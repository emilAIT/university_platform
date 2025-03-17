from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, GraduationRequest
from enrollments.models import Enrollment
import logging

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Customizing the displayed fields in the admin user form
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),  # Existing fields
        ('Personal info', {'fields': ('first_name', 'last_name')}),  # Existing fields
        ('Role and University', {'fields': ('role', 'university')}),  # Add role and university fields
    )

    # If you want to add fields while creating a new user
    add_fieldsets = (
        (None, {'fields': ('username', 'email', 'password1', 'password2')}),  # Existing fields
        ('Personal info', {'fields': ('first_name', 'last_name')}),  # Existing fields
        ('Role and University', {'fields': ('role', 'university')}),  # Add role and university fields
    )

    list_display = ('username', 'email', 'role', 'university', 'is_staff', 'is_superuser')
    list_filter = ('role', 'university')
    search_fields = ('username', 'email')


from django.utils.html import format_html

from django.contrib import admin
from django.utils.html import format_html
from .models import GraduationRequest

# Set up logger
logger = logging.getLogger(__name__)

from django.contrib import admin
from django.utils.html import format_html
import logging

logger = logging.getLogger(__name__)
@admin.register(GraduationRequest)
class GraduationRequestAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'university_name', 'status', 'total_courses', 'courses_and_averages', 'submitted_at')
    list_filter = ('status', 'university')  
    search_fields = ('student__username', 'university__name')

    actions = ['approve_graduation', 'reject_graduation']

    def approve_graduation(self, request, queryset):
        # Update the GraduationRequest status
        queryset.update(status='approved')

        # Update the User's graduation status
        for graduation_request in queryset:
            graduation_request.student.graduation_status = 'approved'
            graduation_request.student.save()

        self.message_user(request, "Graduation request approved successfully.")
        
        # Log the approval action
        logger.info(f"Graduation request(s) approved by {request.user.username}. Approved requests: {queryset.count()}")


    def save_model(self, request, obj, form, change):
        # This is triggered when the admin clicks save
        if obj.status == 'approved' and obj.student.graduation_status != 'approved':
            obj.student.graduation_status = 'approved'
            obj.student.save()

        logger.info(f"Graduation request saved for student: {obj.student.username}. Status: {obj.status}")
        
        super().save_model(request, obj, form, change)

    def reject_graduation(self, request, queryset):
        queryset.update(status='rejected')

        # Update the User's graduation status
        for graduation_request in queryset:
            graduation_request.student.graduation_status = 'rejected'
            graduation_request.student.save()

        self.message_user(request, "Graduation request rejected successfully.")
        
        # Log the rejection action
        logger.info(f"Graduation request(s) rejected by {request.user.username}. Rejected requests: {queryset.count()}")

    def student_name(self, obj):
        return obj.student.username
    student_name.admin_order_field = 'student__username'
    student_name.short_description = 'Student'

    def university_name(self, obj):
        return obj.university.name
    university_name.admin_order_field = 'university__name'
    university_name.short_description = 'University'

    def courses_and_averages(self, obj):
        course_details = []
        for course, avg in obj.per_course_averages.items():
            course_details.append(f"{course}: {avg}")
        return format_html("<br>".join(course_details))  
    courses_and_averages.short_description = 'Courses and Averages'
