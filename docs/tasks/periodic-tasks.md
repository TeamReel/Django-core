# Periodic Task Scheduling

## Settings-Based Schedules (Baseline)

**Recommended for**: Most use cases where schedules are known at deployment time.

Periodic tasks configured in `config/settings/celery.py`:

```python
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'task-name': {
        'task': 'app.tasks.my_task',
        'schedule': crontab(hour=3, minute=0),
    },
}
```

**Advantages**:
- Simple configuration
- Version controlled (schedules tracked in git)
- No additional dependencies
- Clear deployment-time visibility

**Limitations**:
- Requires code deployment to change schedules
- Cannot disable/enable tasks at runtime
- No per-organisation schedule customization

### Schedule Syntax

**Interval-based** (every N seconds):
```python
'my-task': {
    'task': 'app.tasks.my_task',
    'schedule': 60.0,  # Every 60 seconds
}
```

**Cron-based** (specific times):
```python
from celery.schedules import crontab

'daily-cleanup': {
    'task': 'tasks.examples.cleanup_expired_sessions',
    'schedule': crontab(hour=3, minute=0),  # Daily at 3:00 AM
}

'hourly-sync': {
    'task': 'tasks.examples.sync_external_api',
    'schedule': crontab(minute=0),  # Every hour at :00
}

'weekly-report': {
    'task': 'tasks.examples.generate_report',
    'schedule': crontab(hour=9, minute=0, day_of_week='monday'),  # Monday 9 AM
}

'monthly-billing': {
    'task': 'tasks.examples.process_billing',
    'schedule': crontab(hour=0, minute=0, day_of_month=1),  # 1st of month
}
```

### Task Arguments and Options

```python
'task-with-args': {
    'task': 'app.tasks.my_task',
    'schedule': 3600.0,  # Every hour
    'kwargs': {
        'api_url': 'https://api.example.com',
        'org_id': 0,  # System-level task
    },
    'options': {
        'expires': 600,  # Task expires after 10 minutes if not run
        'queue': 'periodic',  # Route to specific queue
    },
}
```

### Disabling Tasks

Temporarily disable a periodic task:
```python
'test-task': {
    'task': 'app.tasks.test_task',
    'schedule': 60.0,
    'enabled': False,  # Task definition exists but won't be scheduled
}
```

## Database-Backed Schedules (Optional Extension)

**Recommended for**: Advanced scenarios requiring runtime schedule modifications.

Uses `django-celery-beat` package to store schedules in PostgreSQL.

### Setup

1. Install dependency:
```bash
pip install django-celery-beat>=2.5.0
```

2. Add to `INSTALLED_APPS` in `config/settings/base.py`:
```python
INSTALLED_APPS = [
    # ...
    'django_celery_beat',
]
```

3. Run migrations:
```bash
python manage.py migrate django_celery_beat
```

4. Update Celery config in `config/settings/celery.py`:
```python
# Switch from default PersistentScheduler to DatabaseScheduler
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
```

5. Restart beat scheduler to use new backend

### Managing Schedules via Django Admin

Navigate to `/admin/django_celery_beat/` to:
- Create new periodic tasks
- Enable/disable existing schedules
- Modify intervals and cron expressions
- View execution history

### Managing Schedules via Code

```python
from django_celery_beat.models import PeriodicTask, CrontabSchedule
import json

# Create crontab schedule
schedule, _ = CrontabSchedule.objects.get_or_create(
    hour=3,
    minute=0,
)

# Create periodic task
PeriodicTask.objects.create(
    name='Cleanup for Org 123',
    task='tasks.examples.cleanup_expired_sessions',
    crontab=schedule,
    kwargs=json.dumps({'org_id': 123}),
    enabled=True,
)
```

### Dynamic Per-Organisation Schedules

```python
from django_celery_beat.models import PeriodicTask, IntervalSchedule
import json

# Create interval schedule (every 30 minutes)
schedule, _ = IntervalSchedule.objects.get_or_create(
    every=30,
    period=IntervalSchedule.MINUTES,
)

# Create per-org tasks
for org in Organisation.objects.filter(requires_sync=True):
    PeriodicTask.objects.get_or_create(
        name=f'sync-org-{org.id}',
        defaults={
            'task': 'tasks.examples.sync_external_api',
            'interval': schedule,
            'kwargs': json.dumps({
                'api_url': org.api_url,
                'org_id': org.id,
            }),
            'enabled': True,
        }
    )
```

### Advantages

- Runtime schedule modifications (no deployment needed)
- Per-organisation custom schedules
- Enable/disable tasks via admin interface
- Execution history tracking

### Considerations

- Additional database dependency
- More complex setup and operations
- Schedules not version controlled (live in database)
- Potential for orphaned task records
- Requires database backups to preserve schedules

## Choosing an Approach

**Use Settings-Based (Baseline) when**:
- Schedules known at deployment time
- Simple maintenance tasks (cleanup, reports)
- Prefer version control over runtime flexibility
- Minimal operational complexity desired
- All environments use same schedules

**Use Database-Backed when**:
- Need runtime schedule changes without deployment
- Per-tenant custom schedules required
- Operators need self-service schedule management
- Execution history tracking needed
- Different schedules per environment/deployment

## Migration Path

To migrate from settings-based to database-backed:

1. Follow database-backed setup steps above
2. Manually recreate existing schedules in Django admin or via migration script
3. Remove or comment out `CELERY_BEAT_SCHEDULE` entries from settings
4. Test thoroughly in staging environment
5. Monitor for duplicate executions during transition
6. Once confirmed working, remove old configuration

**Note**: Both approaches can coexist (settings + database), but this increases complexity and is not recommended.

### Migration Script Example

```python
# In a Django migration or management command
from django_celery_beat.models import PeriodicTask, CrontabSchedule
from django.conf import settings
import json

for name, config in settings.CELERY_BEAT_SCHEDULE.items():
    if 'crontab' in config.get('schedule', {}).__class__.__name__.lower():
        schedule = config['schedule']
        crontab, _ = CrontabSchedule.objects.get_or_create(
            minute=schedule._orig_minute,
            hour=schedule._orig_hour,
            day_of_week=schedule._orig_day_of_week,
            day_of_month=schedule._orig_day_of_month,
            month_of_year=schedule._orig_month_of_year,
        )
        PeriodicTask.objects.get_or_create(
            name=name,
            defaults={
                'task': config['task'],
                'crontab': crontab,
                'kwargs': json.dumps(config.get('kwargs', {})),
                'enabled': config.get('enabled', True),
            }
        )
```

## Testing Periodic Tasks

### Manual Testing

Test a periodic task immediately:
```python
from tasks.examples.cleanup_expired_sessions import cleanup_expired_sessions

# Execute synchronously for testing
result = cleanup_expired_sessions()
print(result)  # {'status': 'success', 'deleted': 0}

# Execute asynchronously
task = cleanup_expired_sessions.delay()
print(task.get(timeout=10))
```

### Short Interval for Development

Temporarily use short intervals for testing:
```python
# In config/settings/local.py (development only)
CELERY_BEAT_SCHEDULE = {
    'test-periodic': {
        'task': 'tasks.examples.hello_world',
        'schedule': 30.0,  # Every 30 seconds for testing
        'kwargs': {'name': 'Test'},
    },
}
```

**Remember to remove or disable test schedules before production deployment**.

## Monitoring

### Check Beat Scheduler Status

```bash
# View beat logs
celery -A config beat -l info

# Check scheduled tasks
celery -A config inspect scheduled
```

### Execution Logs

Beat scheduler logs when tasks are sent:
```
[2025-11-30 10:00:00,000: INFO/MainProcess] Scheduler: Sending due task cleanup-expired-sessions
```

Worker logs show execution:
```
[2025-11-30 10:00:00,123: INFO/ForkPoolWorker-1] Task tasks.examples.cleanup_expired_sessions[abc-123] succeeded in 0.452s
```

### Metrics

If using `django-prometheus` (from B09):
```python
from prometheus_client import Counter

periodic_task_executions = Counter(
    'periodic_task_executions_total',
    'Periodic task executions',
    ['task_name', 'status']
)

@shared_task
def my_periodic_task():
    try:
        # ... task logic ...
        periodic_task_executions.labels(task_name='my_task', status='success').inc()
    except Exception:
        periodic_task_executions.labels(task_name='my_task', status='error').inc()
        raise
```

## Best Practices

1. **One Beat Scheduler Per Deployment**: Never run multiple beat schedulers (causes duplicate executions)
2. **Idempotent Tasks**: Design periodic tasks to be safely re-executable
3. **Short Expiration Times**: Set `expires` to prevent stale task executions
4. **Monitor Execution**: Track success/failure rates in logs or metrics
5. **Graceful Failures**: Handle errors gracefully, log clearly, don't crash beat scheduler
6. **Version Control Schedules**: Use settings-based approach unless runtime changes required
7. **Test Thoroughly**: Verify schedules in staging before production
8. **Document Schedules**: Keep schedule documentation up-to-date with business requirements

## Troubleshooting

### Tasks Not Executing

1. Check beat scheduler is running: `ps aux | grep "celery.*beat"`
2. Verify worker is running and connected to broker
3. Check beat logs for errors: `celery -A config beat -l debug`
4. Confirm task name in schedule matches actual task
5. Verify schedule syntax is correct

### Duplicate Executions

1. Check for multiple beat schedulers: `ps aux | grep "celery.*beat"`
2. Ensure only one beat process per deployment
3. In Kubernetes, use `replicas: 1` for beat deployment
4. In Docker Compose, don't scale beat service

### Schedule Not Updating

**Settings-based**:
- Restart beat scheduler after changing `CELERY_BEAT_SCHEDULE`
- Check settings are loaded correctly: `python manage.py shell` → `from django.conf import settings; print(settings.CELERY_BEAT_SCHEDULE)`

**Database-backed**:
- Changes in admin should apply immediately (beat polls database)
- If not, restart beat scheduler
- Check database connection from beat scheduler

### Task Expires Before Running

Increase `expires` time or reduce schedule frequency:
```python
'my-task': {
    'task': 'app.tasks.slow_task',
    'schedule': 3600.0,  # Every hour
    'options': {
        'expires': 7200,  # 2 hours (enough time for task to run)
    },
}
```
