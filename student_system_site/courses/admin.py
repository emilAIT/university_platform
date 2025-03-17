from django.contrib import admin
from .models import Course

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'university', 'teacher', 'capacity')
    list_filter = ('university',)
    search_fields = ('name',)

    filter_horizontal = ('students',)


    def student_count(self, obj):
          return obj.student_count()
    student_count.short_description = 'Number of Students'
