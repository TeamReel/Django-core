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
    "django_prometheus",  # Must be first for middleware instrumentation
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
    "organisations.apps.OrganisationsConfig",
    "projects.apps.ProjectsConfig",
    "permissions.apps.PermissionsConfig",  # Hierarchical RBAC system
]

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",  # Must be first
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "accounts.middleware.SessionInactivityMiddleware",  # Enforce inactivity timeout
    "django.middleware.locale.LocaleMiddleware",  # Language detection and activation
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",  # Must be last
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


# Cache Configuration
# Redis backend for rate limiting and caching
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1")
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "django_core",
        "TIMEOUT": 300,  # 5 minutes default
    }
}

# Rate Limiting Configuration
# Used by organisations app for creation and invitation limits
ORGANISATION_RATE_LIMITS = {
    "create_org_per_user_per_day": 5,
    "invite_member_per_org_per_hour": 20,
}


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "accounts.validators.UppercaseValidator"},
    {"NAME": "accounts.validators.LowercaseValidator"},
    {"NAME": "accounts.validators.NumberValidator"},
    {"NAME": "accounts.validators.SpecialCharacterValidator"},
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

# Email Configuration
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"  # Development default
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@example.com")
EMAIL_SUBJECT_PREFIX = "[Django Core] "

# Session Configuration
SESSION_COOKIE_AGE = 604800  # 7 days (absolute timeout)
SESSION_SAVE_EVERY_REQUEST = False  # Only save on modification
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access
SESSION_COOKIE_SECURE = False  # Set to True in production (HTTPS only)
SESSION_COOKIE_SAMESITE = "Lax"  # CSRF protection

# Password Reset Configuration
# Django's default_token_generator uses PASSWORD_RESET_TIMEOUT setting
# Token expires after 1 hour (3600 seconds)
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour in seconds

# Permissions System Configuration
PERMISSIONS_CACHE_PREFIX = "perms"  # Cache key prefix for permission evaluations
PERMISSIONS_CACHE_TTL = 300  # 5 minutes (for Redis cache in permission evaluations)
