---
wp: WP06
title: Seed Data & Presets
priority: P2
status: planned
subtasks: T047-T052
dependencies: WP01
estimated_effort: 2-3 hours
lane: "doing"
agent: "copilot-implementer"
shell_pid: "71676"
---

# WP06: Seed Data & Presets

## Objective

Create management command to seed system presets and platform exports. These provide sensible defaults for common video processing scenarios.

## Context

- **Data Model**: `kitty-specs/049-video-processing-pipeline/data-model.md`
- **Depends On**: WP01 (models must exist)
- **Similar Pattern**: `seed_brand_assets.py` in project root

## Subtasks

### T047: Create seed_video_presets Management Command
Create `src/video/management/commands/seed_video_presets.py`:
```python
from django.core.management.base import BaseCommand
from src.video.models import VideoPreset, PlatformExport

class Command(BaseCommand):
    help = "Seed system video presets and platform exports"

    def handle(self, *args, **options):
        self.seed_presets()
        self.seed_platform_exports()
        self.stdout.write(self.style.SUCCESS("Video presets seeded successfully"))

    def seed_presets(self):
        # ... create presets

    def seed_platform_exports(self):
        # ... create platform exports
```

**Acceptance**: `python manage.py seed_video_presets` runs without error

### T048: Define System Presets
Create these presets in `seed_presets()`:

| Name | Resolution | Codec | Bitrate | CRF | FPS | Format |
|------|------------|-------|---------|-----|-----|--------|
| 1080p_high | 1920x1080 | h264 | 8000k | 18 | 30 | mp4 |
| 1080p_standard | 1920x1080 | h264 | 5000k | 23 | 30 | mp4 |
| 720p_standard | 1280x720 | h264 | 3000k | 23 | 30 | mp4 |
| 480p_web | 854x480 | h264 | 1500k | 25 | 30 | mp4 |
| thumbnail | 640x360 | - | - | - | - | jpg |
| gif_preview | 480x270 | gif | - | - | 10 | gif |
| webm_vp9 | 1920x1080 | vp9 | 4000k | 31 | 30 | webm |

```python
SYSTEM_PRESETS = [
    {
        "name": "1080p_high",
        "description": "High quality 1080p for archival",
        "output_format": "mp4",
        "resolution_width": 1920,
        "resolution_height": 1080,
        "codec": "h264",
        "bitrate_video": "8000k",
        "bitrate_audio": "192k",
        "crf": 18,
        "fps": 30,
        "is_system": True,
    },
    # ... more presets
]

def seed_presets(self):
    for preset_data in SYSTEM_PRESETS:
        VideoPreset.objects.update_or_create(
            name=preset_data["name"],
            is_system=True,
            defaults=preset_data,
        )
```

**Acceptance**: 7 system presets created in database

### T049: Define Platform Exports
Create platform exports in `seed_platform_exports()`:

| Platform | Name | Aspect Ratio | Max Duration | Max Size | Crop Strategy |
|----------|------|--------------|--------------|----------|---------------|
| instagram | Feed Square | 1:1 | 60s | 250MB | crop_center |
| instagram | Feed Portrait | 4:5 | 60s | 250MB | crop_center |
| instagram | Reels | 9:16 | 90s | 250MB | crop_center |
| instagram | Stories | 9:16 | 15s | 250MB | crop_center |
| tiktok | Standard | 9:16 | 180s | 287MB | crop_center |
| youtube | Shorts | 9:16 | 60s | 256MB | crop_center |
| youtube | Standard | 16:9 | 43200s | 256GB | letterbox |
| twitter | Video | 16:9 | 140s | 512MB | letterbox |

```python
PLATFORM_EXPORTS = [
    {
        "platform": "instagram",
        "name": "Feed Square",
        "aspect_ratio": "1:1",
        "max_duration_seconds": 60,
        "max_file_size_mb": 250,
        "crop_strategy": "crop_center",
        "recommended": True,
    },
    # ... more exports
]

def seed_platform_exports(self):
    for export_data in PLATFORM_EXPORTS:
        preset = VideoPreset.objects.get(name="1080p_standard")
        PlatformExport.objects.update_or_create(
            platform=export_data["platform"],
            name=export_data["name"],
            defaults={**export_data, "preset": preset},
        )
```

**Acceptance**: 8+ platform exports created with correct FK

### T050: Use update_or_create for Idempotent Seeding
Ensure command can be run multiple times:
```python
VideoPreset.objects.update_or_create(
    name=preset_data["name"],  # Lookup field
    is_system=True,            # Lookup field
    defaults=preset_data,      # Fields to update
)
```

Run twice should not create duplicates.

**Acceptance**: `seed_video_presets` idempotent (same result on re-run)

### T051: Mark System Presets as is_system=True
System presets should be:
- Read-only in API (cannot modify/delete)
- Always available
- Clearly marked in admin

Add protection in ViewSet:
```python
class VideoPresetViewSet(viewsets.ReadOnlyModelViewSet):
    """System presets are read-only."""
    queryset = VideoPreset.objects.filter(is_system=True)
```

**Acceptance**: Cannot modify system presets via API

### T052: Add Railway Deployment Seed Step
Update deployment documentation in quickstart.md:
```bash
# Railway deployment post-migrate hook
python manage.py migrate
python manage.py seed_video_presets
```

Update `railway.json` or Procfile:
```json
{
  "deploy": {
    "startCommand": "python manage.py migrate && python manage.py seed_video_presets && gunicorn..."
  }
}
```

**Acceptance**: Seeding runs automatically on deploy

## Validation Criteria

1. Management command creates all presets
2. Presets have correct values
3. Platform exports linked to presets
4. Idempotent (no duplicates on re-run)
5. System presets protected from modification

## Files to Create/Modify

**Create**:
- `src/video/management/__init__.py`
- `src/video/management/commands/__init__.py`
- `src/video/management/commands/seed_video_presets.py`

**Modify**:
- `kitty-specs/049-video-processing-pipeline/quickstart.md`
- `railway.json` or `Procfile`

## Platform Spec Sources

Document where specs came from:
- Instagram: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
- TikTok: https://developers.tiktok.com/doc/video-upload-guidelines
- YouTube: https://support.google.com/youtube/answer/1722171
- Twitter/X: https://developer.twitter.com/en/docs/twitter-api/v1/media/upload-media

**Note**: Platform specs change frequently. Add last-updated comment in code.

## Review Checklist

- [ ] All presets have valid enum values
- [ ] Aspect ratios correctly formatted
- [ ] Duration limits match platform specs
- [ ] File size limits realistic
- [ ] update_or_create uses correct lookup fields
- [ ] is_system=True on all system presets
- [ ] Command output is informative
- [ ] Deployment hooks documented

## Activity Log

- 2026-02-10T14:30:36Z – copilot-implementer – shell_pid=71676 – lane=doing – Started implementation
