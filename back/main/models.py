from django.db import models
from django.contrib.auth.models import User

class University(models.Model):
    name = models.CharField(max_length=100)
    admin = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_university', null=True, blank=True)

    def __str__(self):
        return self.name

class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    university = models.ForeignKey(University, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.username

class Professor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    university = models.ForeignKey(University, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.username

class Course(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    professor = models.ForeignKey(Professor, on_delete=models.SET_NULL, null=True, blank=True)
    university = models.ForeignKey(University, on_delete=models.CASCADE)
    is_mandatory = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class RegisteredCourse(models.Model):
    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    grade = models.CharField(max_length=10)

    def __str__(self):
        return f"{self.student.user.username} - {self.course.name}"

class Notification(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    gpa = models.FloatField()
    accepted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.student.user.username} - GPA: {self.gpa}"

class StudentNotification(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.student.user.username}"