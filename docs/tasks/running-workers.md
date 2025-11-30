# Running Celery Workers

## Local Development

Start a worker with info-level logging:

```bash
celery -A config worker -l info
```

**Options**:
- `-l debug`: More verbose logging
- `--concurrency=4`: Number of worker processes (default: CPU count)
- `-Q critical,default`: Listen to specific queues

**Example with custom concurrency**:
```bash
celery -A config worker -l info --concurrency=4
```

## Prerequisites

Ensure Redis is running before starting workers:

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

If Redis is not running:
- **Docker**: `docker run -d -p 6379:6379 redis:7`
- **Local**: `redis-server` (install via package manager)

## Production Deployment

### Systemd Service (Linux)

See `docs/deployment/celery-worker.service` for systemd template.

**Install**:
```bash
sudo cp docs/deployment/celery-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable celery-worker
sudo systemctl start celery-worker
```

**Monitor**:
```bash
sudo systemctl status celery-worker
sudo journalctl -u celery-worker -f
```

### Supervisor (Alternative)

See `docs/deployment/supervisor-celery.conf` for supervisor template.

**Install**:
```bash
sudo cp docs/deployment/supervisor-celery.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start celery-worker
```

### Docker

```dockerfile
# In your Dockerfile
CMD ["celery", "-A", "config", "worker", "-l", "info"]
```

**Docker Compose**:
```yaml
services:
  celery-worker:
    build: .
    command: celery -A config worker -l info
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
```

### Kubernetes

See `docs/deployment/k8s-celery-worker.yaml` for Kubernetes deployment template.

## Worker Scaling

**Horizontal Scaling** (multiple workers):
```bash
# Terminal 1
celery -A config worker -l info -n worker1@%h

# Terminal 2
celery -A config worker -l info -n worker2@%h
```

**Vertical Scaling** (more processes per worker):
```bash
celery -A config worker -l info --concurrency=8
```

## Monitoring

Check worker status:
```bash
celery -A config inspect active
celery -A config inspect stats
celery -A config inspect registered
```

## Graceful Shutdown

Workers support graceful shutdown:
- `TERM` signal: Finish current tasks, then stop
- `QUIT` signal: Wait for all tasks, then stop
- `INT` signal: Immediate stop (may lose tasks)

```bash
# Graceful shutdown (finish current tasks)
pkill -TERM -f "celery worker"
```

## Troubleshooting

**Worker not receiving tasks**:
1. Check Redis connection: `redis-cli ping`
2. Verify broker URL matches in settings and environment
3. Check worker is running: `celery -A config inspect ping`

**Tasks stuck in PENDING**:
1. Ensure worker is running
2. Check task routing (worker may be listening to wrong queue)
3. Verify task is imported correctly: `celery -A config inspect registered`

**Memory leaks**:
- Workers automatically restart after 1000 tasks (see `CELERY_WORKER_MAX_TASKS_PER_CHILD`)
- Monitor with: `celery -A config inspect stats | grep "pool-process"`

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

**Docker Compose**:
```yaml
services:
  celery-beat:
    build: .
    command: celery -A config beat -l info
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
```

**Note**: Ensure only one beat container runs (use `replicas: 1` in production).

### Beat Scheduler State

Beat scheduler maintains state in `celerybeat-schedule` file (default) to track last run times.

**Behavior**:
- If beat crashes and restarts, it resumes from last known state
- Some scheduled executions may be delayed but system continues normally
- Delete `celerybeat-schedule` to reset all timers (use with caution)

**File Location**: Project root by default. Add to `.gitignore`.

### Troubleshooting Beat Scheduler

**Tasks not executing on schedule**:
- Check beat scheduler is running: `ps aux | grep "celery.*beat"`
- Verify task name in schedule matches actual task
- Check beat logs for errors: `celery -A config beat -l debug`

**Duplicate executions**:
- Confirm only ONE beat scheduler running
- Check for multiple beat processes: `ps aux | grep "celery.*beat"`

**Schedule drift**:
- Beat scheduler has ±10 second accuracy (acceptable per specification)
- For exact timing requirements, consider external cron + task triggering
