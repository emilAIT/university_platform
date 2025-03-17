from django.contrib import admin
from django.urls import path, include
from universities.views import university_list

urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', include('users.urls')),
    path('courses/', include('courses.urls')),
    path('', university_list, name='home'),
    path('', include('universities.urls')),
]




# path('api/', include('universities.urls')),