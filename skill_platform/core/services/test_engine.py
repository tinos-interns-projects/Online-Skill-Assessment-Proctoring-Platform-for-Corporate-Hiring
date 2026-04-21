from django.db import transaction
from django.utils import timezone

from core.models import Answer, Attempt, Result, TestQuestion
from core.services.blueprint_validator import BlueprintValidationError
from core.services.section_engine import ensure_test_sections, map_questions_to_sections
from core.services.question_engine import (
    QuestionGenerationError,
    generate_sectioned_questions_for_blueprint,
)


class TestEngineError(Exception):
    pass


def generate_test_questions(test):
    """
    Generate test questions from either explicit blueprint questions or blueprint rules.

    The method is backward compatible with the existing flow and now also assigns
    every generated question to a runtime section.
    """

    if getattr(test, "is_generated", False):
        return

    existing_questions = list(
        TestQuestion.objects.filter(test=test).select_related("question", "section")
    )
    if existing_questions:
        ensure_test_sections(test, [item.question for item in existing_questions])
        test.is_generated = True
        test.save(update_fields=["is_generated"])
        return

    blueprint = test.blueprint

    with transaction.atomic():
        try:
            section_payloads = generate_sectioned_questions_for_blueprint(blueprint)
        except (QuestionGenerationError, BlueprintValidationError) as error:
            raise TestEngineError(str(error))

        selected_questions = [
            question
            for section_payload in section_payloads
            for question in section_payload["questions"]
        ]
        if not selected_questions:
            raise TestEngineError("No questions generated from blueprint.")

        sections = ensure_test_sections(test, selected_questions)
        section_by_blueprint_id = {
            section.blueprint_section_id: section
            for section in sections
            if section.blueprint_section_id
        }
        section_by_type = {section.section_type: section for section in sections}
        question_sections = map_questions_to_sections(selected_questions, sections)

        for section_payload in section_payloads:
            runtime_section = None
            blueprint_section = section_payload.get("section")
            if blueprint_section:
                runtime_section = section_by_blueprint_id.get(blueprint_section.id)
            if runtime_section is None:
                runtime_section = section_by_type.get(section_payload["section_type"])

            for question in section_payload["questions"]:
                TestQuestion.objects.create(
                    test=test,
                    question=question,
                    section=runtime_section or question_sections.get(question.id),
                )

        test.is_generated = True
        test.save(update_fields=["is_generated"])


def submit_answer(user, test, question, selected_option):
    if test.user != user:
        raise TestEngineError("Unauthorized access.")

    if not test.is_generated:
        raise TestEngineError("Test is not ready.")

    if test.is_completed:
        raise TestEngineError("Test already completed.")

    attempt = Attempt.objects.filter(
        user=user,
        test=test,
        is_completed=False,
    ).first()

    if not attempt:
        raise TestEngineError("No active test session found.")

    if Answer.objects.filter(attempt=attempt, question=question).exists():
        raise TestEngineError("Question already answered.")

    test_question = TestQuestion.objects.filter(test=test, question=question).select_related("section").first()
    section = test_question.section if test_question else None

    if question.question_type == "mcq":
        is_correct = bool(
            selected_option and question.correct_option and selected_option.lower() == question.correct_option.lower()
        )
        answer = Answer.objects.create(
            attempt=attempt,
            question=question,
            section=section,
            selected_option=selected_option,
            is_correct=is_correct,
            skill=question.skill,
            difficulty=question.difficulty,
        )
    elif question.question_type == "coding":
        answer = Answer.objects.create(
            attempt=attempt,
            question=question,
            section=section,
            selected_option="",
            code_answer=selected_option,
            is_correct=False,
            skill=question.skill,
            difficulty=question.difficulty,
        )
    else:
        raise TestEngineError("Unknown question type.")

    return answer


def finalize_test(attempt):
    if attempt.is_completed:
        raise TestEngineError("Test already finalized.")

    answers = Answer.objects.filter(attempt=attempt)
    if not answers.exists():
        raise TestEngineError("No answers submitted.")

    total_questions = answers.count()
    correct_answers = answers.filter(question__question_type="mcq", is_correct=True).count()
    accuracy = round((correct_answers / total_questions) * 100, 2)

    skill_data = {}
    difficulty_data = {}

    for answer in answers:
        skill_name = answer.skill.name if answer.skill else "Unknown"
        skill_entry = skill_data.setdefault(skill_name, {"correct": 0, "total": 0})
        skill_entry["total"] += 1
        if answer.is_correct:
            skill_entry["correct"] += 1

        difficulty_name = answer.difficulty
        difficulty_entry = difficulty_data.setdefault(difficulty_name, {"correct": 0, "total": 0})
        difficulty_entry["total"] += 1
        if answer.is_correct:
            difficulty_entry["correct"] += 1

    result = Result.objects.create(
        user=attempt.user,
        test=attempt.test,
        attempt=attempt,
        score=correct_answers,
        total_questions=total_questions,
        accuracy=accuracy,
        skill_breakdown=skill_data,
        difficulty_breakdown=difficulty_data,
    )

    attempt.is_completed = True
    attempt.completed_at = timezone.now()
    attempt.save(update_fields=["is_completed", "completed_at"])

    attempt.test.is_completed = True
    attempt.test.completed_at = timezone.now()
    attempt.test.save(update_fields=["is_completed", "completed_at"])

    return result
