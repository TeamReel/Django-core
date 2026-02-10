# Quickstart: Video Processing Pipeline

**Feature**: B55 Video Processing Pipeline
**Date**: 2026-02-10

## Overview

This module provides video transcoding, thumbnail generation, and composition capabilities for the Django Core-App. Videos are processed asynchronously using Celery workers with FFmpeg.

## Prerequisites

- Django Core-App running with B07 (Projects), B08 (Auth), B15 (Celery), B22 (File Storage)
- FFmpeg installed on worker servers
- AWS S3 bucket configured (via B22)
- Redis for Celery broker

## Quick Setup

### 1. Install FFmpeg (Dockerfile)

```dockerfile
# Add to your Dockerfile
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
```

### 2. Configure Celery Queues

The queues are already configured in `config/settings/celery.py`:

```python
# Tiered queue configuration (already configured in B55)
CELERY_TASK_QUEUES = (
    Queue("default", routing_key="default"),
    Queue("video_fast", routing_key="video.fast"),
    Queue("video_slow", routing_key="video.slow"),
)

CELERY_TASK_ROUTES = {
    "src.video.tasks.thumbnail.generate_thumbnail": {"queue": "video_fast"},
    "src.video.tasks.transcode.transcode_video": {"queue": "video_slow"},
    "src.video.tasks.compose.compose_video": {"queue": "video_slow"},
}
```

### 3. Environment Variables

```bash
# .env
VIDEO_MAX_FILE_SIZE_MB=2048        # 2GB default
VIDEO_MAX_DURATION_SECONDS=900      # 15 minutes default
VIDEO_TEMP_DIR=/tmp/video_jobs      # Temp processing directory
```

### 4. Run Migrations

```bash
python manage.py migrate video
```

### 5. Seed System Presets (Required)

Seed baseline video presets and platform export configurations:

```bash
python manage.py seed_video_presets
```

This creates:
- **6 System Presets**: 1080p_high, 1080p_standard, 720p_standard, 480p_web, thumbnail, webm_vp9
- **7 Platform Exports**: Instagram (Feed Square/Portrait/Reels), Stories, TikTok, YouTube (Shorts/Standard)

The command is idempotent - safe to run multiple times (updates existing records).

## Basic Usage

### Submit a Transcode Job

```python
from video.services import VideoService

# Create transcode job
job = VideoService.create_job(
    project=project,
    user=request.user,
    job_type='transcode',
    input_file=uploaded_file,
    config={
        'output_format': 'mp4',
        'quality': '720p',
    }
)

# Job is automatically queued for processing
print(f"Job {job.id} queued with status: {job.status}")
```

### Generate Thumbnail

```python
job = VideoService.create_job(
    project=project,
    user=request.user,
    job_type='thumbnail',
    input_file=video_file,
    config={
        'timestamp': '00:00:05',  # Extract at 5 seconds
    }
)
```

### Generate Thumbnail Grid

```python
job = VideoService.create_job(
    project=project,
    user=request.user,
    job_type='thumbnail',
    input_file=video_file,
    config={
        'grid': {'rows': 3, 'cols': 3},  # 3x3 grid
    }
)
```

### Platform-Specific Export

```python
# Get Instagram 1:1 export config
instagram_export = PlatformExport.objects.get(
    platform='instagram',
    aspect_ratio='1:1'
)

job = VideoService.create_job(
    project=project,
    user=request.user,
    job_type='transcode',
    input_file=video_file,
    platform_export=instagram_export,
)
```

### Video Composition with Overlays

```python
job = VideoService.create_job(
    project=project,
    user=request.user,
    job_type='compose',
    input_file=video_file,
    overlays=[
        {
            'overlay_type': 'logo',
            'position': 'top-right',
            'padding_percent': 5,
            'asset_file': logo_file,
        },
        {
            'overlay_type': 'text',
            'position': 'bottom-left',
            'content': {
                'text': 'Goal: John Smith',
                'font_size': 48,
                'color': '#FFFFFF',
            },
        },
    ],
)
```

### With Workflow Approval (B37)

```python
from workflows.services import WorkflowService

# Create job with approval workflow
workflow_instance = WorkflowService.create_instance(
    template=content_approval_template,
    content_object=None,  # Will be linked after
    project=project,
    created_by=request.user,
)

job = VideoService.create_job(
    project=project,
    user=request.user,
    job_type='transcode',
    input_file=video_file,
    workflow_instance=workflow_instance,
    config={'output_format': 'mp4', 'quality': '1080p'},
)

# After processing completes, video needs approval before use
# workflow_instance.current_state will be 'pending_approval'
```

## API Endpoints

### Create Job
```bash
curl -X POST /api/v1/video/jobs/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Project-ID: $PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "job_type": "transcode",
    "input_file_id": "file-uuid",
    "config": {
      "output_format": "mp4",
      "quality": "720p"
    }
  }'
```

### Check Job Status
```bash
curl /api/v1/video/jobs/{job_id}/ \
  -H "Authorization: Bearer $TOKEN"
```

### List Available Presets
```bash
curl /api/v1/video/presets/ \
  -H "Authorization: Bearer $TOKEN"
```

### List Platform Exports
```bash
curl /api/v1/video/platforms/ \
  -H "Authorization: Bearer $TOKEN"
```

## Monitoring Jobs

### Check Progress

```python
job = VideoJob.objects.get(id=job_id)
print(f"Status: {job.status}")
print(f"Progress: {job.progress_percent}%")

if job.status == 'completed':
    print(f"Output: {job.output_file.url}")
    print(f"Duration: {job.metadata.get('duration_seconds')}s")

if job.status == 'failed':
    print(f"Error: {job.error_message}")
```

### List User's Jobs

```python
jobs = VideoJob.objects.filter(
    project=project,
    created_by=user,
).order_by('-created_at')[:10]
```

## Worker Commands

### Start All Workers (Development - Single Terminal)

```bash
# Start all queues in one worker (development only)
celery -A config worker -Q default,video_fast,video_slow --loglevel=info
```

### Start Workers (Development - Separate Terminals)

```bash
# Terminal 1: Fast queue (thumbnails, quick operations) - concurrency=2
celery -A config worker -Q video_fast --concurrency=2 --loglevel=info -n video_fast@%h

# Terminal 2: Slow queue (transcoding, composition) - concurrency=1
celery -A config worker -Q video_slow --concurrency=1 --loglevel=info -n video_slow@%h

# Terminal 3: Default queue (other background tasks) - concurrency=4
celery -A config worker -Q default --concurrency=4 --loglevel=info -n default@%h
```

### Start Workers (Docker Compose)

```bash
# Start all services including video workers
docker-compose -f docker-compose.local.yml up

# Or start video workers only
docker-compose -f docker-compose.local.yml up video-worker-fast video-worker-slow
```

### Start Workers (Production - Railway)

```json
// railway.json (already configured)
{
  "services": {
    "worker-video-fast": {
      "command": "celery -A config worker -Q video_fast --concurrency=2 -n video_fast@%h"
    },
    "worker-video-slow": {
      "command": "celery -A config worker -Q video_slow --concurrency=1 -n video_slow@%h"
    }
  }
}
```

### Verify Workers Are Running

```bash
# Check active queues
celery -A config inspect active_queues

# Check registered tasks
celery -A config inspect registered

# Check active workers
celery -A config inspect active
```

## Extending

### Custom Video Processor

```python
from video.services.processors import BaseVideoProcessor

class CustomProcessor(BaseVideoProcessor):
    """Custom processing logic."""

    def process(self, input_path: Path, output_path: Path, config: dict) -> dict:
        # Your custom FFmpeg commands
        ...
        return {'duration_seconds': 120, 'resolution': '1920x1080'}
```

### Custom Platform Export

```python
PlatformExport.objects.create(
    platform='custom',
    aspect_ratio='21:9',
    resolution='2560x1080',
    preset=cinema_preset,
    crop_strategy='letterbox',
)
```

## Troubleshooting

### Job Stuck in 'queued'
- Check Celery workers are running: `celery -A config inspect active`
- Verify queue routing: `celery -A config inspect active_queues`

### FFmpeg Not Found
- Verify installation: `ffmpeg -version`
- Check Dockerfile includes FFmpeg

### Out of Disk Space
- Increase worker disk allocation
- Check temp cleanup in task `finally` blocks

### S3 Upload Failures
- Verify AWS credentials in environment
- Check B22 File Storage configuration
