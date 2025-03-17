from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import *
import urllib.parse


# superuser = User.objects.create_user(username='superuser', password='1234', role='super_admin')
# superuser.save()

def role_required(*roles):
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('login')
            if request.user.role not in roles:
                return HttpResponseForbidden(
                    f"You are logged in as {request.user.username} with role '{request.user.role}', "
                    f"but this page requires role: {', '.join(roles)}."
                )
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


def login_view(request):
    notification = request.GET.get('notification')
    notification_type = request.GET.get('notification_type')
    has_unread_notifications = request.user.is_authenticated and request.user.notifications.filter(
        is_read=False).exists()

    if request.method == 'POST' and 'login' in request.POST:
        username = request.POST.get('username')
        password = request.POST.get('password')
        if not username or not password:
            notification = 'Username and password are required'
            notification_type = 'error'
        else:
            user = authenticate(request, username=username, password=password)
            if user:
                login(request, user)
                notification = f'Logged in as {user.username} with role {user.role}'
                notification_type = 'success'
                params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
                if user.role == 'super_admin':
                    return redirect(f"/super_admin/?{params}")
                elif user.role == 'admin':
                    return redirect(f"/admin/?{params}")
                elif user.role == 'professor':
                    return redirect(f"/professor/?{params}")
                else:  # студент
                    return redirect(f"/student/?{params}")
            else:
                if User.objects.filter(username=username).exists():
                    notification = 'Incorrect password'
                else:
                    notification = 'User with this login not found'
                notification_type = 'error'

    return render(request, 'login.html', {
        'notification': notification,
        'notification_type': notification_type,
        'has_unread_notifications': has_unread_notifications,
    })


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
@role_required('admin')
def register_student(request):
    notification = None
    notification_type = None
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        if User.objects.filter(username=username).exists():
            notification = 'Student with this login already exists'
            notification_type = 'error'
        else:
            student = User.objects.create_user(
                username=username,
                password=password,
                role='student',
                university=request.user.university
            )
            mandatory_subjects = Subject.objects.filter(university=request.user.university, is_mandatory=True)
            for subject in mandatory_subjects:
                Enrollment.objects.get_or_create(student=student, subject=subject, semester=1)
            notification = f'Student {username} registered and enrolled in mandatory subjects'
            notification_type = 'success'
            return render(request, 'admin_dashboard.html', {
                'university': request.user.university,
                'students': User.objects.filter(university=request.user.university, role='student'),
                'professors': User.objects.filter(university=request.user.university, role='professor'),
                'subjects': Subject.objects.filter(university=request.user.university),
                'pending_applications': StudentRequest.objects.filter(university=request.user.university,
                                                                      status='pending'),
                'notification': notification,
                'notification_type': notification_type,
            })
    return render(request, 'register_student.html',
                  {'notification': notification, 'notification_type': notification_type})


@login_required
@role_required('admin')
def register_professor(request):
    notification = None
    notification_type = None
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        if not Subject.objects.filter(university=request.user.university, professor__isnull=True).exists():
            notification = 'All subjects already have professors. Cannot add a new professor.'
            notification_type = 'error'
            return render(request, 'admin_dashboard.html', {
                'university': request.user.university,
                'students': User.objects.filter(university=request.user.university, role='student'),
                'professors': User.objects.filter(university=request.user.university, role='professor'),
                'subjects': Subject.objects.filter(university=request.user.university),
                'pending_applications': StudentRequest.objects.filter(university=request.user.university,
                                                                      status='pending'),
                'notification': notification,
                'notification_type': notification_type,
            })
        if User.objects.filter(username=username).exists():
            notification = 'Professor with this login already exists'
            notification_type = 'error'
        else:
            User.objects.create_user(
                username=username,
                password=password,
                role='professor',
                university=request.user.university
            )
            notification = f'Professor {username} successfully registered'
            notification_type = 'success'
            return render(request, 'admin_dashboard.html', {
                'university': request.user.university,
                'students': User.objects.filter(university=request.user.university, role='student'),
                'professors': User.objects.filter(university=request.user.university, role='professor'),
                'subjects': Subject.objects.filter(university=request.user.university),
                'pending_applications': StudentRequest.objects.filter(university=request.user.university,
                                                                      status='pending'),
                'notification': notification,
                'notification_type': notification_type,
            })
    return render(request, 'register_professor.html',
                  {'notification': notification, 'notification_type': notification_type})


@login_required
@role_required('admin')
def register_subject(request):
    notification = None
    notification_type = None
    if request.method == 'POST':
        name = request.POST['name']
        code = request.POST['code']
        mandatory_subject_id = request.POST.get('mandatory_subject')
        if Subject.objects.filter(code=code, university=request.user.university).exists():
            notification = 'Subject with this code already exists'
            notification_type = 'error'
        else:
            subject = Subject.objects.create(
                name=name,
                code=code,
                university=request.user.university,
                is_mandatory=bool(mandatory_subject_id),
                mandatory_subject=MandatorySubject.objects.get(
                    id=mandatory_subject_id) if mandatory_subject_id else None
            )
            if subject.is_mandatory:
                students = User.objects.filter(university=request.user.university, role='student')
                for student in students:
                    Enrollment.objects.get_or_create(student=student, subject=subject, semester=1)
            notification = f'Subject {name} successfully registered'
            notification_type = 'success'
            return render(request, 'admin_dashboard.html', {
                'university': request.user.university,
                'students': User.objects.filter(university=request.user.university, role='student'),
                'professors': User.objects.filter(university=request.user.university, role='professor'),
                'subjects': Subject.objects.filter(university=request.user.university),
                'pending_applications': StudentRequest.objects.filter(university=request.user.university,
                                                                      status='pending'),
                'notification': notification,
                'notification_type': notification_type,
            })
    return render(request, 'register_subject.html', {
        'notification': notification,
        'notification_type': notification_type,
        'mandatory_subjects': MandatorySubject.objects.all(),
    })


@login_required
@role_required('admin')
def assign_professor_to_subject(request, professor_id, subject_id):
    professor = User.objects.get(id=professor_id, role='professor', university=request.user.university)
    subject = Subject.objects.get(id=subject_id, university=request.user.university)
    total_subjects = Subject.objects.filter(university=request.user.university).count()
    total_professors = User.objects.filter(university=request.user.university, role='professor').count()
    professor_subjects = Subject.objects.filter(professor=professor).count()
    max_subjects_per_professor = total_subjects - (total_professors - 1)

    notification = None
    notification_type = None
    if subject.professor is None:
        if professor_subjects >= max_subjects_per_professor:
            notification = f'{professor.username} cannot take more than {max_subjects_per_professor} subjects.'
            notification_type = 'error'
        else:
            subject.professor = professor
            subject.save()
            notification = f'{professor.username} assigned to {subject.name}'
            notification_type = 'success'
    else:
        notification = f'Subject {subject.name} is already assigned to {subject.professor.username}'
        notification_type = 'error'
    params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
    return redirect(f"/admin/?{params}")


@login_required
@role_required('admin')
def remove_professor_from_subject(request, subject_id):
    subject = Subject.objects.get(id=subject_id, university=request.user.university)
    current_professor = subject.professor
    if current_professor:
        professor_subjects_count = Subject.objects.filter(professor=current_professor).count()
        if professor_subjects_count <= 1:
            notification = f'Cannot remove {subject.name} from {current_professor.username}, it is their last subject.'
            notification_type = 'error'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/admin/?{params}")

        if request.method == 'POST' and 'confirm' in request.POST:
            Grade.objects.filter(enrollment__subject=subject).delete()
            subject.professor = None
            subject.save()
            notification = f'Subject {subject.name} freed. All student grades removed.'
            notification_type = 'success'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/admin/?{params}")

        return render(request, 'confirm_remove_professor.html', {
            'subject': subject,
            'current_professor': current_professor.username,
        })
    notification = 'This subject has no professor.'
    notification_type = 'error'
    params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
    return redirect(f"/admin/?{params}")


@login_required
@role_required('student')
def student_dashboard(request):
    university = request.user.university
    enrollments = Enrollment.objects.filter(student=request.user).select_related('subject__professor')
    grades = Grade.objects.filter(enrollment__in=enrollments)
    available_subjects = Subject.objects.filter(university=university).exclude(
        id__in=enrollments.values_list('subject_id', flat=True)
    )
    status = request.user.get_academic_status()

    # Проверяем, есть ли активные запросы (pending или admin_approved)
    active_requests = StudentRequest.objects.filter(
        student=request.user,
        status__in=['pending', 'admin_approved']
    ).exists()

    # Проверяем, может ли студент отправлять запросы (статус active и нет активных запросов)
    can_submit_request = request.user.status == 'active' and not active_requests
    # Проверяем, может ли студент запрашивать оценки (статус active и нет активных запросов)
    can_request_grade = request.user.status == 'active' and not active_requests

    notification = request.GET.get('notification')
    notification_type = request.GET.get('notification_type')
    has_unread_notifications = request.user.notifications.filter(is_read=False).exists()

    if request.method == 'POST':
        if 'subject_id' in request.POST:
            subject_id = request.POST['subject_id']
            subject = Subject.objects.get(id=subject_id, university=university)
            Enrollment.objects.create(student=request.user, subject=subject, semester=1)
            notification = f'You have enrolled in {subject.name}'
            notification_type = 'success'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/student/?{params}")
        elif 'application' in request.POST:
            if not can_submit_request:
                notification = "You cannot submit a new application. You either have an active request or have already passed."
                notification_type = 'error'
                params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
                return redirect(f"/student/?{params}")

            mandatory_grades = Grade.objects.filter(
                enrollment__student=request.user,
                enrollment__subject__is_mandatory=True
            )
            for grade in mandatory_grades:
                if grade.score < 60:
                    Notification.objects.create(
                        recipient=request.user,
                        message=f"Your application was denied: {grade.enrollment.subject.name} ({grade.enrollment.subject.code}) grade is {grade.score} (below 60)",
                        action='application_denied'
                    )
                    notification = f'Application denied: {grade.enrollment.subject.name} grade is below 60'
                    notification_type = 'error'
                    params = urllib.parse.urlencode(
                        {'notification': notification, 'notification_type': notification_type})
                    return redirect(f"/student/?{params}")

            enrollments_without_grades = Enrollment.objects.filter(
                student=request.user
            ).exclude(id__in=grades.values('enrollment_id'))
            if enrollments_without_grades.exists():
                without_grade_subject = enrollments_without_grades.first().subject
                Notification.objects.create(
                    recipient=request.user,
                    message=f"Your application was denied: {without_grade_subject.name} ({without_grade_subject.code}) has no grade",
                    action='application_denied'
                )
                notification = f'Application denied: {without_grade_subject.name} has no grade'
                notification_type = 'error'
                params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
                return redirect(f"/student/?{params}")

            admin = User.objects.filter(university=university, role='admin').first()
            if admin:
                request_obj = StudentRequest.objects.create(
                    student=request.user,
                    admin=admin,
                    university=university,
                    status='pending'
                )
                mandatory_subjects = Subject.objects.filter(university=university, is_mandatory=True)
                for subject in mandatory_subjects:
                    grade = Grade.objects.filter(enrollment__student=request.user, enrollment__subject=subject).first()
                    if grade:
                        StudentGrade.objects.create(
                            student=request.user,
                            mandatory_subject=subject.mandatory_subject,
                            grade=str(grade.score),
                            request=request_obj
                        )
                notification = 'Application submitted to admin'
                notification_type = 'success'
            else:
                notification = 'No admin available to process application'
                notification_type = 'error'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/student/?{params}")
        elif 'request_grade' in request.POST:
            if not can_request_grade:
                notification = "You cannot request a grade. You either have an active application or have already passed."
                notification_type = 'error'
                params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
                return redirect(f"/student/?{params}")

            enrollment_id = request.POST['enrollment_id']
            enrollment = Enrollment.objects.get(id=enrollment_id, student=request.user)
            professor = enrollment.subject.professor
            if professor:
                Notification.objects.create(
                    recipient=professor,
                    sender=request.user,
                    message=f"{request.user.username} requests a grade for {enrollment.subject.name} ({enrollment.subject.code})",
                    action='grade_request',
                    is_read=True
                )
                notification = f'Request sent to {professor.username} for {enrollment.subject.name}'
                notification_type = 'success'
            else:
                notification = 'No professor assigned to this subject'
                notification_type = 'error'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/student/?{params}")

    return render(request, 'student_dashboard.html', {
        'university': university,
        'enrollments': enrollments,
        'grades': grades,
        'available_subjects': available_subjects,
        'status': status,
        'can_submit_request': can_submit_request,
        'can_request_grade': can_request_grade,
        'notification': notification,
        'notification_type': notification_type,
        'has_unread_notifications': has_unread_notifications,
    })


@login_required
@role_required('professor')
def professor_dashboard(request):
    university = request.user.university
    professor_subjects = Subject.objects.filter(professor=request.user)
    available_subjects = Subject.objects.filter(university=university, professor__isnull=True)
    total_subjects = Subject.objects.filter(university=university).count()
    total_professors = User.objects.filter(university=university, role='professor').count()
    professor_subjects_count = professor_subjects.count()
    max_subjects_per_professor = total_subjects - (total_professors - 1) if total_professors > 1 else total_subjects
    grade_requests = Notification.objects.filter(
        recipient=request.user,
        action='grade_request'
    )

    notification = request.GET.get('notification')
    notification_type = request.GET.get('notification_type')
    has_unread_notifications = request.user.notifications.filter(is_read=False).exists()

    if request.method == 'POST':
        if 'enrollment_id' in request.POST:
            enrollment_id = request.POST['enrollment_id']
            score = float(request.POST['score'])
            if 0 <= score <= 100:
                enrollment = Enrollment.objects.get(id=enrollment_id, subject__professor=request.user)
                grade, created = Grade.objects.update_or_create(
                    enrollment=enrollment,
                    defaults={'score': score}
                )
                action = "updated" if not created else "set"
                Notification.objects.create(
                    recipient=enrollment.student,
                    sender=request.user,
                    message=f"Your grade for {enrollment.subject.name} ({enrollment.subject.code}) has been {action}: {score}",
                    action='grade_set'
                )
                notification = f'Grade {score} {action} for {enrollment.student.username}'
                notification_type = 'success'
            else:
                notification = 'Grade must be between 0 and 100'
                notification_type = 'error'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/professor/?{params}")
        elif 'subject_id' in request.POST:
            subject_id = request.POST['subject_id']
            subject = Subject.objects.get(id=subject_id, university=university, professor__isnull=True)
            if professor_subjects_count >= max_subjects_per_professor:
                notification = f'You cannot take more than {max_subjects_per_professor} subjects.'
                notification_type = 'error'
            else:
                subject.professor = request.user
                subject.save()
                notification = f'You have taken {subject.name} ({subject.code})'
                notification_type = 'success'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/professor/?{params}")

    return render(request, 'professor_dashboard.html', {
        'professor_subjects': professor_subjects,
        'available_subjects': available_subjects,
        'grade_requests': grade_requests,
        'notification': notification,
        'notification_type': notification_type,
    })


@login_required
@role_required('admin')
def admin_dashboard(request):
    university = request.user.university
    students = User.objects.filter(university=university, role='student')
    professors = User.objects.filter(university=university, role='professor')
    subjects = Subject.objects.filter(university=university)  # Здесь будут и обязательные предметы
    pending_applications = StudentRequest.objects.filter(university=university, status='pending')

    notification = request.GET.get('notification')
    notification_type = request.GET.get('notification_type')
    has_unread_notifications = request.user.notifications.filter(is_read=False).exists()

    if request.method == 'POST' and 'request_id' in request.POST:
        request_id = request.POST['request_id']
        action = request.POST.get('action')
        request_obj = StudentRequest.objects.get(id=request_id, university=university, status='pending')
        student = request_obj.student
        if action == 'confirm':
            request_obj.status = 'admin_approved'
            request_obj.admin = request.user
            request_obj.save()
            Notification.objects.create(
                recipient=student,
                sender=request.user,
                message=f"Your application has been approved by admin and sent to Super Admin for final approval.",
                action='application_admin_approved'
            )
            notification = f"Application of {student.username} confirmed and sent to Super Admin"
            notification_type = 'success'
        elif action == 'deny':
            reason = request.POST.get('reason', 'No reason provided')
            request_obj.status = 'denied'
            request_obj.deny_reason = reason
            request_obj.save()
            Notification.objects.create(
                recipient=student,
                sender=request.user,
                message=f"Unfortunately, {student.username}, your request has been denied: {reason}",
                action='application_denied'
            )
            notification = f"Application of {student.username} denied"
            notification_type = 'error'
        params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
        return redirect(f"/admin/?{params}")

    return render(request, 'admin_dashboard.html', {
        'university': university,
        'students': students,
        'professors': professors,
        'subjects': subjects,
        'pending_applications': pending_applications,
        'notification': notification,
        'notification_type': notification_type,
    })


@login_required
@role_required('admin')
def application_details(request, request_id):
    request_obj = StudentRequest.objects.get(id=request_id, university=request.user.university)
    student = request_obj.student
    enrollments = Enrollment.objects.filter(student=student).select_related('subject', 'grade')

    return render(request, 'application_details.html', {
        'request': request_obj,
        'student': student,
        'enrollments': enrollments,
    })


@login_required
@role_required('super_admin')
def super_admin_dashboard(request):
    universities = University.objects.all()
    university_stats = [
        {
            'university': university,
            'student_count': User.objects.filter(university=university, role='student').count()
        }
        for university in universities
    ]
    pending_requests = StudentRequest.objects.filter(status='admin_approved').prefetch_related('student_grades')
    mandatory_subjects = MandatorySubject.objects.all()

    notification = request.GET.get('notification')
    notification_type = request.GET.get('notification_type')

    if request.method == 'POST':
        action = request.POST.get('action')

        # Обработка добавления университета к обязательному предмету
        if action == 'add':
            subject_id = request.POST.get('subject_id')
            university_id = request.POST.get('university_id')

            try:
                subject = MandatorySubject.objects.get(id=subject_id)
                university = University.objects.get(id=university_id)

                # Проверяем, не привязан ли уже университет
                if university not in subject.universities.all():
                    subject.universities.add(university)
                    notification = f"University {university.name} added to subject {subject.name}!"
                    notification_type = 'success'
                else:
                    notification = f"University {university.name} is already assigned to subject {subject.name}."
                    notification_type = 'error'
            except (MandatorySubject.DoesNotExist, University.DoesNotExist):
                notification = "Error adding university to subject."
                notification_type = 'error'

            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/super_admin/?{params}")

        # Обработка approve/deny для StudentRequest
        request_id = request.POST.get('request_id')
        try:
            request_obj = StudentRequest.objects.get(id=request_id, status='admin_approved')
            student = request_obj.student

            if action == 'approve':
                request_obj.status = 'super_approved'
                request_obj.save()
                student.status = 'passed'
                student.save()
                Notification.objects.create(
                    recipient=student,
                    sender=request.user,
                    message=f"Your application has been fully approved by Super Admin!",
                    action='application_super_approved'
                )
                notification = f"Application of {student.username} approved!"
                notification_type = 'success'
            elif action == 'deny':
                reason = request.POST.get('reason', 'No reason provided')
                request_obj.status = 'denied'
                request_obj.deny_reason = reason
                request_obj.save()
                Notification.objects.create(
                    recipient=student,
                    sender=request.user,
                    message=f"Unfortunately, {student.username}, your request has been denied by Super Admin: {reason}",
                    action='application_denied'
                )
                notification = f"Application of {student.username} denied!"
                notification_type = 'error'
        except StudentRequest.DoesNotExist:
            notification = "Request not found or already processed."
            notification_type = 'error'

        params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
        return redirect(f"/super_admin/?{params}")

    return render(request, 'super_admin_dashboard.html', {
        'university_stats': university_stats,
        'pending_requests': pending_requests,
        'mandatory_subjects': mandatory_subjects,
        'universities': universities,
        'notification': notification,
        'notification_type': notification_type,
    })


@login_required
@role_required('super_admin')
def register_university(request):
    notification = None
    notification_type = None
    if request.method == 'POST':
        name = request.POST['name']
        if University.objects.filter(name=name).exists():
            notification = 'University with this name already exists'
            notification_type = 'error'
        else:
            University.objects.create(name=name)
            notification = f'University {name} successfully registered'
            notification_type = 'success'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/super_admin/?{params}")
    return render(request, 'register_university.html', {
        'notification': notification,
        'notification_type': notification_type,
    })


@login_required
@role_required('super_admin')
def register_mandatory_subject(request):
    notification = None
    notification_type = None
    universities = University.objects.all()
    if request.method == 'POST':
        name = request.POST['name']
        selected_universities = request.POST.getlist('universities')  # Получаем список выбранных университетов
        if MandatorySubject.objects.filter(name=name).exists():
            notification = 'Mandatory subject with this name already exists'
            notification_type = 'error'
        else:
            # Создаём обязательный предмет
            subject = MandatorySubject.objects.create(name=name)
            subject.universities.set(selected_universities)  # Устанавливаем выбранные университеты

            # Создаём объекты Subject для каждого выбранного университета
            for university_id in selected_universities:
                university = University.objects.get(id=university_id)
                # Генерируем уникальный код для предмета
                code = f"MAND-{subject.id}-{university.id}"
                new_subject, created = Subject.objects.get_or_create(
                    university=university,
                    name=subject.name,
                    code=code,
                    is_mandatory=True,
                    mandatory_subject=subject,
                    defaults={'professor': None}
                )
                # Если предмет новый, регистрируем всех студентов университета
                if created:
                    students = User.objects.filter(university=university, role='student')
                    for student in students:
                        Enrollment.objects.get_or_create(student=student, subject=new_subject, semester=1)

            notification = f'Mandatory subject {name} successfully registered and added to selected universities'
            notification_type = 'success'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/super_admin/?{params}")
    return render(request, 'register_mandatory_subject.html', {
        'notification': notification,
        'notification_type': notification_type,
        'universities': universities,
    })


@login_required
@role_required('super_admin')
def register_admin(request):
    notification = None
    notification_type = None
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        university_id = request.POST['university_id']
        university = University.objects.get(id=university_id)

        if university.admin:
            notification = f'University {university.name} already has an admin: {university.admin.username}'
            notification_type = 'error'
        elif User.objects.filter(username=username).exists():
            notification = 'Admin with this login already exists'
            notification_type = 'error'
        else:
            admin = User.objects.create_user(
                username=username,
                password=password,
                role='admin',
                university=university
            )
            university.admin = admin
            university.save()
            notification = f'Admin {username} successfully registered for {university.name}'  # Изменено здесь
            notification_type = 'success'
            params = urllib.parse.urlencode({'notification': notification, 'notification_type': notification_type})
            return redirect(f"/super_admin/?{params}")

    return render(request, 'register_admin.html', {
        'notification': notification,
        'notification_type': notification_type,
        'universities': University.objects.all(),
    })


@csrf_exempt
@login_required
@role_required('super_admin')
def approve_request(request, request_id):
    if request.method == 'POST':
        request_obj = StudentRequest.objects.get(id=request_id)
        request_obj.status = 'super_approved'
        request_obj.save()
        Notification.objects.create(
            recipient=request_obj.student,
            message=f"Congratulations, {request_obj.student.username}! Your application has been fully approved.",
            action='application_approved'
        )
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})


@csrf_exempt
@login_required
@role_required('super_admin')
def deny_request(request, request_id):
    if request.method == 'POST':
        request_obj = StudentRequest.objects.get(id=request_id)
        request_obj.status = 'denied'
        request_obj.deny_reason = request.POST.get('reason', 'No reason provided')
        request_obj.save()
        Notification.objects.create(
            recipient=request_obj.student,
            message=f"Unfortunately, {request_obj.student.username}, your application has been denied by Super Admin: {request_obj.deny_reason}",
            action='application_denied'
        )
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})


@login_required
def notifications_view(request):
    notifications = request.user.notifications.all().order_by('-created_at')
    has_unread_notifications = notifications.filter(is_read=False).exists()
    if request.method == 'POST' and 'mark_read' in request.POST:
        notifications.update(is_read=True)
        return redirect('notifications')

    return render(request, 'notifications.html', {
        'notifications': notifications,
        'has_unread_notifications': has_unread_notifications,
    })

@login_required
def set_theme(request):
    if request.method == 'POST':
        theme = request.POST.get('theme', 'day')  # По умолчанию день
        request.session['theme'] = theme
    return redirect(request.META.get('HTTP_REFERER', '/'))

@login_required
def manage_mandatory_subject_universities(request):
    if request.method == "POST":
        subject_id = request.POST.get("subject_id")
        university_id = request.POST.get("university_id")
        action = request.POST.get("action")

        subject = MandatorySubject.objects.get(id=subject_id)
        university = University.objects.get(id=university_id)

        if action == "add" and university not in subject.universities.all():
            subject.universities.add(university)
        elif action == "remove" and university in subject.universities.all():
            subject.universities.remove(university)

        return redirect('super_admin_dashboard')

    return redirect('super_admin_dashboard')