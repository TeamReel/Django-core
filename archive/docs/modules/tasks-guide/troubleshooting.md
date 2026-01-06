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

### Error: "Task of type X is not registered"

**Symptom**:
```
[ERROR] Received unregistered task of type 'tasks.examples.my_task'
```

**Cause**: Worker doesn't recognize task (import issue or wrong name)

**Solutions**:

1. Check task name in schedule/trigger:
```python
# Correct: full dotted path
'task': 'tasks.examples.my_task'

# Wrong: missing module
'task': 'my_task'
```

2. Verify task is decorated:
```python
from celery import shared_task

@shared_task  # MUST have decorator
def my_task():
    pass
```

3. Check autodiscovery in tasks app:
```python
# src/tasks/apps.py
class TasksConfig(AppConfig):
    name = 'tasks'

    def ready(self):
        # Ensure autodiscovery finds tasks
        pass
```

4. Restart worker after code changes

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

**4. Worker not running**
Beat sends tasks, but no worker to execute them:
```bash
# Start worker in separate terminal
celery -A config worker -l info
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

## Audit Trail Issues

### Error: Audit events not created

**Symptom**: AuditedTask runs but no audit events in database

**Possible Causes**:

**1. Task not using AuditedTask base**
```python
# Wrong
@shared_task
def my_task(user_id, org_id):
    pass

# Correct
@shared_task(base=AuditedTask)
def my_task(user_id, org_id):
    pass
```

**2. Missing required context**
```python
# Must pass user_id, org_id explicitly
result = my_task.delay(user_id=123, org_id=456)
```

**3. B09 audit app not configured**
- Verify `audit` app in INSTALLED_APPS
- Run migrations: `python manage.py migrate audit`

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

# Reserved tasks (prefetched)
celery -A config inspect reserved
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

Flower provides:
- Real-time task monitoring
- Task history and results
- Worker status and statistics
- Task routing visualization

### Check Redis Connection

```bash
# Test connection
redis-cli -h localhost -p 6379 ping

# Monitor commands in real-time
redis-cli monitor

# Check memory usage
redis-cli info memory

# List all keys (use cautiously in production)
redis-cli keys "*celery*"
```

### Verify Settings

```python
# Django shell
python manage.py shell

from django.conf import settings
print(settings.CELERY_BROKER_URL)
print(settings.CELERY_RESULT_BACKEND)
print(settings.CELERY_BEAT_SCHEDULE)
```

---

## Getting Help

**Internal Resources**:
- [Main Documentation](README.md)
- [Task Patterns](../../kitty-specs/015-tasks-scheduling-foundation/contracts/task-patterns.md)
- [Quickstart Guide](../../kitty-specs/015-tasks-scheduling-foundation/quickstart.md)
- [Running Workers](running-workers.md)
- [Periodic Tasks](periodic-tasks.md)

**External Resources**:
- [Celery Documentation](https://docs.celeryproject.org/)
- [Celery FAQ](https://docs.celeryproject.org/en/stable/faq.html)
- [Redis Documentation](https://redis.io/documentation)

**Logging**:
Check application logs for task execution details:
```bash
tail -f logs/celery.log
journalctl -u celery-worker -f  # systemd
docker logs -f <container_id>   # Docker
```
