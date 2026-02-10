---
wp: WP04
title: Celery Tasks & Queue Config
priority: P1
status: planned
subtasks: T031-T040
dependencies: WP03
estimated_effort: 4-6 hours
lane: "doing"
agent: "copilot-implementer"
shell_pid: "71676"
---

# WP04: Celery Tasks & Queue Config

## Objective

Implement Celery tasks for video processing with tiered queues (video_fast for thumbnails, video_slow for transcoding). Configure retry logic, status updates, and proper task routing.

## Context

- **Research**: `kitty-specs/049-video-processing-pipeline/research.md` (queue strategy)
- **Plan**: `kitty-specs/049-video-processing-pipeline/plan.md` (tiered queues decision)
- **Depends On**: WP03 (processors must exist)

## Queue Architecture

```
video_fast queue (concurrency=2):
├── generate_thumbnail
└── extract_metadata

video_slow queue (concurrency=1):
├── transcode_video
└── compose_video

default queue:
└── cleanup_temp_files
```

## Subtasks

### T031: Configure Tiered Celery Queues
Update `src/core/settings/celery.py`:
```python
from celery import Celery
from kombu import Queue

app = Celery("teamreel")

# Queue definitions
CELERY_TASK_QUEUES = (
    Queue("default", routing_key="default"),
    Queue("video_fast", routing_key="video.fast"),
    Queue("video_slow", routing_key="video.slow"),
)

# Task routing
CELERY_TASK_ROUTES = {
    "src.video.tasks.thumbnail.*": {"queue": "video_fast"},
    "src.video.tasks.transcode.*": {"queue": "video_slow"},
    "src.video.tasks.compose.*": {"queue": "video_slow"},
}
```

**Acceptance**: Queues appear in `celery inspect active_queues`

### T032: Create transcode_video Task [P]
Implement in `src/video/tasks/transcode.py`:
```python
from celery import shared_task
from src.video.services import VideoService
from src.video.models import VideoJob

@shared_task(
    bind=True,
    max_retries=3,
    soft_time_limit=1800,  # 30 min soft limit
    time_limit=2100,       # 35 min hard limit
    acks_late=True,
)
def transcode_video(self, job_id: str):
    """Transcode video to target format."""
    job = VideoJob.objects.get(id=job_id)
    service = VideoService()

    try:
        job.status = "processing"
        job.started_at = timezone.now()
        job.save(update_fields=["status", "started_at"])

        processor = service.get_processor(job)
        output_file = processor.execute()

        job.status = "completed"
        job.output_file = output_file
        job.completed_at = timezone.now()
        job.save()

    except Exception as exc:
        job.status = "failed"
        job.error_message = str(exc)
        job.save(update_fields=["status", "error_message"])
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

**Acceptance**: Task transcode video with retry on failure

### T033: Create generate_thumbnail Task [P]
Implement in `src/video/tasks/thumbnail.py`:
```python
@shared_task(
    bind=True,
    max_retries=3,
    soft_time_limit=60,   # 1 min soft limit
    time_limit=120,       # 2 min hard limit
    acks_late=True,
)
def generate_thumbnail(self, job_id: str, timestamp_seconds: float = None):
    """Generate thumbnail at specified timestamp."""
    job = VideoJob.objects.get(id=job_id)
    # ... similar pattern to transcode
```

**Acceptance**: Thumbnail generates quickly (<30s for most videos)

### T034: Create compose_video Task [P]
Implement in `src/video/tasks/compose.py`:
```python
@shared_task(
    bind=True,
    max_retries=3,
    soft_time_limit=3600,  # 1 hour soft limit
    time_limit=4200,       # 1h10m hard limit
    acks_late=True,
)
def compose_video(self, job_id: str):
    """Compose video with overlays."""
    job = VideoJob.objects.get(id=job_id)
    # ... process overlays
```

**Acceptance**: Video with overlays composes correctly

### T035: Implement Retry Logic with Exponential Backoff
Configure retry in task decorator:
```python
@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=60,      # Start with 60s
    retry_backoff_max=3600, # Max 1 hour
    retry_jitter=True,      # Add randomness
    max_retries=3,
)
```

Track retry count on job:
```python
job.retry_count = self.request.retries
job.save(update_fields=["retry_count"])
```

**Acceptance**: Failed jobs retry with increasing delays

### T036: Implement Job Status Updates
Status flow:
```
pending → queued → processing → completed
                 ↘ failed
                 ↘ cancelled
```

Update status at each stage:
```python
# On task received (before execution)
@task_prerun.connect(sender=transcode_video)
def on_task_prerun(sender, task_id, task, args, **kwargs):
    job_id = args[0]
    VideoJob.objects.filter(id=job_id).update(status="processing")
```

**Acceptance**: Job status reflects actual task state

### T037: Implement progress_percent Updates
Update progress during FFmpeg execution:
```python
def progress_callback(percent: int):
    VideoJob.objects.filter(id=job.id).update(progress_percent=percent)

processor.execute(progress_callback=progress_callback)
```

Use atomic update to avoid race conditions.

**Acceptance**: progress_percent increases during processing

### T038: Wire Task Dispatch from VideoService
In `VideoService.create_job()`:
```python
def create_job(self, ...) -> VideoJob:
    job = VideoJob.objects.create(
        project=project,
        created_by=user,
        source_file=source_file,
        job_type=job_type,
        status="pending",
    )

    # Dispatch to appropriate queue
    if job_type == "transcode":
        transcode_video.delay(str(job.id))
    elif job_type == "thumbnail":
        generate_thumbnail.delay(str(job.id))
    elif job_type == "compose":
        compose_video.delay(str(job.id))

    job.status = "queued"
    job.save(update_fields=["status"])

    return job
```

**Acceptance**: Job creation triggers correct task

### T039: Add Task Routing Configuration
Create `src/video/tasks/__init__.py`:
```python
from .transcode import transcode_video
from .thumbnail import generate_thumbnail
from .compose import compose_video

__all__ = ["transcode_video", "generate_thumbnail", "compose_video"]
```

Ensure tasks are discoverable:
```python
# In celery.py
app.autodiscover_tasks(["src.video"])
```

**Acceptance**: Tasks appear in `celery inspect registered`

### T040: Document Worker Startup Commands
Add to quickstart.md:
```bash
# Start all workers
celery -A src.core worker -Q default,video_fast,video_slow -l info

# Start dedicated video workers (production)
celery -A src.core worker -Q video_fast -c 2 -n video_fast@%h
celery -A src.core worker -Q video_slow -c 1 -n video_slow@%h
```

Add to docker-compose:
```yaml
video_worker_fast:
  command: celery -A src.core worker -Q video_fast -c 2 -l info

video_worker_slow:
  command: celery -A src.core worker -Q video_slow -c 1 -l info
```

**Acceptance**: Workers start with correct queue bindings

## Validation Criteria

1. Tasks registered in Celery
2. Tasks route to correct queues
3. Retry works with exponential backoff
4. Status updates reflect task state
5. Progress updates during execution
6. Workers start with documented commands

## Files to Create/Modify

**Create**:
- `src/video/tasks/__init__.py`
- `src/video/tasks/transcode.py`
- `src/video/tasks/thumbnail.py`
- `src/video/tasks/compose.py`

**Modify**:
- `src/core/settings/celery.py` (queue config)
- `docker-compose.local.yml` (video workers)
- `kitty-specs/049-video-processing-pipeline/quickstart.md` (commands)

## Review Checklist

- [ ] All tasks use acks_late=True for crash safety
- [ ] Time limits appropriate for task type
- [ ] Retry backoff configured correctly
- [ ] Status updates are atomic
- [ ] Progress updates don't cause deadlocks
- [ ] Tasks properly import processors
- [ ] Worker commands documented
- [ ] Docker compose updated
- [ ] Type hints on task functions

## Activity Log

- 2026-02-10T14:20:52Z – copilot-implementer – shell_pid=71676 – lane=doing – Started implementation
