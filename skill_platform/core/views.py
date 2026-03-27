from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

from core.models import Test, TestBlueprint, Result, Attempt
from core.services.question_engine import generate_questions_for_blueprint
from core.services.blueprint_validator import (
    validate_blueprint,
    BlueprintValidationError
)

import json
from collections import defaultdict
import uuid
from django.utils import timezone
from django.db import transaction
from core.models import Test, Attempt, Answer, Result, TestQuestion, WebcamCapture
from django.contrib.auth import authenticate, login
from django.core.mail import send_mail
from django.conf import settings


import subprocess

def run_code(user_code, input_data):
    try:
        process = subprocess.Popen(
            ["python"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        output, error = process.communicate(input=input_data, timeout=5)

        return output.strip(), error.strip()

    except Exception as e:
        return "", str(e)


def evaluate_code(question, user_code):
    test_cases = question.test_cases.all()

    passed = 0
    total = test_cases.count()

    for case in test_cases:
        output, error = run_code(user_code, case.input_data)

        if output.strip() == case.expected_output.strip():
            passed += 1

    score = (passed / total) * 100 if total > 0 else 0



    return score, passed, total



def login_view(request):

    next_url = request.GET.get("next")

    if request.method == "POST":

        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)

            # 🔍 DEBUG (check terminal)
            print("User:", user)
            print("Is staff:", user.is_staff)
            print("Is superuser:", user.is_superuser)
            print("Has profile:", hasattr(user, "userprofile"))

            if hasattr(user, "userprofile"):
                print("Role:", user.userprofile.role)

            # 🔹 Next URL (if redirected)
            if next_url:
                return redirect(next_url)

            # 🔹 Admin
            if user.is_superuser or user.is_staff:
                return redirect("/admin/")

            # 🔹 Role-based redirect
            if hasattr(user, "userprofile"):
                role = user.userprofile.role

                if role == "employer":
                    return redirect("employer_dashboard")

                elif role == "candidate":
                    return redirect("candidate_dashboard")

            # 🔥 Fallback (VERY IMPORTANT)
            return redirect("/login/")

        else:
            return render(request, "login.html", {
                "error": "Invalid username or password"
            })

    return render(request, "login.html")

from django.contrib.auth import logout

def logout_view(request):
    logout(request)
    return redirect("login")



@login_required
def assessment(request):

    # Allow only candidates
    if request.user.userprofile.role != "candidate":
        return redirect("login")

    # Get candidate's active test
    test = Test.objects.filter(
        user=request.user,
        is_completed=False
    ).first()

    if not test:
        return render(request, "assessment.html", {
            "questions": [],
            "error": "No active test assigned to you."
        })

    # -------------------------
    # SCHEDULE LOCK
    # -------------------------
    now = timezone.now()

    if test.scheduled_start and now < test.scheduled_start:
        return render(request, "assessment.html", {
            "questions": [],
            "error": "This test has not started yet."
        })

    if test.scheduled_end and now > test.scheduled_end:
        return render(request, "assessment.html", {
            "questions": [],
            "error": "This test has expired."
        })

    # -------------------------
    # PREVENT REATTEMPT
    # -------------------------
    existing_attempt = Attempt.objects.filter(
        user=request.user,
        test=test,
        is_completed=True
    ).first()

    if existing_attempt:
        return render(request, "assessment.html", {
            "questions": [],
            "error": "You have already attempted this test."
        })

    # Create attempt session if not exists
    attempt, created = Attempt.objects.get_or_create(
        user=request.user,
        test=test,
        defaults={"is_completed": False}
    )

    # -------------------------
    # LOAD TEST QUESTIONS
    # -------------------------
    test_questions = TestQuestion.objects.filter(test=test)
    questions = [tq.question for tq in test_questions]

    # -------------------------
    # SUBMIT TEST
    # -------------------------
    if request.method == "POST":

        with transaction.atomic():

            score = 0
            correct = 0
            wrong = 0
            unattempted = 0

            if attempt.is_completed:
                return redirect("assessment")

            for question in questions:

                selected = request.POST.get(f"q{question.id}")

                # Unattempted
                if not selected:
                    unattempted += 1
                    continue

                # =========================
                # MCQ QUESTIONS
                # =========================
                if question.question_type == "mcq":

                    is_correct = (
                        selected.lower() == question.correct_option.lower()
                    )

                    Answer.objects.create(
                        attempt=attempt,
                        question=question,
                        selected_option=selected.lower(),
                        is_correct=is_correct,
                        skill=question.skill,
                        difficulty=question.difficulty,
                    )

                    if is_correct:
                        score += 1
                        correct += 1
                    else:
                        wrong += 1

                # =========================
                # CODING QUESTIONS
                # =========================
                elif question.question_type == "coding":

                    Answer.objects.create(
                        attempt=attempt,
                        question=question,
                        code_answer=selected,
                        skill=question.skill,
                        difficulty=question.difficulty,
                    )

            # -------------------------
            # SAVE RESULT
            # -------------------------
            Result.objects.create(
                user=request.user,
                test=test,
                attempt=attempt,
                score=score,
                total_questions=len(questions),
            )

            # Mark attempt completed
            attempt.is_completed = True
            attempt.completed_at = timezone.now()
            attempt.save()

            # Mark test completed
            test.is_completed = True
            test.completed_at = timezone.now()
            test.save()

            return render(request, "result.html", {
                "score": score,
                "total": len(questions),
                "correct": correct,
                "wrong": wrong,
                "unattempted": unattempted
            })

    return render(request, "assessment.html", {
        "questions": questions,
        "test": test,
        "attempt": attempt
    })



@login_required
def analytics_report(request):
    results = Result.objects.filter(user=request.user)

    context = {
        "attempts": results,
        "total_attempts": results.count(),
        "average_score": (
            sum(r.score for r in results) / results.count()
            if results.exists() else 0
        )
    }

    return render(request, "analytics.html", context)



from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .services.analytics import (
    skill_wise_performance,
    difficulty_wise_performance
)
from .models import Result
from .serializers import AssessmentSerializer, CandidateSerializer, ResultSerializer


@api_view(['GET'])
@permission_classes([AllowAny]) 
def analytics_api(request):
    skill_wise = skill_wise_performance()
    top_results = Result.objects.select_related("user").order_by("-accuracy", "-created_at")[:5]
    recent_results = Result.objects.order_by("created_at")[:7]

    return Response({
        "total_attempts": Result.objects.count(),
        "skill_wise": skill_wise,
        "difficulty_wise": difficulty_wise_performance(),
        "rankings": [
            {"name": result.user.username, "score": round(result.accuracy, 2)}
            for result in top_results
        ],
        "sectionScores": [
            {"section": item["skill"], "avgScore": item["avg_score"]}
            for item in skill_wise
        ],
        "trend": [
            {"week": result.created_at.strftime("%b %d"), "avg": round(result.accuracy, 2)}
            for result in recent_results
        ],
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def employer_stats_api(request):
    from django.contrib.auth.models import User
    from django.db.models import Avg

    assessment_count = TestBlueprint.objects.count()
    candidate_count = User.objects.filter(userprofile__role="candidate").count()
    live_tests = Attempt.objects.filter(is_completed=False).count()
    average_accuracy = Result.objects.aggregate(avg=Avg("accuracy"))["avg"] or 0

    live_monitoring = []
    active_attempts = Attempt.objects.filter(is_completed=False).select_related("test__blueprint", "user")

    for attempt in active_attempts:
        test = attempt.test
        warnings = CandidateActivity.objects.filter(attempt=attempt).count()
        score = Answer.objects.filter(attempt=attempt, is_correct=True).count()

        if test.scheduled_end:
            remaining = (test.scheduled_end - timezone.now()).total_seconds()
            if remaining > 0:
                minutes = int(remaining // 60)
                seconds = int(remaining % 60)
                time_left = f"{minutes}m {seconds:02d}s"
            else:
                time_left = "Expired"
        else:
            time_left = "N/A"

        live_monitoring.append({
            "candidate": attempt.user.get_full_name() or attempt.user.username,
            "test": test.blueprint.name,
            "status": "In Progress",
            "score": score,
            "warnings": warnings,
            "timeLeft": time_left,
        })

    return Response({
        "stats": [
            {"label": "Assessments Created", "value": assessment_count},
            {"label": "Candidates Assigned", "value": candidate_count},
            {"label": "Live Tests", "value": live_tests},
            {"label": "Avg Score", "value": f"{round(average_accuracy)}%"},
        ],
        "liveMonitoring": live_monitoring,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def candidates_api(request):
    from django.contrib.auth.models import User

    users = User.objects.filter(userprofile__role="candidate").order_by("username")
    payload = []

    for user in users:
        latest_result = Result.objects.filter(user=user).order_by("-created_at").first()
        payload.append({
            "id": user.id,
            "name": user.get_full_name() or user.username,
            "email": user.email or "",
            "stage": "Completed" if latest_result else "Assigned",
            "role": "Candidate",
            "company": "",
            "status": "Completed" if latest_result else "Active",
        })

    return Response(CandidateSerializer(payload, many=True).data)



@api_view(["GET"])
@permission_classes([AllowAny])
def employers_api(request):
    from django.contrib.auth.models import User

    users = User.objects.filter(userprofile__role="employer").order_by("username")
    payload = [
        {
            "id": user.id,
            "name": user.get_full_name() or user.username,
            "email": user.email or "",
            "stage": "Hiring",
            "role": "Employer",
            "company": user.get_full_name() or user.username,
            "status": "Active",
        }
        for user in users
    ]

    return Response(CandidateSerializer(payload, many=True).data)
@api_view(["GET"])
@permission_classes([AllowAny])
def results_api(request):
    queryset = Result.objects.select_related("user", "test__blueprint", "attempt").order_by("-created_at")
    return Response(ResultSerializer(queryset, many=True).data)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def assessments_api(request):
    from .models import Skill

    if request.method == "GET":
        queryset = TestBlueprint.objects.prefetch_related("rules__skill", "questions").order_by("name")
        return Response(AssessmentSerializer(queryset, many=True).data)

    payload = request.data
    title = payload.get("title")
    skill_name = str(payload.get("skill") or "").strip()
    difficulty = payload.get("difficulty") or "Medium"
    duration_minutes = int(payload.get("durationMinutes") or 45)
    questions_payload = payload.get("questions") or []

    if not title:
        return Response({"detail": "Assessment title is required."}, status=400)

    blueprint = TestBlueprint.objects.create(
        name=title,
        primary_skill=skill_name,
        duration_minutes=duration_minutes,
        difficulty=difficulty,
        question_count=len(questions_payload),
        description=payload.get("description", ""),
    )

    skill_obj = None
    if skill_name:
        skill_obj, _ = Skill.objects.get_or_create(name=skill_name)

    option_map = ["a", "b", "c", "d"]

    for item in questions_payload:
        options = item.get("options") or []
        correct_index = int(item.get("correctOption", 0))

        Question.objects.create(
            blueprint=blueprint,
            skill=skill_obj,
            difficulty=str(item.get("difficulty") or difficulty).lower(),
            question_text=item.get("question", ""),
            option_a=options[0] if len(options) > 0 else "",
            option_b=options[1] if len(options) > 1 else "",
            option_c=options[2] if len(options) > 2 else "",
            option_d=options[3] if len(options) > 3 else "",
            correct_option=option_map[correct_index] if 0 <= correct_index < len(option_map) else "a",
        )

    return Response(AssessmentSerializer(blueprint).data, status=201)

from django.shortcuts import get_object_or_404
from django.http import JsonResponse

from .models import Test, TestBlueprint, TestQuestion, Attempt, Result
from core.services import submit_answer, finalize_test

from django.utils import timezone


@login_required
def start_test(request, blueprint_id):

    blueprint = get_object_or_404(TestBlueprint, id=blueprint_id)

    tests = Test.objects.filter(
        blueprint=blueprint,
        user=request.user,
        is_completed=False
    ).order_by("-scheduled_start")   # IMPORTANT

    if not tests.exists():
        return JsonResponse({"error": "No active test assigned."}, status=404)

    test = tests.first()

    if not test.is_generated:
        return JsonResponse({"error": "Test not ready"}, status=400)

    now = timezone.now()

    # Use correct schedule fields
    start_time = test.scheduled_start
    end_time = test.scheduled_end

    # Debug (temporary)
    print("NOW:", now)
    print("START:", start_time)
    print("END:", end_time)

    if now < start_time:
        return JsonResponse({"error": "Test has not started yet."}, status=403)

    if now >= end_time:
        return JsonResponse({"error": "Test has expired."}, status=403)

    attempt, created = Attempt.objects.get_or_create(
        user=request.user,
        test=test,
        is_completed=False
    )

    return JsonResponse({
        "message": "Test started",
        "test_id": test.id
    })

@login_required
def get_next_question(request, test_id):

    from django.utils import timezone

    test = get_object_or_404(Test, id=test_id, user=request.user)

    # Check if test expired
    now = timezone.now()

    if test.scheduled_end and now >= test.scheduled_end:
        return redirect(f"/finish-test/{test.id}/")

    attempt = Attempt.objects.filter(
        user=request.user,
        test=test,
        is_completed=False
    ).first()

    if not attempt:
        return JsonResponse({"error": "No active session"}, status=400)

    answered_questions = Answer.objects.filter(
        attempt=attempt
    ).values_list("question_id", flat=True)

    next_tq = TestQuestion.objects.filter(
        test=test
    ).exclude(
        question_id__in=answered_questions
    ).first()

    # No more questions → finish test
    if not next_tq:
        return redirect(f"/finish-test/{test.id}/")

    q = next_tq.question

    return render(request, "question.html", {
        "test": test,
        "question": q,
        "attempt": attempt,
        "duration": test.duration_minutes,
        "start_time": attempt.started_at.timestamp()
    })

from core.services.test_engine import TestEngineError


@login_required
def submit_answer_view(request, test_id, question_id):
    test = get_object_or_404(Test, id=test_id, user=request.user)
    question = get_object_or_404(
        TestQuestion,
        test=test,
        question_id=question_id
    ).question

    selected_option = request.GET.get("option")

    try:
        submit_answer(
            user=request.user,
            test=test,
            question=question,
            selected_option=selected_option
        )
        return redirect(f"/question/{test.id}/")

    except TestEngineError as e:
        return JsonResponse({"error": str(e)}, status=400)




@login_required
def finish_test(request, test_id):

    test = get_object_or_404(Test, id=test_id, user=request.user)

    attempt = Attempt.objects.filter(
        user=request.user,
        test=test,
        is_completed=False
    ).first()

    if not attempt:
        return JsonResponse({"error": "No active session"}, status=400)

    answers = Answer.objects.filter(attempt=attempt)

    total_questions = TestQuestion.objects.filter(test=test).count()

    correct = answers.filter(is_correct=True).count()
    attempted = answers.count()

    wrong = attempted - correct
    unattempted = total_questions - attempted

    accuracy = 0
    if total_questions > 0:
        accuracy = round((correct / total_questions) * 100, 2)

    # Count proctoring violations (limit to 3)
    warning_count = min(
        CandidateActivity.objects.filter(attempt=attempt).count(),
        3
    )

    attempt.is_completed = True
    attempt.completed_at = timezone.now()
    attempt.save()

    test.is_completed = True
    test.completed_at = timezone.now()
    test.save()

    result = {
        "score": correct,
        "total": total_questions,
        "correct": correct,
        "wrong": wrong,
        "unattempted": unattempted,
        "accuracy": accuracy,
        "warnings": warning_count
        
    }

    return render(request, "test_result.html", {
        "result": result
    })


@login_required
def view_result(request, test_id):
    result = get_object_or_404(Result, test_id=test_id, user=request.user)

    return JsonResponse({
        "score": result.score,
        "total_questions": result.total_questions
    })

from django.db.models import Avg
from django.contrib.auth.decorators import user_passes_test
from collections import defaultdict


@user_passes_test(lambda u: u.is_staff)
def admin_dashboard(request):

    total_tests = Test.objects.count()
    total_attempts = Attempt.objects.count()
    completed_tests = Test.objects.filter(is_completed=True).count()

    avg_accuracy = Result.objects.aggregate(
        avg=Avg("accuracy")
    )["avg"] or 0

    completion_rate = 0
    if total_tests > 0:
        completion_rate = round((completed_tests / total_tests) * 100, 2)

    skill_scores = defaultdict(list)

    for result in Result.objects.all():
        for skill, data in result.skill_breakdown.items():
            accuracy = (data["correct"] / data["total"]) * 100 if data["total"] > 0 else 0
            skill_scores[skill].append(accuracy)

    skill_summary = {
        skill: round(sum(scores) / len(scores), 2)
        for skill, scores in skill_scores.items()
    }

    most_tested_skill = None
    weakest_skill = None

    if skill_summary:
        most_tested_skill = max(skill_summary, key=skill_summary.get)
        weakest_skill = min(skill_summary, key=skill_summary.get)

    top_candidates = (
        Result.objects
        .values("user__username")
        .annotate(avg_score=Avg("accuracy"))
        .order_by("-avg_score")[:5]
    )

    context = {
        "total_tests": total_tests,
        "total_attempts": total_attempts,
        "completed_tests": completed_tests,
        "avg_accuracy": round(avg_accuracy, 2),
        "completion_rate": completion_rate,
        "most_tested_skill": most_tested_skill,
        "weakest_skill": weakest_skill,
        "top_candidates": top_candidates,
    }

    return render(request, "admin_dashboard.html", context)




@login_required
def candidate_dashboard(request):

    results = Result.objects.filter(user=request.user)

    total_tests = results.count()

    avg_accuracy = round(
        sum(r.accuracy for r in results) / total_tests, 2
    ) if total_tests > 0 else 0

    best_score = max(
        (r.accuracy for r in results),
        default=0
    )

    recent_score = results.order_by("-id").first().accuracy if results.exists() else 0


    skill_scores = defaultdict(list)
    difficulty_scores = defaultdict(list)


    for result in results:

        for skill, data in result.skill_breakdown.items():

            accuracy = (data["correct"] / data["total"]) * 100 if data["total"] else 0
            skill_scores[skill].append(accuracy)

        for diff, data in result.difficulty_breakdown.items():

            accuracy = (data["correct"] / data["total"]) * 100 if data["total"] else 0
            difficulty_scores[diff].append(accuracy)


    skill_summary = {
        skill: round(sum(scores)/len(scores), 2)
        for skill, scores in skill_scores.items()
    }

    difficulty_summary = {
        diff: round(sum(scores)/len(scores), 2)
        for diff, scores in difficulty_scores.items()
    }


    strongest_skill = max(skill_summary, key=skill_summary.get) if skill_summary else "None"
    weakest_skill = min(skill_summary, key=skill_summary.get) if skill_summary else "None"


    return render(request, "candidate_dashboard.html", {

    "total_tests": total_tests,
    "avg_accuracy": avg_accuracy,
    "best_score": best_score,
    "recent_score": recent_score,

    "skill_summary": skill_summary,
    "strongest_skill": strongest_skill,
    "weakest_skill": weakest_skill,

    "skill_chart_labels": json.dumps(list(skill_summary.keys())),
    "skill_chart_values": json.dumps(list(skill_summary.values())),

    "difficulty_chart_labels": json.dumps(list(difficulty_summary.keys())),
    "difficulty_chart_values": json.dumps(list(difficulty_summary.values()))

})


from django.contrib.auth.models import User

from core.services.test_engine import generate_test_questions

from datetime import timedelta
from django.utils import timezone
from django.utils.dateparse import parse_datetime


from datetime import datetime, timedelta
from django.utils import timezone


from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.conf import settings

import uuid

@login_required
def employer_dashboard(request):

    if not hasattr(request.user, "userprofile"):
        return redirect("login")

    if request.user.userprofile.role != "employer":
        return redirect("candidate_dashboard")

    blueprints = TestBlueprint.objects.all()
    candidates = User.objects.filter(userprofile__role="candidate")
    tests = Test.objects.select_related("user", "blueprint").order_by("-scheduled_start")

    message = None

    if "success_message" in request.session:
        message = request.session.pop("success_message")

    # =================================================
    # HANDLE TEST ASSIGNMENT
    # =================================================
    if request.method == "POST":

        # Clear any old success message
        request.session.pop("success_message", None)

        blueprint_id = request.POST.get("blueprint")
        candidate_id = request.POST.get("candidate")
        start_time = request.POST.get("start_time")
        duration = int(request.POST.get("duration"))

        blueprint = TestBlueprint.objects.get(id=blueprint_id)
        candidate = User.objects.get(id=candidate_id)

        # ------------------------------
        # SECURITY CHECK
        # ------------------------------
        if candidate.userprofile.role != "candidate":
            message = "Invalid user selected. Only candidates can be assigned tests."
            return render(request, "employer_dashboard.html", {
                "blueprints": blueprints,
                "candidates": candidates,
                "tests": tests,
                "monitor_data": [],
                "message": message
            })

        # ------------------------------
        # VALIDATE START TIME
        # ------------------------------
        if not start_time:
            message = "Please select a start time."
            return render(request, "employer_dashboard.html", {
                "blueprints": blueprints,
                "candidates": candidates,
                "tests": tests,
                "monitor_data": [],
                "message": message
            })

        # ✅ FIXED TIMEZONE ISSUE
        scheduled_start = datetime.fromisoformat(start_time)

        if timezone.is_naive(scheduled_start):
            scheduled_start = timezone.make_aware(
                scheduled_start,
                timezone.get_current_timezone()
            )

        print("Selected time:", scheduled_start)
        print("Current time:", timezone.now())

        if scheduled_start < timezone.now():
            message = "Start time cannot be in the past."
            return render(request, "employer_dashboard.html", {
                "blueprints": blueprints,
                "candidates": candidates,
                "tests": tests,
                "monitor_data": [],
                "message": message
            })

        scheduled_end = scheduled_start + timedelta(minutes=duration)

        # ------------------------------
        # CREATE TEST
        # ------------------------------
        test = Test.objects.create(
            blueprint=blueprint,
            user=candidate,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            duration_minutes=duration
        )

        generate_test_questions(test)

        # ------------------------------
        # CREATE INVITATION LINK
        # ------------------------------
        token = uuid.uuid4().hex

        TestInvitation.objects.create(
            test=test,
            candidate=candidate,
            token=token
        )

        invitation_link = request.build_absolute_uri(f"/invite/{token}/")

        # ------------------------------
        # SEND EMAIL
        # ------------------------------
        print("EMAIL FUNCTION CALLED")
        print("Sending email to:", candidate.email)

        send_mail(
            subject="Online Assessment Invitation",
            message=f"""
Hello {candidate.username},

You have been invited to attend an online assessment.

Test: {blueprint.name}

Click the link below to start your test:
{invitation_link}

Best regards,
Assessment Platform
""",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[candidate.email],
            fail_silently=False,
        )

        request.session["success_message"] = "Test assigned successfully. Invitation link sent to candidate email."
        return redirect("employer_dashboard")

    # =================================================
    # LIVE TEST MONITORING
    # =================================================
    monitor_data = []

    active_attempts = Attempt.objects.filter(
        is_completed=False
    ).select_related("test", "user")

    print("Active attempts:", active_attempts.count())

    for attempt in active_attempts:

        test = attempt.test

        status = "In Progress"

        score = Answer.objects.filter(
            attempt=attempt,
            is_correct=True
        ).count()

        warnings = CandidateActivity.objects.filter(
            attempt=attempt
        ).count()

        elapsed = (timezone.now() - attempt.started_at).total_seconds()
        remaining = (test.duration_minutes * 60) - elapsed

        if remaining > 0:
            minutes = int(remaining // 60)
            seconds = int(remaining % 60)
            time_left = f"{minutes}:{seconds:02d}"
        else:
            time_left = "Expired"

        monitor_data.append({
            "candidate": attempt.user.username,
            "test": test.blueprint.name,
            "status": status,
            "score": score,
            "warnings": warnings,
            "time_left": time_left
        })

    return render(request, "employer_dashboard.html", {
        "blueprints": blueprints,
        "candidates": candidates,
        "tests": tests,
        "monitor_data": monitor_data,
        "message": message
    })

from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from core.models import TestInvitation
from django.contrib.auth import logout


def accept_invitation(request, token):

    # If user not logged in → redirect to login and come back here
    if not request.user.is_authenticated:
        return redirect(f"/login/?next=/invite/{token}/")

    invitation = get_object_or_404(TestInvitation, token=token)

    print("CURRENT USER:", request.user)

    # DEBUG (temporary)
    print("Logged in user:", request.user)
    print("Invitation candidate:", invitation.candidate)
    print("Logged user ID:", request.user.id)
    print("Invitation candidate ID:", invitation.candidate.id)

    # Invitation already used
    if invitation.is_used:
        return render(request, "invitation_error.html", {
            "message": "This invitation link has already been used."
        })

    

    # Security check
    if request.user != invitation.candidate:

        # If someone else is logged in (admin/employer)
        if request.user.is_authenticated:
           logout(request)

        # Redirect to login and come back to invitation
        return redirect(f"/login/?next=/invite/{token}/")

    test = invitation.test
    now = timezone.now()

    # Test not started
    if test.scheduled_start and now < test.scheduled_start:
        return render(request, "test_not_started.html", {
            "start_time": test.scheduled_start
        })

    # Test expired
    if test.scheduled_end and now >= test.scheduled_end:
        return render(request, "invitation_error.html", {
            "message": "This test has expired."
        })
    
    # Prevent starting expired test even if attempt already exists
    if test.scheduled_end and timezone.now() >= test.scheduled_end:
        return render(request, "invitation_error.html", {
            "message": "This test has expired."
        })

    # Create attempt
    attempt, created = Attempt.objects.get_or_create(
        user=request.user,
        test=test,
        defaults={"is_completed": False}
    )

    invitation.is_used = True
    invitation.save()

    return redirect("get_next_question", test_id=test.id)


@login_required
def employer_results(request):

    if not hasattr(request.user, "userprofile"):
        return redirect("login")

    if request.user.userprofile.role != "employer":
        return redirect("employer_dashboard")

    results = Result.objects.select_related("attempt", "test", "user")

    return render(request, "employer_results.html", {
        "results": results
    })


from .models import CandidateActivity, WebcamCapture
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def log_activity(request):

    if request.method == "POST":

        try:
            data = json.loads(request.body)

            attempt_id = data.get("attempt_id")
            activity_type = data.get("activity_type")

            if not attempt_id or not activity_type:
                return JsonResponse({"error": "Missing data"}, status=400)

            attempt = Attempt.objects.get(id=attempt_id)

            CandidateActivity.objects.create(
                attempt=attempt,
                activity_type=activity_type
            )

            warning_count = min(
                CandidateActivity.objects.filter(attempt=attempt).count(),
                3
            )

            return JsonResponse({
                "status": "recorded",
                "warnings": warning_count
            })

        except Attempt.DoesNotExist:
            return JsonResponse({"error": "Invalid attempt"}, status=404)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"message": "Proctoring endpoint ready"})


@login_required
def candidate_report(request, test_id):

    test = get_object_or_404(Test, id=test_id)

    attempt = Attempt.objects.filter(test=test).first()

    if not attempt:
        return render(request, "candidate_report.html", {
            "candidate": test.user.username,
            "test": test.blueprint.name,
            "score": 0,
            "total": 0,
            "accuracy": 0,
            "correct": 0,
            "wrong": 0,
            "unattempted": 0,
            "violations": []
        })

    answers = Answer.objects.filter(attempt=attempt)

    total_questions = TestQuestion.objects.filter(test=test).count()

    correct = answers.filter(is_correct=True).count()
    attempted = answers.count()

    wrong = attempted - correct
    unattempted = total_questions - attempted

    accuracy = 0
    if total_questions > 0:
        accuracy = round((correct / total_questions) * 100, 2)

    violations = CandidateActivity.objects.filter(
        attempt=attempt
    ).order_by("timestamp")[:3]

    from django.db.models import Count

    violation_summary = CandidateActivity.objects.filter(
        attempt=attempt
    ).order_by("timestamp")[:3].values("activity_type").annotate(count=Count("activity_type"))
    
    webcam_images = WebcamCapture.objects.filter(
        attempt=attempt
    ).order_by("-timestamp")

    return render(request, "candidate_report.html", {
        "candidate": test.user.username,
        "test": test.blueprint.name,
        "score": correct,
        "total": total_questions,
        "accuracy": accuracy,
        "correct": correct,
        "wrong": wrong,
        "unattempted": unattempted,
        "violations": violations,
        "violation_summary": violation_summary,
        "webcam_images": webcam_images,
        "answers": answers
        
    })


@csrf_exempt
def save_webcam_frame(request):

    if request.method == "POST":

        attempt_id = request.POST.get("attempt_id")
        image = request.FILES.get("image")

        attempt = Attempt.objects.get(id=attempt_id)

        WebcamCapture.objects.create(
            attempt=attempt,
            image=image
        )

        return JsonResponse({"status": "saved"})

    return JsonResponse({"message": "invalid request"})


import requests
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt



@csrf_exempt
def run_code(request):

    if request.method == "POST":

        data = json.loads(request.body)

        code = data.get("code", "")
        question_id = data.get("question_id")
        user_id = data.get("user_id")
        test_id = data.get("test_id")   

        language_id = int(data.get("language_id", 71))

        from django.contrib.auth.models import User
        from core.models import Question, Answer, Attempt

        try:
            # ✅ Get user
            user = User.objects.get(id=user_id)

            # ✅ Get question
            question = Question.objects.get(id=question_id)

            # ✅ Get correct attempt
            attempt = Attempt.objects.get(
                user=user,
                test_id=test_id
            )

            test_cases = question.test_cases.all()

            passed = 0
            total = test_cases.count()

            for case in test_cases:

                payload = {
                    "language_id": int(language_id),
                    "source_code": code,
                    "stdin": case.input_data
                }

                response = requests.post(
                    "https://ce.judge0.com/submissions",
                    json=payload,
                    params={"base64_encoded": "false", "wait": "true"}
                )

                result = response.json()

                output = (
                    result.get("stdout")
                    or result.get("stderr")
                    or result.get("compile_output")
                    or ""
                ).strip()

                if output == case.expected_output.strip():
                    passed += 1

            score = (passed / total) * 100 if total > 0 else 0

            # ✅ Save answer
            Answer.objects.update_or_create(
                attempt=attempt,
                question=question,
                defaults={
                    "score": score,
                    "code_answer": code,
                    "is_correct": score == 100,
                    "skill": question.skill,
                    "difficulty": question.difficulty
                }
            )

            return JsonResponse({
                "output": f"Passed {passed}/{total} test cases",
                "score": score
            })

        except Exception as e:
            return JsonResponse({"output": str(e)})


