---
lane: "for_review"
agent: "copilot"
shell_pid: "38532"
---
# Work Package 05: Periodic Scheduling Configuration

```yaml
work_package_id: WP05
lane: planned
feature: B15 Tasks & Scheduling Foundation
priority: P2
depends_on:
  - WP01
subtasks:
  - T025
  - T026
  - T027
  - T028
  - T029
  - T030
history:
  - 2025-11-30: Created from task breakdown
```

---

## Objective

Configure celery-beat for periodic task scheduling using Django settings (baseline) with optional django-celery-beat extension point documented for database-backed schedules.

**Success Criteria**:
- `CELERY_BEAT_SCHEDULE` configured in settings with example schedules
- Example periodic task (cleanup_expired_sessions) created
- Beat scheduler starts successfully with `celery beat` command
- Documentation explains settings-based vs database-backed approaches
- Systemd service template provided for production deployment

---

## Context

**Relevant Specifications**:
- [spec.md](../../spec.md): User Story 2 (Schedule Recurring Jobs), FR-003, NFR-003
- [plan.md](../../plan.md): Settings-driven baseline, optional DB backend
- [research.md](../../research.md): Section on periodic task storage
- [contracts/task-patterns.md](../../contracts/task-patterns.md): Periodic task configuration patterns

**Clarification from Session 2025-11-30**:
- **Baseline**: Settings-driven schedules (`CELERY_BEAT_SCHEDULE` in Django settings)
- **Extension**: Optional django-celery-beat for database-backed schedules (runtime changes)
- **Default**: Settings approach is sufficient for most use cases

**Integration Points**:
- B01 Settings: Extend Celery configuration with beat schedule
- WP01 Celery App: Beat scheduler uses existing Celery app

---

## Detailed Guidance

### T025: Configure Beat Scheduler in Settings
**Objective**: Add `CELERY_BEAT_SCHEDULE` to Django settings

**Steps**:
1. Edit `config/settings/celery.py` (created in WP01) and add:
```python
from celery.schedules import crontab

# Periodic Task Scheduling (celery-beat)
CELERY_BEAT_SCHEDULE = {
    # Example: Cleanup expired sessions daily at 3:00 AM
    'cleanup-expired-sessions': {
        'task': 'tasks.examples.cleanup_expired_sessions',
        'schedule': crontab(hour=3, minute=0),
        'options': {
            'expires': 3600,  # Task expires if not run within 1 hour
        },
    },

    # Example: Hourly sync (interval-based)
    'sync-external-data-hourly': {
        'task': 'tasks.examples.sync_external_api',
        'schedule': 3600.0,  # Every hour (in seconds)
        'kwargs': {
            'api_url': 'https://api.example.com/sync',
            'org_id': 0,  # System-level task
        },
        'options': {
            'expires': 600,  # Expires after 10 minutes
        },
    },

    # Example: Every 5 minutes (for testing)
    'health-check-every-5-min': {
        'task': 'tasks.examples.hello_world',
        'schedule': 300.0,  # 5 minutes
        'kwargs': {'name': 'Scheduler'},
        'enabled': False,  # Disabled by default (for testing only)
    },
}

# Beat Scheduler Settings
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'  # Optional, for DB-backed
# Leave commented for settings-based (default):
# CELERY_BEAT_SCHEDULER = 'celery.beat:PersistentScheduler'
```

2. Add schedule examples for common patterns:
```python
# Common Schedule Patterns (commented examples)
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
```

**Reference**: [task-patterns.md](../../contracts/task-patterns.md) Periodic Task Configuration

---

### T026: Create Example Periodic Task
**Objective**: Implement cleanup task for session management

**Steps**:
1. Create `src/tasks/examples/cleanup_expired_sessions.py`:
```python
"""Example periodic task for routine maintenance."""
from celery import shared_task
from django.contrib.sessions.models import Session
from django.utils import timezone
from typing import Dict
import logging

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_sessions() -> Dict[str, int]:
    """
    Remove expired sessions from database.

    This task demonstrates:
    - Periodic maintenance pattern
    - Safe cleanup with transaction handling
    - Structured return value for monitoring

    Scheduled via CELERY_BEAT_SCHEDULE:
        'cleanup-expired-sessions': {
            'task': 'tasks.examples.cleanup_expired_sessions',
            'schedule': crontab(hour=3, minute=0),  # Daily at 3:00 AM
        }

    Returns:
        Dictionary with cleanup statistics
    """
    try:
        # Find expired sessions
        now = timezone.now()
        expired = Session.objects.filter(expire_date__lt=now)
        count = expired.count()

        if count > 0:
            # Delete in chunks to avoid long transactions
            chunk_size = 1000
            deleted_total = 0

            while True:
                expired_chunk = list(
                    Session.objects.filter(expire_date__lt=now)
                    .values_list('session_key', flat=True)[:chunk_size]
                )

                if not expired_chunk:
                    break

                deleted = Session.objects.filter(session_key__in=expired_chunk).delete()[0]
                deleted_total += deleted
                logger.info(f"Deleted {deleted} expired sessions (chunk)")

            logger.info(f"Cleanup completed: {deleted_total} expired sessions removed")
            return {'status': 'success', 'deleted': deleted_total}

        else:
            logger.info("No expired sessions to clean up")
            return {'status': 'success', 'deleted': 0}

    except Exception as exc:
        logger.exception(f"Failed to cleanup expired sessions: {exc}")
        return {'status': 'error', 'deleted': 0, 'error': str(exc)}
```

**Reference**: [quickstart.md](../../quickstart.md) Periodic task example

---

### T027: Document Beat Scheduler Startup
**Objective**: Add beat scheduler commands to worker documentation

**Steps**:
1. Edit `docs/tasks/running-workers.md` (created in WP01) and add beat section:
```markdown
## Running Beat Scheduler

The beat scheduler triggers periodic tasks according to `CELERY_BEAT_SCHEDULE` configuration.

### Local Development

Start beat scheduler in a separate terminal:
```bash
celery -A config beat -l info
```

**Important**: Only ONE beat scheduler should run per deployment. Running multiple schedulers will cause duplicate task executions.

### Production Deployment

#### Systemd Service

See `docs/deployment/celery-beat.service` for systemd template.

**Install**:
```bash
sudo cp docs/deployment/celery-beat.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable celery-beat
sudo systemctl start celery-beat
```

**Monitor**:
```bash
sudo systemctl status celery-beat
sudo journalctl -u celery-beat -f
```

#### Docker

```dockerfile
# Separate container for beat scheduler
CMD ["celery", "-A", "config", "beat", "-l", "info"]
```

**Note**: Ensure only one beat container runs (use `replicas: 1` in docker-compose).

### Beat Scheduler State

Beat scheduler maintains state in `celerybeat-schedule` file (default) to track last run times.

**Behavior**:
- If beat crashes and restarts, it resumes from last known state
- Some scheduled executions may be delayed but system continues normally
- Delete `celerybeat-schedule` to reset all timers (use with caution)

### Troubleshooting

**Tasks not executing on schedule**:
- Check beat scheduler is running: `ps aux | grep "celery.*beat"`
- Verify task name in schedule matches actual task
- Check beat logs for errors: `celery -A config beat -l debug`

**Duplicate executions**:
- Confirm only ONE beat scheduler running
- Check for multiple beat processes: `ps aux | grep "celery.*beat"`

**Schedule drift**:
- Beat scheduler has ±10 second accuracy (acceptable per spec)
- For exact timing, consider external cron + task triggering
```

---

### T028: Document Database-Backed Schedules (Optional Extension)
**Objective**: Explain django-celery-beat setup for runtime schedule changes

**Steps**:
1. Create `docs/tasks/periodic-tasks.md`:
```markdown
# Periodic Task Scheduling

## Settings-Based Schedules (Baseline)

**Recommended for**: Most use cases where schedules are known at deployment time.

Periodic tasks configured in `config/settings/celery.py`:

```python
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

## Database-Backed Schedules (Optional Extension)

**Recommended for**: Advanced scenarios requiring runtime schedule modifications.

Uses `django-celery-beat` package to store schedules in PostgreSQL.

### Setup

1. Install dependency:
```bash
pip install django-celery-beat>=2.5.0
```

2. Add to `INSTALLED_APPS`:
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

4. Update Celery config:
```python
# config/settings/celery.py
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

### Advantages

- Runtime schedule modifications (no deployment needed)
- Per-organisation custom schedules
- Enable/disable tasks via admin interface
- Execution history tracking

### Considerations

- Additional database dependency
- More complex setup
- Schedules not version controlled (live in database)
- Potential for orphaned task records

## Choosing an Approach

**Use Settings-Based (Baseline) when**:
- Schedules known at deployment time
- Simple maintenance tasks
- Prefer version control over runtime flexibility
- Minimal operational complexity desired

**Use Database-Backed when**:
- Need runtime schedule changes
- Per-tenant custom schedules required
- Operators need self-service schedule management
- Execution history tracking needed

## Migration Path

To migrate from settings-based to database-backed:

1. Follow database-backed setup steps above
2. Manually recreate existing schedules in Django admin
3. Remove/comment out `CELERY_BEAT_SCHEDULE` entries
4. Test thoroughly before removing old configuration

**Note**: Both approaches can coexist (settings + database), but this is not recommended due to complexity.
```

**Reference**: [spec.md](../../spec.md) FR-003 (extension point for DB-backed schedules)

---

### T029: Create Beat Systemd Service Template
**Objective**: Provide production deployment template

**Steps**:
1. Create `docs/deployment/celery-beat.service`:
```ini
[Unit]
Description=Celery Beat Scheduler for Django Core-App
After=network.target redis.service

[Service]
Type=simple
User=django
Group=django
WorkingDirectory=/opt/django-core-app
Environment="DJANGO_SETTINGS_MODULE=config.settings.production"
Environment="CELERY_BROKER_URL=redis://localhost:6379/0"

# Beat scheduler command
ExecStart=/opt/django-core-app/venv/bin/celery -A config beat -l info --pidfile=/var/run/celery/beat.pid

# Graceful shutdown
ExecStop=/bin/kill -s TERM $MAINPID

# Restart policy
Restart=always
RestartSec=10s

# Ensure only one beat scheduler runs
PIDFile=/var/run/celery/beat.pid

[Install]
WantedBy=multi-user.target
```

2. Add supervisor alternative `docs/deployment/supervisor-celery-beat.conf`:
```ini
[program:celery-beat]
command=/opt/django-core-app/venv/bin/celery -A config beat -l info
directory=/opt/django-core-app
user=django
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery/beat.log
environment=DJANGO_SETTINGS_MODULE="config.settings.production",CELERY_BROKER_URL="redis://localhost:6379/0"
```

---

### T030: Test Periodic Task Execution
**Objective**: Verify beat scheduler triggers tasks on schedule

**Steps**:
1. Manual test with short interval:
```python
# Temporarily add to CELERY_BEAT_SCHEDULE
'test-periodic': {
    'task': 'tasks.examples.hello_world',
    'schedule': 30.0,  # Every 30 seconds
    'kwargs': {'name': 'Scheduler Test'},
}
```

2. Start beat scheduler:
```bash
celery -A config beat -l info
```

3. Start worker in another terminal:
```bash
celery -A config worker -l info
```

4. Observe logs:
- Beat logs should show task scheduled every 30 seconds
- Worker logs should show task execution

5. Test cron schedule (if time permits):
```python
# Schedule for next minute
from celery.schedules import crontab
from datetime import datetime
current_minute = datetime.now().minute
next_minute = (current_minute + 1) % 60

'test-cron': {
    'task': 'tasks.examples.hello_world',
    'schedule': crontab(minute=next_minute),
    'kwargs': {'name': 'Cron Test'},
}
```

6. Verify task executes at scheduled time

**Expected Output (Beat)**:
```
[2025-11-30 10:00:00,000: INFO/MainProcess] beat: Starting...
[2025-11-30 10:00:30,123: INFO/MainProcess] Scheduler: Sending due task test-periodic
```

**Expected Output (Worker)**:
```
[2025-11-30 10:00:30,456: INFO/ForkPoolWorker-1] Task tasks.examples.hello_world[abc-123] succeeded in 1.002s: 'Hello, Scheduler Test!'
```

**Note**: Full integration tests implemented in WP07.

---

## Definition of Done

- [ ] `CELERY_BEAT_SCHEDULE` configured in settings with example schedules
- [ ] Example periodic task created: `cleanup_expired_sessions.py`
- [ ] Beat scheduler documentation added to `running-workers.md`
- [ ] Database-backed schedules documented in `periodic-tasks.md`
- [ ] Systemd service template created: `celery-beat.service`
- [ ] Supervisor template created: `supervisor-celery-beat.conf`
- [ ] Manual test confirms periodic tasks execute on schedule
- [ ] Documentation clarifies settings vs database approaches

---

## Dependencies & Risks

**Depends On**:
- WP01 (Celery app configured)

**Blocks**:
- WP06 (Documentation - periodic task guides)
- WP07 (Testing - periodic schedule tests)

**Risks**:
1. **Multiple beat schedulers running**
   - Mitigation: Document singleton requirement prominently
   - Systemd template includes PIDFile to prevent duplicates
   - K8s deployments should use `replicas: 1`

2. **Schedule drift on worker restart**
   - Mitigation: Acceptable per spec (±10s accuracy)
   - Document behavior in troubleshooting

3. **Database-backed schedules complexity**
   - Mitigation: Keep as optional extension
   - Recommend settings-based for baseline

4. **Celerybeat-schedule file conflicts**
   - Mitigation: Document file purpose and location
   - Add to .gitignore

---

## Implementation Checklist

**Before Starting**:
- [ ] Verified WP01 complete (Celery configured)
- [ ] Confirmed example tasks exist for scheduling

**During Implementation**:
- [ ] Added beat schedule to settings following B01 structure
- [ ] Created periodic task with clear docstring
- [ ] Documented both settings and database approaches
- [ ] Created production deployment templates

**After Implementation**:
- [ ] Started beat scheduler successfully
- [ ] Verified periodic task executes
- [ ] Tested schedule with short interval
- [ ] Committed with message: "B15/WP05: Periodic scheduling configuration with celery-beat"

---

## Notes for Reviewer

- Verify only settings-based approach implemented (DB-backed is optional/documented only)
- Check beat scheduler runs without conflicts
- Confirm systemd template has correct paths and user
- Validate documentation distinguishes baseline from extension clearly
- Ensure schedule examples cover common patterns (hourly, daily, cron)

## Activity Log

- 2025-11-30T18:36:20Z – copilot – shell_pid=38532 – lane=doing – Started periodic scheduling implementation
- 2025-11-30T18:41:35Z – copilot – shell_pid=38532 – lane=for_review – WP05 complete: Periodic scheduling with beat configuration, examples, and deployment templates
