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

**Docker Compose** (Complete example):
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  celery-worker:
    build: .
    command: celery -A config worker -l info
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - DJANGO_SETTINGS_MODULE=config.settings.production
    depends_on:
      - redis
    deploy:
      replicas: 2  # Multiple workers OK
    volumes:
      - ./logs:/var/log/celery

  celery-beat:
    build: .
    command: celery -A config beat -l info
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - DJANGO_SETTINGS_MODULE=config.settings.production
    depends_on:
      - redis
    deploy:
      replicas: 1  # ONLY ONE beat scheduler
```

### Kubernetes

**Worker Deployment** (`k8s-celery-worker.yaml`):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
  labels:
    app: celery-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      containers:
      - name: worker
        image: django-core-app:latest
        command: ["celery", "-A", "config", "worker", "-l", "info"]
        env:
        - name: CELERY_BROKER_URL
          value: "redis://redis-service:6379/0"
        - name: DJANGO_SETTINGS_MODULE
          value: "config.settings.production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

**Beat Deployment** (`k8s-celery-beat.yaml`):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-beat
  labels:
    app: celery-beat
spec:
  replicas: 1  # CRITICAL: Only 1 replica
  selector:
    matchLabels:
      app: celery-beat
  template:
    metadata:
      labels:
        app: celery-beat
    spec:
      containers:
      - name: beat
        image: django-core-app:latest
        command: ["celery", "-A", "config", "beat", "-l", "info"]
        env:
        - name: CELERY_BROKER_URL
          value: "redis://redis-service:6379/0"
        - name: DJANGO_SETTINGS_MODULE
          value: "config.settings.production"
```

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

### Flower (Web-based Monitoring)

Install and run Flower for real-time task monitoring:

```bash
# Install
pip install flower

# Start monitoring UI
celery -A config flower

# Navigate to http://localhost:5555
```

**Features**:
- Real-time task monitoring
- Task history and results
- Worker status and statistics
- Task routing visualization

**Docker Compose**:
```yaml
services:
  flower:
    build: .
    command: celery -A config flower
    ports:
      - "5555:5555"
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
```

### Prometheus Metrics

For prometheus integration, install django-prometheus:

```bash
pip install django-prometheus
```

Configure in settings and expose metrics at `/metrics`.

## Scaling Guidance

### When to Add Workers

Monitor these signals to determine when to scale:

**Add Workers When**:
- Task queue length consistently > 100
- Worker CPU utilization > 80%
- Task wait time > 30 seconds
- Health check shows degraded performance

**How to Scale**:

1. **Horizontal Scaling** (add more worker processes):
   - Docker: Increase `replicas` in docker-compose
   - Kubernetes: Increase `replicas` in deployment
   - Systemd: Create additional service units

2. **Vertical Scaling** (more concurrency per worker):
   - Increase `--concurrency` flag
   - Ensure sufficient CPU and memory resources

**Example Scaling Strategy**:
- **Light Load**: 1-2 workers, concurrency 4
- **Medium Load**: 3-5 workers, concurrency 8
- **Heavy Load**: 10+ workers, concurrency 16

### Queue-Based Scaling

Route different task types to different queues:

```python
# High-priority queue
@shared_task
def critical_operation():
    pass

critical_operation.apply_async(queue='critical')

# Start dedicated worker for critical queue
celery -A config worker -Q critical -l info --concurrency=2
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
