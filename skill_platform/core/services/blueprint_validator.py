from django.db.models import Count
from core.models import Question


class BlueprintValidationError(Exception):
    """Raised when blueprint configuration is invalid"""
    pass


def validate_blueprint(blueprint):
    """
    Strict validation:
    - Ensures enough active questions exist for each rule
    """

    errors = []

    for rule in blueprint.rules.all():
        available_queryset = Question.objects.filter(
            skill=rule.skill,
            difficulty=rule.difficulty,
            is_active=True,
        )
        if getattr(rule, "section_id", None):
            available_queryset = available_queryset.filter(section_type=rule.section.section_type)
        if getattr(rule, "topic_id", None):
            available_queryset = available_queryset.filter(topic=rule.topic)

        available = available_queryset.count()

        if available < rule.number_of_questions:
            section_label = f" / {rule.section.title}" if getattr(rule, "section_id", None) else ""
            topic_label = f" / {rule.topic.name}" if getattr(rule, "topic_id", None) else ""
            errors.append(
                f"{rule.skill.name}{topic_label}{section_label} ({rule.difficulty.capitalize()}): "
                f"Required {rule.number_of_questions}, available {available}"
            )

    if errors:
        raise BlueprintValidationError(" | ".join(errors))
