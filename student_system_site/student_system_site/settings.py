
from pathlib import Path
import cloudinary
import cloudinary.uploader
import cloudinary_storage
import os

cloudinary.config(
    cloud_name='dw9zgthcn',  # Replace with your actual cloud name
    api_key='334999574182623',  # Replace with your actual API key
    api_secret='xlKo174JpnVu4nBhxdxYtEAxesQ',  # Replace with your actual API secret
)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent



# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-vs2uuj*m1!hb44m%2*fu%y=9@_%h18*i=d)$1@itps05i5dp+q'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []



# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'universities',
    'users',
    'courses',
    'enrollments',
    'cloudinary_storage',
    'cloudinary',

]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'student_system_site.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR/ 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'student_system_site.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = []


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


###
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': 'SSPI',
    'API_KEY': '334999574182623',
    'API_SECRET': 'xlKo174JpnVu4nBhxdxYtEAxesQ'
}

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
###

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # This is where collectstatic will collect files


# This is where Django will look for static files during development
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),  # Adjust the path to 'static' folder. # Global static files
    os.path.join(BASE_DIR, "universities", "static"), # App-level static files
]

AUTH_USER_MODEL = 'users.User'

###

