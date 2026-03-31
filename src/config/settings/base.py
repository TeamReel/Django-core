from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

import environ
from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parents[2]

env = environ.Env()

# Ensure logs directory exists (handle permission errors in production)
LOGS_DIR = Path(BASE_DIR).parent / "logs"
try:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
except (PermissionError, OSError):
    # In production environments like Railway/Docker, use /tmp for logs
    LOGS_DIR = Path("/tmp/logs")
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
    "dashboard.apps.TeamReelAdminConfig",  # F34: Custom admin with monitoring dashboard
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    # Third-party apps
    "corsheaders",  # CORS headers for frontend dev
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",  # B13: JWT token blacklist
    "drf_spectacular",  # B13: OpenAPI documentation
    "channels",  # B23: WebSocket Infrastructure
    "rtc_websockets.apps.RtcWebsocketsConfig",  # B23: Real-time WebSocket
    # Core-App modules
    "constitution_engine",
    "security_baseline",
    "organisations.apps.OrganisationsConfig",
    "projects.apps.ProjectsConfig",
    "permissions.apps.PermissionsConfig",  # Hierarchical RBAC system
    "audit.apps.AuditConfig",  # Audit logging system
    "settings.apps.SettingsConfig",  # Settings & Feature Flags (B10)
    "transactions.apps.TransactionsConfig",  # Transaction & Credits Engine (B11)
    "credits.apps.CreditsConfig",  # Credits Balance (organisation-scoped)
    "i18n_preferences.apps.I18nPreferencesConfig",  # User & Org i18n Preferences (B12)
    "api",  # B13: API Foundation & Standards
    "tasks.apps.TasksConfig",  # B15: Tasks & Scheduling
    "search.apps.SearchConfig",  # Search Engine
    "observability.apps.ObservabilityConfig",  # B18: Observability
    "notifications.apps.NotificationsConfig",  # B16: Notifications
    # B17: Contextual Notification Service
    "contextual_notifications.apps.ContextualNotificationsConfig",
    # B22: File & Media Management
    "files.apps.FilesConfig",
    # B20: CLI & Scaffolding
    "scaffolding",
    # B30: Activities & Period Hierarchy
    "activities.apps.ActivitiesConfig",
    # B31: Content Templates & Generation
    "src.content_generation.apps.ContentGenerationConfig",
    # B32: Sport Configuration & Templates
    "sport_configuration.apps.SportConfigurationConfig",
    # B33: Brand Identity Manager
    "branding.apps.BrandingConfig",
    # B34: Generative Pipelines - AI Content Generation Factory
    "src.generative.apps.GenerativeConfig",
    # B35: Smart Asset Library - Media & File Management
    "medialib.apps.MedialibConfig",
    # B37: Workflow Engine & State Machine
    "src.workflows.apps.WorkflowsConfig",
    # B41: User Navigation State
    "navigation.apps.NavigationConfig",
    # B55: Video Processing Pipeline
    "src.video.apps.VideoConfig",
    # B62: Activity Feed
    "activity_feed.apps.ActivityFeedConfig",
    # B46: Soft Delete & Trash
    "trash.apps.TrashConfig",
    # F34: Admin Monitoring Dashboard
    "dashboard.apps.DashboardConfig",
]

MIDDLEWARE = [
    # Must be first
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    # CORS - must be before CommonMiddleware
    "corsheaders.middleware.CorsMiddleware",
    # WP02: Correlation ID extraction/generation
    "observability.middleware.CorrelationIDMiddleware",
    # WP03: HTTP request metrics (T038)
    "observability.middleware.HTTPMetricsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "accounts.middleware.SessionInactivityMiddleware",  # Enforce inactivity timeout
    "django.middleware.locale.LocaleMiddleware",  # Language detection and activation
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "config.middleware.csrf.EnsureCSRFCookieMiddleware",  # Ensure CSRF cookie for SPA
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
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    )
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

# Channel Layer Configuration
# B23: Redis channel layer for WebSocket communication
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
            "capacity": 1500,  # Message capacity per channel
            "expiry": 10,  # Message expiry in seconds
        },
    },
}

# Rate Limiting Configuration
# Used by organisations app for creation and invitation limits
ORGANISATION_RATE_LIMITS = {
    "create_org_per_user_per_day": 5,
    "invite_member_per_org_per_hour": 20,
}

# Video Processing Pipeline (B55)
VIDEO_MAX_FILE_SIZE = int(os.getenv("VIDEO_MAX_FILE_SIZE_MB", 2048)) * 1024 * 1024
VIDEO_MAX_DURATION = int(os.getenv("VIDEO_MAX_DURATION_SECONDS", 900))
VIDEO_TEMP_DIR = os.getenv("VIDEO_TEMP_DIR", os.path.join(os.getenv("TEMP", "/tmp"), "video_jobs"))


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
SESSION_COOKIE_SAMESITE = env("SESSION_COOKIE_SAMESITE", default="Lax")  # CSRF protection
SESSION_COOKIE_SECURE = False  # Set to True in production (HTTPS only)

# Custom: Inactive timeout enforced via middleware (24 hours)
SESSION_INACTIVITY_TIMEOUT = 86400  # 24 hours in seconds

# CSRF Configuration
# Ensure CSRF cookie is sent with every response for SPA compatibility
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to read CSRF token
CSRF_COOKIE_SAMESITE = env("CSRF_COOKIE_SAMESITE", default="Lax")  # CSRF protection
CSRF_COOKIE_SECURE = False  # Set to True in production (HTTPS only)
CSRF_USE_SESSIONS = False  # Use cookie-based CSRF tokens (not session)
CSRF_COOKIE_NAME = "csrftoken"  # Default cookie name


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

# Media uploads (avatars, etc.)
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")

# Default to a project-level media folder, but fall back to /tmp if the
# filesystem is read-only (common on Railway/containers).
_default_media_root = Path(BASE_DIR).parent / "media"
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", str(_default_media_root)))
try:
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
except (PermissionError, OSError):
    MEDIA_ROOT = Path("/tmp/media")
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

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

# =============================================================================
# FETCH GUARDRAILS (B40)
# =============================================================================
# Pagination guardrails to prevent frontend over-fetching

# Master switch (can be overridden by feature flag)
FETCH_GUARDRAIL_ENABLED = True

# Default limits
FETCH_GUARDRAIL_MAX_PAGES = 5
FETCH_GUARDRAIL_MAX_ITEMS = 500

# Warning threshold (log warning when usage exceeds this percentage)
FETCH_GUARDRAIL_WARNING_THRESHOLD = 0.8

# Optimistic create support
OPTIMISTIC_CREATE_ENABLED = True

# Observability logging
FETCH_GUARDRAIL_OBSERVABILITY_ENABLED = True

# Feature Flag Keys (B10 Integration)
# These flags can override the settings above at runtime:
# - frontend_fetch_guardrails_enabled (bool): Master switch
# - frontend_fetch_max_pages_default (int): Override FETCH_GUARDRAIL_MAX_PAGES
# - frontend_fetch_max_items_default (int): Override FETCH_GUARDRAIL_MAX_ITEMS
# - frontend_optimistic_create_enabled (bool): Override OPTIMISTIC_CREATE_ENABLED
# - frontend_fetch_observability_enabled (bool): Override FETCH_GUARDRAIL_OBSERVABILITY_ENABLED
# Note: Feature flags take precedence over settings at runtime

# Per-endpoint overrides (optional)
# Keys are URL path patterns, values are dicts with 'max_pages' and/or 'max_items'
# Example:
# FETCH_GUARDRAIL_OVERRIDES = {
#     '/api/v1/activities/': {'max_pages': 10, 'max_items': 1000},
#     '/api/v1/audit-logs/': {'max_pages': 20},
# }
FETCH_GUARDRAIL_OVERRIDES: dict[str, dict[str, int]] = {}

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

# B23: WebSocket JWT Configuration
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", SECRET_KEY)
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

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


# Password Reset Configuration
# Django's default_token_generator uses PASSWORD_RESET_TIMEOUT setting
# Token expires after 1 hour (3600 seconds)
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour in seconds

# Permissions System Configuration
PERMISSIONS_CACHE_PREFIX = "perms"  # Cache key prefix for permission evaluations
PERMISSIONS_CACHE_TTL = 300  # 5 minutes (for Redis cache in permission evaluations)
PERMISSIONS_AUDIT_BACKEND = (
    "permissions.audit.B09Backend"  # Use B09 adapter (supports internal audit app)
)

# =============================================================================
# SOFT DELETE & TRASH (B46)
# =============================================================================
# Default retention period in days (how long items stay in trash before expiry)
SOFT_DELETE_RETENTION_DAYS = int(os.getenv("SOFT_DELETE_RETENTION_DAYS", "30"))

# Per-model retention overrides (optional)
# SOFT_DELETE_RETENTION_OVERRIDES = {
#     "content_generation.ContentItem": 60,  # Content stays 60 days
#     "files.FileAsset": 14,  # Files only 14 days
# }

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
# Search Hierarchy Configuration (B39 Feature 045)
# ==============================================================================

# Registry of hierarchy resolvers - maps content type labels to resolver classes
# Format: {"app_label.model": "dotted.path.to.ResolverClass"}
SEARCH_HIERARCHY_RESOLVERS: dict[str, str] = {
    "organisations.organisation": "search.hierarchy.resolvers.OrganisationHierarchyResolver",
    "projects.project": "search.hierarchy.resolvers.ProjectHierarchyResolver",
    "projects.projectmembership": "search.hierarchy.resolvers.ProjectMembershipHierarchyResolver",
    "activities.period": "search.hierarchy.resolvers.PeriodHierarchyResolver",
    "activities.activity": "search.hierarchy.resolvers.ActivityHierarchyResolver",
}

# List of searchable anchor types for hierarchical navigation
# Types listed here can be used as the root of a hierarchy tree
SEARCH_HIERARCHY_ANCHOR_TYPES: list[str] = [
    "organisations.organisation",
    "projects.project",
    "projects.projectmembership",
    "activities.period",
]

# Maximum depth for hierarchy traversal
# TeamReel hierarchy: Org(0) → Club(1) → Team(2) → Season(3) → Competition(4) → Match(5)
SEARCH_HIERARCHY_MAX_DEPTH = int(os.getenv("SEARCH_HIERARCHY_MAX_DEPTH", "6"))

# Maximum total nodes in a single hierarchy response (default: 100)
SEARCH_HIERARCHY_MAX_NODES = int(os.getenv("SEARCH_HIERARCHY_MAX_NODES", "100"))

# Maximum siblings per level (to prevent massive trees) (default: 50)
SEARCH_HIERARCHY_PER_LEVEL_LIMIT = int(os.getenv("SEARCH_HIERARCHY_PER_LEVEL_LIMIT", "50"))

# Enable/disable hierarchical navigation feature
SEARCH_HIERARCHY_ENABLED = os.getenv("SEARCH_HIERARCHY_ENABLED", "true").lower() == "true"

# ==============================================================================
# Transactions Configuration (B11)
# ==============================================================================

# Default payer routing for debits when caller does not specify payer_routing.
# Options:
# - explicit
# - user_project_org
# - project_user_org
TRANSACTIONS_PAYER_ROUTING_DEFAULT = os.getenv(
    "TRANSACTIONS_PAYER_ROUTING_DEFAULT",
    "explicit",
)

# ==============================================================================
# Navigation Configuration (B41: User Navigation State)
# ==============================================================================

# Maximum number of recent items to keep per user (hard cap)
NAVIGATION_RECENTS_MAX_COUNT = int(os.getenv("NAVIGATION_RECENTS_MAX_COUNT", "50"))

# Retention period for recent items (in days), after which they may be pruned
NAVIGATION_RECENTS_RETENTION_DAYS = int(os.getenv("NAVIGATION_RECENTS_RETENTION_DAYS", "90"))

# ==============================================================================
# Observability Configuration (B18)
# ==============================================================================

# Health Checks
OBSERVABILITY_HEALTH_CHECKS_ENABLED = True  # Enable /health/live and /health/ready endpoints

# Structured Logging (WP02)
OBSERVABILITY_LOGGING_JSON = os.getenv("OBSERVABILITY_LOGGING_JSON", "true").lower() == "true"
OBSERVABILITY_PII_REDACTION_ENABLED = (
    os.getenv("OBSERVABILITY_PII_REDACTION_ENABLED", "true").lower() == "true"
)

# Metrics (WP03 - T043)
OBSERVABILITY_METRICS_ENABLED = os.getenv("OBSERVABILITY_METRICS_ENABLED", "true").lower() == "true"
OBSERVABILITY_METRICS_EXPORTER = os.getenv(
    "OBSERVABILITY_METRICS_EXPORTER", "prometheus"
)  # Options: prometheus, statsd

# Logging Configuration (T023-T025)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "observability.logging.JSONFormatter",
        },
        "standard": {"format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"},
    },
    "filters": {
        "correlation_id": {
            "()": "observability.logging.CorrelationIDFilter",
        },
        "pii_redaction": {
            "()": "observability.logging.PIIRedactionFilter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if OBSERVABILITY_LOGGING_JSON else "standard",
            "filters": (
                ["correlation_id", "pii_redaction"]
                if OBSERVABILITY_PII_REDACTION_ENABLED
                else ["correlation_id"]
            ),
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": os.getenv("SQL_LOG_LEVEL", "WARNING"),
            "propagate": False,
        },
    },
}

from .celery import *  # noqa: E402, F403
