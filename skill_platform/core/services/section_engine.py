from django.db import transaction
from django.utils import timezone

from core.models import AttemptSection, BlueprintSection, Section, TestQuestion


SECTION_SPECS = [
    {"key": "verbal", "title": "Verbal"},
    {"key": "numerical", "title": "Numerical"},
    {"key": "logical", "title": "Logical"},
    {"key": "coding", "title": "Coding"},
]

SECTION_KEYWORDS = {
    "verbal": [
        "verbal",
        "english",
        "reading",
        "grammar",
        "vocabulary",
        "comprehension",
        "language",
    ],
    "numerical": [
        "numerical",
        "quantitative",
        "aptitude",
        "math",
        "mathematics",
        "arithmetic",
        "algebra",
        "ratio",
        "percentage",
        "probability",
        "statistics",
        "data interpretation",
    ],
    "logical": [
        "logical",
        "logic",
        "reasoning",
        "puzzle",
        "pattern",
        "sequence",
        "analytical",
        "critical thinking",
    ],
}


def get_default_section_minutes(total_duration, section_count):
    if section_count <= 0:
        return 15

    if total_duration:
        return max(10, min(20, round(total_duration / section_count)))

    return 15


def infer_question_section_type(question):
    section_type = (getattr(question, "section_type", "") or "").strip().lower()
    if section_type:
        return section_type

    question_type = (getattr(question, "question_type", "") or "").strip().lower()
    if question_type == "coding":
        return "coding"

    haystacks = [
        getattr(getattr(question, "skill", None), "name", "") or "",
        getattr(getattr(question, "topic", None), "name", "") or "",
        getattr(question, "question_text", "") or "",
    ]
    normalized = " ".join(item.lower() for item in haystacks)

    for section_key, keywords in SECTION_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return section_key

    return "logical"


def build_section_blueprints(test, questions):
    blueprint_sections = list(
        BlueprintSection.objects.filter(blueprint=test.blueprint).order_by("order", "id")
    )
    if blueprint_sections:
        return [
            {
                "section_type": item.section_type,
                "title": item.title,
                "order": item.order,
                "time_limit_minutes": item.time_limit_minutes,
                "blueprint_section": item,
            }
            for item in blueprint_sections
        ]

    duration_minutes = getattr(test, "duration_minutes", None) or getattr(test.blueprint, "duration_minutes", None) or 60
    default_minutes = get_default_section_minutes(duration_minutes, len(SECTION_SPECS))

    return [
        {
            "section_type": spec["key"],
            "title": spec["title"],
            "order": index + 1,
            "time_limit_minutes": default_minutes,
            "blueprint_section": None,
        }
        for index, spec in enumerate(SECTION_SPECS)
    ]


@transaction.atomic
def ensure_test_sections(test, questions):
    sections = list(test.sections.order_by("order", "id"))
    if sections:
        return sections

    section_blueprints = build_section_blueprints(test, questions)
    created_sections = []
    for item in section_blueprints:
        created_sections.append(
            Section.objects.create(
                test=test,
                blueprint_section=item["blueprint_section"],
                section_type=item["section_type"],
                title=item["title"],
                order=item["order"],
                time_limit_minutes=item["time_limit_minutes"],
            )
        )

    return created_sections


def map_questions_to_sections(questions, sections):
    section_map = {section.section_type: section for section in sections}
    fallback_section = sections[0] if sections else None

    mapping = {}
    for question in questions:
        inferred_type = infer_question_section_type(question)
        mapping[question.id] = section_map.get(inferred_type, fallback_section)

    return mapping


@transaction.atomic
def ensure_attempt_sections(attempt):
    sections = list(attempt.test.sections.order_by("order", "id"))
    existing = {item.section_id: item for item in attempt.section_attempts.select_related("section")}

    for section in sections:
        if section.id not in existing:
            existing[section.id] = AttemptSection.objects.create(
                attempt=attempt,
                section=section,
            )

    return [existing[section.id] for section in sections]


def get_section_remaining_seconds(attempt_section, now=None):
    now = now or timezone.now()

    if not attempt_section.started_at:
        return attempt_section.section.time_limit_minutes * 60

    elapsed = (now - attempt_section.started_at).total_seconds()
    return max(int((attempt_section.section.time_limit_minutes * 60) - elapsed), 0)


@transaction.atomic
def sync_current_section(attempt, now=None):
    now = now or timezone.now()
    section_attempts = ensure_attempt_sections(attempt)

    for section_attempt in section_attempts:
        if section_attempt.completed_at:
            continue

        if not section_attempt.started_at:
            section_attempt.started_at = now
            section_attempt.save(update_fields=["started_at"])

        remaining_seconds = get_section_remaining_seconds(section_attempt, now)
        if remaining_seconds > 0:
            return section_attempt

        section_attempt.completed_at = now
        section_attempt.auto_submitted = True
        section_attempt.save(update_fields=["completed_at", "auto_submitted"])

    return None


def is_section_accessible(target_section_attempt, current_section_attempt):
    if not target_section_attempt:
        return False

    if target_section_attempt.completed_at:
        return True

    if not current_section_attempt:
        return True

    return target_section_attempt.id == current_section_attempt.id
