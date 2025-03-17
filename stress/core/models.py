from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator

class University(models.Model):
    name = models.CharField(max_length=255, unique=True)
    admin = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='admin_universities')

    def __str__(self):
        return self.name

    def student_count(self):
        return User.objects.filter(university=self, role='student').count()

class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('professor', 'Professor'),
        ('admin', 'Admin'),
        ('super_admin', 'Super Admin'),
    )
    STATUS_CHOICES = (
        ('active', 'Active'),  # Студент может подавать запросы
        ('passed', 'Passed'),  # Студент прошёл и больше не может подавать запросы
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    university = models.ForeignKey('University', on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')  # Новое поле


    def calculate_gpa(self):
        grades = Grade.objects.filter(enrollment__student=self)
        return grades.aggregate(models.Avg('score'))['score__avg'] or 0

    def get_academic_status(self):
        # Если статус студента уже "passed" (установлен супер админом), возвращаем "passed"
        if self.status == 'passed':
            return "passed"

        # Проверяем только обязательные предметы
        mandatory_grades = Grade.objects.filter(
            enrollment__student=self,
            enrollment__subject__is_mandatory=True
        )
        for grade in mandatory_grades:
            if grade.score < 60:
                return "failed"
        return "active"

    def __str__(self):
        return self.username


class MandatorySubject(models.Model):
    name = models.CharField(max_length=255, unique=True)
    universities = models.ManyToManyField(University, related_name='mandatory_subjects')

    def __str__(self):
        return self.name

class Subject(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    university = models.ForeignKey(University, on_delete=models.CASCADE)
    is_mandatory = models.BooleanField(default=False)
    professor = models.ForeignKey(User, on_delete=models.SET_NULL,
                                 null=True, blank=True,
                                 limit_choices_to={'role': 'professor'},
                                 related_name='subjects')
    mandatory_subject = models.ForeignKey(MandatorySubject, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('code', 'university')

    def __str__(self):
        return f"{self.name} ({self.code})"

class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE,
                              related_name='enrollments',
                              limit_choices_to={'role': 'student'})
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    semester = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('student', 'subject', 'semester')

class Grade(models.Model):
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE, related_name='grade')
    score = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    date_added = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.enrollment.student.username} - {self.enrollment.subject.name}: {self.score}"

class StudentRequest(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requests', limit_choices_to={'role': 'student'})
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='handled_requests', null=True, blank=True, limit_choices_to={'role': 'admin'})
    university = models.ForeignKey(University, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('admin_approved', 'Admin Approved'),
        ('super_approved', 'Super Approved'),
        ('denied', 'Denied')
    ], default='pending')
    deny_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Request by {self.student.username} for {self.university.name}"

class StudentGrade(models.Model):
    """Оценки студентов по обязательным предметам для запросов."""
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_grades', limit_choices_to={'role': 'student'})
    mandatory_subject = models.ForeignKey(MandatorySubject, on_delete=models.CASCADE)
    grade = models.CharField(max_length=10)  # Например, "A", "B", "C" или числовой эквивалент
    request = models.ForeignKey(StudentRequest, on_delete=models.CASCADE, related_name='student_grades', null=True, blank=True)

    def __str__(self):
        return f"{self.student.username} - {self.mandatory_subject.name}: {self.grade}"

class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    action = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.recipient.username}: {self.message} ({'unread' if not self.is_read else 'read'})"