import uuid
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from core.models import (
    Answer,
    Attempt,
    CandidateActivity,
    CodingEvaluation,
    EmployerAssessmentTemplate,
    EmployerAssessmentTemplateSection,
    Question,
    Result,
    Section,
    Test,
    TestAssignment,
    TestInvitation,
    TestQuestion,
    WebcamCapture,
)


DEFAULT_SECTION_TYPES = ["aptitude", "verbal", "numerical", "logical", "coding"]


def find_matching_blueprint_section(blueprint, section_type):
    return blueprint.sections.filter(section_type=section_type).order_by("order", "id").first()


def serialize_template(template):
    return {
        "id": template.id,
        "name": template.name,
        "blueprintId": template.blueprint_id,
        "blueprintName": template.blueprint.name,
        "difficulty": template.difficulty,
        "totalDurationMinutes": template.total_duration_minutes,
        "createdAt": template.created_at.isoformat(),
        "sections": [
            {
                "id": section.id,
                "title": section.title,
                "sectionType": section.section_type,
                "order": section.order,
                "questionCount": section.question_count,
                "timeLimitMinutes": section.time_limit_minutes,
                "blueprintSectionId": section.blueprint_section_id,
            }
            for section in template.sections.select_related("blueprint_section").order_by("order", "id")
        ],
    }


@transaction.atomic
def create_employer_template(employer, payload):
    blueprint = payload["blueprint"]
    template = EmployerAssessmentTemplate.objects.create(
        employer=employer,
        blueprint=blueprint,
        name=payload["name"],
        difficulty=payload.get("difficulty") or "Medium",
        total_duration_minutes=payload.get("total_duration_minutes") or blueprint.duration_minutes or 45,
    )

    sections_payload = payload.get("sections") or []
    for index, item in enumerate(sections_payload):
        section_type = str(item.get("sectionType") or item.get("section_type") or DEFAULT_SECTION_TYPES[index % len(DEFAULT_SECTION_TYPES)]).lower()
        EmployerAssessmentTemplateSection.objects.create(
            template=template,
            blueprint_section=find_matching_blueprint_section(blueprint, section_type),
            title=item.get("title") or section_type.title(),
            section_type=section_type,
            order=int(item.get("order") or (index + 1)),
            question_count=int(item.get("questionCount") or 0),
            time_limit_minutes=int(item.get("timeLimitMinutes") or 15),
        )

    return template


def _select_questions_for_section(blueprint, section_config, used_ids):
    queryset = Question.objects.filter(is_active=True).exclude(id__in=used_ids)
    if blueprint.questions.filter(is_active=True).exists():
        queryset = queryset.filter(blueprint=blueprint)

    queryset = queryset.filter(section_type=section_config.section_type)
    count = max(section_config.question_count, 0)
    if count <= 0:
        return []

    questions = list(queryset.order_by("id")[:count])
    for question in questions:
        used_ids.add(question.id)
    return questions


@transaction.atomic
def create_test_assignment(*, employer, candidate, blueprint, template, scheduled_start, duration_minutes, request=None):
    scheduled_end = scheduled_start + timedelta(minutes=duration_minutes)
    test = Test.objects.create(
        blueprint=blueprint,
        user=candidate,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        duration_minutes=duration_minutes,
        is_generated=True,
    )

    section_configs = list(template.sections.order_by("order", "id")) if template else []
    if not section_configs:
        for index, section in enumerate(blueprint.sections.order_by("order", "id")):
            section_configs.append(
                EmployerAssessmentTemplateSection(
                    template=template,
                    blueprint_section=section,
                    title=section.title,
                    section_type=section.section_type,
                    order=index + 1,
                    question_count=blueprint.questions.filter(section_type=section.section_type, is_active=True).count(),
                    time_limit_minutes=section.time_limit_minutes,
                )
            )

    used_question_ids = set()
    for index, section_config in enumerate(section_configs):
        test_section = Section.objects.create(
            test=test,
            blueprint_section=section_config.blueprint_section,
            section_type=section_config.section_type,
            title=section_config.title,
            order=section_config.order or (index + 1),
            time_limit_minutes=section_config.time_limit_minutes,
        )

        for question in _select_questions_for_section(blueprint, section_config, used_question_ids):
            TestQuestion.objects.create(
                test=test,
                section=test_section,
                question=question,
            )

    assignment = TestAssignment.objects.create(
        employer=employer,
        candidate=candidate,
        blueprint=blueprint,
        template=template,
        test=test,
        scheduled_start=scheduled_start,
        duration_minutes=duration_minutes,
    )

    token = TestInvitation.objects.create(
        test=test,
        candidate=candidate,
        token=uuid.uuid4().hex,
    )

    if request and candidate.email:
        invitation_link = f"{settings.FRONTEND_URL}/invite/{token.token}"
        send_mail(
            subject="Online Assessment Invitation",
            message=(
                f"Hello {candidate.username},\n\n"
                f"You have been assigned the assessment '{blueprint.name}'.\n"
                f"Start time: {scheduled_start}\n\n"
                f"Use the link below to start your test:\n{invitation_link}\n"
            ),
            from_email=getattr(settings, "EMAIL_HOST_USER", None),
            recipient_list=[candidate.email],
            fail_silently=True,
        )

    return assignment


def get_test_end_time(test):
    if test.scheduled_end:
        return test.scheduled_end
    if test.scheduled_start:
        return test.scheduled_start + timedelta(minutes=test.duration_minutes or 0)
    return None


def calculate_test_status(test, now=None):
    now = now or timezone.now()
    latest_attempt = test.attempt_set.order_by("-started_at").first()
    result_exists = Result.objects.filter(test=test).exists()
    end_time = get_test_end_time(test)

    if result_exists or test.is_completed:
        return "Completed"
    if latest_attempt and not latest_attempt.is_completed and (end_time is None or now <= end_time):
        return "In Progress"
    if test.scheduled_start and now < test.scheduled_start:
        return "Scheduled"
    if end_time and now > end_time:
        return "Expired"
    return "Active"


def assignment_status(assignment):
    return calculate_test_status(assignment.test)


def serialize_assignment(assignment):
    report_available = assignment.test.attempt_set.filter(is_completed=True).exists()
    return {
        "id": assignment.id,
        "candidate": assignment.candidate.get_full_name() or assignment.candidate.username,
        "assessmentName": assignment.template.name if assignment.template else assignment.blueprint.name,
        "status": assignment_status(assignment),
        "assignedAt": assignment.assigned_at.isoformat(),
        "scheduledStart": assignment.scheduled_start.isoformat(),
        "durationMinutes": assignment.duration_minutes,
        "reportAvailable": report_available,
    }


def build_candidate_report_payload(assignment):
    test = assignment.test
    attempt = test.attempt_set.select_related("user").first()
    answers = Answer.objects.filter(attempt=attempt).select_related("question", "section", "coding_evaluation") if attempt else Answer.objects.none()
    total_questions = TestQuestion.objects.filter(test=test).count()
    correct_answers = answers.filter(is_correct=True).count()
    attempted_questions = answers.count()
    wrong_answers = max(attempted_questions - correct_answers, 0)
    unattempted_questions = max(total_questions - attempted_questions, 0)
    accuracy = round((correct_answers / total_questions) * 100, 2) if total_questions else 0
    result = getattr(attempt, "result", None) if attempt else None

    section_rows = []
    for section in test.sections.order_by("order", "id"):
        section_total = TestQuestion.objects.filter(test=test, section=section).count()
        section_attempted = answers.filter(section=section).count()
        section_correct = answers.filter(section=section, is_correct=True).count()
        percentage = round((section_correct / section_total) * 100, 2) if section_total else 0
        section_rows.append(
            {
                "title": section.title,
                "sectionType": section.section_type,
                "percentage": percentage,
                "attemptedQuestions": section_attempted,
                "correctAnswers": section_correct,
                "totalQuestions": section_total,
            }
        )

    coding_rows = []
    for answer in answers.filter(question__question_type="coding"):
        evaluation = getattr(answer, "coding_evaluation", None)
        coding_rows.append(
            {
                "questionId": answer.question_id,
                "question": answer.question.question_text,
                "codeSubmitted": answer.code_answer or "",
                "output": evaluation.output if evaluation else "",
                "expectedOutput": evaluation.expected_output if evaluation else "",
                "testCasesPassed": evaluation.passed_test_cases if evaluation else 0,
                "totalTestCases": evaluation.total_test_cases if evaluation else 0,
                "score": answer.score,
            }
        )

    violation_summary = list(
        CandidateActivity.objects.filter(attempt=attempt)
        .values("activity_type")
        .annotate(count=Count("id"))
        .order_by("-count", "activity_type")
    ) if attempt else []

    webcam_images = [
        {
            "url": capture.image.url,
            "timestamp": capture.timestamp.isoformat(),
        }
        for capture in WebcamCapture.objects.filter(attempt=attempt).order_by("-timestamp")
    ] if attempt else []

    auto_submitted_due_to_violations = any(
        item["activity_type"] == "AUTO_SUBMIT_VIOLATIONS" for item in violation_summary
    )

    return {
        "assignmentId": assignment.id,
        "candidate": {
            "name": assignment.candidate.get_full_name() or assignment.candidate.username,
            "email": assignment.candidate.email or "",
        },
        "test": {
            "name": assignment.template.name if assignment.template else assignment.blueprint.name,
            "examDateTime": assignment.scheduled_start.isoformat(),
            "durationMinutes": assignment.duration_minutes,
        },
        "performance": {
            "totalScore": result.score if result else 0,
            "accuracy": result.accuracy if result else accuracy,
            "attemptedQuestions": attempted_questions,
            "correctAnswers": correct_answers,
            "wrongAnswers": wrong_answers,
            "unattemptedQuestions": unattempted_questions,
        },
        "codingPerformance": coding_rows,
        "sectionPerformance": section_rows,
        "proctoring": {
            "totalViolations": sum(item["count"] for item in violation_summary),
            "autoSubmittedDueToViolations": auto_submitted_due_to_violations,
            "violationTypes": violation_summary,
            "webcamEvidence": webcam_images,
        },
    }


def update_coding_evaluation(answer, *, output, expected_output, passed_test_cases, total_test_cases):
    CodingEvaluation.objects.update_or_create(
        answer=answer,
        defaults={
            "output": output,
            "expected_output": expected_output,
            "passed_test_cases": passed_test_cases,
            "total_test_cases": total_test_cases,
        },
    )
