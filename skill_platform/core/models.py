from django.db import models
from django.contrib.auth.models import User


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
        return f"{self.user.username} - {self.blueprint.name}"
    

class TestInvitation(models.Model):

    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name="invitations")
    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name="test_invitations")

    token = models.CharField(max_length=100, unique=True)

    invited_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.candidate.username} invitation for Test {self.test.id}"

    


# --------------------
# TEST QUESTION MAPPING
# --------------------

class TestQuestion(models.Model):
    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name='questions'
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
    
class Answer(models.Model):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    selected_option = models.CharField(max_length=5)
    code_answer = models.TextField(blank=True, null=True)
    is_correct = models.BooleanField()

    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    difficulty = models.CharField(max_length=10)

    score = models.FloatField(default=0)

    def __str__(self):
        return f"{self.attempt} - Q{self.question.id}"




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
    



