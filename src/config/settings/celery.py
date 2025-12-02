"""
Celery configuration for async task execution.

Settings loaded via CELERY_ namespace from Django settings.
Supports environment-specific broker URLs via environment variables.
"""

import environ
from celery.schedules import crontab

env = environ.Env()

# Broker Configuration
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/0")

# Result Backend Configuration (lightweight status tracking)
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://localhost:6379/0")
CELERY_RESULT_EXTENDED = True  # Store task args/kwargs for debugging
CELERY_RESULT_EXPIRES = 86400  # 24 hours TTL

# Task Execution Settings
CELERY_TASK_TRACK_STARTED = True  # Track 'STARTED' state
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes hard timeout
CELERY_TASK_SOFT_TIME_LIMIT = 270  # 4.5 minutes soft timeout
CELERY_TASK_ACKS_LATE = True  # Acknowledge after task completion (for reliability)
CELERY_TASK_REJECT_ON_WORKER_LOST = True  # Requeue if worker crashes

# Serialization (security: JSON only)
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]

# Timezone Configuration
# Will use Django's TIME_ZONE setting
CELERY_ENABLE_UTC = True

# Worker Configuration
CELERY_WORKER_PREFETCH_MULTIPLIER = 4  # Tasks to prefetch per worker
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000  # Restart worker after N tasks (prevent memory leaks)

# Logging
CELERY_WORKER_HIJACK_ROOT_LOGGER = False  # Use Django logging

# Periodic Task Scheduling (celery-beat)
CELERY_BEAT_SCHEDULE = {
    # T088: Cleanup old notifications daily at 2 AM UTC
    "cleanup-old-notifications": {
        "task": "notifications.tasks.cleanup_tasks.cleanup_old_notifications",
        "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM UTC
        "kwargs": {
            "retention_days": 90,  # Delete notifications older than 90 days
            "dry_run": False,
        },
        "options": {
            "expires": 3600,  # Task expires if not run within 1 hour
        },
    },
    # Example: Cleanup expired sessions daily at 3:00 AM
    "cleanup-expired-sessions": {
        "task": "tasks.examples.cleanup_expired_sessions",
        "schedule": crontab(hour=3, minute=0),
        "options": {
            "expires": 3600,  # Task expires if not run within 1 hour
        },
    },
    # Example: Hourly sync (interval-based)
    "sync-external-data-hourly": {
        "task": "tasks.examples.sync_external_api",
        "schedule": 3600.0,  # Every hour (in seconds)
        "kwargs": {
            "api_url": "https://api.example.com/sync",
            "org_id": 0,  # System-level task
        },
        "options": {
            "expires": 600,  # Expires after 10 minutes
        },
    },
    # Example: Every 5 minutes (for testing)
    "health-check-every-5-min": {
        "task": "tasks.examples.hello_world",
        "schedule": 300.0,  # 5 minutes
        "kwargs": {"name": "Scheduler"},
        "enabled": False,  # Disabled by default (for testing only)
    },
}

# Beat Scheduler Settings
# Use default PersistentScheduler for settings-based schedules
# For database-backed schedules, uncomment below and install django-celery-beat:
# CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Common Schedule Patterns (reference examples)
# =============================================
#
# Every N seconds:
#   'schedule': 30.0  # Every 30 seconds
#
# Every N minutes:
#   'schedule': 600.0  # Every 10 minutes
#
# Cron-style schedules:
#   crontab(minute=0, hour='*/2')  # Every 2 hours
#   crontab(minute=0, hour=0, day_of_week='monday')  # Weekly on Monday
#   crontab(minute=30, hour=2, day_of_month=1)  # Monthly on 1st at 2:30 AM
#   crontab(minute=0, hour=0)  # Daily at midnight
