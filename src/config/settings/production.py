from __future__ import annotations

import os

import dj_database_url
from django.core.management.utils import get_random_secret_key

from .base import *  # noqa: F401, F403

# Security: DEBUG must be False in production
DEBUG = False

# Security: SECRET_KEY from environment (required at runtime)
# Note: Uses fallback during build phase (collectstatic) when env vars aren't available
SECRET_KEY = env("SECRET_KEY", default=os.getenv("SECRET_KEY", get_random_secret_key()))

# Security: ALLOWED_HOSTS from environment
# Format: comma-separated list, e.g., ".onrender.com,myapp.com"
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[".onrender.com"])

# Security: Force HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Security: Additional headers
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# WP08: Security enforcement mode for Constitutional Engine integration
SECURITY_ENFORCEMENT_MODE = "strict"

# Database: PostgreSQL via DATABASE_URL (Render provides this)
DATABASES = {
    "default": dj_database_url.config(
        conn_max_age=600,  # Connection pooling (10 minutes)
        conn_health_checks=True,  # Enable connection health checks
        ssl_require=True,  # Require SSL for database connections
    )
}

# Static Files: Whitenoise for serving static files
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

# Cache: Redis (via REDIS_URL from Render)
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,
        },
        "KEY_PREFIX": "django-core",
    }
}

# Celery: Redis broker and result backend
CELERY_BROKER_URL = env("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = env("REDIS_URL")

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
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:3000",  # Local dev
        "http://localhost:5173",  # Vite dev
        # Add your deployed frontend URLs here:
        # "https://django-core-demo.vercel.app",
        # "https://django-core-demo.netlify.app",
    ],
)

# CSRF: Trust frontend domains
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "https://*.onrender.com",
        # Add your deployed frontend URLs here:
        # "https://django-core-demo.vercel.app",
        # "https://django-core-demo.netlify.app",
    ],
)

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
