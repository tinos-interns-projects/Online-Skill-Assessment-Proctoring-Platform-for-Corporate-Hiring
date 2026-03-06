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
from core.models import Test, Attempt, Answer, Result, TestQuestion
from django.contrib.auth import authenticate, login
from django.core.mail import send_mail


def login_view(request):

    next_url = request.GET.get("next")

    if request.method == "POST":

        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)

            if next_url:
                return redirect(next_url)

            # Admin
            if user.is_superuser or user.is_staff:
                return redirect("admin_dashboard")

            # Role based redirect
            if hasattr(user, "userprofile"):
                role = user.userprofile.role

                if role == "employer":
                    return redirect("employer_dashboard")

                if role == "candidate":
                    return redirect("candidate_dashboard")

        else:
            return render(request, "login.html", {"error": "Invalid username or password"})

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

                # Unattempted question
                if not selected:
                    unattempted += 1
                    continue

                is_correct = selected.lower() == question.correct_option.lower()

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

            accuracy = (score / len(questions)) * 100

            return render(request, "result.html", {
                "score": score,
                "total": len(questions),
                "correct": correct,
                "wrong": wrong,
                "unattempted": unattempted
            })

    return render(request, "assessment.html", {
        "questions": questions,
        "test": test
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


@api_view(['GET'])
@permission_classes([AllowAny]) 
def analytics_api(request):
    return Response({
        "total_attempts": Result.objects.count(),
        "skill_wise": skill_wise_performance(),
        "difficulty_wise": difficulty_wise_performance(),
    })

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

    if now > end_time:
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

    test = get_object_or_404(Test, id=test_id, user=request.user)

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

    if not next_tq:
        return redirect(f"/finish-test/{test.id}/")

    q = next_tq.question

    return render(request, "question.html", {
    "test": test,
    "question": q,
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

    result = finalize_test(attempt)

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
    message = request.session.pop("success_message", None)

    if request.method == "POST":

        blueprint_id = request.POST.get("blueprint")
        candidate_id = request.POST.get("candidate")
        start_time = request.POST.get("start_time")
        duration = int(request.POST.get("duration"))

        blueprint = TestBlueprint.objects.get(id=blueprint_id)
        candidate = User.objects.get(id=candidate_id)


        # Prevent multiple active tests
        existing_test = Test.objects.filter(
            user=candidate,
            is_completed=False
        ).exists()

        if existing_test:
            message = "This candidate already has an active test."
            return render(request, "employer_dashboard.html", {
                "blueprints": blueprints,
                "candidates": candidates,
                "tests": tests,
                "message": message
            })

        # SECURITY CHECK
        if candidate.userprofile.role != "candidate":
            message = "Invalid user selected. Only candidates can be assigned tests."
            return render(request, "employer_dashboard.html", {
                "blueprints": blueprints,
                "candidates": candidates,
                "tests": tests,
                "message": message
            })

        # Convert start time safely
        scheduled_start = parse_datetime(start_time)

        # Calculate end time
        scheduled_end = scheduled_start + timedelta(minutes=duration)

        # Create test
        test = Test.objects.create(
            blueprint=blueprint,
            user=candidate,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            duration_minutes=duration
        )

        # Generate questions
        generate_test_questions(test)

        # Create invitation token
        token = uuid.uuid4().hex

        TestInvitation.objects.create(
            test=test,
            candidate=candidate,
            token=token
        )

        invitation_link = request.build_absolute_uri(f"/invite/{token}/")
        from django.core.mail import send_mail

        # Send invitation email
        send_mail(
            subject="Online Assessment Invitation",
            message=f"""
        Hello {candidate.username},

        You have been invited to attend an online assessment.

        Test: {blueprint.name}

        Click the link below to start your test:
        {invitation_link}

        Please complete the test within the scheduled time.

        Best regards,
        Assessment Platform
        """,
            from_email=None,
            recipient_list=[candidate.email],
            fail_silently=False,
        )

        request.session["success_message"] = "Test assigned successfully. Invitation email sent to the candidate."
        return redirect("employer_dashboard")

    # -----------------------------
    # LIVE TEST MONITORING
    # -----------------------------

    monitor_data = []

    for test in tests:

        attempt = Attempt.objects.filter(
            test=test,
            is_completed=False
        ).first()

        status = "Not Started"
        time_left = "-"

        if attempt:

            status = "In Progress"

            elapsed = (timezone.now() - attempt.started_at).total_seconds()
            remaining = (test.duration_minutes * 60) - elapsed

            if remaining > 0:
                minutes = int(remaining // 60)
                seconds = int(remaining % 60)
                time_left = f"{minutes}:{seconds:02d}"
            else:
                time_left = "Time Expired"

        if test.is_completed:
            status = "Completed"
            time_left = "-"

        monitor_data.append({
            "candidate": test.user.username,
            "test": test.blueprint.name,
            "status": status,
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
    if test.scheduled_end and now > test.scheduled_end:
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

    return redirect("question_view", test_id=test.id)


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