import base64
import uuid
from datetime import timedelta

try:
    import numpy as np
except ImportError:  # pragma: no cover - optional dependency in local environments
    np = None
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.models import TestInvitation

from .models import (
    Answer,
    Attempt,
    CandidateActivity,
    Question,
    Result,
    Skill,
    Test,
    TestBlueprint,
    TestQuestion,
    UserProfile,
    WebcamCapture,
)
from .serializers import ResultSerializer
from .services.section_engine import (
    ensure_attempt_sections,
    ensure_test_sections,
    get_section_remaining_seconds,
    is_section_accessible,
    map_questions_to_sections,
    sync_current_section,
)
from .services.employer_dashboard import calculate_test_status, get_test_end_time


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
try:
    import cv2
except ImportError:  # pragma: no cover - optional dependency in local environments
    cv2 = None


FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml") if cv2 else None


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
    if cv2 is None or np is None:
        raise ValueError("Computer vision dependencies are unavailable.")
    binary = decode_base64_image(image_data)
    array = np.frombuffer(binary, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image.")
    return binary, image


def resolve_api_user(request):
    if not request.user.is_authenticated:
        raise PermissionDenied("User not authenticated")

    user = request.user
    UserProfile.objects.get_or_create(user=user, defaults={"role": "candidate"})
    return user


def resolve_assessment(assessment_id=None):
    if assessment_id:
        blueprint = TestBlueprint.objects.filter(id=assessment_id).first()
        if blueprint:
            return blueprint

    blueprint = TestBlueprint.objects.filter(questions__is_active=True).distinct().order_by("name").first()
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
    duration_minutes = blueprint.duration_minutes or 60
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

    attempt = (
        Attempt.objects.filter(user=user, test=active_test, is_completed=False)
        .order_by("-started_at")
        .first()
    )
    if not attempt and not active_test.is_completed:
        attempt = Attempt.objects.create(user=user, test=active_test, is_completed=False)

    return active_test, attempt


def ensure_test_structure(test, blueprint):
    questions = get_assessment_questions(blueprint)
    sections = ensure_test_sections(test, questions)

    test_questions = list(
        TestQuestion.objects.filter(test=test)
        .select_related("question__skill", "question__topic", "section")
        .order_by("section__order", "id")
    )

    if not test_questions:
        question_sections = map_questions_to_sections(questions, sections)
        for question in questions:
            TestQuestion.objects.create(
                test=test,
                question=question,
                section=question_sections.get(question.id),
            )

        test_questions = list(
            TestQuestion.objects.filter(test=test)
            .select_related("question__skill", "question__topic", "section")
            .order_by("section__order", "id")
        )
    else:
        missing_section_records = [item for item in test_questions if item.section_id is None]
        if missing_section_records:
            question_sections = map_questions_to_sections([item.question for item in test_questions], sections)
            for test_question in missing_section_records:
                test_question.section = question_sections.get(test_question.question_id)
                test_question.save(update_fields=["section"])
            test_questions = list(
                TestQuestion.objects.filter(test=test)
                .select_related("question__skill", "question__topic", "section")
                .order_by("section__order", "id")
            )

    return test_questions


def serialize_test_question(test_question):
    question = test_question.question
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
        "sectionType": test_question.section.section_type if test_question.section else (question.section_type or ""),
        "sectionTitle": test_question.section.title if test_question.section else "",
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


def build_breakdowns_from_answers(answers):
    skill_breakdown = {}
    difficulty_breakdown = {}

    for answer in answers:
        skill_name = answer.skill.name if answer.skill else "General"
        difficulty_name = (answer.difficulty or "medium").title()

        skill_entry = skill_breakdown.setdefault(skill_name, {"correct": 0, "total": 0})
        skill_entry["total"] += 1
        if answer.is_correct:
            skill_entry["correct"] += 1

        difficulty_entry = difficulty_breakdown.setdefault(difficulty_name, {"correct": 0, "total": 0})
        difficulty_entry["total"] += 1
        if answer.is_correct:
            difficulty_entry["correct"] += 1

    return skill_breakdown, difficulty_breakdown


def build_section_breakdown(attempt):
    answers = Answer.objects.filter(attempt=attempt).select_related("section")
    section_answers = {}
    for answer in answers:
        if not answer.section:
            continue

        entry = section_answers.setdefault(
            answer.section_id,
            {
                "sectionId": answer.section_id,
                "section": answer.section.title,
                "correct": 0,
                "attempted": 0,
            },
        )
        entry["attempted"] += 1
        if answer.is_correct:
            entry["correct"] += 1

    output = []
    for section_attempt in attempt.section_attempts.select_related("section").order_by("section__order", "id"):
        total_questions = TestQuestion.objects.filter(test=attempt.test, section=section_attempt.section).count()
        answer_data = section_answers.get(section_attempt.section_id, {})
        output.append(
            {
                "id": section_attempt.section_id,
                "title": section_attempt.section.title,
                "sectionType": section_attempt.section.section_type,
                "timeLimitMinutes": section_attempt.section.time_limit_minutes,
                "totalQuestions": total_questions,
                "attemptedQuestions": answer_data.get("attempted", 0),
                "correctAnswers": answer_data.get("correct", 0),
                "status": "completed" if section_attempt.completed_at else "pending",
                "autoSubmitted": section_attempt.auto_submitted,
            }
        )

    return output


def build_result_detail(result):
    attempt = result.attempt
    answers = Answer.objects.filter(attempt=attempt).select_related("question", "section")

    correct_answers = answers.filter(is_correct=True).count()
    attempted_count = answers.count()
    wrong_answers = max(attempted_count - correct_answers, 0)
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

        explanation_items.append(
            {
                "questionId": question.id,
                "question": question.question_text,
                "submittedAnswer": submitted_answer,
                "correctAnswer": correct_answer,
                "explanation": question.explanation or "No explanation available.",
                "sectionTitle": answer.section.title if answer.section else "",
            }
        )

    return {
        "resultId": result.id,
        "testName": result.test.blueprint.name,
        "score": result.score,
        "accuracy": round(result.accuracy, 2),
        "totalQuestions": result.total_questions,
        "attemptedQuestions": attempted_count,
        "correctAnswers": correct_answers,
        "wrongAnswers": wrong_answers,
        "violations": violations,
        "explanations": explanation_items,
        "sections": build_section_breakdown(attempt),
        "submittedAt": result.created_at.isoformat(),
    }


def resolve_attempt(request, attempt_id):
    if not attempt_id:
        return None
    user = resolve_api_user(request)
    return Attempt.objects.filter(id=attempt_id, user=user).select_related("test__blueprint").first()


def get_section_attempts_with_current(attempt, now=None):
    now = now or timezone.now()
    current_section_attempt = sync_current_section(attempt, now)
    section_attempts = ensure_attempt_sections(attempt)

    while current_section_attempt:
        has_questions = TestQuestion.objects.filter(test=attempt.test, section=current_section_attempt.section).exists()
        if has_questions:
            break

        current_section_attempt.completed_at = now
        current_section_attempt.auto_submitted = True
        current_section_attempt.save(update_fields=["completed_at", "auto_submitted"])
        current_section_attempt = sync_current_section(attempt, now)
        section_attempts = ensure_attempt_sections(attempt)

    return section_attempts, current_section_attempt


def serialize_section_attempt(section_attempt, current_section_attempt, now=None):
    now = now or timezone.now()
    section = section_attempt.section
    remaining_seconds = get_section_remaining_seconds(section_attempt, now) if not section_attempt.completed_at else 0
    question_count = TestQuestion.objects.filter(test=section.test, section=section).count()

    if section_attempt.completed_at:
        status = "completed"
    elif current_section_attempt and section_attempt.id == current_section_attempt.id:
        status = "current"
    else:
        status = "locked"

    return {
        "id": section.id,
        "title": section.title,
        "sectionType": section.section_type,
        "order": section.order,
        "timeLimitMinutes": section.time_limit_minutes,
        "remainingSeconds": remaining_seconds,
        "questionCount": question_count,
        "status": status,
        "locked": status == "locked",
        "completed": status == "completed",
        "autoSubmitted": section_attempt.auto_submitted,
    }


def persist_answers_for_scope(attempt, test_questions, answers_payload, general_skill):
    question_ids = [item.question_id for item in test_questions]
    Answer.objects.filter(attempt=attempt, question_id__in=question_ids).delete()

    attempted_count = 0
    correct_count = 0
    for test_question in test_questions:
        evaluation = evaluate_answer(test_question.question, get_answer_payload(answers_payload, test_question.question_id))
        if not evaluation["is_attempted"]:
            continue

        attempted_count += 1
        if evaluation["is_correct"]:
            correct_count += 1

        Answer.objects.create(
            attempt=attempt,
            question=test_question.question,
            section=test_question.section,
            selected_option=evaluation["selected_option"],
            code_answer=evaluation["code_answer"],
            is_correct=evaluation["is_correct"],
            skill=test_question.question.skill or general_skill,
            difficulty=test_question.question.difficulty or "medium",
            score=evaluation["score"],
        )

    return attempted_count, correct_count


def apply_frontend_violations(attempt, violations_count):
    existing_violations = CandidateActivity.objects.filter(attempt=attempt).count()
    additional_violations = max(violations_count - existing_violations, 0)
    for _ in range(additional_violations):
        CandidateActivity.objects.create(attempt=attempt, activity_type="FRONTEND_VIOLATION")


def finalize_attempt(attempt, user, time_taken=0, violations_count=0, now=None, auto_submit_reason=""):
    now = now or timezone.now()
    all_test_questions = list(TestQuestion.objects.filter(test=attempt.test).select_related("section", "question"))
    answers = list(Answer.objects.filter(attempt=attempt).select_related("skill"))

    total_questions = len(all_test_questions)
    correct_count = sum(1 for answer in answers if answer.is_correct)
    score_percentage = round((correct_count / total_questions) * 100) if total_questions else 0
    skill_breakdown, difficulty_breakdown = build_breakdowns_from_answers(answers)

    apply_frontend_violations(attempt, violations_count)
    if auto_submit_reason == "violations":
        CandidateActivity.objects.create(attempt=attempt, activity_type="AUTO_SUBMIT_VIOLATIONS")
    elif auto_submit_reason == "timeout":
        CandidateActivity.objects.create(attempt=attempt, activity_type="AUTO_SUBMIT_TIMEOUT")

    attempt.is_completed = True
    attempt.completed_at = now
    if time_taken:
        attempt.started_at = now - timedelta(seconds=max(time_taken, 0))
    attempt.save(update_fields=["started_at", "completed_at", "is_completed"])

    attempt.section_attempts.filter(completed_at__isnull=True).update(
        completed_at=now,
        auto_submitted=True,
    )

    test = attempt.test
    test.is_completed = True
    test.completed_at = now
    test.save(update_fields=["completed_at", "is_completed"])

    result, _ = Result.objects.update_or_create(
        attempt=attempt,
        defaults={
            "user": user,
            "test": test,
            "score": score_percentage,
            "total_questions": total_questions,
            "accuracy": score_percentage,
            "skill_breakdown": skill_breakdown,
            "difficulty_breakdown": difficulty_breakdown,
        },
    )

    detail = build_result_detail(result)
    detail["timeTaken"] = time_taken
    detail["attemptId"] = attempt.id
    detail["testId"] = test.id
    return detail


@api_view(["GET"])
@permission_classes([AllowAny])
def questions_api(request):

    token = request.GET.get("token")
    assessment_id = request.query_params.get("assessment_id")
    requested_section_id = request.query_params.get("section_id")

    invitation = None
    user = None
    test = None
    attempt = None

    # ---------- INVITATION FLOW ----------
    if token:
        try:
            invitation = TestInvitation.objects.select_related(
                "candidate", "test", "test__blueprint"
            ).get(token=token)

            user = invitation.candidate
            test = invitation.test
            blueprint = test.blueprint

        except TestInvitation.DoesNotExist:
            return Response({"detail": "Invalid invitation token"}, status=403)

        # get or create attempt
        attempt = Attempt.objects.filter(test=test, user=user).first()

        if not attempt:
            attempt = Attempt.objects.create(
                test=test,
                user=user,
                is_completed=False
            )

    # ---------- NORMAL LOGIN FLOW ----------
    else:
        blueprint = resolve_assessment(assessment_id)
        user = resolve_api_user(request)

        if not blueprint:
            return Response({"detail": "No assessment is available right now."}, status=404)

        test, attempt = get_or_create_exam_session(user, blueprint)

    # ---------- GENERATE QUESTIONS ----------
    test_questions = ensure_test_structure(test, blueprint)

    if not test_questions:
        return Response({"detail": "No questions are available right now."}, status=404)

    now = timezone.now()

    if test.scheduled_start and now < test.scheduled_start:
       return Response(
           {
              "status": "not_started",
              "detail": "Exam not started.",
              "scheduledStart": test.scheduled_start.isoformat()
           },
           status=200
       )

    if test.scheduled_end and now >= test.scheduled_end:
        return Response({
            "detail": "Exam ended.",
            "scheduledEnd": test.scheduled_end.isoformat()
        }, status=403)
    
    # Ensure attempt start time is set correctly
    if not attempt.started_at:
        attempt.started_at = now
        attempt.save()

    section_attempts, current_section_attempt = get_section_attempts_with_current(attempt, now)

    if not current_section_attempt:
        result = Result.objects.filter(attempt=attempt).first()

        if result:
            detail = build_result_detail(result)
            detail["detail"] = "Exam ended."
            return Response(detail, status=403)

        return Response({"detail": "Exam ended."}, status=403)

    selected_section_attempt = current_section_attempt

    if requested_section_id:
        selected_section_attempt = next(
            (item for item in section_attempts if str(item.section_id) == str(requested_section_id)),
            current_section_attempt,
        )

        if not is_section_accessible(selected_section_attempt, current_section_attempt):
            return Response(
                {"detail": "Complete the current section before moving ahead."},
                status=403,
            )

    active_test_questions = [
        item for item in test_questions
        if item.section_id == selected_section_attempt.section_id
    ]

    response_sections = [
        serialize_section_attempt(item, current_section_attempt, now)
        for item in section_attempts
    ]

    remaining_seconds = get_section_remaining_seconds(selected_section_attempt, now)

    overall_remaining_seconds = (
        max(int((test.scheduled_end - now).total_seconds()), 0)
        if test.scheduled_end
        else remaining_seconds
    )

    remaining_seconds = max(remaining_seconds, 1)

    if overall_remaining_seconds <= 0:
        overall_remaining_seconds = 1

    return Response({
        "assessmentId": blueprint.id,
        "title": blueprint.name,
        "durationMinutes": selected_section_attempt.section.time_limit_minutes,
        "remainingSeconds": remaining_seconds,
        "overallRemainingSeconds": overall_remaining_seconds,
        "scheduledStart": test.scheduled_start.isoformat() if test.scheduled_start else None,
        "scheduledEnd": test.scheduled_end.isoformat() if test.scheduled_end else None,
        "testId": test.id,
        "attemptId": attempt.id,
        "observationMessage": "You are under camera observation",
        "activeSection": serialize_section_attempt(
            selected_section_attempt, current_section_attempt, now
        ),
        "sections": response_sections,
        "questions": [
            serialize_test_question(test_question)
            for test_question in active_test_questions
        ],
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

    return Response(
        {
            "status": "saved",
            "screenshotUrl": absolute_media_url(request, capture.image.url),
            "timestamp": capture.timestamp.isoformat(),
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def detect_face_api(request):
    payload = request.data or {}

    if cv2 is None or np is None or FACE_CASCADE is None:
        return Response({"violation": False, "reason": "opencv_unavailable", "faceCount": 0})

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

    return Response(
        {
            "violation": reason != "clear",
            "reason": reason,
            "message": FACE_REASON_MESSAGES.get(reason, "Face check clear."),
            "faceCount": face_count,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def log_violation_api(request):
    payload = request.data or {}
    attempt = resolve_attempt(request, payload.get("attemptId"))
    if not attempt:
        return Response({"detail": "Active attempt not found for violation logging."}, status=404)

    activity_type = str(payload.get("activityType") or "UNKNOWN").upper()
    CandidateActivity.objects.create(attempt=attempt, activity_type=activity_type)

    return Response(
        {
            "status": "logged",
            "violations": CandidateActivity.objects.filter(attempt=attempt).count(),
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def submit_test_api(request):

    print("SUBMIT API CALLED")
    print("sectionId:", request.data.get("sectionId"))

    payload = request.data or {}
    answers = payload.get("answers") or {}
    time_taken = max(int(payload.get("timeTaken") or 0), 0)
    violations_count = max(int(payload.get("violationsCount") or 0), 0)
    assessment_id = payload.get("assessmentId")
    attempt_id = payload.get("attemptId")
    section_id = payload.get("sectionId")
    auto_submitted = bool(payload.get("autoSubmitted"))
    auto_submit_reason = str(payload.get("autoSubmitReason") or "").strip().lower()

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

    test_questions = ensure_test_structure(test, blueprint)
    if not test_questions:
        return Response({"detail": "Unable to resolve assessment questions for submission."}, status=400)

    now = timezone.now()

    with transaction.atomic():
        if section_id:
            section_attempts, current_section_attempt = get_section_attempts_with_current(attempt, now)
            selected_section_attempt = next(
                (item for item in section_attempts if str(item.section_id) == str(section_id)),
                None,
            )
            if not is_section_accessible(selected_section_attempt, current_section_attempt):
                return Response({
                  "status": "invalid_section",
                  "detail": "Section not accessible",
                  "attemptId": attempt.id,
                  "testId": test.id
                }, status=200)
            
            section_test_questions = [item for item in test_questions if item.section_id == selected_section_attempt.section_id]
            persist_answers_for_scope(attempt, section_test_questions, answers, general_skill)
            apply_frontend_violations(attempt, violations_count)

            if not selected_section_attempt.started_at:
                selected_section_attempt.started_at = now

            selected_section_attempt.completed_at = now
            selected_section_attempt.auto_submitted = auto_submitted
            selected_section_attempt.save(update_fields=["started_at", "completed_at", "auto_submitted"])

            section_attempts, next_section_attempt = get_section_attempts_with_current(attempt, now)
            if next_section_attempt:
                return Response(
                    {
                        "status": "section_saved",
                        "attemptId": attempt.id,
                        "testId": test.id,
                        "nextSectionId": next_section_attempt.section_id,
                        "sections": [
                            serialize_section_attempt(item, next_section_attempt, now)
                            for item in section_attempts
                        ],
                    }
                )

        else:
            persist_answers_for_scope(attempt, test_questions, answers, general_skill)

        detail = finalize_attempt(
            attempt=attempt,
            user=user,
            time_taken=time_taken,
            violations_count=violations_count,
            now=now,
            auto_submit_reason=auto_submit_reason,
        )

    return Response(detail, status=201)


@api_view(["GET"])
@permission_classes([AllowAny])
def results_api(request):
    if request.query_params.get("summary") == "1" or not (
        request.query_params.get("result_id") or request.query_params.get("latest")
    ):
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

        now = timezone.now()
        section_attempts, current_section_attempt = get_section_attempts_with_current(attempt, now)
        current_section_title = current_section_attempt.section.title if current_section_attempt else "Completed"
        current_section_time = get_section_remaining_seconds(current_section_attempt, now) if current_section_attempt else 0
        status = calculate_test_status(test, now)

        test_end_time = get_test_end_time(test)
        if test_end_time:
            remaining = (test_end_time - now).total_seconds()
            if remaining > 0:
                minutes = int(remaining // 60)
                seconds = int(remaining % 60)
                time_left = f"{minutes}m {seconds:02d}s"
            else:
                time_left = "Expired"
        else:
            time_left = "N/A"

        live_monitoring.append(
            {
                "candidate": attempt.user.get_full_name() or attempt.user.username,
                "test": test.blueprint.name,
                "status": status,
                "score": score,
                "attemptedQuestions": attempted_count,
                "warnings": violations.count(),
                "timeLeft": time_left,
                "currentSection": current_section_title,
                "sectionTimeLeft": current_section_time,
                "assignmentId": getattr(getattr(test, "assignment", None), "id", None),
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
                "sections": [
                    serialize_section_attempt(item, current_section_attempt, now)
                    for item in section_attempts
                ],
            }
        )

    return Response(
        {
            "stats": [
                {"label": "Assessments Created", "value": assessment_count},
                {"label": "Candidates Assigned", "value": candidate_count},
                {"label": "Live Tests", "value": live_tests},
            ],
            "liveMonitoring": live_monitoring,
        }
    )


@api_view(["DELETE"])
@permission_classes([AllowAny])
def delete_assessment_api(request, assessment_id):
    blueprint = TestBlueprint.objects.filter(id=assessment_id).first()
    if not blueprint:
        return Response({"detail": "Assessment not found."}, status=404)

    blueprint.delete()
    return Response({"status": "deleted"})
