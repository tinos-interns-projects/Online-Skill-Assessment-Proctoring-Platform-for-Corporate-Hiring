
from django.db.models import Sum
from rest_framework import serializers

from .models import Question, Result, Test, TestBlueprint


def option_letter_to_index(value):
    if value in (None, ""):
        return None

    normalized = str(value).strip().lower()
    if normalized.isdigit():
        return int(normalized)

    return {"a": 0, "b": 1, "c": 2, "d": 3}.get(normalized)


# =========================
# QUESTION SERIALIZER
# =========================
class QuestionSerializer(serializers.ModelSerializer):
    question = serializers.CharField(source="question_text")
    options = serializers.SerializerMethodField()
    sectionType = serializers.CharField(source="section_type", allow_blank=True)

    class Meta:
        model = Question
        fields = ["id", "question", "options", "difficulty", "sectionType"]

    def get_options(self, obj):
        return [
            option
            for option in [obj.option_a, obj.option_b, obj.option_c, obj.option_d]
            if option
        ]


# =========================
# ASSESSMENT SERIALIZER
# =========================
class AssessmentSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="name")
    skill = serializers.SerializerMethodField()
    durationMinutes = serializers.SerializerMethodField()
    questionCount = serializers.SerializerMethodField()
    difficulty = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()
    sections = serializers.SerializerMethodField()

    class Meta:
        model = TestBlueprint
        fields = [
            "id",
            "title",
            "skill",
            "durationMinutes",
            "questionCount",
            "difficulty",
            "questions",
            "sections",
        ]

    def get_skill(self, obj):
        if obj.primary_skill:
            return obj.primary_skill

        first_rule = obj.rules.select_related("skill").first()
        return first_rule.skill.name if first_rule and first_rule.skill else "General"

    def get_durationMinutes(self, obj):
        return obj.duration_minutes or 45

    def get_questionCount(self, obj):
        if obj.question_count:
            return obj.question_count

        rule_total = obj.rules.aggregate(total=Sum("number_of_questions"))["total"]
        return rule_total or obj.questions.count()

    def get_difficulty(self, obj):
        if obj.difficulty:
            return obj.difficulty

        first_rule = obj.rules.first()
        return (
            first_rule.difficulty.title()
            if first_rule and first_rule.difficulty
            else "Medium"
        )

    def get_questions(self, obj):
        direct_questions = obj.questions.filter(is_active=True)
        if direct_questions.exists():
            return QuestionSerializer(direct_questions, many=True).data

        derived_ids = []
        for rule in obj.rules.select_related("skill", "topic"):
            queryset = Question.objects.filter(is_active=True)

            if rule.skill_id:
                queryset = queryset.filter(skill=rule.skill)

            if rule.topic_id:
                queryset = queryset.filter(topic=rule.topic)

            if rule.difficulty:
                queryset = queryset.filter(difficulty=rule.difficulty)

            derived_ids.extend(
                list(queryset.values_list("id", flat=True)[: rule.number_of_questions])
            )

        if not derived_ids:
            return []

        derived_questions = Question.objects.filter(id__in=derived_ids)
        return QuestionSerializer(derived_questions, many=True).data

    def get_sections(self, obj):
        blueprint_sections = obj.sections.order_by("order", "id")

        if blueprint_sections.exists():
            return [
                {
                    "id": section.id,
                    "title": section.title,
                    "sectionType": section.section_type,
                    "order": section.order,
                    "timeLimitMinutes": section.time_limit_minutes,
                }
                for section in blueprint_sections
            ]

        default_titles = [
            ("verbal", "Verbal"),
            ("numerical", "Numerical"),
            ("logical", "Logical"),
            ("coding", "Coding"),
        ]

        total_minutes = obj.duration_minutes or 60
        default_minutes = max(10, min(20, round(total_minutes / len(default_titles))))

        return [
            {
                "id": index + 1,
                "title": title,
                "sectionType": key,
                "order": index + 1,
                "timeLimitMinutes": default_minutes,
            }
            for index, (key, title) in enumerate(default_titles)
        ]


# =========================
# CANDIDATE SERIALIZER
# =========================
class CandidateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.CharField(allow_blank=True)
    stage = serializers.CharField()
    role = serializers.CharField()
    company = serializers.CharField(allow_blank=True)
    status = serializers.CharField()


# =========================
# RESULT SERIALIZER
# =========================
class ResultSerializer(serializers.ModelSerializer):
    candidate = serializers.CharField(source="user.username")
    test = serializers.CharField(source="test.blueprint.name")
    title = serializers.CharField(source="test.blueprint.name")
    totalQuestions = serializers.IntegerField(source="total_questions")

    attempted = serializers.SerializerMethodField()
    correct = serializers.SerializerMethodField()
    wrong = serializers.SerializerMethodField()
    unattempted = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Result
        fields = [
            "id",
            "candidate",
            "test",
            "title",
            "score",
            "accuracy",
            "totalQuestions",
            "attempted",
            "correct",
            "wrong",
            "unattempted",
            "status",
        ]

    def get_correct(self, obj):
        return (
            round((obj.accuracy / 100) * obj.total_questions)
            if obj.total_questions
            else obj.score
        )

    def get_wrong(self, obj):
        if not obj.attempt:
            return 0

        attempted = obj.attempt.answer_set.count()
        correct = self.get_correct(obj)
        return max(attempted - correct, 0)

    def get_attempted(self, obj):
        return self.get_correct(obj) + self.get_wrong(obj)

    def get_unattempted(self, obj):
        return max(obj.total_questions - self.get_attempted(obj), 0)

    def get_status(self, obj):
        return "Passed" if obj.accuracy >= 70 else "Review"


# =========================
# TEST SERIALIZER
# =========================
class TestSerializer(serializers.ModelSerializer):
    blueprint = serializers.CharField(source="blueprint.name")
    name = serializers.CharField(source="blueprint.name")
    candidates = serializers.IntegerField(default=1)
    start = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = ["id", "name", "blueprint", "candidates", "start", "status"]

    def get_start(self, obj):
        return (
            obj.scheduled_start.strftime("%Y-%m-%d %H:%M")
            if obj.scheduled_start
            else ""
        )

    def get_status(self, obj):
        if obj.is_completed:
            return "Completed"
        return "Live" if obj.is_generated else "Scheduled"

