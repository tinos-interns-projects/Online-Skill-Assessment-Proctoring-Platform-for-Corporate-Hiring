from django.db import models
from django.contrib.auth.models import User


SECTION_TYPE_CHOICES = [
    ("verbal", "Verbal"),
    ("numerical", "Numerical"),
    ("logical", "Logical"),
    ("coding", "Coding"),
    ("frontend", "Frontend"),
    ("backend", "Backend"),
    ("aptitude", "Aptitude"),
]


# --------------------
# CORE TAXONOMY
# --------------------

class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Topic(models.Model):
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.skill.name} - {self.name}"


# --------------------
# BLUEPRINT MODELS
# --------------------

class TestBlueprint(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    primary_skill = models.CharField(max_length=100, blank=True)
    duration_minutes = models.PositiveIntegerField(default=45)
    difficulty = models.CharField(max_length=20, default="Medium", blank=True)
    question_count = models.PositiveIntegerField(default=0)


    def __str__(self):
        return self.name


class BlueprintSection(models.Model):
    blueprint = models.ForeignKey(
        TestBlueprint,
        on_delete=models.CASCADE,
        related_name="sections"
    )
    section_type = models.CharField(max_length=20, choices=SECTION_TYPE_CHOICES)
    title = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=1)
    time_limit_minutes = models.PositiveIntegerField(default=15)

    class Meta:
        ordering = ["order", "id"]
        unique_together = ("blueprint", "section_type", "order")

    def __str__(self):
        return f"{self.blueprint.name} - {self.title}"


class EmployerAssessmentTemplate(models.Model):
    employer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="assessment_templates"
    )
    blueprint = models.ForeignKey(
        TestBlueprint,
        on_delete=models.CASCADE,
        related_name="employer_templates"
    )
    name = models.CharField(max_length=200)
    difficulty = models.CharField(max_length=20, default="Medium", blank=True)
    total_duration_minutes = models.PositiveIntegerField(default=45)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return f"{self.name} ({self.employer.username})"


class EmployerAssessmentTemplateSection(models.Model):
    template = models.ForeignKey(
        EmployerAssessmentTemplate,
        on_delete=models.CASCADE,
        related_name="sections"
    )
    blueprint_section = models.ForeignKey(
        BlueprintSection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="template_sections"
    )
    title = models.CharField(max_length=100)
    section_type = models.CharField(max_length=20, choices=SECTION_TYPE_CHOICES)
    order = models.PositiveIntegerField(default=1)
    question_count = models.PositiveIntegerField(default=0)
    time_limit_minutes = models.PositiveIntegerField(default=15)

    class Meta:
        ordering = ["order", "id"]
        unique_together = ("template", "order")

    def __str__(self):
        return f"{self.template.name} - {self.title}"


class BlueprintRule(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    blueprint = models.ForeignKey(
        TestBlueprint,
        on_delete=models.CASCADE,
        related_name='rules'
    )

    section = models.ForeignKey(
        BlueprintSection,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        blank=True,
        null=True
    )
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES
    )
    number_of_questions = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.blueprint.name} - {self.skill.name} ({self.difficulty})"


# --------------------
# QUESTION BANK
# --------------------

class Question(models.Model):
    blueprint = models.ForeignKey(
        TestBlueprint,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="questions"
    )

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    QUESTION_TYPE_CHOICES = [
        ('mcq', 'MCQ'),
        ('msq', 'Multiple Select'),
        ('coding', 'Coding'),
        ('scenario', 'Scenario'),
    ]

    skill = models.ForeignKey(
        Skill,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questions"
    )

    topic = models.ForeignKey(
        Topic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        null=True,
        blank=True
    )

    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPE_CHOICES,
        default='mcq'
    )

    section_type = models.CharField(
        max_length=20,
        choices=SECTION_TYPE_CHOICES,
        blank=True,
        default=""
    )

    question_text = models.TextField()

    # ✅ Coding Solution (reference)
    code_solution = models.TextField(blank=True, null=True)

    # ✅ NEW: Sample Input/Output (for UI display)
    sample_input = models.TextField(blank=True, null=True)
    sample_output = models.TextField(blank=True, null=True)



    # MCQ fields
    option_a = models.CharField(max_length=200, blank=True, null=True)
    option_b = models.CharField(max_length=200, blank=True, null=True)
    option_c = models.CharField(max_length=200, blank=True, null=True)
    option_d = models.CharField(max_length=200, blank=True, null=True)

    correct_option = models.CharField(max_length=5, blank=True, null=True)

    explanation = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.question_text[:60]
    
# -------------------
# TEST CASE
# -------------------

class TestCase(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="test_cases"
    )
    input_data = models.TextField()
    expected_output = models.TextField()

    def __str__(self):
        return f"TestCase for Question {self.question.id}"
    

# --------------------
# TEST INSTANCE
# --------------------

class Test(models.Model):

    blueprint = models.ForeignKey(TestBlueprint, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    is_completed = models.BooleanField(default=False)
    is_generated = models.BooleanField(default=False)

    # NEW FIELDS
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)

    duration_minutes = models.IntegerField(default=60)

    def __str__(self):
        return f"{self.blueprint}"
    

class TestInvitation(models.Model):

    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name="invitations")
    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name="test_invitations")

    token = models.CharField(max_length=100, unique=True)

    invited_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.candidate.username} invitation for Test {self.test.id}"


class TestAssignment(models.Model):
    employer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_test_assignments"
    )
    candidate = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_test_assignments"
    )
    blueprint = models.ForeignKey(
        TestBlueprint,
        on_delete=models.CASCADE,
        related_name="test_assignments"
    )
    template = models.ForeignKey(
        EmployerAssessmentTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_assignments"
    )
    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name="assignments"
    )

    assigned_at = models.DateTimeField(auto_now_add=True)
    scheduled_start = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=45)

    class Meta:
        ordering = ["-assigned_at", "-id"]

    def __str__(self):
        return f"{self.candidate.username} - {self.blueprint.name}"


class Section(models.Model):
    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name="sections"
    )
    blueprint_section = models.ForeignKey(
        BlueprintSection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_sections"
    )
    section_type = models.CharField(max_length=20, choices=SECTION_TYPE_CHOICES)
    title = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=1)
    time_limit_minutes = models.PositiveIntegerField(default=15)
    questions = models.ManyToManyField(
        Question,
        through="TestQuestion",
        related_name="test_sections",
        blank=True
    )

    class Meta:
        ordering = ["order", "id"]
        unique_together = ("test", "order")

    def __str__(self):
        return f"{self.test.id} - {self.title}"


# --------------------
# TEST QUESTION MAPPING
# --------------------

class TestQuestion(models.Model):
    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_questions"
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE
    )

    def __str__(self):
        return f"{self.test.id} - Q{self.question.id}"


# --------------------
# ATTEMPTS & RESULTS
# --------------------

class Attempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    test = models.ForeignKey(Test, on_delete=models.CASCADE)

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    is_completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - Test {self.test.id}"


class AttemptSection(models.Model):
    attempt = models.ForeignKey(
        Attempt,
        on_delete=models.CASCADE,
        related_name="section_attempts"
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="attempts"
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    auto_submitted = models.BooleanField(default=False)

    class Meta:
        ordering = ["section__order", "id"]
        unique_together = ("attempt", "section")

    def __str__(self):
        return f"{self.attempt} - {self.section.title}"


class Answer(models.Model):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="answers"
    )

    selected_option = models.CharField(max_length=5, blank=True, null=True)
    code_answer = models.TextField(blank=True, null=True)
    is_correct = models.BooleanField(default=False)

    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    difficulty = models.CharField(max_length=10)

    score = models.FloatField(default=0)

    def __str__(self):
        return f"{self.attempt} - Q{self.question.id}"


class CodingEvaluation(models.Model):
    answer = models.OneToOneField(
        Answer,
        on_delete=models.CASCADE,
        related_name="coding_evaluation"
    )
    output = models.TextField(blank=True)
    expected_output = models.TextField(blank=True)
    passed_test_cases = models.PositiveIntegerField(default=0)
    total_test_cases = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Coding Evaluation for Answer {self.answer_id}"




class Result(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    test = models.ForeignKey(Test, on_delete=models.CASCADE)
    attempt = models.OneToOneField(Attempt, on_delete=models.CASCADE)

    score = models.IntegerField()
    total_questions = models.IntegerField()
    accuracy = models.FloatField(default=0)

    skill_breakdown = models.JSONField(default=dict)
    difficulty_breakdown = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)


from django.contrib.auth.models import User


class UserProfile(models.Model):

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("employer", "Employer"),
        ("candidate", "Candidate"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.user.username} - {self.role}"


class CandidateActivity(models.Model):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.attempt.user} - {self.activity_type}"
    

class WebcamCapture(models.Model):
    attempt = models.ForeignKey(
        Attempt,
        on_delete=models.CASCADE,
        related_name="webcam_captures"
    )

    image = models.ImageField(upload_to="webcam/")

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.attempt.user.username} - Webcam Frame - {self.timestamp}"
    



