# views.py
from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
import logging
from django.views.decorators.csrf import csrf_exempt

from courses.models import Course
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponse, HttpResponseForbidden
from enrollments.models import Enrollment
from users.models import GraduationRequest


# Set up logging configuration
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
ch = logging.StreamHandler()  # Logs to console
ch.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
ch.setFormatter(formatter)
logger.addHandler(ch)


from django.shortcuts import render, redirect


from django.http import JsonResponse


@csrf_exempt
def user_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        role = request.POST.get('role')
        university_id = request.GET.get('university_id')

        # Log the received data to confirm it's being received correctly
        logger.debug(f"Received login data: Username: {username}, Password: {password}, Role: {role}, University ID: {university_id}")

        if not username or not password or not role or not university_id:
            messages.error(request, "All fields must be filled!")
            return render(request, 'login.html')

        # Authenticate the user
        user = authenticate(request, username=username, password=password)

        # Log if user was authenticated or not
        logger.debug(f"Authentication result: {user}")

        if user:
            # Check if role matches and university_id is correct
            if user.role == role and user.university.id == int(university_id):
                logger.debug(f"Role and University ID check passed: {user.role}, {user.university.id}")
                login(request, user)
                
                # Handle teacher role
                if user.role == 'teacher':
                    courses = Course.objects.filter(teacher=user)
                    return render(request, 'teachers/teacher_dashboard.html', {'courses': courses})

                # Handle student role
                elif user.role == 'student':
                    courses = Course.objects.filter(students=user) 
                    return render(request, 'students/student_dashboard.html', {'courses': courses})  # Render student dashboard
                else:
                    messages.error(request, "Invalid role.")
            else:
                logger.debug(f"Invalid role or university. User role: {user.role}, University ID: {user.university.id}")
                messages.error(request, "Invalid role or university.")
        else:
            logger.debug(f"Invalid username or password for {username}")
            messages.error(request, "Invalid username or password.")

    return render(request, 'login.html')



@login_required
def request_graduation(request):
    student = request.user
    university = student.university

    if not university:
        return HttpResponseForbidden("You are not associated with any university.")

    # Get total unique courses taken by the student
    unique_courses = Course.objects.filter(students=student).count()  # Uses the ManyToMany relationship

    if unique_courses == 0:
        return HttpResponse(status=204)

    course_averages = {}
    enrollments = Enrollment.objects.filter(student=student)

    for enrollment in enrollments:
        course_name = enrollment.course.name
        if course_name not in course_averages:
            course_averages[course_name] = []
        if enrollment.grade is not None:
            course_averages[course_name].append(enrollment.grade)

    course_avg_results = {course: sum(grades) / len(grades) for course, grades in course_averages.items() if grades}

    graduation_request = GraduationRequest.objects.create(
        student=student,
        university=university,
        status="pending",
        total_courses=unique_courses,
        per_course_averages=course_avg_results
    )

    return HttpResponse(status=204)



@login_required
def student_dashboard(request):
    student = request.user
    courses = Enrollment.objects.filter(student=student).values_list('course', flat=True).distinct()
    graduation_request = GraduationRequest.objects.filter(student=student).first()

    return render(request, 'students/student_dashboard.html', {
        'user': student,
        'courses': courses,
        'graduation_request': graduation_request,
    })





# @login_required
# def profile_view(request):
#     student = request.user
#     graduation_request = GraduationRequest.objects.filter(student=student).first()
#     courses = student.enrollments.all()  # Assuming the student model has enrollments related to courses
    
#     return render(request, 'profile.html', {
#         'student': student,
#         'graduation_request': graduation_request,
#         'courses': courses,
#     })




# @login_required
# def request_graduation(request):
#     student = request.user
#     university = student.university

#     if not university:
#         return HttpResponseForbidden("You are not associated with any university.")

#     enrollments = Enrollment.objects.filter(student=student)

#     if not enrollments.exists():
#         return HttpResponse(status=204) 

#     course_averages = {}
#     for enrollment in enrollments:
#         course_name = enrollment.course.name
#         if course_name not in course_averages:
#             course_averages[course_name] = []
#         if enrollment.grade is not None:
#             course_averages[course_name].append(enrollment.grade)

#     course_avg_results = {course: sum(grades) / len(grades) for course, grades in course_averages.items() if grades}

#     # Calculate the total unique courses taken
#     unique_courses = len(course_averages)

#     # Create the GraduationRequest and save per-course averages
#     graduation_request = GraduationRequest.objects.create(
#         student=student,
#         university=university,
#         status="pending",
#         total_courses=unique_courses,  # Total unique courses taken
#         per_course_averages=course_avg_results  # Store the per-course averages
#     )

#     return HttpResponse(status=204) 
