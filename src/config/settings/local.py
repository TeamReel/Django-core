from __future__ import annotations

import os

from corsheaders.defaults import default_headers

from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]  # For testing

# CORS Configuration for frontend development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-organisation-id",
    "x-project-id",
]

# CSRF Trusted Origins (required for POST requests from frontend)
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
]

# Disable throttling in local development (Redis not required)
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # Disable throttling locally

# WP08: Security enforcement mode for Constitutional Engine integration
SECURITY_ENFORCEMENT_MODE = "advisory"

# Email Configuration (Development)
# Prints emails to console instead of sending via SMTP
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_FROM = "noreply@localhost"

# Webhook Configuration (Development/Testing)
# In production, set via environment variable
WEBHOOK_SECRET_KEY = os.environ.get(
    "WEBHOOK_SECRET_KEY", "test-webhook-secret-key-for-development-only"
)

# Use dummy cache and in-memory channel layer for local development if Redis is not available
# This prevents timeouts when Redis is not running
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

# AI Generation (B34) - read from environment
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", None)

# MiniMax / Hailuo Video Generation
MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", None)
MINIMAX_GROUP_ID = os.environ.get("MINIMAX_GROUP_ID", None)

# Runway Gen Video Generation
RUNWAYML_API_SECRET = os.environ.get("RUNWAYML_API_SECRET", None)
