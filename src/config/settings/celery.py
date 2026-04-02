"""
Celery configuration for async task execution.

Settings loaded via CELERY_ namespace from Django settings.
Supports environment-specific broker URLs via environment variables.
"""

import os
import tempfile

import environ
from celery.schedules import crontab
from kombu import Queue

env = environ.Env()

# Broker Configuration
# Fallback to REDIS_URL if CELERY_BROKER_URL is not set (common in Railway/Heroku)
CELERY_BROKER_URL = env(
    "CELERY_BROKER_URL", default=env("REDIS_URL", default="redis://localhost:6379/0")
)

# Result Backend Configuration (lightweight status tracking)
CELERY_RESULT_BACKEND = env(
    "CELERY_RESULT_BACKEND", default=env("REDIS_URL", default="redis://localhost:6379/0")
)
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

# B55: Video Processing Pipeline - Tiered Queue Configuration
# ─── 3 separate Railway worker services (see Procfile) ───
# Worker 1 (worker):      default + video_fast  — concurrency=2, lightweight tasks
# Worker 2 (worker-video): video_slow           — concurrency=1, heavy CPU/memory
# Worker 3 (worker-ai):    ai_generation        — concurrency=1, rate-limited AI calls
CELERY_TASK_QUEUES = (
    Queue("default", routing_key="default"),
    Queue("video_fast", routing_key="video.fast"),
    Queue("video_slow", routing_key="video.slow"),
    Queue("ai_generation", routing_key="ai.generation"),
)

CELERY_TASK_ROUTES = {
    # video_fast: thumbnails, metadata extraction (seconds)
    "src.video.tasks.thumbnail.generate_thumbnail": {"queue": "video_fast"},
    # video_slow: heavy operations (minutes to hours)
    "src.video.tasks.transcode.transcode_video": {"queue": "video_slow"},
    "src.video.tasks.compose.compose_video": {"queue": "video_slow"},
    "src.video.tasks.asset_processing.process_member_asset": {"queue": "video_slow"},
    "src.video.tasks.then_vs_now.process_then_vs_now_video": {"queue": "video_slow"},
    # video_fast: auto-crop closeup from fullbody (Pillow only, seconds)
    "src.video.tasks.asset_processing.auto_crop_closeup_from_fullbody": {"queue": "video_fast"},
    # video_slow: heavy FFmpeg video composition (minutes)
    "src.video.tasks.lineup.process_lineup_video": {"queue": "video_slow"},
    "src.video.tasks.goal_celebration.process_goal_celebration_video": {"queue": "video_slow"},
    "src.video.tasks.match_intro.process_match_intro_video": {"queue": "video_slow"},
    # ai_generation: rate-limited AI API calls (Gemini/MiniMax/Veo)
    "generative.tasks.generate_asset_task": {"queue": "ai_generation"},
    # B67: Bulk generation orchestration (lightweight, default queue)
    "src.bulk_generation.tasks.process_bulk_generation_job": {"queue": "default"},
    "src.bulk_generation.tasks.process_bulk_flyer_item": {"queue": "video_slow"},
    "src.bulk_generation.tasks.on_bulk_item_video_completed": {"queue": "default"},
}

# Periodic Task Scheduling (celery-beat)
CELERY_BEAT_SCHEDULE_FILENAME = env(
    "CELERY_BEAT_SCHEDULE_FILENAME",
    default=os.path.join(tempfile.gettempdir(), "celerybeat-schedule"),
)
CELERY_BEAT_SCHEDULE = {
    # T088: Cleanup old notifications daily at 2 AM UTC
    "cleanup-old-notifications": {
        "task": "notifications.tasks.cleanup_tasks.cleanup_old_notifications",
        "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM UTC
        "kwargs": {
            "retention_days": 30,  # Delete notifications older than 30 days
            "dry_run": False,
        },
        "options": {
            "expires": 3600,  # Task expires if not run within 1 hour
        },
    },
    # WP03: Cleanup deleted files daily at 2:30 AM UTC
    "cleanup-deleted-files": {
        "task": "files.tasks.cleanup_deleted_files",
        "schedule": crontab(hour=2, minute=30),  # Daily at 2:30 AM UTC
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
    # "health-check-every-5-min": {
    #     "task": "tasks.examples.hello_world",
    #     "schedule": 300.0,  # 5 minutes
    #     "kwargs": {"name": "Scheduler"},
    #     # "enabled": False,  # Disabled by default (for testing only)
    # },
    # B25: Collect cache performance metrics every 10 minutes
    "collect-cache-metrics": {
        "task": "observability.tasks.collect_system_metrics",
        "schedule": crontab(minute="*/10"),  # Every 10 minutes
        "options": {
            "expires": 300,  # Task expires if not run within 5 minutes
        },
    },
    # B31: Cleanup expired content daily at 2:15 AM UTC
    "cleanup-expired-content": {
        "task": "src.content_generation.tasks.cleanup_expired_content",
        "schedule": crontab(hour=2, minute=15),  # Daily at 2:15 AM UTC
        "options": {
            "expires": 3600,  # Task expires if not run within 1 hour
        },
    },
    # B34: Cleanup expired generation outputs daily at 2:45 AM UTC
    "cleanup-expired-outputs": {
        "task": "generative.tasks.cleanup_expired_outputs",
        "schedule": crontab(hour=2, minute=45),  # Daily at 2:45 AM UTC
        "options": {
            "expires": 3600,  # Task expires if not run within 1 hour
        },
    },
    # B34: Update template costs monthly on 1st at 3:00 AM UTC
    "update-template-costs": {
        "task": "generative.tasks.update_template_costs",
        "schedule": crontab(hour=3, minute=0, day_of_month=1),  # Monthly on 1st
        "options": {
            "expires": 7200,  # Task expires if not run within 2 hours
        },
    },
    # B34: Recover stale GenerationJobs every 15 minutes
    "recover-stale-generation-jobs": {
        "task": "generative.tasks.recover_stale_generation_jobs",
        "schedule": crontab(minute="*/15"),  # Every 15 minutes
        "kwargs": {"threshold_minutes": 30},
        "options": {
            "expires": 600,  # Task expires if not run within 10 minutes
        },
    },
    # Reprocess stuck/missing TeamReel assets daily at 4:00 AM UTC
    "reprocess-stuck-assets": {
        "task": "src.video.tasks.asset_processing.reprocess_stuck_assets_periodic",
        "schedule": crontab(hour=4, minute=0),  # Daily at 4 AM UTC
        "kwargs": {"stuck_minutes": 60},
        "options": {
            "expires": 3600,  # Task expires if not run within 1 hour
        },
    },
    # Recover stale VideoJobs every 10 minutes
    "recover-stale-video-jobs": {
        "task": "src.video.tasks.processing.recover_stale_video_jobs",
        "schedule": crontab(minute="*/10"),  # Every 10 minutes
        "kwargs": {"threshold_minutes": 15},
        "options": {
            "expires": 300,  # Task expires if not run within 5 minutes
        },
    },
    # Weekly DB maintenance: VACUUM ANALYZE on high-churn tables (Sunday 3:30 AM)
    "db-maintenance-vacuum": {
        "task": "observability.tasks.db_maintenance_vacuum",
        "schedule": crontab(hour=3, minute=30, day_of_week=0),  # Sunday 3:30 AM UTC
        "options": {
            "expires": 3600,
        },
    },
    # B64: Cleanup stale WebSocket connections every 30 minutes
    "cleanup-stale-websocket-connections": {
        "task": "rtc_websockets.tasks.cleanup_stale_connections",
        "schedule": crontab(minute="*/30"),  # Every 30 minutes
        "options": {
            "expires": 900,  # Task expires if not run within 15 minutes
        },
    },
    # B46: Cleanup expired trash items daily at 3:15 AM UTC
    "cleanup-expired-trash": {
        "task": "trash.tasks.cleanup_expired_trash",
        "schedule": crontab(hour=3, minute=15),  # Daily at 3:15 AM UTC
        "kwargs": {
            "batch_size": 500,
            "dry_run": False,
        },
        "options": {
            "expires": 3600,  # Task expires if not run within 1 hour
        },
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
