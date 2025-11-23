from __future__ import annotations

import os
from pathlib import Path

from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parents[2]


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", get_random_secret_key())

DEBUG = False

ALLOWED_HOSTS: list[str] = []

# Custom User Model
AUTH_USER_MODEL = "accounts.User"


INSTALLED_APPS = [
    "accounts.apps.AccountsConfig",  # Must be before admin
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party apps
    "rest_framework",
    # Core-App modules
    "constitution_engine",
    "security_baseline",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",  # Language detection and activation
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Session Configuration
# 24 hours inactive timeout OR 7 days absolute (whichever comes first)
SESSION_ENGINE = "django.contrib.sessions.backends.db"  # Database-backed
SESSION_COOKIE_AGE = 604800  # 7 days in seconds (absolute timeout)
SESSION_SAVE_EVERY_REQUEST = False  # Only save when modified
SESSION_COOKIE_HTTPONLY = True  # Security: no JS access
SESSION_COOKIE_SAMESITE = "Lax"  # CSRF protection
SESSION_COOKIE_SECURE = False  # Set to True in production (HTTPS only)

# Custom: Inactive timeout enforced via middleware (24 hours)
SESSION_INACTIVITY_TIMEOUT = 86400  # 24 hours in seconds


# Internationalization and Localization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

# Default language for all server-rendered content
LANGUAGE_CODE = "en-us"

# UTC for all server-side datetime operations
TIME_ZONE = "UTC"

# Enable Django translation system
USE_I18N = True

# Enable localized formatting (deprecated Django 5.0+, but harmless)
USE_L10N = True

# Store datetimes as timezone-aware (UTC)
USE_TZ = True

# Available languages for content translation
# Additional languages can be added without code changes
LANGUAGES = [
    ("en", "English"),
]

# Translation file directories
# Per-app locale/ directories are auto-detected (e.g., src/<app>/locale/)
LOCALE_PATHS = [
    BASE_DIR / "locale",  # Centralized translations for core messages
]


STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# WP13: Security enforcement mode configuration (FR-024)
# Controls how security violations are handled:
# - "strict": Block startup on violations (production default)
# - "advisory": Log violations but allow startup (development default)
# - "mixed": Block on CRITICAL, warn on HIGH/MEDIUM (staging default)
SECURITY_ENFORCEMENT_MODE = os.getenv("SECURITY_ENFORCEMENT_MODE", "strict")

# WP13: Environment detection for security profiles
# Used by ManifestLoader to select appropriate security configuration
ENVIRONMENT = os.getenv("DJANGO_ENV", "local")


# Django REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}
