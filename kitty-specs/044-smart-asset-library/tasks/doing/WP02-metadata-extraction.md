---
work_package_id: WP02
work_package_name: Metadata Extraction
priority: P1
estimated_hours: 4
dependencies:
  - WP01
  - Pillow
  - ffprobe (FFmpeg)
subtasks:
  - id: T008
    title: Implement extract_image_metadata() service
    priority: P1
    status: completed
  - id: T009
    title: Implement extract_video_metadata() service
    priority: P1
    status: completed
  - id: T010
    title: Create Celery task process_media_item
    priority: P1
    status: completed
  - id: T011
    title: Wire extraction to MediaItem creation flow
    priority: P1
    status: completed
  - id: T012
    title: Handle extraction failures gracefully
    priority: P2
    status: completed
lane: "doing"
agent: "GitHub Copilot"
shell_pid: "10500"
---

# WP02: Metadata Extraction

## Goal
Auto-extract image and video metadata (dimensions, duration, etc.) on upload using Pillow for images and ffprobe for videos.

## Context

### Design Documents
- **Research**: See `research.md` for library selection rationale
- **Data Model**: MediaItem.extraction_metadata JSONField stores raw data

### Tech Stack Decision
- **Images**: Pillow (already in project, lightweight)
- **Videos**: ffprobe subprocess (FFmpeg already required for B34)
- **Async**: Celery task to avoid blocking uploads

## Implementation Details

### T008: Image Metadata Extraction
Create service at `src/assets/services/metadata.py`:

```python
from PIL import Image
from PIL.ExifTags import TAGS
import io

def extract_image_metadata(file_bytes: bytes) -> dict:
    """Extract metadata from image file bytes."""
    result = {
        "width": None,
        "height": None,
        "format": None,
        "mode": None,
        "exif": {},
    }

    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            result["width"] = img.width
            result["height"] = img.height
            result["format"] = img.format
            result["mode"] = img.mode

            # Extract EXIF if available
            if hasattr(img, "_getexif") and img._getexif():
                exif_data = img._getexif()
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    # Only store safe types
                    if isinstance(value, (str, int, float)):
                        result["exif"][tag] = value
    except Exception as e:
        result["error"] = str(e)

    return result
```

### T009: Video Metadata Extraction
```python
import subprocess
import json
import tempfile
import os

def extract_video_metadata(file_bytes: bytes) -> dict:
    """Extract metadata from video file bytes using ffprobe."""
    result = {
        "width": None,
        "height": None,
        "duration_seconds": None,
        "codec": None,
        "fps": None,
    }

    # Write to temp file (ffprobe needs file path)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            tmp_path
        ]

        output = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if output.returncode == 0:
            data = json.loads(output.stdout)

            # Find video stream
            for stream in data.get("streams", []):
                if stream.get("codec_type") == "video":
                    result["width"] = stream.get("width")
                    result["height"] = stream.get("height")
                    result["codec"] = stream.get("codec_name")

                    # Calculate FPS from frame rate
                    if "r_frame_rate" in stream:
                        num, den = map(int, stream["r_frame_rate"].split("/"))
                        result["fps"] = round(num / den, 2) if den else None
                    break

            # Duration from format
            if "format" in data:
                duration = data["format"].get("duration")
                if duration:
                    result["duration_seconds"] = round(float(duration), 2)
    except Exception as e:
        result["error"] = str(e)
    finally:
        os.unlink(tmp_path)

    return result
```

### T010: Celery Task
Create task at `src/assets/tasks.py`:

```python
from celery import shared_task
from .models import MediaItem, MediaItemState
from .services.metadata import extract_image_metadata, extract_video_metadata

@shared_task(bind=True, max_retries=3)
def process_media_item(self, media_item_id: str):
    """Process uploaded media item: extract metadata."""
    try:
        item = MediaItem.objects.get(id=media_item_id)
        item.state = MediaItemState.PROCESSING
        item.save(update_fields=["state"])

        # Download file bytes from S3
        file_bytes = item.file.download_bytes()

        # Extract based on mime type
        if item.mime_type.startswith("image/"):
            metadata = extract_image_metadata(file_bytes)
        elif item.mime_type.startswith("video/"):
            metadata = extract_video_metadata(file_bytes)
        else:
            metadata = {}

        # Update item
        item.width = metadata.get("width")
        item.height = metadata.get("height")
        item.duration_seconds = metadata.get("duration_seconds")
        item.extraction_metadata = metadata
        item.state = MediaItemState.READY
        item.save()

        return {"status": "success", "media_item_id": str(item.id)}

    except MediaItem.DoesNotExist:
        return {"status": "error", "message": "Item not found"}
    except Exception as exc:
        # Mark as error and retry
        if hasattr(self, 'request'):
            MediaItem.objects.filter(id=media_item_id).update(
                state=MediaItemState.ERROR,
                extraction_metadata={"error": str(exc)}
            )
        raise self.retry(exc=exc, countdown=60)
```

### T011: Wire to Creation Flow
Update ViewSet to trigger task on create:

```python
class MediaItemViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        instance = serializer.save(
            created_by=self.request.user,
            state=MediaItemState.PENDING
        )
        # Trigger async processing
        process_media_item.delay(str(instance.id))
```

### T012: Error Handling
- Retry up to 3 times with 60s backoff
- Store error details in `extraction_metadata.error`
- Set `state=error` on final failure
- Add management command to reprocess failed items

```python
# src/assets/management/commands/reprocess_media.py
from django.core.management.base import BaseCommand
from assets.models import MediaItem, MediaItemState
from assets.tasks import process_media_item

class Command(BaseCommand):
    def handle(self, *args, **options):
        failed = MediaItem.objects.filter(state=MediaItemState.ERROR)
        for item in failed:
            item.state = MediaItemState.PENDING
            item.save(update_fields=["state"])
            process_media_item.delay(str(item.id))
        self.stdout.write(f"Requeued {failed.count()} items")
```

## Acceptance Criteria

- [ ] Image upload → dimensions extracted within 5 seconds
- [ ] Video upload → dimensions + duration extracted
- [ ] Failed extraction sets state=error with details
- [ ] Reprocess command works for failed items
- [ ] No blocking during upload (async via Celery)

## Testing Notes

- Mock ffprobe subprocess in unit tests
- Test with various image formats (JPEG, PNG, WebP, GIF)
- Test with video formats (MP4, WebM, MOV)
- Test error cases (corrupt file, unsupported format)

## Activity Log

- 2026-02-02T19:16:52Z – GitHub Copilot – shell_pid=10500 – lane=doing – Started implementation of WP02
