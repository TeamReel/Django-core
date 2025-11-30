# Work Package 06: Documentation & Developer Guides

```yaml
work_package_id: WP06
lane: planned
feature: B15 Tasks & Scheduling Foundation
priority: P2
depends_on:
  - WP01
  - WP02
  - WP03
  - WP04
  - WP05
subtasks:
  - T031
  - T032
  - T033
  - T034
  - T035
history:
  - 2025-11-30: Created from task breakdown
```

---

## Objective

Create comprehensive developer documentation including setup instructions, usage patterns, troubleshooting guide, and deployment templates. Ensures developers can onboard quickly and operators can deploy reliably.

**Success Criteria**:
- Main README provides architecture overview and navigation
- Worker management guide covers local, systemd, supervisor, and container deployments
- Periodic tasks guide explains settings vs database-backed approaches
- Troubleshooting guide addresses common errors and debugging
- Deployment templates (systemd, supervisor) are production-ready

---

## Context

**Relevant Specifications**:
- [spec.md](../../spec.md): NFR-004 (documentation requirement)
- [quickstart.md](../../quickstart.md): 15-minute getting started guide (already exists)
- [plan.md](../../plan.md): All planning decisions to document

**Integration Points**:
- Existing docs structure (if any): `docs/` directory
- Copilot context: Reference for AI-assisted development

**Note**: Some documentation started in WP01 (running-workers.md), WP02 (auditing.md), WP05 (periodic-tasks.md). This WP consolidates and completes the documentation set.

---

## Detailed Guidance

### T031: Create Main Tasks Documentation
**Objective**: Central README for tasks infrastructure

**Steps**:
1. Create `docs/tasks/README.md`:
```markdown
# Tasks & Scheduling Infrastructure (B15)

Asynchronous task execution and periodic scheduling foundation for Django Core-App.

## Overview

B15 provides baseline capability for:

- **Background Task Execution**: Offload heavy operations (exports, bulk updates, external API calls) to background workers with automatic retry
- **Periodic Job Scheduling**: Run maintenance tasks (cleanup, sync) on fixed schedules (hourly, daily, cron-style)
- **Audit Integration**: Optional audit logging for sensitive operations via `AuditedTask` base class
- **Health Monitoring**: HTTP endpoint and CLI command for worker health checks

**Technology Stack**:
- Celery 5.3+ for task execution
- Redis for broker and result backend
- celery-beat for periodic scheduling

## Quick Links

- [Quick Start Guide](../../kitty-specs/015-tasks-scheduling-foundation/quickstart.md) - 15-minute getting started
- [Running Workers](running-workers.md) - Local and production deployment
- [Periodic Tasks](periodic-tasks.md) - Scheduling configuration
- [Task Auditing](auditing.md) - AuditedTask usage for sensitive operations
- [Troubleshooting](troubleshooting.md) - Common errors and solutions

## Architecture

```
┌─────────────────┐
│  Django App     │
│  (HTTP Request) │
└────────┬────────┘
         │ .delay()
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Redis Broker   │◄────►│  Celery Worker   │
│  (Task Queue)   │      │  (Executes Tasks)│
└─────────────────┘      └──────────────────┘
         ▲
         │
┌─────────────────┐
│  Celery Beat    │
│  (Scheduler)    │
└─────────────────┘
```

## Core Concepts

### Tasks

Units of work defined as Python functions:

```python
from celery import shared_task

@shared_task
def send_email(recipient, subject, body):
    # Task implementation
    pass
```

Triggered asynchronously:

```python
result = send_email.delay('user@example.com', 'Hello', 'Body')
```

### Periodic Tasks

Tasks scheduled to run automatically:

```python
# config/settings/celery.py
CELERY_BEAT_SCHEDULE = {
    'cleanup-sessions-daily': {
        'task': 'tasks.examples.cleanup_expired_sessions',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3:00 AM
    },
}
```

### AuditedTask

Base class for tasks requiring B09 audit logging:

```python
from celery import shared_task
from tasks.base import AuditedTask

@shared_task(base=AuditedTask)
def export_user_data(user_id, org_id, format='csv'):
    # Automatically creates audit events
    pass
```

See [auditing.md](auditing.md) for details.

## Integration Points

### B09 Audit Logging
- `AuditedTask` base class creates lifecycle audit events
- Context propagation via explicit kwargs (user_id, org_id)

### B12 Notifications (if exists)
- Example integration in `tasks/examples/send_notification.py`
- Bulk notification sending pattern

### B03 Security Baseline
- Health check integration available
- No sensitive data in task logs

### B01 Settings
- Celery configuration in `config/settings/celery.py`
- Environment-based broker URLs

## Getting Started

### 1. Prerequisites

- Redis running locally or accessible via `CELERY_BROKER_URL`
- Python 3.12+ with dependencies installed

### 2. Install Dependencies

```bash
pip install -r requirements/base.txt
```

### 3. Start Worker

```bash
celery -A config worker -l info
```

### 4. Create Your First Task

```python
# myapp/tasks.py
from celery import shared_task

@shared_task
def my_background_task(arg1, arg2):
    # Implementation
    return result
```

### 5. Trigger Task

```python
from myapp.tasks import my_background_task

result = my_background_task.delay(arg1, arg2)
```

See [quickstart guide](../../kitty-specs/015-tasks-scheduling-foundation/quickstart.md) for detailed walkthrough.

## Production Deployment

### Worker Management

- **Systemd**: `docs/deployment/celery-worker.service`
- **Supervisor**: `docs/deployment/supervisor-celery.conf`
- **Docker**: See `running-workers.md`

### Beat Scheduler

- **Systemd**: `docs/deployment/celery-beat.service`
- **Supervisor**: `docs/deployment/supervisor-celery-beat.conf`

**Critical**: Only ONE beat scheduler per deployment.

### Health Monitoring

HTTP endpoint:
```bash
curl http://localhost:8000/health/tasks/
```

CLI command:
```bash
python manage.py check_workers --exit-code
```

## Best Practices

1. **Use AuditedTask for sensitive operations**: Data exports, permission changes, bulk updates
2. **Pass context explicitly**: Always include `user_id`, `org_id` for audit trail
3. **Set appropriate timeouts**: Default 5 minutes, adjust per task
4. **Configure retry policies**: Use exponential backoff for external API calls
5. **Monitor task execution**: Use health checks and logging
6. **Chunk large operations**: Process in batches to avoid memory issues
7. **Test tasks with .apply()**: Execute synchronously in tests

## Common Patterns

### Retry Pattern

```python
@shared_task(
    bind=True,
    max_retries=5,
    autoretry_for=(RequestException,),
    retry_backoff=True,
)
def flaky_api_call(self, url):
    # Implementation
    pass
```

### Chunking Pattern

```python
@shared_task
def process_large_dataset(item_ids):
    chunk_size = 100
    for i in range(0, len(item_ids), chunk_size):
        chunk = item_ids[i:i+chunk_size]
        # Process chunk
```

### Context Propagation

```python
@shared_task(base=AuditedTask)
def sensitive_operation(user_id, org_id, request_id=None):
    # user_id, org_id, request_id used for audit
    pass

# In view:
result = sensitive_operation.delay(
    user_id=request.user.id,
    org_id=request.user.organisation_id,
    request_id=request.META.get('HTTP_X_REQUEST_ID')
)
```

## Troubleshooting

See [troubleshooting.md](troubleshooting.md) for detailed guide.

**Quick Checks**:
- Redis running? `redis-cli ping`
- Worker running? `celery -A config inspect active`
- Task registered? Check worker startup logs
- Broker configured? Check `CELERY_BROKER_URL`

## Further Reading

- [Celery Documentation](https://docs.celeryproject.org/en/stable/)
- [Django Celery Integration](https://docs.celeryproject.org/en/stable/django/first-steps-with-django.html)
- [Task Patterns](../../kitty-specs/015-tasks-scheduling-foundation/contracts/task-patterns.md)
```

**Reference**: All planning documents for architecture and integration points

---

### T032: Consolidate Worker Management Documentation
**Objective**: Complete running-workers.md with all deployment scenarios

**Steps**:
1. Edit `docs/tasks/running-workers.md` (started in WP01):
   - Verify local development section complete
   - Ensure systemd template referenced
   - Add Docker Compose example:
```yaml
# docker-compose.yml
services:
  worker:
    image: django-core-app:latest
    command: celery -A config worker -l info
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - DJANGO_SETTINGS_MODULE=config.settings.production
    depends_on:
      - redis
    deploy:
      replicas: 2  # Multiple workers OK
```
   - Add Kubernetes example:
```yaml
# k8s-celery-worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: worker
        image: django-core-app:latest
        command: ["celery", "-A", "config", "worker", "-l", "info"]
        env:
        - name: CELERY_BROKER_URL
          value: "redis://redis-service:6379/0"
```
   - Add monitoring section (Flower, Prometheus)
   - Add scaling guidance (when to add workers)

**Reference**: [plan.md](../../plan.md) Decision 1 (manual worker management)

---

### T033: Consolidate Periodic Tasks Documentation
**Objective**: Complete periodic-tasks.md with migration guidance

**Steps**:
1. Edit `docs/tasks/periodic-tasks.md` (started in WP05):
   - Verify settings-based section complete
   - Verify database-backed section complete
   - Add comparison table:

| Feature | Settings-Based | Database-Backed |
|---------|----------------|-----------------|
| Runtime changes | ❌ No | ✅ Yes |
| Version controlled | ✅ Yes | ❌ No |
| Setup complexity | Low | Medium |
| Admin UI | ❌ No | ✅ Yes |
| Per-tenant schedules | ❌ No | ✅ Yes |
| **Recommended for** | Most use cases | Advanced scenarios |

   - Add schedule syntax reference (crontab examples)
   - Add testing periodic tasks section:
```python
# Testing periodic tasks
from tasks.examples.cleanup_expired_sessions import cleanup_expired_sessions

def test_cleanup_task():
    result = cleanup_expired_sessions.apply()  # Execute synchronously
    assert result.successful()
```

**Reference**: [spec.md](../../spec.md) FR-003 (extension point documentation)

---

### T034: Create Troubleshooting Guide
**Objective**: Document common errors and debugging approaches

**Steps**:
1. Create `docs/tasks/troubleshooting.md`:
```markdown
# Troubleshooting Guide: Tasks & Scheduling

## Connection Errors

### Error: "Connection refused" when starting worker

**Symptom**:
```
[ERROR/MainProcess] consumer: Cannot connect to redis://localhost:6379/0:
Error 61 connecting to localhost:6379. Connection refused.
```

**Cause**: Redis broker not running or wrong connection URL

**Solutions**:
1. Start Redis:
```bash
redis-server
# OR
docker run -d -p 6379:6379 redis:7-alpine
```

2. Verify Redis running:
```bash
redis-cli ping
# Should return: PONG
```

3. Check `CELERY_BROKER_URL` environment variable:
```bash
echo $CELERY_BROKER_URL
# Should be: redis://localhost:6379/0
```

---

### Error: "Timeout waiting for broker"

**Symptom**: Worker hangs on startup or health check returns timeout

**Cause**: Redis slow to respond or network issue

**Solutions**:
1. Check Redis latency:
```bash
redis-cli --latency
```

2. Increase connection timeout in settings:
```python
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = 10
```

3. Check firewall rules if using remote Redis

---

## Task Execution Issues

### Error: Task not executing

**Symptom**: Task.delay() returns task ID but task never runs

**Possible Causes**:

**1. Worker not running**
```bash
# Check if worker process exists
ps aux | grep "celery.*worker"

# Start worker if not running
celery -A config worker -l info
```

**2. Task not registered**
Check worker startup logs for task list:
```
[tasks]
  . tasks.examples.hello_world
  . tasks.examples.export_user_data
```

If task missing:
- Verify task decorated with `@shared_task`
- Check autodiscovery in app config
- Restart worker after adding new tasks

**3. Wrong queue**
Task sent to queue worker not listening to:
```python
# Send to specific queue
task.apply_async(queue='high_priority')

# Worker listening to specific queues
celery -A config worker -Q critical,default
```

---

### Error: "SoftTimeLimitExceeded"

**Symptom**: Task interrupted with timeout error

**Cause**: Task exceeded soft time limit (default 4.5 minutes)

**Solutions**:

1. Increase timeout for specific task:
```python
@shared_task(soft_time_limit=600)  # 10 minutes
def long_running_task():
    pass
```

2. Increase global timeout:
```python
# config/settings/celery.py
CELERY_TASK_SOFT_TIME_LIMIT = 600
```

3. Optimize task to run faster:
- Process in smaller chunks
- Use database query optimization
- Cache expensive operations

---

## Periodic Task Issues

### Error: Periodic tasks not executing

**Symptom**: Beat scheduler running but scheduled tasks not triggering

**Possible Causes**:

**1. Beat scheduler not running**
```bash
# Check for beat process
ps aux | grep "celery.*beat"

# Start if not running
celery -A config beat -l info
```

**2. Task name mismatch**
```python
# Schedule references wrong task name
CELERY_BEAT_SCHEDULE = {
    'my-task': {
        'task': 'tasks.examples.wrong_name',  # ❌ Task doesn't exist
        'schedule': 3600.0,
    },
}
```

Check beat logs for errors:
```
[ERROR] Received unregistered task of type 'tasks.examples.wrong_name'
```

**3. Schedule disabled**
```python
CELERY_BEAT_SCHEDULE = {
    'my-task': {
        'task': 'tasks.examples.hello_world',
        'schedule': 3600.0,
        'enabled': False,  # ❌ Task disabled
    },
}
```

---

### Error: Duplicate task executions

**Symptom**: Periodic task runs multiple times at same schedule interval

**Cause**: Multiple beat scheduler processes running

**Solution**:
1. Find all beat processes:
```bash
ps aux | grep "celery.*beat"
```

2. Kill duplicate processes:
```bash
kill <PID>
```

3. Ensure only ONE beat scheduler per deployment:
- Use `replicas: 1` in Docker/K8s
- Use singleton systemd service with PIDFile
- Document clearly in runbooks

---

## Performance Issues

### Error: Tasks queuing up, not processing fast enough

**Symptom**: Task queue growing, worker overwhelmed

**Solutions**:

**1. Add more workers**
```bash
# Start additional worker processes
celery -A config worker -l info --concurrency=8

# OR start multiple worker processes
celery -A config worker -l info &
celery -A config worker -l info &
```

**2. Increase concurrency**
```bash
# More worker threads/processes
celery -A config worker --concurrency=16
```

**3. Use multiple queues**
Separate high-priority from low-priority tasks:
```python
@shared_task
def critical_task():
    pass

@shared_task
def low_priority_task():
    pass

# Send to specific queues
critical_task.apply_async(queue='critical')
low_priority_task.apply_async(queue='default')

# Start workers for specific queues
celery -A config worker -Q critical -l info
celery -A config worker -Q default -l info
```

---

### Error: High memory usage in worker

**Symptom**: Worker memory grows over time, eventually crashes

**Possible Causes**:

**1. Task result accumulation**
```python
# Solution: Set shorter expiry
CELERY_RESULT_EXPIRES = 3600  # 1 hour instead of 24 hours
```

**2. Memory leak in task code**
Check for:
- Large objects not garbage collected
- Open file handles not closed
- Database connections not released

**3. Too many concurrent tasks**
```python
# Reduce concurrency
CELERY_WORKER_PREFETCH_MULTIPLIER = 2  # Default: 4
```

**4. Worker not restarting**
```python
# Restart worker after N tasks
CELERY_WORKER_MAX_TASKS_PER_CHILD = 100  # Default: 1000
```

---

## Debugging Tips

### Enable Debug Logging

```bash
# Worker with debug logs
celery -A config worker -l debug

# Beat with debug logs
celery -A config beat -l debug
```

### Inspect Worker State

```bash
# Active tasks
celery -A config inspect active

# Registered tasks
celery -A config inspect registered

# Worker stats
celery -A config inspect stats

# Scheduled tasks
celery -A config inspect scheduled
```

### Execute Task Synchronously (Testing)

```python
# In test or Django shell
from tasks.examples.hello_world import hello_world

result = hello_world.apply(args=['Alice'])  # Blocks until complete
print(result.result)  # "Hello, Alice!"
```

### Monitor with Flower

```bash
# Install Flower
pip install flower

# Start monitoring UI
celery -A config flower

# Navigate to http://localhost:5555
```

---

## Getting Help

**Internal Resources**:
- [Main Documentation](README.md)
- [Task Patterns](../../kitty-specs/015-tasks-scheduling-foundation/contracts/task-patterns.md)
- [Quickstart Guide](../../kitty-specs/015-tasks-scheduling-foundation/quickstart.md)

**External Resources**:
- [Celery Documentation](https://docs.celeryproject.org/)
- [Celery FAQ](https://docs.celeryproject.org/en/stable/faq.html)
- [Redis Documentation](https://redis.io/documentation)

**Logging**:
Check application logs for task execution details:
```bash
tail -f logs/celery.log
```
```

**Reference**: Common errors from development and testing

---

### T035: Create Deployment Templates
**Objective**: Production-ready service files

**Steps**:
1. Verify systemd templates exist (from WP01, WP05):
   - `docs/deployment/celery-worker.service`
   - `docs/deployment/celery-beat.service`

2. Verify supervisor templates exist (from WP01, WP05):
   - `docs/deployment/supervisor-celery.conf`
   - `docs/deployment/supervisor-celery-beat.conf`

3. Create README: `docs/deployment/README.md`:
```markdown
# Deployment Templates

Production deployment templates for Celery infrastructure.

## Systemd (Recommended for Linux servers)

### Worker Service
File: `celery-worker.service`

**Install**:
```bash
sudo cp celery-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable celery-worker
sudo systemctl start celery-worker
```

### Beat Scheduler Service
File: `celery-beat.service`

**Install**:
```bash
sudo cp celery-beat.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable celery-beat
sudo systemctl start celery-beat
```

**Monitor**:
```bash
sudo systemctl status celery-worker
sudo systemctl status celery-beat
sudo journalctl -u celery-worker -f
```

## Supervisor (Alternative)

### Configuration
Files: `supervisor-celery.conf`, `supervisor-celery-beat.conf`

**Install**:
```bash
sudo cp supervisor-celery*.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
```

**Monitor**:
```bash
sudo supervisorctl status
sudo supervisorctl tail celery-worker
```

## Docker & Kubernetes

See `docs/tasks/running-workers.md` for container deployment examples.

## Security Considerations

- Run workers as non-root user (`User=django` in systemd)
- Use environment files for secrets (not hardcoded in service files)
- Restrict log file permissions
- Use separate Redis namespace per environment

## Monitoring

- Enable health check endpoints
- Configure log rotation
- Set up alerts for worker failures
- Monitor Redis memory usage
```

4. Add `.env.production.example`:
```bash
# Django Settings
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=your-secret-key-here

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Optional: Result expiry
CELERY_RESULT_EXPIRES=3600
```

---

## Definition of Done

- [ ] Main documentation created: `docs/tasks/README.md` with architecture and navigation
- [ ] Worker management docs complete: `running-workers.md` with all deployment scenarios
- [ ] Periodic tasks docs complete: `periodic-tasks.md` with comparison and examples
- [ ] Troubleshooting guide created: `troubleshooting.md` with common errors
- [ ] Deployment README created: `docs/deployment/README.md` with installation steps
- [ ] All deployment templates verified (systemd, supervisor)
- [ ] Example .env file created for production

---

## Dependencies & Risks

**Depends On**:
- WP01-WP05 (all implementation complete to document)

**Blocks**: None (documentation is final step)

**Risks**:
1. **Documentation drift over time**
   - Mitigation: Link to code examples to stay in sync
   - Include version/date in headers

2. **Missing edge cases in troubleshooting**
   - Mitigation: Update based on user feedback
   - Encourage contributions

---

## Notes for Reviewer

- Verify documentation covers all deployment scenarios
- Check troubleshooting addresses common errors from testing
- Confirm deployment templates are production-ready
- Validate navigation between docs is clear
