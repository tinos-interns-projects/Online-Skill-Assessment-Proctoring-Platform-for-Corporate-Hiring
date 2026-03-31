from django.contrib import admin, messages
from core.services.blueprint_validator import validate_blueprint, BlueprintValidationError
from core.services.test_engine import generate_test_questions, TestEngineError


# Admin panel branding
admin.site.site_header = "Online Skill Assessment Platform"
admin.site.site_title = "Assessment Admin Portal"
admin.site.index_title = "Admin Dashboard"

from .models import (
    Skill,
    Topic,
    Question,
    TestCase,
    TestBlueprint,
    BlueprintSection,
    BlueprintRule,
    Test,
    Section,
    TestQuestion,
    Attempt,
    AttemptSection,
    Answer,
    Result,
    WebcamCapture,
)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'skill')
    list_filter = ('skill',)


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'question_type' , 'skill', 'topic', 'difficulty')
    list_filter = ('question_type' , 'skill', 'difficulty')
    search_fields = ('question_text',)

@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ("question", "input_data", "expected_output")

@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'test',              # ADD
        'score',
        'total_questions',
        'created_at'
    )
    list_filter = (
        'user',              # FILTER BY CANDIDATE
        'test',              # FILTER BY TEST
        'created_at'
    )
    search_fields = (
        'user__username',
        'user__email',
    )

# Inline section editor for adding multiple blueprint sections on the same page.
class BlueprintSectionInline(admin.TabularInline):
    model = BlueprintSection
    extra = 3
    fields = ("title", "section_type", "order", "time_limit_minutes")
    ordering = ("order", "id")


@admin.register(TestBlueprint)
class TestBlueprintAdmin(admin.ModelAdmin):
    list_display = ("id","name",)
    # Extend the existing admin without changing its current save behavior.
    inlines = [BlueprintSectionInline]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        try:
            validate_blueprint(obj)
            messages.success(
                request,
                "✅ Blueprint is valid. Enough questions available."
            )
        except BlueprintValidationError as e:
            messages.warning(
                request,
                f"⚠️ Blueprint issue: {str(e)}"
            )


@admin.register(BlueprintRule)
class BlueprintRuleAdmin(admin.ModelAdmin):
    list_display = ('blueprint', 'skill', 'difficulty', 'number_of_questions')
    list_filter = ('skill', 'difficulty')


@admin.register(BlueprintSection)
class BlueprintSectionAdmin(admin.ModelAdmin):
    list_display = ("blueprint", "title", "section_type", "order", "time_limit_minutes")
    list_filter = ("section_type",)


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'test',
        'started_at',
        'completed_at',
        'is_completed',
    )
    list_filter = (
        'user',
        'test',
        'is_completed',
    )
    search_fields = (
        'user__username',
    )


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'attempt',
        'section',
        'question',
        'selected_option',
        'is_correct',
        'skill',
        'difficulty',
    )
    list_filter = (
        'skill',
        'difficulty',
        'is_correct',
    )
    search_fields = (
        'question__question_text',
        'attempt__user__username',
    )

@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'blueprint',
        'is_generated',      # show generation status
        'is_completed',
        'completed_at'
    )

    list_filter = (
        'user',
        'blueprint',
        'is_completed'
    )

    search_fields = (
        'user__username',
        'user__email',
    )

    # 🔒 System-controlled fields
    readonly_fields = (
        'is_generated',
        'is_completed',
        'completed_at',
        'started_at'
    )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        # Auto-generate questions only when creating new Test
        if not change:
            try:
                generate_test_questions(obj)
            except TestEngineError as e:
                self.message_user(request, str(e), level=messages.ERROR)


@admin.register(TestQuestion)
class TestQuestionAdmin(admin.ModelAdmin):
    list_display = ('test', 'section', 'question')
    list_filter = ('test',)


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("test", "title", "section_type", "order", "time_limit_minutes")
    list_filter = ("section_type",)


@admin.register(AttemptSection)
class AttemptSectionAdmin(admin.ModelAdmin):
    list_display = ("attempt", "section", "started_at", "completed_at", "auto_submitted")
    list_filter = ("auto_submitted", "section__section_type")


from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role")


from .models import TestInvitation


@admin.register(TestInvitation)
class TestInvitationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "candidate",
        "test",
        "token",
        "invited_at",
        "is_used",
    )
    list_filter = ("is_used", "invited_at")
    search_fields = ("candidate__username", "token")


@admin.register(WebcamCapture)
class WebcamCaptureAdmin(admin.ModelAdmin):
    list_display = ("attempt", "image", "timestamp")
