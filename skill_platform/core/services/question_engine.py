from core.models import BlueprintRule, Question
from core.services.blueprint_validator import BlueprintValidationError, validate_blueprint
from core.services.section_engine import SECTION_SPECS, infer_question_section_type


class QuestionGenerationError(Exception):
    """Raised when the engine cannot build a valid question set for a blueprint."""


def _fallback_section_specs(blueprint):
    blueprint_sections = list(blueprint.sections.order_by("order", "id"))
    if blueprint_sections:
        return [
            {
                "section": section,
                "section_type": section.section_type,
                "title": section.title,
                "order": section.order,
                "time_limit_minutes": section.time_limit_minutes,
            }
            for section in blueprint_sections
        ]

    total_duration = getattr(blueprint, "duration_minutes", 0) or 60
    default_minutes = max(10, min(20, round(total_duration / max(len(SECTION_SPECS), 1))))

    return [
        {
            "section": None,
            "section_type": item["key"],
            "title": item["title"],
            "order": index + 1,
            "time_limit_minutes": default_minutes,
        }
        for index, item in enumerate(SECTION_SPECS)
    ]


def _question_queryset_for_rule(rule, used_question_ids):
    queryset = Question.objects.filter(
        is_active=True,
        skill=rule.skill,
        difficulty=rule.difficulty,
        section_type=rule.section.section_type,
    ).exclude(id__in=used_question_ids)

    if rule.topic_id:
        queryset = queryset.filter(topic=rule.topic)

    return queryset


def generate_sectioned_questions_for_blueprint(blueprint):
    """
    Generate blueprint questions section by section.

    Returns a list of section payloads shaped like:
    {
        "section": BlueprintSection | None,
        "section_type": "logical",
        "title": "Logical",
        "order": 3,
        "time_limit_minutes": 15,
        "questions": [Question, ...],
    }
    """

    direct_questions = list(
        blueprint.questions.filter(is_active=True).select_related("skill", "topic").order_by("?")
    )
    if direct_questions:
        section_specs = _fallback_section_specs(blueprint)
        questions_by_section = {item["section_type"]: [] for item in section_specs}
        for question in direct_questions:
            questions_by_section.setdefault(infer_question_section_type(question), []).append(question)

        section_payloads = []
        for item in section_specs:
            section_payloads.append({**item, "questions": questions_by_section.get(item["section_type"], [])})

        leftover_questions = [
            question
            for question in direct_questions
            if infer_question_section_type(question) not in questions_by_section
        ]
        if leftover_questions and section_payloads:
            section_payloads[0]["questions"].extend(leftover_questions)

        return [item for item in section_payloads if item["questions"]]

    try:
        validate_blueprint(blueprint)
    except BlueprintValidationError as error:
        raise QuestionGenerationError(str(error)) from error

    section_payloads = []
    used_question_ids = set()
    blueprint_sections = list(blueprint.sections.order_by("order", "id"))

    if blueprint_sections:
        for section in blueprint_sections:
            rules = list(
                BlueprintRule.objects.filter(
                    blueprint=blueprint,
                    section=section,
                ).select_related("skill", "topic", "section")
            )
            if not rules:
                continue

            section_questions = []
            for rule in rules:
                total_needed = rule.number_of_questions or 0
                if total_needed <= 0:
                    continue

                questions = list(
                    _question_queryset_for_rule(rule, used_question_ids).order_by("?")[:total_needed]
                )

                if len(questions) < total_needed:
                    topic_name = f" / {rule.topic.name}" if rule.topic_id else ""
                    raise QuestionGenerationError(
                        f"No questions available for rule: {rule.skill.name}{topic_name} "
                        f"({rule.difficulty}) in {section.title}"
                    )

                used_question_ids.update(question.id for question in questions)
                section_questions.extend(questions)

            if section_questions:
                section_payloads.append(
                    {
                        "section": section,
                        "section_type": section.section_type,
                        "title": section.title,
                        "order": section.order,
                        "time_limit_minutes": section.time_limit_minutes,
                        "questions": section_questions,
                    }
                )
    else:
        # Backward-compatible fallback for older blueprints that may still rely on rules
        # without explicit runtime sections.
        logical_fallback = {
            "section": None,
            "section_type": "logical",
            "title": "Logical",
            "order": 1,
            "time_limit_minutes": max(10, min(20, getattr(blueprint, "duration_minutes", 15) or 15)),
            "questions": [],
        }
        for rule in blueprint.rules.select_related("skill", "topic").all():
            total_needed = rule.number_of_questions or 0
            if total_needed <= 0:
                continue

            queryset = Question.objects.filter(
                is_active=True,
                skill=rule.skill,
                difficulty=rule.difficulty,
            ).exclude(id__in=used_question_ids)
            if rule.topic_id:
                queryset = queryset.filter(topic=rule.topic)

            questions = list(queryset.order_by("?")[:total_needed])
            if len(questions) < total_needed:
                topic_name = f" / {rule.topic.name}" if rule.topic_id else ""
                raise QuestionGenerationError(
                    f"No questions available for rule: {rule.skill.name}{topic_name} ({rule.difficulty})"
                )

            used_question_ids.update(question.id for question in questions)
            logical_fallback["questions"].extend(questions)

        if logical_fallback["questions"]:
            section_payloads.append(logical_fallback)

    if not section_payloads:
        raise QuestionGenerationError("No questions generated from blueprint.")

    return section_payloads


def generate_questions_for_blueprint(blueprint):
    """
    Backward-compatible flat question list used by legacy callers.
    """

    selected_questions = []
    for section_payload in generate_sectioned_questions_for_blueprint(blueprint):
        selected_questions.extend(section_payload["questions"])

    return selected_questions
