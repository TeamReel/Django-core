# Video Processing Pipeline (B55)

## Overview

FFmpeg-based video processing for the Django Core-App. Provides async video transcoding, thumbnail generation, composition with overlays, and platform-specific exports.

## Features

- **Async Video Transcoding**: Convert videos between formats (MP4, WebM, HLS) with quality presets
- **Thumbnail Generation**: Extract frames at timestamps or create grid layouts
- **Video Composition**: Add logos, watermarks, text overlays, intro/outro sequences
- **Platform-Specific Exports**: Instagram (1:1, 4:5, 9:16), TikTok, YouTube, Stories
- **Workflow Integration**: Optional B37 workflow approval flows
- **Tiered Queue Architecture**: Dedicated Celery queues for fast/slow processing

## Architecture

```
VideoJob → Celery Task → Processor → FFmpeg → S3
```

### Components

- **Models**: VideoJob, VideoPreset, PlatformExport, VideoOverlay
- **Services**: VideoService, TranscodeProcessor, ThumbnailProcessor, ComposeProcessor
- **Tasks**: Celery workers (video_fast, video_slow queues)
- **API**: DRF ViewSets with 8 REST endpoints

## Quick Start

### Create a transcode job

```python
from src.video.services import VideoService
from src.video.models import VideoPreset

service = VideoService()
preset = VideoPreset.objects.get(name="1080p_standard")

job = service.create_job(
    project=project,
    user=request.user,
    input_file=file,
    job_type="transcode",
    preset=preset,
)
# Job is now queued and will be processed async
```

### Generate a thumbnail

```python
job = service.create_job(
    project=project,
    user=request.user,
    input_file=file,
    job_type="thumbnail",
    config={"timestamp": 5.0},  # 5 seconds into video
)
```

### Check job status

```python
from src.video.models import VideoJob

job = VideoJob.objects.get(id=job_id)
print(f"Status: {job.status}")
print(f"Progress: {job.progress_percent}%")
if job.status == "completed":
    print(f"Output: {job.output_file.url}")
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/video/jobs/` | Create a new video job |
| GET | `/api/v1/video/jobs/` | List jobs (paginated, filterable) |
| GET | `/api/v1/video/jobs/{id}/` | Get job details |
| DELETE | `/api/v1/video/jobs/{id}/` | Cancel queued job |
| POST | `/api/v1/video/jobs/{id}/retry/` | Retry failed job |
| GET | `/api/v1/video/presets/` | List encoding presets |
| GET | `/api/v1/video/platforms/` | List platform exports |

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `VIDEO_MAX_FILE_SIZE` | 2GB | Max upload size |
| `VIDEO_MAX_DURATION` | 900s | Max duration (15 min) |
| `VIDEO_TEMP_DIR` | `/tmp/video_jobs` | Temp processing dir |

## Dependencies

- **FFmpeg 4.4+**: Required for video processing
- **B07 Projects**: Job scoping
- **B08 Authentication**: User context
- **B15 Background Tasks**: Celery integration
- **B22 File Storage**: S3 for input/output files
- **B35 Media Library**: Asset organization
- **B37 Workflow**: Optional approval flows

## Related Modules

- [B22 File Storage](../files/README.md) - S3 integration
- [B37 Workflow Engine](../workflow/README.md) - Approval flows
- [B15 Background Tasks](../background/README.md) - Celery config

## Extension Points

### Custom Presets

Create project-specific presets via Django Admin or API:

```python
preset = VideoPreset.objects.create(
    name="custom_4k",
    output_format="mp4",
    video_codec="libx264",
    resolution="3840x2160",
    bitrate_video="20M",
    crf=18,
)
```

### Custom Processors

Extend `BaseVideoProcessor` for custom FFmpeg operations:

```python
from src.video.services.processors.base import BaseVideoProcessor

class CustomProcessor(BaseVideoProcessor):
    def build_command(self, input_path: str, output_path: str) -> list[str]:
        return [
            "ffmpeg", "-i", input_path,
            # Your custom FFmpeg flags
            output_path
        ]
```

## Testing

```bash
# Run video tests
pytest tests/video/ -v

# With coverage
pytest tests/video/ --cov=src.video --cov-report=html
```

## Documentation

- [Specification](../../kitty-specs/049-video-processing-pipeline/spec.md)
- [Data Model](../../kitty-specs/049-video-processing-pipeline/data-model.md)
- [API Contract](../../kitty-specs/049-video-processing-pipeline/contracts/openapi.yaml)
- [Quickstart Guide](../../kitty-specs/049-video-processing-pipeline/quickstart.md)
