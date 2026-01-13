from .production import *

CELERY_TASK_ALWAYS_EAGER = True
CELERY_BROKER_URL = "memory://"
