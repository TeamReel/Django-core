from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parents[2]

# Ensure logs directory exists
LOGS_DIR = Path(BASE_DIR).parent / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", get_random_secret_key())

DEBUG = False

ALLOWED_HOSTS: list[str] = []

# Custom User Model
AUTH_USER_MODEL = "accounts.User"


INSTALLED_APPS = [
    "django_prometheus",  # Must be first for middleware instrumentation
    # B14: Web UI - Must be before accounts for template override
    "web_ui.apps.WebUIConfig",
    "accounts.apps.AccountsConfig",  # Must be before admin
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party apps
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",  # B13: JWT token blacklist
    "drf_spectacular",  # B13: OpenAPI documentation
    # Core-App modules
    "constitution_engine",
    "security_baseline",
    "organisations.apps.OrganisationsConfig",
    "projects.apps.ProjectsConfig",
    "permissions.apps.PermissionsConfig",  # Hierarchical RBAC system
    "audit.apps.AuditConfig",  # Audit logging system
    "settings.apps.SettingsConfig",  # Settings & Feature Flags (B10)
    "transactions.apps.TransactionsConfig",  # Transaction & Credits Engine (B11)
    "i18n_preferences.apps.I18nPreferencesConfig",  # User & Org i18n Preferences (B12)
    "api",  # B13: API Foundation & Standards
    "tasks.apps.TasksConfig",  # B15: Tasks & Scheduling Foundation
    "observability.apps.ObservabilityConfig",  # B18: Platform Observability Foundation
    "notifications.apps.NotificationsConfig",  # B16: Notifications Baseline
    "contextual_notifications.apps.ContextualNotificationsConfig",  # B17: Contextual Notification Service
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
    "i18n_preferences.middleware.PreferenceLocaleMiddleware",  # B12: User/org language activation
    "i18n_preferences.middleware.PreferenceTimezoneMiddleware",  # B12: User/org timezone activation
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
                # B14: Web UI navigation context
                "web_ui.context_processors.navigation.navigation_context",
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
        "api.authentication.CustomJWTAuthentication",  # B13: JWT with inactive user check (FR-005a)
        "rest_framework.authentication.SessionAuthentication",  # B13: Fallback for web clients
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        # B13 WP03: Consistent response envelope
        "api.renderers.EnvelopeJSONRenderer",
    ],
    # B13 WP03: Consistent error handling
    "EXCEPTION_HANDLER": "api.exceptions.envelope_exception_handler",
    # B13 WP04: Pagination with metadata
    "DEFAULT_PAGINATION_CLASS": "api.pagination.BaseAPIPagination",
    # B13 WP04: Rate limiting (FR-020, FR-021)
    "DEFAULT_THROTTLE_CLASSES": [
        "api.throttling.AuthenticatedUserThrottle",  # 100/min for authenticated
        "api.throttling.AnonymousUserThrottle",  # 10/min for anonymous
    ],
    "PAGE_SIZE": 50,
    # B13 WP06: OpenAPI schema generation
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# B13: JWT Authentication Configuration (djangorestframework-simplejwt)
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),  # Short-lived for security
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),  # Allow persistent sessions
    "ROTATE_REFRESH_TOKENS": True,  # Generate new refresh on each refresh
    "BLACKLIST_AFTER_ROTATION": True,  # Invalidate old refresh tokens
    "ALGORITHM": "HS256",  # Standard HMAC SHA-256
    "SIGNING_KEY": SECRET_KEY,  # Use Django's secret key
    "AUTH_HEADER_TYPES": ("Bearer",),  # Authorization: Bearer <token>
    "USER_ID_FIELD": "id",  # B05 User model uses 'id'
    "USER_ID_CLAIM": "user_id",  # JWT payload field name
}

# B13 WP06: OpenAPI Documentation Configuration (drf-spectacular)
SPECTACULAR_SETTINGS = {
    "TITLE": "Django Core API",
    "DESCRIPTION": "Product-agnostic Django core application API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,  # Don't serve schema at /api/schema/ unless explicitly requested
    "SCHEMA_PATH_PREFIX": r"/api/v1",  # Only document versioned APIs
    "COMPONENT_SPLIT_REQUEST": True,  # Separate request/response schemas
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,  # Enable deep linking for operations and tags
        "persistAuthorization": True,  # Persist authorization data in localStorage
        "displayOperationId": False,  # Hide operation IDs for cleaner UI
    },
    "AUTHENTICATION_WHITELIST": [],  # Disable auto-detection, use manual SecurityScheme
    "APPEND_COMPONENTS": {
        "securitySchemes": {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
        }
    },
    "SECURITY": [{"BearerAuth": []}],  # Apply JWT auth globally
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
PERMISSIONS_AUDIT_BACKEND = "permissions.audit.DjangoLoggingBackend"  # Default to Django logging

# Logging Configuration
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
        "json": {
            "format": "{message}",  # Message already JSON from audit backend
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "audit_file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOGS_DIR / "permissions_audit.log"),
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "formatter": "json",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
        },
        "permissions": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "permissions.audit": {
            "handlers": ["audit_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# ==============================================================================
# Celery Configuration (B15)
# ==============================================================================
# Import Celery settings after TIME_ZONE is defined
from .celery import *  # noqa

# ==============================================================================
# Web UI Configuration (B14)
# ==============================================================================

SITE_NAME = "Django Core"  # Used in page titles (<title> tag) and branding (header)

# ==============================================================================
# Observability Configuration (B18)
# ==============================================================================

# Health Checks
OBSERVABILITY_HEALTH_CHECKS_ENABLED = True  # Enable /health/live and /health/ready endpoints

# Structured Logging (WP02 - to be implemented)
OBSERVABILITY_LOGGING_JSON = False  # Enable JSON-formatted logs (requires WP02)
OBSERVABILITY_PII_REDACTION_ENABLED = True  # Enable PII redaction filter

# Metrics (WP03 - to be implemented)
OBSERVABILITY_METRICS_ENABLED = False  # Enable metric collection (requires WP03)
OBSERVABILITY_METRICS_EXPORTER = "prometheus"  # Options: prometheus, statsd
