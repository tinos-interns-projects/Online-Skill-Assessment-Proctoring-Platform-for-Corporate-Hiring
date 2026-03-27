import base64
import uuid
from datetime import timedelta

import cv2
import numpy as np
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    Answer,
    Attempt,
    CandidateActivity,
    Question,
    Result,
    Skill,
    Test,
    TestBlueprint,
    UserProfile,
    WebcamCapture,
)
from .serializers import ResultSerializer


OPTION_INDEX_TO_LETTER = {0: "a", 1: "b", 2: "c", 3: "d"}
OPTION_LETTER_TO_INDEX = {"a": 0, "b": 1, "c": 2, "d": 3}
QUESTION_TYPE_MAP = {
    "mcq": "mcq",
    "msq": "mcq",
    "coding": "coding",
    "scenario": "descriptive",
}
FACE_REASON_MESSAGES = {
    "no_face": "Warning: no face detected.",
    "multiple_faces": "Warning: multiple faces detected.",
}
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def normalize_text(value):
    return " ".join(str(value or "").strip().lower().split())


def absolute_media_url(request, path):
    if not path:
        return ""

    if path.startswith("http://") or path.startswith("https://"):
        return path

    return request.build_absolute_uri(path)


def decode_base64_image(image_data):
    if not image_data:
        raise ValueError("Image data is required.")

    encoded = image_data.split(",", 1)[1] if "," in image_data else image_data
    return base64.b64decode(encoded)


def load_cv_image(image_data):
    binary = decode_base64_image(image_data)
    array = np.frombuffer(binary, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image.")
    return binary, image


def resolve_api_user(request):
    if request.user.is_authenticated:
        user = request.user
    else:
        user, created = User.objects.get_or_create(
            username="frontend_candidate",
            defaults={"email": "frontend_candidate@example.com"},
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])

    UserProfile.objects.get_or_create(user=user, defaults={"role": "candidate"})
    return user


def resolve_assessment(assessment_id=None):
    if assessment_id:
        blueprint = TestBlueprint.objects.filter(id=assessment_id).first()
        if blueprint:
            return blueprint

    blueprint = (
        TestBlueprint.objects.filter(questions__is_active=True)
        .distinct()
        .order_by("name")
        .first()
    )
    if blueprint:
        return blueprint

    return TestBlueprint.objects.order_by("name").first()


def get_assessment_questions(blueprint):
    if blueprint:
        questions = list(blueprint.questions.filter(is_active=True).select_related("skill", "topic").order_by("id"))
        if questions:
            return questions

    return list(Question.objects.filter(is_active=True).select_related("skill", "topic").order_by("id")[:20])


def get_or_create_exam_session(user, blueprint):
    now = timezone.now()
    duration_minutes = blueprint.duration_minutes or 20
    active_test = (
        Test.objects.filter(user=user, blueprint=blueprint, is_completed=False)
        .order_by("-started_at")
        .first()
    )

    if not active_test:
        active_test = Test.objects.create(
            blueprint=blueprint,
            user=user,
            duration_minutes=duration_minutes,
            scheduled_start=now,
            scheduled_end=now + timedelta(minutes=duration_minutes),
            is_generated=True,
            is_completed=False,
        )

    attempt = Attempt.objects.filter(user=user, test=active_test, is_completed=False).order_by("-started_at").first()
    if not attempt and not active_test.is_completed:
        attempt = Attempt.objects.create(user=user, test=active_test, is_completed=False)

    return active_test, attempt


def serialize_question(question):
    raw_type = question.question_type or "mcq"
    question_type = QUESTION_TYPE_MAP.get(raw_type, "descriptive")
    options = [option for option in [question.option_a, question.option_b, question.option_c, question.option_d] if option]
    correct_index = OPTION_LETTER_TO_INDEX.get((question.correct_option or "").lower())

    return {
        "id": question.id,
        "question": question.question_text,
        "type": question_type,
        "difficulty": (question.difficulty or "medium").title(),
        "options": options if question_type == "mcq" else [],
        "answer": correct_index,
        "correctOption": correct_index,
        "explanation": question.explanation or "",
        "sampleInput": question.sample_input or "",
        "sampleOutput": question.sample_output or "",
    }


def get_answer_payload(answers, question_id):
    return answers.get(str(question_id), answers.get(question_id))


def option_label(question, answer_letter):
    if not answer_letter:
        return ""

    option_index = OPTION_LETTER_TO_INDEX.get(str(answer_letter).lower())
    options = [question.option_a, question.option_b, question.option_c, question.option_d]
    if option_index is None or option_index >= len(options):
        return str(answer_letter).upper()

    option_text = options[option_index]
    return option_text or str(answer_letter).upper()


def evaluate_answer(question, submitted_value):
    raw_type = QUESTION_TYPE_MAP.get(question.question_type or "mcq", "descriptive")

    if raw_type == "mcq":
        submitted_index = None
        if isinstance(submitted_value, int):
            submitted_index = submitted_value
        elif str(submitted_value or "").strip().isdigit():
            submitted_index = int(str(submitted_value).strip())
        else:
            submitted_index = OPTION_LETTER_TO_INDEX.get(str(submitted_value or "").strip().lower())

        correct_index = OPTION_LETTER_TO_INDEX.get((question.correct_option or "").lower())
        is_correct = submitted_index is not None and submitted_index == correct_index
        selected_option = OPTION_INDEX_TO_LETTER.get(submitted_index, "") if submitted_index is not None else ""

        return {
            "is_attempted": submitted_index is not None,
            "is_correct": is_correct,
            "selected_option": selected_option,
            "code_answer": "",
            "score": 100 if is_correct else 0,
        }

    text_answer = str(submitted_value or "").strip()
    if not text_answer:
        return {
            "is_attempted": False,
            "is_correct": False,
            "selected_option": "",
            "code_answer": "",
            "score": 0,
        }

    reference_answer = question.code_solution if raw_type == "coding" else question.explanation
    is_correct = bool(reference_answer) and normalize_text(text_answer) == normalize_text(reference_answer)

    return {
        "is_attempted": True,
        "is_correct": is_correct,
        "selected_option": "",
        "code_answer": text_answer,
        "score": 100 if is_correct else 0,
    }


def build_breakdowns(evaluated_answers):
    skill_breakdown = {}
    difficulty_breakdown = {}

    for item in evaluated_answers:
        question = item["question"]
        if not item["is_attempted"]:
            continue

        skill_name = question.skill.name if question.skill else "General"
        difficulty_name = (question.difficulty or "medium").title()

        skill_entry = skill_breakdown.setdefault(skill_name, {"correct": 0, "total": 0})
        skill_entry["total"] += 1
        if item["is_correct"]:
            skill_entry["correct"] += 1

        difficulty_entry = difficulty_breakdown.setdefault(difficulty_name, {"correct": 0, "total": 0})
        difficulty_entry["total"] += 1
        if item["is_correct"]:
            difficulty_entry["correct"] += 1

    return skill_breakdown, difficulty_breakdown


def build_result_detail(result):
    attempt = result.attempt
    answers = Answer.objects.filter(attempt=attempt).select_related("question")

    correct_answers = answers.filter(is_correct=True).count()
    wrong_answers = answers.filter(is_correct=False).count()
    violations = CandidateActivity.objects.filter(attempt=attempt).count()

    explanation_items = []
    for answer in answers.filter(is_correct=False):
        question = answer.question
        submitted_answer = answer.code_answer or option_label(question, answer.selected_option) or "Not answered"
        correct_answer = ""
        if question.correct_option:
            correct_answer = option_label(question, question.correct_option)
        elif question.code_solution:
            correct_answer = question.code_solution

        explanation_items.append({
            "questionId": question.id,
            "question": question.question_text,
            "submittedAnswer": submitted_answer,
            "correctAnswer": correct_answer,
            "explanation": question.explanation or "No explanation available.",
        })

    return {
        "resultId": result.id,
        "testName": result.test.blueprint.name,
        "score": result.score,
        "accuracy": round(result.accuracy, 2),
        "totalQuestions": result.total_questions,
        "attemptedQuestions": answers.count(),
        "correctAnswers": correct_answers,
        "wrongAnswers": wrong_answers,
        "violations": violations,
        "explanations": explanation_items,
        "submittedAt": result.created_at.isoformat(),
    }


def resolve_attempt(request, attempt_id):
    if not attempt_id:
        return None

    user = resolve_api_user(request)
    return Attempt.objects.filter(id=attempt_id, user=user).select_related("test__blueprint").first()


@api_view(["GET"])
@permission_classes([AllowAny])
def questions_api(request):
    assessment_id = request.query_params.get("assessment_id")
    blueprint = resolve_assessment(assessment_id)
    if not blueprint:
        return Response({"detail": "No assessment is available right now."}, status=404)

    questions = get_assessment_questions(blueprint)
    if not questions:
        return Response({"detail": "No questions are available right now."}, status=404)

    user = resolve_api_user(request)
    test, attempt = get_or_create_exam_session(user, blueprint)
    now = timezone.now()

    if test.scheduled_start and now < test.scheduled_start:
        return Response({"detail": "Exam not started.", "scheduledStart": test.scheduled_start.isoformat()}, status=403)

    if test.scheduled_end and now >= test.scheduled_end:
        return Response({"detail": "Exam ended.", "scheduledEnd": test.scheduled_end.isoformat()}, status=403)

    remaining_seconds = int((test.scheduled_end - now).total_seconds()) if test.scheduled_end else (blueprint.duration_minutes or 20) * 60

    return Response({
        "assessmentId": blueprint.id,
        "title": blueprint.name,
        "durationMinutes": blueprint.duration_minutes if blueprint.duration_minutes else 20,
        "remainingSeconds": max(remaining_seconds, 0),
        "scheduledStart": test.scheduled_start.isoformat() if test.scheduled_start else None,
        "scheduledEnd": test.scheduled_end.isoformat() if test.scheduled_end else None,
        "testId": test.id,
        "attemptId": attempt.id if attempt else None,
        "observationMessage": "You are under camera observation",
        "questions": [serialize_question(question) for question in questions],
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def upload_screenshot_api(request):
    payload = request.data or {}
    attempt = resolve_attempt(request, payload.get("attemptId"))
    if not attempt:
        return Response({"detail": "Active attempt not found for screenshot upload."}, status=404)

    try:
        binary = decode_base64_image(payload.get("imageData"))
    except Exception:
        return Response({"detail": "Invalid screenshot data."}, status=400)

    filename = f"attempt_{attempt.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}.jpg"
    capture = WebcamCapture.objects.create(
        attempt=attempt,
        image=ContentFile(binary, name=filename),
    )

    return Response({
        "status": "saved",
        "screenshotUrl": absolute_media_url(request, capture.image.url),
        "timestamp": capture.timestamp.isoformat(),
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def detect_face_api(request):
    payload = request.data or {}

    try:
        _, image = load_cv_image(payload.get("imageData"))
    except Exception:
        return Response({"violation": False, "reason": "unreadable_image", "faceCount": 0})

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    face_count = len(faces)

    if face_count == 0:
        reason = "no_face"
    elif face_count > 1:
        reason = "multiple_faces"
    else:
        reason = "clear"

    return Response({
        "violation": reason != "clear",
        "reason": reason,
        "message": FACE_REASON_MESSAGES.get(reason, "Face check clear."),
        "faceCount": face_count,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def log_violation_api(request):
    payload = request.data or {}
    attempt = resolve_attempt(request, payload.get("attemptId"))
    if not attempt:
        return Response({"detail": "Active attempt not found for violation logging."}, status=404)

    activity_type = str(payload.get("activityType") or "UNKNOWN").upper()
    CandidateActivity.objects.create(attempt=attempt, activity_type=activity_type)

    return Response({
        "status": "logged",
        "violations": CandidateActivity.objects.filter(attempt=attempt).count(),
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def submit_test_api(request):
    payload = request.data or {}
    answers = payload.get("answers") or {}
    time_taken = max(int(payload.get("timeTaken") or 0), 0)
    violations_count = max(int(payload.get("violationsCount") or 0), 0)
    assessment_id = payload.get("assessmentId")
    attempt_id = payload.get("attemptId")

    if not isinstance(answers, dict):
        return Response({"detail": "Answers payload must be an object."}, status=400)

    user = resolve_api_user(request)
    general_skill, _ = Skill.objects.get_or_create(name="General")

    attempt = resolve_attempt(request, attempt_id)
    if attempt:
        test = attempt.test
        blueprint = test.blueprint
    else:
        blueprint = resolve_assessment(assessment_id)
        if not blueprint:
            return Response({"detail": "Unable to resolve an assessment for submission."}, status=400)
        test, attempt = get_or_create_exam_session(user, blueprint)

    questions = get_assessment_questions(blueprint)
    if not questions:
        return Response({"detail": "Unable to resolve assessment questions for submission."}, status=400)

    now = timezone.now()

    with transaction.atomic():
        Answer.objects.filter(attempt=attempt).delete()

        evaluated_answers = []
        for question in questions:
            evaluation = evaluate_answer(question, get_answer_payload(answers, question.id))
            evaluation["question"] = question
            evaluated_answers.append(evaluation)

            if not evaluation["is_attempted"]:
                continue

            Answer.objects.create(
                attempt=attempt,
                question=question,
                selected_option=evaluation["selected_option"],
                code_answer=evaluation["code_answer"],
                is_correct=evaluation["is_correct"],
                skill=question.skill or general_skill,
                difficulty=question.difficulty or "medium",
                score=evaluation["score"],
            )

        existing_violations = CandidateActivity.objects.filter(attempt=attempt).count()
        additional_violations = max(violations_count - existing_violations, 0)
        for _ in range(additional_violations):
            CandidateActivity.objects.create(attempt=attempt, activity_type="FRONTEND_VIOLATION")

        attempted_count = sum(1 for item in evaluated_answers if item["is_attempted"])
        correct_count = sum(1 for item in evaluated_answers if item["is_attempted"] and item["is_correct"])
        score_percentage = round((correct_count / len(questions)) * 100) if questions else 0
        skill_breakdown, difficulty_breakdown = build_breakdowns(evaluated_answers)

        attempt.is_completed = True
        attempt.completed_at = now
        if time_taken:
            attempt.started_at = now - timedelta(seconds=time_taken)
        attempt.save(update_fields=["started_at", "completed_at", "is_completed"])

        test.is_completed = True
        test.completed_at = now
        test.save(update_fields=["completed_at", "is_completed"])

        result, _ = Result.objects.update_or_create(
            attempt=attempt,
            defaults={
                "user": user,
                "test": test,
                "score": score_percentage,
                "total_questions": len(questions),
                "accuracy": score_percentage,
                "skill_breakdown": skill_breakdown,
                "difficulty_breakdown": difficulty_breakdown,
            },
        )

    detail = build_result_detail(result)
    detail["attemptedQuestions"] = attempted_count
    detail["timeTaken"] = time_taken
    detail["attemptId"] = attempt.id
    detail["testId"] = test.id
    return Response(detail, status=201)


@api_view(["GET"])
@permission_classes([AllowAny])
def results_api(request):
    if request.query_params.get("summary") == "1" or not (request.query_params.get("result_id") or request.query_params.get("latest")):
        queryset = Result.objects.select_related("user", "test__blueprint", "attempt").order_by("-created_at")
        return Response(ResultSerializer(queryset, many=True).data)

    queryset = Result.objects.select_related("test__blueprint", "attempt").order_by("-created_at")
    result_id = request.query_params.get("result_id")

    if result_id:
        result = queryset.filter(id=result_id).first()
    else:
        result = queryset.first()

    if not result:
        return Response({"detail": "Result not found."}, status=404)

    return Response(build_result_detail(result))


@api_view(["GET"])
@permission_classes([AllowAny])
def employer_monitoring_api(request):
    from django.contrib.auth.models import User

    assessment_count = TestBlueprint.objects.count()
    candidate_count = User.objects.filter(userprofile__role="candidate").count()
    live_tests = Attempt.objects.filter(is_completed=False).count()

    active_attempts = Attempt.objects.filter(is_completed=False).select_related("test__blueprint", "user")
    live_monitoring = []

    for attempt in active_attempts:
        test = attempt.test
        violations = CandidateActivity.objects.filter(attempt=attempt).order_by("-timestamp")
        screenshots = WebcamCapture.objects.filter(attempt=attempt).order_by("-timestamp")[:6]
        correct_count = Answer.objects.filter(attempt=attempt, is_correct=True).count()
        attempted_count = Answer.objects.filter(attempt=attempt).count()
        score = round((correct_count / attempted_count) * 100) if attempted_count else 0

        if test.scheduled_end:
            remaining = (test.scheduled_end - timezone.now()).total_seconds()
            if remaining > 0:
                minutes = int(remaining // 60)
                seconds = int(remaining % 60)
                time_left = f"{minutes}m {seconds:02d}s"
            else:
                time_left = "Expired"
        else:
            time_left = "N/A"

        live_monitoring.append({
            "candidate": attempt.user.get_full_name() or attempt.user.username,
            "test": test.blueprint.name,
            "status": "In Progress",
            "score": score,
            "warnings": violations.count(),
            "timeLeft": time_left,
            "violationLogs": [
                {
                    "type": item.activity_type,
                    "timestamp": item.timestamp.isoformat(),
                }
                for item in violations[:5]
            ],
            "screenshots": [
                {
                    "url": absolute_media_url(request, capture.image.url),
                    "timestamp": capture.timestamp.isoformat(),
                }
                for capture in screenshots
            ],
        })

    return Response({
        "stats": [
            {"label": "Assessments Created", "value": assessment_count},
            {"label": "Candidates Assigned", "value": candidate_count},
            {"label": "Live Tests", "value": live_tests},
        ],
        "liveMonitoring": live_monitoring,
    })


@api_view(["DELETE"])
@permission_classes([AllowAny])
def delete_assessment_api(request, assessment_id):
    blueprint = TestBlueprint.objects.filter(id=assessment_id).first()
    if not blueprint:
        return Response({"detail": "Assessment not found."}, status=404)

    blueprint.delete()
    return Response({"status": "deleted"})
