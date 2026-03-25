from django.urls import path
from . import views

urlpatterns = [


    path('login/', views.login_view, name='login'),
    path('assessment/', views.assessment, name='assessment'),
    path('analytics/', views.analytics_report, name='analytics'),
    path('api/analytics/', views.analytics_api),

    # CANDIDATE TEST FLOW
    
    path('start-test/<int:blueprint_id>/', views.start_test, name='start_test'),
    path('question/<int:test_id>/', views.get_next_question, name='get_next_question'),
    path(
        'submit-answer/<int:test_id>/<int:question_id>/',
        views.submit_answer_view,
        name='submit_answer'
    ),
    path('finish-test/<int:test_id>/', views.finish_test, name='finish_test'),
    path('result/<int:test_id>/', views.view_result, name='view_result'),

    path("log-activity/", views.log_activity, name="log_activity"),

    path("invite/<str:token>/", views.accept_invitation, name="accept_invitation"),

    # ADMIN DASHBOARD
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),

    # CANDIDATE DASHBOARD
    path('candidate-dashboard/', views.candidate_dashboard, name='candidate_dashboard'),

    # EMPLOYER DASHBOARD
    path('employer-dashboard/', views.employer_dashboard, name='employer_dashboard'),

    # EMPLOYER RESULT VIEW
    path("employer/results/", views.employer_results, name="employer_results"),
    
    # EMPLOYER CANDIDATE REPORT
    path("employer/candidate-report/<int:test_id>/", views.candidate_report, name="candidate_report"),

    # Webcam monitoring endpoint
    path("save-webcam-frame/", views.save_webcam_frame, name="save_webcam_frame"),

    path("run-code/", views.run_code, name="run_code"),

]