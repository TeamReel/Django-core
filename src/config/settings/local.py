from __future__ import annotations

import os

from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]  # For testing

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
