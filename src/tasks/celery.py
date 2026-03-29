"""
Celery application configuration for Django Core-App.

This module initializes the Celery app with Django settings and autodiscovery.
All task modules are automatically discovered from INSTALLED_APPS.
"""

import logging
import os

from celery import Celery

logger = logging.getLogger(__name__)

# Set default Django settings module.
#
# Important: Railway services (celery-worker / celery-beat) may not explicitly set
# DJANGO_SETTINGS_MODULE. If Celery defaults to local settings in that case, it can
# end up using sqlite + memory broker, and never see jobs created by the production
# backend (Postgres/Redis). This manifests as VideoJobs stuck in "queued".
if not os.environ.get("DJANGO_SETTINGS_MODULE"):
    running_on_railway = bool(os.environ.get("RAILWAY_ENVIRONMENT"))
    has_production_env = bool(os.environ.get("DATABASE_URL") or os.environ.get("REDIS_URL"))

    if running_on_railway or has_production_env:
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
    else:
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

app = Celery("django_core")

# Load task config from Django settings with CELERY_ namespace
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    logger.debug("Request: %r", self.request)
