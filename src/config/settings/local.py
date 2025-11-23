from __future__ import annotations

from .base import *  # noqa: F401, F403

DEBUG = True

# WP08: Security enforcement mode for Constitutional Engine integration
SECURITY_ENFORCEMENT_MODE = "advisory"

# Email Configuration (Development)
# Prints emails to console instead of sending via SMTP
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_FROM = "noreply@localhost"
