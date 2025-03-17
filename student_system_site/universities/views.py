from django.shortcuts import render
from django.http import JsonResponse
from .models import University
from django.http import HttpResponse

def university_list(request):
    universities = University.objects.all()  # Fetch all universities
    return render(request, 'univers_list/university_list.html', {'universities': universities})




## We need an API to return universities as JSON so the frontend (JavaScript) can fetch and display them