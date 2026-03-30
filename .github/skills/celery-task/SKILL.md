---
name: celery-task
description: "Scaffold and debug Celery async tasks — queue selection, retry patterns, idempotency, testing. Use when creating background jobs, debugging workers, or adding async processing."
compatibility: "Requires Celery, Redis broker, and the 4-queue architecture configured in settings."
metadata:
  author: teamreel
  argument-hint: "Task to create or debug (e.g. 'generate video thumbnails' or 'debug failing email task')"
---

# Celery Task Skill

Scaffold, debug, and test Celery async tasks following TeamReel conventions.

## When to use
- Creating a new background/async task
- Debugging a failing Celery worker or task
- Adding retry logic, rate limiting, or priority queuing
- Moving synchronous code to async processing

## When NOT to use
- Synchronous API logic that doesn't need background processing → keep in ViewSet/service
- One-off management commands → use Django management commands instead

## Queue Architecture

TeamReel uses 4 Celery queues across 3 Railway workers:

| Queue | Purpose | Worker | Concurrency | Use for |
|-------|---------|--------|-------------|---------|
| `default` | General tasks | celery-worker | 2 | Notifications, cleanup, indexing, workflows |
| `video_fast` | Quick video ops | celery-worker | 2 | Thumbnails, auto-crop, metadata extraction |
| `video_slow` | Heavy FFmpeg work | celery-worker | 1 | Transcode, compose, lineup video, asset processing |
| `ai_generation` | Rate-limited AI calls | worker-ai | 1 | OpenAI, Gemini, LangGraph, asset generation |

> **Reference**: See `docs/features/celery-tasks.md` for the full task inventory (33 production tasks) and beat schedule.

## Task Template

### Basic Task

```python
"""
Celery tasks for <app_name>.
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="<app_name>.tasks.<task_name>",
    queue="default",
    max_retries=3,
    default_retry_delay=60,  # seconds
    acks_late=True,
    reject_on_worker_lost=True,
)
def task_name(self, resource_id: str, **kwargs) -> dict:
    """
    Short description of what this task does.

    Args:
        resource_id: UUID of the resource to process.

    Returns:
        dict with status and any result data.
    """
    from <app_name>.models import Resource  # import inside to avoid circular

    try:
        resource = Resource.objects.get(id=resource_id)
    except Resource.DoesNotExist:
        logger.warning("Resource %s not found, skipping task", resource_id)
        return {"status": "skipped", "reason": "not_found"}

    try:
        # Do the actual work
        result = process_resource(resource)
        return {"status": "completed", "result": result}

    except Exception as exc:
        logger.exception("Task %s failed for resource %s", self.name, resource_id)
        raise self.retry(exc=exc)
```

### Video Processing Task

```python
@shared_task(
    bind=True,
    name="video.tasks.render_video",
    queue="video",
    max_retries=2,
    default_retry_delay=120,
    soft_time_limit=600,   # 10 min soft limit
    time_limit=660,        # 11 min hard limit
    acks_late=True,
)
def render_video(self, job_id: str) -> dict:
    """Render a video job via FFmpeg."""
    ...
```

### AI Generation Task

```python
@shared_task(
    bind=True,
    name="generative.tasks.generate_content",
    queue="ai",
    max_retries=3,
    default_retry_delay=30,
    rate_limit="10/m",  # max 10 per minute (API rate limiting)
    acks_late=True,
)
def generate_content(self, request_id: str) -> dict:
    """Generate content via AI provider."""
    ...
```

## Key Patterns

### Idempotency
Tasks must be safe to run multiple times with the same arguments:

```python
@shared_task(bind=True, name="app.tasks.process_item", queue="default")
def process_item(self, item_id: str) -> dict:
    from app.models import Item

    item = Item.objects.get(id=item_id)

    # Guard: skip if already processed
    if item.status == "completed":
        logger.info("Item %s already processed, skipping", item_id)
        return {"status": "skipped", "reason": "already_completed"}

    # Mark as processing (optimistic lock)
    updated = Item.objects.filter(
        id=item_id, status="pending"
    ).update(status="processing")

    if not updated:
        logger.warning("Item %s not in pending state, skipping", item_id)
        return {"status": "skipped", "reason": "state_conflict"}

    # Do work...
    item.refresh_from_db()
    item.status = "completed"
    item.save(update_fields=["status", "updated_at"])
    return {"status": "completed"}
```

### Chaining Tasks
```python
from celery import chain

# Process → Generate thumbnail → Notify
workflow = chain(
    process_upload.s(file_id),
    generate_thumbnail.s(),
    notify_user.s(user_id=user_id),
)
workflow.apply_async()
```

### Calling Tasks
```python
# From a ViewSet or service:
from myapp.tasks import process_item

# Async dispatch
process_item.delay(str(resource.id))

# With options
process_item.apply_async(
    args=[str(resource.id)],
    countdown=30,           # delay 30 seconds
    queue="priority",       # override queue
    priority=9,             # higher priority (0-9)
)
```

## Testing Celery Tasks

### Test Setup
```python
import pytest
from unittest.mock import patch

@pytest.fixture
def celery_eager(settings):
    """Run tasks synchronously in tests."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True

@pytest.mark.django_db
class TestProcessItemTask:
    def test_processes_pending_item(self, celery_eager):
        item = ItemFactory(status="pending")
        result = process_item(str(item.id))
        assert result["status"] == "completed"
        item.refresh_from_db()
        assert item.status == "completed"

    def test_skips_already_completed(self, celery_eager):
        item = ItemFactory(status="completed")
        result = process_item(str(item.id))
        assert result["status"] == "skipped"

    def test_retries_on_failure(self, celery_eager):
        item = ItemFactory(status="pending")
        with patch("myapp.tasks.process_resource", side_effect=Exception("boom")):
            with pytest.raises(Exception):
                process_item(str(item.id))
```

## Debugging Celery Tasks

### Check Worker Logs
```powershell
# Link to the appropriate Railway service first
railway link  # select celery-worker or worker-ai

# View recent task logs
railway logs 2>&1 | Select-String "Task|ERROR|Exception|retry" | Select-Object -First 50

# Check for stuck tasks
railway logs 2>&1 | Select-String "received|succeeded|failed" | Select-Object -Last 30
```

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Task never runs | Wrong queue name | Check `queue=` matches worker `-Q` flag |
| Task retries forever | Missing `max_retries` | Set explicit `max_retries=3` |
| Task hangs | No time limit | Add `soft_time_limit` + `time_limit` |
| Duplicate processing | Not idempotent | Add status guard check |
| Import error in worker | Circular import | Move imports inside task function |
| Task succeeds but no effect | Missing `.save()` | Ensure model changes are persisted |
| `WorkerLostError` | OOM or timeout | Reduce batch size, add `reject_on_worker_lost=True` |

### Verify Task Registration
```powershell
# Check if task is registered
python manage.py shell -c "from celery import current_app; print([t for t in current_app.tasks if 'myapp' in t])"
```

## File Location

Tasks go in `src/<app>/tasks.py`. Register the app in `INSTALLED_APPS` and ensure `apps.py` has a `ready()` method if using signals.

## Output Format

```markdown
## Celery Task: [task_name]

### Configuration
| Setting | Value |
|---------|-------|
| Queue | default/video/ai/priority |
| Max retries | 3 |
| Retry delay | 60s |
| Time limit | soft: 300s, hard: 360s |
| Rate limit | None |
| Idempotent | Yes/No |

### Files Created/Modified
| File | Changes |
|------|---------|

### Tests
| Test | What it verifies |
|------|-----------------|
```
