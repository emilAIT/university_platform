from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('login/', views.login, name='login'),
    path('students/', views.students, name='students'),
    path('students/<int:student_id>/', views.student_detail, name='student_detail'),  # Добавили этот маршрут
    path('professors/', views.professors, name='professors'),
    path('create/', views.create, name='create'),
    path('create_professor/', views.create_professor, name='create_professor'),
    path('delete_professor/<int:professor_id>/', views.delete_professor, name='delete_professor'),
    path('delete_student/<int:student_id>/', views.delete_student, name='delete_student'),
    path('edit_student/<int:student_id>/', views.edit_student, name='edit_student'),
    path('edit_professor/<int:professor_id>/', views.edit_professor, name='edit_professor'),
    path('create_university/', views.create_university, name='create_university'),
    path('delete_university/<int:university_id>/', views.delete_university, name='delete_university'),
    path('sadmin/', views.sadmin, name='sadmin'),
    path('university_admin/<int:university_id>/', views.university_admin, name='university_admin'),
    path('create_course/', views.create_course, name='create_course'),
    path('delete_course/<int:course_id>/', views.delete_course, name='delete_course'),
    path('register_course/', views.register_course, name='register_course'),
    path('window_student/', views.window_student, name='window_student'),
    path('professor_dashboard/', views.professor_dashboard, name='professor_dashboard'),
    path('toggle_course_status/<int:course_id>/', views.toggle_course_status, name='toggle_course_status'),
    path('notifications/', views.notifications, name='notifications'),
    path('accept_notification/<int:notification_id>/', views.accept_notification, name='accept_notification'),
    path('deny_notification/<int:notification_id>/', views.deny_notification, name='deny_notification'),
    path('student_notifications/', views.student_notifications, name='student_notifications'),
    path('course_overview/', views.course_overview, name='course_overview'),
]