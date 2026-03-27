from django.urls import path
from . import views
from . import exam_api

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('assessment/', views.assessment, name='assessment'),
    path('analytics/', views.analytics_report, name='analytics'),
    path('api/analytics/', views.analytics_api),
    path('api/employer/stats/', exam_api.employer_monitoring_api, name='api_employer_stats'),
    path('api/candidates/', views.candidates_api, name='api_candidates'),
    path('api/employers/', views.employers_api, name='api_employers'),
    path('api/questions/', exam_api.questions_api, name='api_questions'),
    path('api/submit/', exam_api.submit_test_api, name='api_submit_test'),
    path('api/results/', exam_api.results_api, name='api_results'),
    path('api/upload-screenshot/', exam_api.upload_screenshot_api, name='api_upload_screenshot'),
    path('api/detect-face/', exam_api.detect_face_api, name='api_detect_face'),
    path('api/log-violation/', exam_api.log_violation_api, name='api_log_violation'),
    path('api/assessments/', views.assessments_api, name='api_assessments'),
    path('api/assessments/<int:assessment_id>/', exam_api.delete_assessment_api, name='api_delete_assessment'),

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
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('candidate-dashboard/', views.candidate_dashboard, name='candidate_dashboard'),
    path('employer-dashboard/', views.employer_dashboard, name='employer_dashboard'),
    path("employer/results/", views.employer_results, name="employer_results"),
    path("employer/candidate-report/<int:test_id>/", views.candidate_report, name="candidate_report"),
    path("save-webcam-frame/", views.save_webcam_frame, name="save_webcam_frame"),
    path("run-code/", views.run_code, name="run_code"),
]
