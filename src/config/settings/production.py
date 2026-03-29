from __future__ import annotations

import dj_database_url
from corsheaders.defaults import default_headers
from django.core.management.utils import get_random_secret_key

from .base import *  # noqa: F401, F403

# Security: DEBUG must be False in production
DEBUG = False

# Security: SECRET_KEY from environment (required at runtime)
# Note: Uses fallback during build phase (collectstatic) when env vars aren't available
SECRET_KEY = env("SECRET_KEY", default=None)
if not SECRET_KEY:
    SECRET_KEY = get_random_secret_key()

# Security: ALLOWED_HOSTS from environment
# Format: comma-separated list, e.g., ".onrender.com,myapp.com"
# Default includes Railway and Render domains, plus localhost for health checks
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=[".onrender.com", ".railway.app", "localhost", "127.0.0.1", "*", ".teamreel.app"],
)
# Ensure teamreel.app is always allowed, even if ALLOWED_HOSTS is set in env
if ".teamreel.app" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(".teamreel.app")

# Security: Force HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# SESSION_COOKIE_SAMESITE = "None"  # Allow cross-site cookies for separated frontend/backend
# CSRF_COOKIE_SAMESITE = "None"
# ITP Fix: Share cookies across subdomains (api.teamreel.app & demo.teamreel.app)
SESSION_COOKIE_DOMAIN = ".teamreel.app"
CSRF_COOKIE_DOMAIN = ".teamreel.app"
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# Security: Additional headers
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_REDIRECT_EXEMPT = [r"^health/"]  # Allow HTTP for health checks

# WP08: Security enforcement mode for Constitutional Engine integration
SECURITY_ENFORCEMENT_MODE = "strict"

# Database: PostgreSQL via DATABASE_URL (Render provides this)
DATABASES = {
    "default": dj_database_url.config(
        conn_max_age=60,  # Reduced to 60s to prevent "too many clients" on shared DBs
        conn_health_checks=True,  # Enable connection health checks
        ssl_require=True,  # Require SSL for database connections
    )
}

# Static Files: Whitenoise for serving static files
STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Middleware: Insert WhiteNoise immediately after SecurityMiddleware
# Robust approach: find SecurityMiddleware index dynamically
try:
    security_index = MIDDLEWARE.index("django.middleware.security.SecurityMiddleware")  # noqa: F405
    MIDDLEWARE.insert(
        security_index + 1, "whitenoise.middleware.WhiteNoiseMiddleware"
    )  # noqa: F405
except (ValueError, NameError):
    # Fallback: append if SecurityMiddleware not found
    MIDDLEWARE.append("whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405

# Cache: Redis (via REDIS_URL from Render/Railway)
# Note: Provides fallback during build phase when env vars aren't available
REDIS_URL = env("REDIS_URL", default=None)

# Treat empty string as None (common in some deployment environments)
if REDIS_URL == "":
    REDIS_URL = None

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "SOCKET_CONNECT_TIMEOUT": 5,
                "SOCKET_TIMEOUT": 5,
                "IGNORE_EXCEPTIONS": True,  # Gracefully degrade when Redis unavailable
            },
            "KEY_PREFIX": "django-core",
        }
    }

    # Celery: Redis broker and result backend
    CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=REDIS_URL)
    CELERY_RESULT_BACKEND = env("REDIS_URL", default=REDIS_URL)

    # Channels: Redis Channel Layer
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        },
    }
else:
    # Fallback: In-memory cache (prevents crashes if Redis is missing)
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake",
        }
    }

    # Fallback: In-memory Channel Layer
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }

    # Fallback: Celery (avoid connecting to missing Redis)
    CELERY_BROKER_URL = "memory://"
    CELERY_RESULT_BACKEND = "cache+memory://"

# Email Configuration (Production)
# Uses SMTP for sending emails
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_FROM = env("EMAIL_FROM", default="noreply@example.com")

# CORS: Allow frontend domains
# Add your Vercel/Netlify frontend domain here
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:3000",  # Local dev
        "http://localhost:5173",  # Vite dev
        "https://django-core-app-production.up.railway.app",
        "https://demo.teamreel.app",
        "https://teamreel.app",
        # Add your deployed frontend URLs here:
        # "https://django-core-demo.vercel.app",
        # "https://django-core-demo.netlify.app",
    ],
)
# Ensure teamreel domains are always allowed for CORS
if "https://demo.teamreel.app" not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append("https://demo.teamreel.app")
if "https://teamreel.app" not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append("https://teamreel.app")

CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-organisation-id",
    "x-organization-id",  # US spelling for file uploads (X-Organization-ID)
    "x-project-id",
]

# CSRF: Trust frontend domains
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "https://*.onrender.com",
        "https://*.railway.app",
        "https://django-core-app-production.up.railway.app",
        "https://demo.teamreel.app",
        "https://teamreel.app",
        "https://api.teamreel.app",
        # Add your deployed frontend URLs here:
        # "https://django-core-demo.vercel.app",
        # "https://django-core-demo.netlify.app",
    ],
)
# Ensure teamreel domains are always trusted for CSRF
if "https://demo.teamreel.app" not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append("https://demo.teamreel.app")
if "https://api.teamreel.app" not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append("https://api.teamreel.app")

# Logging: Structured JSON logging for production
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": env("DJANGO_LOG_LEVEL", default="INFO"),
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "security_baseline": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# ==============================================================================
# AWS S3 / File Storage Configuration (B22/B35)
# ==============================================================================
# Required env vars:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
# Optional env vars:
#   AWS_S3_BUCKET_NAME (default: teamreel-assets-demo)
#   AWS_S3_REGION (default: eu-north-1)

AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default=None)
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default=None)
AWS_S3_BUCKET_NAME = env("AWS_S3_BUCKET_NAME", default="teamreel-assets-demo")
AWS_S3_REGION = env("AWS_S3_REGION", default="eu-north-1")

# Use S3 backend when AWS credentials are configured
if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    FILES_STORAGE_BACKEND = "files.backends.s3.S3StorageBackend"

# ==============================================================================
# AI Generation (B34 Generative Pipelines)
# ==============================================================================
# Google Gemini / Imagen API key for asset generation pipeline
GOOGLE_API_KEY = env("GOOGLE_API_KEY", default=None)

# MiniMax / Hailuo Video Generation
MINIMAX_API_KEY = env("MINIMAX_API_KEY", default=None)
MINIMAX_GROUP_ID = env("MINIMAX_GROUP_ID", default=None)

# Runway Gen Video Generation
RUNWAYML_API_SECRET = env("RUNWAYML_API_SECRET", default=None)

# Pika 2.2 Video Generation (via fal.ai)
FAL_KEY = env("FAL_KEY", default=None)
