
from django.urls import path
from . import views

urlpatterns = [
    path('<int:course_id>/', views.course_detail, name='course_detail'),
    path('<int:course_id>/students/', views.student_grades, name='student_grades'),
    path('course/<int:course_id>/add-grades/', views.add_grades, name='add_grades'),
    path('course/<int:course_id>/grades/', views.student_course_detail, name='student_course_detail'),
    # path('course/<int:course_id>/view_grades/', views.student_grades_view, name='student_grades_view'),

]
