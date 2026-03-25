from django.utils import timezone
from django.db import transaction

from core.models import Attempt, Result, TestQuestion, Question, Answer
from core.services.blueprint_validator import (
    validate_blueprint,
    BlueprintValidationError
)


class TestEngineError(Exception):
    pass


# =========================================================
# 1️⃣ Automatic Question Generation (BlueprintRule Based)
# =========================================================

def generate_test_questions(test):
    """
    Generate questions based on BlueprintRule

    ✔ Prevent duplicate generation
    ✔ Validate blueprint
    ✔ Use skill + difficulty + count from BlueprintRule
    ✔ Ensure at least 1 coding question per rule (if available)
    ✔ Avoid duplicate questions
    """

    # Prevent duplicate generation
    if getattr(test, "is_generated", False):
        return

    if TestQuestion.objects.filter(test=test).exists():
        test.is_generated = True
        test.save(update_fields=["is_generated"])
        return

    blueprint = test.blueprint

    try:
        validate_blueprint(blueprint)
    except BlueprintValidationError as e:
        raise TestEngineError(str(e))

    with transaction.atomic():

        selected_questions = []
        used_question_ids = set()

        for rule in blueprint.rules.all():

            # 🔹 Get questions for skill + difficulty
            base_qs = Question.objects.filter(
                skill=rule.skill,
                difficulty=rule.difficulty
            ).exclude(id__in=used_question_ids)

            # 🔹 Split MCQ and Coding
            mcq_qs = base_qs.filter(question_type='mcq')
            coding_qs = base_qs.filter(question_type='coding')

            total_needed = rule.number_of_questions

            if total_needed <= 0:
                continue

            selected = []

            # 🔥 Ensure at least 1 coding question (if available)
            coding_count = 1 if coding_qs.exists() else 0
            mcq_count = total_needed - coding_count

            # Select MCQ
            if mcq_count > 0:
                mcqs = list(mcq_qs.order_by("?")[:mcq_count])
                selected.extend(mcqs)

            # Select Coding
            if coding_count > 0:
                codings = list(coding_qs.order_by("?")[:coding_count])
                selected.extend(codings)

            # Track used questions
            for q in selected:
                used_question_ids.add(q.id)

            selected_questions.extend(selected)

        if not selected_questions:
            raise TestEngineError("No questions generated from blueprint.")

        # 🔹 Save questions
        for question in selected_questions:
            TestQuestion.objects.create(
                test=test,
                question=question
            )

        test.is_generated = True
        test.save(update_fields=["is_generated"])


# =========================================================
# 2️⃣ Submit Answer (MCQ + Coding)
# =========================================================

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
        is_completed=False
    ).first()

    if not attempt:
        raise TestEngineError("No active test session found.")

    # Prevent duplicate answers
    if Answer.objects.filter(attempt=attempt, question=question).exists():
        raise TestEngineError("Question already answered.")

    # =========================
    # MCQ
    # =========================
    if question.question_type == "mcq":

        is_correct = (
            selected_option and
            selected_option.lower() == question.correct_option.lower()
        )

        answer = Answer.objects.create(
            attempt=attempt,
            question=question,
            selected_option=selected_option,
            is_correct=is_correct,
            skill=question.skill,
            difficulty=question.difficulty,
        )

    # =========================
    # CODING
    # =========================
    elif question.question_type == "coding":

        answer = Answer.objects.create(
            attempt=attempt,
            question=question,
            code_answer=selected_option,
            is_correct=False,
            skill=question.skill,
            difficulty=question.difficulty,
        )

    else:
        raise TestEngineError("Unknown question type.")

    return answer


# =========================================================
# 3️⃣ Finalize Test (Result + Analytics)
# =========================================================

def finalize_test(attempt):

    if attempt.is_completed:
        raise TestEngineError("Test already finalized.")

    answers = Answer.objects.filter(attempt=attempt)

    if not answers.exists():
        raise TestEngineError("No answers submitted.")

    total_questions = answers.count()

    # ✔ Only MCQ contributes to score
    correct_answers = answers.filter(
        question__question_type='mcq',
        is_correct=True
    ).count()

    accuracy = round((correct_answers / total_questions) * 100, 2)

    # =========================
    # Skill-wise breakdown
    # =========================
    skill_data = {}

    for answer in answers:
        skill_name = answer.skill.name if answer.skill else "Unknown"

        if skill_name not in skill_data:
            skill_data[skill_name] = {"correct": 0, "total": 0}

        skill_data[skill_name]["total"] += 1

        if answer.is_correct:
            skill_data[skill_name]["correct"] += 1

    # =========================
    # Difficulty-wise breakdown
    # =========================
    difficulty_data = {}

    for answer in answers:
        level = answer.difficulty

        if level not in difficulty_data:
            difficulty_data[level] = {"correct": 0, "total": 0}

        difficulty_data[level]["total"] += 1

        if answer.is_correct:
            difficulty_data[level]["correct"] += 1

    result = Result.objects.create(
        user=attempt.user,
        test=attempt.test,
        attempt=attempt,
        score=correct_answers,
        total_questions=total_questions,
        accuracy=accuracy,
        skill_breakdown=skill_data,
        difficulty_breakdown=difficulty_data
    )

    attempt.is_completed = True
    attempt.completed_at = timezone.now()
    attempt.save(update_fields=["is_completed", "completed_at"])

    attempt.test.is_completed = True
    attempt.test.completed_at = timezone.now()
    attempt.test.save(update_fields=["is_completed", "completed_at"])

    return result