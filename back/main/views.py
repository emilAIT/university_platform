from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth.models import User
from .models import Student, Professor, University, RegisteredCourse, Course, Notification, StudentNotification
from .forms import *
from django.contrib.auth.decorators import login_required
from .forms import LoginForm
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Avg

def home(request):
    return render(request, "main/home.html", {'title': 'Something'})

def login(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            if user is not None:
                auth_login(request, user)
                if user.is_superuser:
                    # Перенаправление суперпользователя на страницу university_admin
                    return redirect('sadmin')
                elif hasattr(user, 'admin_university'):
                    return redirect('university_admin', university_id=user.admin_university.id)
                elif hasattr(user, 'student'):
                    return redirect('window_student')
                elif hasattr(user, 'professor'):
                    return redirect('professor_dashboard')
                else:
                    return redirect('home')
            else:
                form.add_error(None, "Invalid username or password")
        else:
            print("Form is not valid")
            print(form.errors)
    else:
        form = LoginForm()
    return render(request, 'main/login.html', {'form': form})

@login_required
def sadmin(request):
    if request.user.is_superuser:
        universities = University.objects.all()
        university_data = []
        for university in universities:
            student_count = Student.objects.filter(university=university).count()
            professor_count = Professor.objects.filter(university=university).count()
            course_count = Course.objects.filter(university=university).count()
            course_registration_count = RegisteredCourse.objects.filter(course__university=university).count()
            graduate_count = StudentNotification.objects.filter(student__university=university).count()
            university_data.append({
                'university': university,
                'student_count': student_count,
                'professor_count': professor_count,
                'course_count': course_count,
                'graduate_count': graduate_count
            })
        return render(request, "main/university_admin.html", {'university_data': university_data})
    else:
        return redirect('home')

@login_required
def delete_university(request, university_id):
    university = get_object_or_404(University, id=university_id)
    if request.method == 'POST':
        university.delete()
        return redirect('sadmin')
    return render(request, "main/delete_university.html", {'university': university})

@login_required
def university_admin(request, university_id=None):
    university = None
    if university_id:
        university = get_object_or_404(University, id=university_id)
    else:
        # Если university_id не указан, попробуем получить университет, связанный с пользователем
        if hasattr(request.user, 'admin_university'):
            university = request.user.admin_university
    return render(request, "main/university_admin.html", {'university': university})

@login_required
def window_student(request):
    if hasattr(request.user, 'student'):
        student = request.user.student
        courses = RegisteredCourse.objects.filter(student=student)
        mandatory_courses = Course.objects.filter(university=student.university, is_mandatory=True)
        mandatory_courses_count = mandatory_courses.count()
        mandatory_courses_passed = all(course.grade and int(course.grade) >= 60 for course in courses if course.course.is_mandatory)
        can_approve = mandatory_courses_count >= 5 and mandatory_courses_passed

        print(f"Request method: {request.method}, POST data: {request.POST}")  

        if request.method == 'POST' and 'approve' in request.POST:
            try:
                gpa = sum(int(course.grade) for course in courses if course.course.is_mandatory and course.grade and str(course.grade).isdigit()) / mandatory_courses_count
                notification = Notification.objects.create(student=student, gpa=gpa)
                print(f"Notification created: {notification}")
                print(f"Notification student: {notification.student}")
                print(f"Notification GPA: {notification.gpa}")

            except ValueError as e:
                print(f"Error calculating GPA: {e}")

        return render(request, "main/window_student.html", {
            'student': student,
            'courses': courses,
            'mandatory_courses': mandatory_courses,
            'can_approve': can_approve
        })
    else:
        return redirect('home')

@login_required
def students(request):
    if hasattr(request.user, 'student') or hasattr(request.user, 'admin_university'):
        if hasattr(request.user, 'student'):
            student = request.user.student
            courses = RegisteredCourse.objects.filter(student=student)
            return render(request, "main/window_student.html", {'student': student, 'courses': courses})
        elif hasattr(request.user, 'admin_university'):
            university = request.user.admin_university
            students = Student.objects.filter(university=university).order_by('user__username')
            return render(request, "main/students.html", {'students': students, 'university': university})
    else:
        return redirect('home')

def professors(request):
    if hasattr(request.user, 'admin_university'):
        university = request.user.admin_university
        professors = Professor.objects.filter(university=university).order_by('user__username')
        return render(request, "main/professors.html", {'professors': professors, 'university': university})
    else:
        return redirect('home')

def create_university(request):
    if request.method == 'POST':
        form = UniversityForm(request.POST)
        if form.is_valid():
            admin_username = form.cleaned_data['admin_username']
            admin_password = form.cleaned_data['admin_password']
            if User.objects.filter(username=admin_username).exists():
                form.add_error('admin_username', 'Username already exists')
            else:
                admin_user = User.objects.create_user(username=admin_username, password=admin_password)
                university = form.save(commit=False)
                university.admin = admin_user
                university.save()

                if request.user.is_superuser:
                    return redirect('sadmin')
                else:
                    return redirect('university_admin', university_id=university.id)
        else:
            print(form.errors)  # Отладочное сообщение
    else:
        form = UniversityForm()
    return render(request, "main/create_university.html", {'form': form})

def create(request):
    if request.method == 'POST':
        form = StudentForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = User.objects.create_user(username=username, password=password)
            student = form.save(commit=False)
            student.user = user
            student.university = request.user.admin_university
            student.save()
            return redirect('students')
        else:
            print(form.errors)  # Отладочное сообщение
    else:
        form = StudentForm()
    return render(request, "main/create_student.html", {'form': form})

@login_required
def create_professor(request):
    if request.method == 'POST':
        professor_form = ProfessorForm(request.POST)
        course_form = CourseForm(request.POST)
        if professor_form.is_valid():
            username = professor_form.cleaned_data['username']
            password = professor_form.cleaned_data['password']
            user = User.objects.create_user(username=username, password=password)
            professor = professor_form.save(commit=False)
            professor.user = user
            professor.university = request.user.admin_university
            professor.save()
            professor_form.save_m2m()  # Save the many-to-many data for the form

            if course_form.is_valid():
                course = course_form.save(commit=False)
                course.professor = professor
                course.university = request.user.admin_university
                course.save()

            return redirect('professors')
        else:
            print(professor_form.errors)  # Отладочное сообщение
            print(course_form.errors)  # Отладочное сообщение
    else:
        professor_form = ProfessorForm()
        course_form = CourseForm()
        course_form.fields.pop('professor')  # Удаляем поле выбора профессора из формы
    return render(request, "main/create_professor.html", {'professor_form': professor_form, 'course_form': course_form})

def delete_professor(request, professor_id):
    professor = get_object_or_404(Professor, id=professor_id)
    if request.method == 'POST':
        professor.user.delete()
        professor.delete()
        return redirect('professors')
    return render(request, "main/delete_professor.html", {'professor': professor})

def delete_student(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    if request.method == 'POST':
        student.user.delete()
        student.delete()
        return redirect('students')
    return render(request, "main/delete_student.html", {'student': student})

def edit_student(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    if request.method == 'POST':
        form = StudentForm(request.POST, instance=student)
        if form.is_valid():
            user = student.user
            user.username = form.cleaned_data['username']
            if form.cleaned_data['password']:
                user.set_password(form.cleaned_data['password'])
            user.save()
            form.save()
            return redirect('students')
        else:
            print(form.errors)  # Отладочное сообщение
    else:
        form = StudentForm(instance=student)
    return render(request, "main/edit_student.html", {'form': form, 'student': student})

def edit_professor(request, professor_id):
    professor = get_object_or_404(Professor, id=professor_id)
    if request.method == 'POST':
        form = ProfessorForm(request.POST, instance=professor)
        if form.is_valid():
            user = professor.user
            user.username = form.cleaned_data['username']
            if form.cleaned_data['password']:
                user.set_password(form.cleaned_data['password'])
            user.save()
            form.save()
            return redirect('professors')
        else:
            print(form.errors)  # Отладочное сообщение
    else:
        form = ProfessorForm(instance=professor)
    return render(request, "main/edit_professor.html", {'form': form, 'professor': professor})

@login_required
def create_course(request):
    if request.method == 'POST':
        form = CourseForm(request.POST)
        if form.is_valid():
            course = form.save(commit=False)
            course.university = request.user.admin_university
            course.is_mandatory = False  # Устанавливаем значение по умолчанию
            course.save()
            return redirect('university_admin', university_id=request.user.admin_university.id)
        else:
            print(form.errors)  # Отладочное сообщение
    else:
        form = CourseForm()
    return render(request, "main/create_course.html", {'form': form})

def delete_course(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    if request.method == 'POST':
        course.delete()
        return redirect('professors')
    return render(request, "main/delete_course.html", {'course': course})

@login_required
def register_course(request):
    if hasattr(request.user, 'student'):
        student = request.user.student
        if request.method == 'POST':
            form = RegisterCourseForm(request.POST, student=student)
            if form.is_valid():
                course = form.cleaned_data['course']
                if RegisteredCourse.objects.filter(student=student, course=course).exists():
                    messages.error(request, 'You are already registered for this course.')
                else:
                    registered_course = form.save(commit=False)
                    registered_course.student = student
                    registered_course.save()
                    messages.success(request, 'You have successfully registered for the course.')
                return redirect('students')
            else:
                print(form.errors)  # Отладочное сообщение
        else:
            form = RegisterCourseForm(student=student)
        return render(request, "main/register_course.html", {'form': form})
    else:
        messages.error(request, 'You do not have permission to register for courses.')
        return redirect('home')

@login_required
def professor_dashboard(request):
    if hasattr(request.user, 'professor'):
        professor = request.user.professor
        courses = professor.course_set.all()
        students = RegisteredCourse.objects.filter(course__in=courses)
        if request.method == 'POST':
            for student in students:
                grade = request.POST.get(f'grade_{student.id}')
                if grade and 0 <= int(grade) <= 100:
                    student.grade = grade
                    student.save()
            messages.success(request, 'Grades have been successfully saved.')
            return redirect('professor_dashboard')
        return render(request, "main/professor_dashboard.html", {'professor': professor, 'students': students})
    else:
        return redirect('home')

@login_required
def student_detail(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    courses = RegisteredCourse.objects.filter(student=student)
    students = Student.objects.filter(university=request.user.admin_university).order_by('user__username')
    return render(request, "main/students.html", {
        'students': students,
        'selected_student': student,
        'selected_student_courses': courses,
        'university': request.user.admin_university
    })

@login_required
def toggle_course_status(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    if request.method == 'POST':
        course.is_mandatory = not course.is_mandatory
        course.save()
        return JsonResponse({'status': 'success', 'is_mandatory': course.is_mandatory})
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def create_student(request):
    if request.method == 'POST':
        form = StudentForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = User.objects.create_user(username=username, password=password)
            student = form.save(commit=False)
            student.user = user
            student.university = request.user.admin_university
            student.save()
            return redirect('students')
        else:
            print(form.errors)  # Отладочное сообщение
    else:
        form = StudentForm()
    return render(request, "main/create_student.html", {'form': form})

@login_required
def notifications(request):
    if hasattr(request.user, 'admin_university'):
        university = request.user.admin_university
        notifications = Notification.objects.filter(student__university=university)
        print(f"Notifications: {notifications}")
        return render(request, "main/notifications.html", {'notifications': notifications})
    else:
        messages.error(request, 'You do not have permission to view this page.')
        return redirect('home')

@login_required
def accept_notification(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id)
    notification.accepted = True
    notification.save()
    print(f"Notification accepted: {notification}")
    StudentNotification.objects.create(
        student=notification.student,
        message='Congratulations! You have successfully completed your university education and will receive a diploma.'
    )
    notification.delete()  # Удаляем уведомление после принятия
    return redirect('notifications')

@login_required
def deny_notification(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id)
    notification.delete()
    print(f"Notification denied: {notification}")
    return redirect('notifications')

@login_required
def student_notifications(request):
    if hasattr(request.user, 'student'):
        student = request.user.student
        notifications = StudentNotification.objects.filter(student=student)
        return render(request, "main/student_notifications.html", {'notifications': notifications})
    else:
        return redirect('home')

@login_required
def course_overview(request):
    if hasattr(request.user, 'admin_university'):
        university = request.user.admin_university
        courses = Course.objects.filter(university=university)
        course_data = []
        for course in courses:
            avg_grade = course.registeredcourse_set.aggregate(avg_grade=Avg('grade'))['avg_grade']
            course_data.append({
                'course': course,
                'avg_grade': avg_grade
            })
        return render(request, "main/course_overview.html", {'course_data': course_data, 'university': university})
    else:
        return redirect('home')