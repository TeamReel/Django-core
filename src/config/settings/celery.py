"""
Celery configuration for async task execution.

Settings loaded via CELERY_ namespace from Django settings.
Supports environment-specific broker URLs via environment variables.
"""
import environ

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
