from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('admin/', views.admin_dashboard, name='admin_dashboard'),
    path('register_student/', views.register_student, name='register_student'),
    path('register_professor/', views.register_professor, name='register_professor'),
    path('register_subject/', views.register_subject, name='register_subject'),
    path('assign_professor/<int:professor_id>/<int:subject_id>/', views.assign_professor_to_subject, name='assign_professor_to_subject'),
    path('remove_professor/<int:subject_id>/', views.remove_professor_from_subject, name='remove_professor_from_subject'),
    path('student/', views.student_dashboard, name='student_dashboard'),
    path('professor/', views.professor_dashboard, name='professor_dashboard'),
    path('application_details/<int:request_id>/', views.application_details, name='application_details'),
    path('notifications/', views.notifications_view, name='notifications'),
    path('super_admin/', views.super_admin_dashboard, name='super_admin_dashboard'),
    path('register_university/', views.register_university, name='register_university'),  # Новый маршрут
    path('register_mandatory_subject/', views.register_mandatory_subject, name='register_mandatory_subject'),  # Новый маршрут
    path('register_admin/', views.register_admin, name='register_admin'),
    path('super_admin/approve_request/<int:request_id>/', views.approve_request, name='approve_request'),
    path('super_admin/deny_request/<int:request_id>/', views.deny_request, name='deny_request'),
    path('set-theme/', views.set_theme, name='set_theme'),
    path('manage-mandatory-subject-universities/', views.manage_mandatory_subject_universities, name='manage_mandatory_subject_universities'),
]