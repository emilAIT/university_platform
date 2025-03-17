from django import forms
from django.contrib.auth.models import User
from .models import Student, Professor, Course, University, RegisteredCourse

class RegisterCourseForm(forms.ModelForm):
    course = forms.ModelChoiceField(queryset=Course.objects.none(), widget=forms.Select(attrs={
        'class': 'form-control'
    }))

    class Meta:
        model = RegisteredCourse
        fields = ['course']

    def __init__(self, *args, **kwargs):
        student = kwargs.pop('student', None)
        super(RegisterCourseForm, self).__init__(*args, **kwargs)
        if student:
            self.fields['course'].queryset = Course.objects.filter(university=student.university)

class CourseForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = ['name', 'professor']

        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Course Name'
            }),
            'professor': forms.Select(attrs={
                'class': 'form-control'
            })
        }

CourseFormSet = forms.modelformset_factory(Course, form=CourseForm, extra=1, can_delete=True, fields=['name'], widgets={
    'name': forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Course Name'
    })
})

class StudentForm(forms.ModelForm):
    username = forms.CharField(widget=forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Username'
    }))
    password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control',
        'placeholder': 'Password'
    }))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control',
        'placeholder': 'Confirm Password'
    }))

    class Meta:
        model = Student
        fields = []  # Удалите поле university из формы

    def __init__(self, *args, **kwargs):
        super(StudentForm, self).__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['username'].initial = self.instance.user.username

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        if password != confirm_password:
            raise forms.ValidationError("Passwords do not match")

        return cleaned_data

class ProfessorForm(forms.ModelForm):
    username = forms.CharField(widget=forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Username'
    }))
    password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control',
        'placeholder': 'Password'
    }))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control',
        'placeholder': 'Confirm Password'
    }))

    class Meta:
        model = Professor
        fields = []

    def __init__(self, *args, **kwargs):
        super(ProfessorForm, self).__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['username'].initial = self.instance.user.username

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        if password != confirm_password:
            raise forms.ValidationError("Passwords do not match")

        return cleaned_data

class UniversityForm(forms.ModelForm):
    admin_username = forms.CharField(widget=forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Admin Username'
    }))
    admin_password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control',
        'placeholder': 'Admin Password'
    }))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control',
        'placeholder': 'Confirm Password'
    }))

    class Meta:
        model = University
        fields = ['name']

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("admin_password")
        confirm_password = cleaned_data.get("confirm_password")

        if password != confirm_password:
            raise forms.ValidationError("Passwords do not match")

        return cleaned_data

class LoginForm(forms.Form):
    username = forms.CharField(max_length=150, widget=forms.TextInput(attrs={'class': 'form-control'}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control'}))