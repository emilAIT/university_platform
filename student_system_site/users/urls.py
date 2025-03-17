from django.urls import path
from .views import user_login, request_graduation
app_name = 'users'

urlpatterns = [
    path('login/', user_login, name='login'),  
    path('request-graduation/', request_graduation, name='request_graduation'),
]
