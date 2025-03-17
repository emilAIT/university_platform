from django.db import models
from users.models import User
from courses.models import Course


# Enrollment Model
class Enrollment(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,  # Deleting user removes enrollment
        limit_choices_to={'role': 'student'},
        related_name="enrollments"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,  # Deleting course removes enrollments
        related_name="enrollments"
    )

    grade = models.FloatField(null=True, blank=True)
