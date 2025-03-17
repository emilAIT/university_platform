from django.db import models
from django.contrib.auth.models import AbstractUser
from universities.models import University

# User Model
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    
    university = models.ForeignKey(
        'universities.University',
        on_delete=models.SET_NULL,  # Prevents deletion errors
        null=True, blank=True,
        related_name='students'
    )

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_set',
        blank=True
    )

    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_permissions_set',
        blank=True
    )

    graduation_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ], default='pending')

    def get_taken_courses_count(self):
      return self.courses.filter(university=self.university).count()


from django.contrib.postgres.fields import JSONField

class GraduationRequest(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'student'},
        related_name="graduation_requests"
    )
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending'
    )
    total_courses = models.IntegerField(default=0)  # Unique courses count
    submitted_at = models.DateTimeField(auto_now_add=True)

    # Remove the average_grade field and use the JSONField for course averages
    per_course_averages = models.JSONField(default=dict)  # For Django 4.0+ or later

    def __str__(self):
        return f"{self.student.username} - {self.status}"