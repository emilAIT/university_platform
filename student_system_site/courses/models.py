from django.db import models
from users.models import User

# Course Model
class Course(models.Model):
    name = models.CharField(max_length=255)
    
    university = models.ForeignKey(
        'universities.University',
        on_delete=models.CASCADE,  # University deletion removes courses
        related_name="courses"
    )

    teacher = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,  # Avoid deletion errors
        null=True, blank=True,
        limit_choices_to={'role': 'teacher'},
        related_name="teaching_courses"
    )

    capacity = models.PositiveIntegerField()

    students = models.ManyToManyField(
        User,
        related_name='courses',
        limit_choices_to={'role': 'student'},
        blank=True,
        db_constraint=False  # Prevents FK constraint errors
    )

    def __str__(self):
        return self.name
    
    def student_count(self):
        return self.students.count()
