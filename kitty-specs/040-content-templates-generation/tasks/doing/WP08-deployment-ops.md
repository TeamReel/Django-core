---
work_package_id: WP08
title: Deployment & Operations
lane: doing
subtasks: [T042, T043, T044, T045]
priority: P3
estimated_effort: 1 day
dependencies: [WP01, WP02, WP03, WP07]
assignee: github-copilot
agent: github-copilot
shell_pid: "$PID"
history:
  - date: 2026-01-30T08:00:00Z
    action: moved_to_doing
    author: github-copilot
    note: "Started WP08: Deployment & Operations"
---

# WP08: Deployment & Operations

## Objective
Configure Celery Beat, health checks, structured logging, Railway deployment config.

## Implementation

### T042: Celery Beat Schedule
**Already implemented in T038**, but verify complete config:

```python
# settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-content': {
        'task': 'src.content_generation.tasks.cleanup_expired_content',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM UTC
    },
}
```

**Celery Worker Start** (Procfile or docker-compose):
```bash
# Railway/Procfile
worker: celery -A config.celery_app worker --loglevel=info
beat: celery -A config.celery_app beat --loglevel=info
```

---

### T043: Health Check Endpoint
```python
# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import connection
from django_redis import get_redis_connection

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_check(request):
    """Health check endpoint for monitoring"""
    status = {'status': 'healthy', 'checks': {}}

    # Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        status['checks']['database'] = 'ok'
    except Exception as e:
        status['checks']['database'] = f'error: {str(e)}'
        status['status'] = 'unhealthy'

    # Redis/Celery check
    try:
        redis_conn = get_redis_connection('default')
        redis_conn.ping()
        status['checks']['redis'] = 'ok'
    except Exception as e:
        status['checks']['redis'] = f'error: {str(e)}'
        status['status'] = 'unhealthy'

    # Content Generation stats
    from .models import ContentItem
    status['checks']['content_generation'] = {
        'queued': ContentItem.objects.active().filter(status='queued').count(),
        'generating': ContentItem.objects.active().filter(status='generating').count(),
        'failed_last_24h': ContentItem.objects.active().filter(
            status='failed',
            created_at__gte=timezone.now() - timedelta(days=1)
        ).count(),
    }

    return Response(status)

# urls.py
urlpatterns = [
    path('health/', health_check, name='content_generation_health'),
]
```

---

### T044: Structured Logging
```python
# tasks.py
import logging
logger = logging.getLogger(__name__)

@shared_task(bind=True)
def generate_content_task(self, item_id: int, user_id: int):
    logger.info(
        'Content generation started',
        extra={
            'item_id': item_id,
            'user_id': user_id,
            'task_id': self.request.id,
        }
    )

    try:
        # ... generation logic ...
        logger.info(
            'Content generation completed',
            extra={
                'item_id': item_id,
                'duration': duration,
                'output_file_id': item.output_file_id,
            }
        )
    except Exception as e:
        logger.error(
            'Content generation failed',
            extra={
                'item_id': item_id,
                'error': str(e),
            },
            exc_info=True
        )
        raise
```

**Logging Config** (settings.py):
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'loggers': {
        'src.content_generation': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

---

### T045: Railway Deployment Config
**railway.json**:
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "gunicorn config.wsgi:application --bind 0.0.0.0:$PORT",
    "healthcheckPath": "/api/v1/health/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Environment Variables** (Railway Dashboard):
```
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...
DJANGO_SETTINGS_MODULE=config.settings.production
DATABASE_URL=postgresql://...
```

**Celery Worker Service** (Railway):
- Create separate service for Celery worker
- Start command: `celery -A config.celery_app worker --loglevel=info`
- Same env vars as main Django service

**Celery Beat Service** (Railway):
- Create separate service for Celery beat
- Start command: `celery -A config.celery_app beat --loglevel=info`
- Same env vars as main Django service

---

## Done When
- [ ] Celery Beat running scheduled cleanup task
- [ ] Health check endpoint returns status for all services
- [ ] Structured JSON logs in production
- [ ] Railway services deployed (web + worker + beat)
- [ ] All environment variables configured
- [ ] Zero-downtime deployment tested
