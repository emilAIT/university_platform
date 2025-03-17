
##_______________________


from django.shortcuts import render, get_object_or_404, redirect
from .models import Course
from enrollments.models import Enrollment
from users.models import User
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden, HttpResponseRedirect

from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt


@login_required
def course_detail(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    
    # Ensure the user is the teacher of this course
    if request.user != course.teacher:
        return HttpResponseForbidden("You are not authorized to view this course's details.")
    
    # Get the list of students enrolled in the course
    enrollments = Enrollment.objects.filter(course=course)
    
    return render(request, 'courses/course_detail.html', {
        'course': course,
        'enrollments': enrollments
    })



@login_required
def student_grades(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    enrollments = Enrollment.objects.filter(course=course).select_related('student')

    # Handle form submission (POST request)
    if request.method == 'POST':
        for enrollment in enrollments:
            grade = request.POST.get(f'grade_{enrollment.id}')
            if grade:
                try:
                    # Update the grade, ensuring it's a valid number
                    enrollment.grade = float(grade)
                    enrollment.save()
                except ValueError:
                    # If grade is not a valid number, handle this
                    pass

        # After updating, redirect to the same page to reflect the changes
        return HttpResponseRedirect(reverse('course_detail', args=[course.id]))

    return render(request, 'courses/student_grades.html', {
        'course': course,
        'enrollments': enrollments  # Use "enrollments" for consistency with the template
    })


@csrf_exempt
def add_grades(request, course_id):
    course = get_object_or_404(Course, id=course_id)

    if request.method == 'POST':
        student_name = request.POST.get('student_name')
        grade = request.POST.get('grade')

        # Find the student by username
        student = get_object_or_404(User, username=student_name)

        # Check if the student is already enrolled in the course
        if student in course.students.all():  # Check if student is enrolled
            # Check if enrollment already exists for the student in the course            Enrollment.objects.create(course=course, student=student, grade=float(grade))
            # Redirect to course details page
            Enrollment.objects.create(course=course, student=student, grade=float(grade))
            return HttpResponseRedirect(reverse('course_detail', args=[course.id]))
        else:
            # If the student is not enrolled in the course
            return HttpResponseRedirect(reverse('course_detail', args=[course.id]))

    return render(request, 'courses/add_grades.html', {'course': course})




@login_required
def student_course_detail(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    
    # Get all enrollments for the course
    enrollments = Enrollment.objects.filter(course=course)
    
    # Render the student's view with the list of grades
    return render(request, 'courses/student_course_detail.html', {
        'course': course,
        'enrollments': enrollments  # Pass all enrollments for the current course
    })


