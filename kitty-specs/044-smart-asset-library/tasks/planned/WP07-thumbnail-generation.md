---
work_package_id: WP07
work_package_name: Thumbnail Generation
priority: P3
estimated_hours: 4
dependencies:
  - WP01
  - WP02
  - Pillow
  - FFmpeg
subtasks:
  - id: T028
    title: Implement generate_image_thumbnail()
    priority: P1
    status: not-started
  - id: T029
    title: Implement generate_video_thumbnail()
    priority: P1
    status: not-started
  - id: T030
    title: Create Celery task for async generation
    priority: P1
    status: not-started
  - id: T031
    title: Store thumbnails as FileAsset with parent reference
    priority: P2
    status: not-started
  - id: T032
    title: Add thumbnails endpoint to API
    priority: P2
    status: not-started
lane: planned
---

# WP07: Thumbnail Generation

## Goal
Auto-generate preview thumbnails for images and videos at multiple sizes.

## Context

### Design Documents
- **Research**: Pillow for images, ffmpeg for video frames
- **B22 File Storage**: Thumbnails stored as FileAsset with parent FK

### Thumbnail Sizes
| Size | Dimensions | Use Case |
|------|------------|----------|
| small | 200x200 | List views, grids |
| medium | 400x400 | Detail previews |
| large | 800x800 | Full preview |

### Processing Strategy
- Generate thumbnails async via Celery (after metadata extraction)
- Store as separate FileAsset entries linked to parent
- Use progressive JPEG for images
- Extract middle frame for videos

## Implementation Details

### T028: Image Thumbnail Generation
Create service at `src/assets/services/thumbnails.py`:

```python
from PIL import Image
import io

THUMBNAIL_SIZES = {
    "small": (200, 200),
    "medium": (400, 400),
    "large": (800, 800),
}

def generate_image_thumbnail(
    file_bytes: bytes,
    size: str = "medium"
) -> tuple[bytes, str]:
    """Generate thumbnail from image bytes.

    Returns (thumbnail_bytes, mime_type).
    """
    dimensions = THUMBNAIL_SIZES.get(size, THUMBNAIL_SIZES["medium"])

    with Image.open(io.BytesIO(file_bytes)) as img:
        # Convert to RGB if necessary (for JPEG output)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Use LANCZOS for high-quality downscaling
        img.thumbnail(dimensions, Image.Resampling.LANCZOS)

        # Save as progressive JPEG
        output = io.BytesIO()
        img.save(
            output,
            format="JPEG",
            quality=85,
            progressive=True,
            optimize=True
        )
        output.seek(0)

        return output.read(), "image/jpeg"


def generate_all_image_thumbnails(file_bytes: bytes) -> dict[str, tuple[bytes, str]]:
    """Generate all thumbnail sizes for an image.

    Returns dict of {size: (bytes, mime_type)}.
    """
    thumbnails = {}
    for size in THUMBNAIL_SIZES:
        thumbnails[size] = generate_image_thumbnail(file_bytes, size)
    return thumbnails
```

### T029: Video Thumbnail Generation
```python
import subprocess
import tempfile
import os
from decimal import Decimal

def generate_video_thumbnail(
    file_bytes: bytes,
    duration_seconds: Decimal = None,
    size: str = "medium"
) -> tuple[bytes, str]:
    """Extract frame from video and generate thumbnail.

    Extracts frame from middle of video (or 2 seconds in if duration unknown).
    """
    dimensions = THUMBNAIL_SIZES.get(size, THUMBNAIL_SIZES["medium"])
    width, height = dimensions

    # Write video to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as video_tmp:
        video_tmp.write(file_bytes)
        video_path = video_tmp.name

    # Create temp file for output image
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as img_tmp:
        img_path = img_tmp.name

    try:
        # Calculate seek position (middle of video or 2s)
        if duration_seconds:
            seek_time = float(duration_seconds) / 2
        else:
            seek_time = 2.0

        # FFmpeg command to extract frame and resize
        cmd = [
            "ffmpeg",
            "-ss", str(seek_time),       # Seek to position
            "-i", video_path,            # Input file
            "-vframes", "1",             # Extract 1 frame
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease",
            "-y",                        # Overwrite output
            img_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=30
        )

        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {result.stderr.decode()}")

        # Read generated thumbnail
        with open(img_path, "rb") as f:
            return f.read(), "image/jpeg"

    finally:
        # Cleanup temp files
        os.unlink(video_path)
        if os.path.exists(img_path):
            os.unlink(img_path)


def generate_all_video_thumbnails(
    file_bytes: bytes,
    duration_seconds: Decimal = None
) -> dict[str, tuple[bytes, str]]:
    """Generate all thumbnail sizes for a video."""
    thumbnails = {}
    for size in THUMBNAIL_SIZES:
        thumbnails[size] = generate_video_thumbnail(file_bytes, duration_seconds, size)
    return thumbnails
```

### T030: Celery Task
Add thumbnail task to `src/assets/tasks.py`:

```python
from celery import shared_task
from .models import MediaItem, MediaItemState
from .services.thumbnails import (
    generate_all_image_thumbnails,
    generate_all_video_thumbnails,
    THUMBNAIL_SIZES
)
from storage.models import FileAsset

@shared_task(bind=True, max_retries=2)
def generate_thumbnails(self, media_item_id: str):
    """Generate thumbnails for a media item."""
    try:
        item = MediaItem.objects.get(id=media_item_id)

        # Skip if already has thumbnails
        if item.thumbnail_set.exists():
            return {"status": "skipped", "reason": "thumbnails exist"}

        # Download source file
        file_bytes = item.file.download_bytes()

        # Generate based on type
        if item.mime_type.startswith("image/"):
            thumbnails = generate_all_image_thumbnails(file_bytes)
        elif item.mime_type.startswith("video/"):
            thumbnails = generate_all_video_thumbnails(
                file_bytes,
                item.duration_seconds
            )
        else:
            return {"status": "skipped", "reason": "unsupported type"}

        # Store thumbnails
        for size, (thumb_bytes, mime_type) in thumbnails.items():
            # Create FileAsset for thumbnail
            thumb_asset = FileAsset.objects.create(
                project=item.project,
                created_by=item.created_by,
                filename=f"{item.id}_{size}.jpg",
                mime_type=mime_type,
                file_size_bytes=len(thumb_bytes),
            )
            thumb_asset.upload_bytes(thumb_bytes)

            # Create Thumbnail record
            Thumbnail.objects.create(
                media_item=item,
                file=thumb_asset,
                size=size,
                width=THUMBNAIL_SIZES[size][0],
                height=THUMBNAIL_SIZES[size][1],
            )

        return {"status": "success", "sizes": list(thumbnails.keys())}

    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)


# Chain thumbnail generation after metadata extraction
@shared_task
def process_media_item_complete(media_item_id: str):
    """Chain task: metadata extraction → thumbnail generation."""
    from celery import chain

    workflow = chain(
        process_media_item.s(media_item_id),
        generate_thumbnails.s()
    )
    workflow.delay()
```

### T031: Thumbnail Model
Add Thumbnail model to `src/assets/models.py`:

```python
class Thumbnail(TimeStampedModel):
    """Generated thumbnail for a media item."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="thumbnails"
    )
    file = models.ForeignKey(
        "storage.FileAsset",
        on_delete=models.CASCADE
    )
    size = models.CharField(max_length=20)  # small, medium, large
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()

    class Meta:
        unique_together = [("media_item", "size")]
```

### T032: Thumbnails API
Add to serializer:

```python
class ThumbnailSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Thumbnail
        fields = ["size", "width", "height", "url"]

    def get_url(self, obj):
        return obj.file.get_presigned_url() if obj.file else None


class MediaItemSerializer(serializers.ModelSerializer):
    thumbnails = ThumbnailSerializer(many=True, read_only=True)
    # ... rest of fields
```

Add dedicated endpoint:

```python
class MediaItemThumbnailsView(APIView):
    """Get thumbnails for a media item."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        item = get_object_or_404(MediaItem, pk=pk)
        self.check_access(request, item)

        thumbnails = item.thumbnails.all()
        serializer = ThumbnailSerializer(thumbnails, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        """Regenerate thumbnails for item."""
        item = get_object_or_404(MediaItem, pk=pk)
        self.check_access(request, item)

        # Delete existing thumbnails
        item.thumbnails.all().delete()

        # Trigger regeneration
        generate_thumbnails.delay(str(item.id))

        return Response({"status": "regenerating"}, status=202)
```

## Acceptance Criteria

- [ ] Upload image → thumbnails at 3 sizes generated
- [ ] Upload video → thumbnail extracted from middle frame
- [ ] Thumbnails accessible via API with presigned URLs
- [ ] Regenerate endpoint works
- [ ] Async generation doesn't block upload

## Testing Notes

- Test various image formats (JPEG, PNG, WebP, GIF)
- Test video formats (MP4, WebM, MOV)
- Test aspect ratio preservation
- Test error handling (corrupt files)
- Mock FFmpeg in unit tests
