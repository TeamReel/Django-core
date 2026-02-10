# Data Model: Video Processing Pipeline

**Feature**: B55 Video Processing Pipeline
**Date**: 2026-02-10
**Status**: Complete

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│      Project        │       │        File         │
│    (B07 - exists)   │       │    (B22 - exists)   │
└─────────────────────┘       └─────────────────────┘
          │                            │
          │ project_id                 │ input_file_id
          │                            │ output_file_id
          ▼                            ▼
┌─────────────────────────────────────────────────────┐
│                      VideoJob                        │
├─────────────────────────────────────────────────────┤
│ id: UUID (PK)                                        │
│ project: FK(Project)                                 │
│ created_by: FK(User)                                 │
│ job_type: ENUM(transcode, thumbnail, compose)        │
│ status: ENUM(queued, processing, completed, failed)  │
│ progress_percent: Integer (0-100)                    │
│ input_file: FK(File)                                 │
│ output_file: FK(File, nullable)                      │
│ preset: FK(VideoPreset, nullable)                    │
│ workflow_instance: FK(WorkflowInstance, nullable)    │
│ config: JSONField                                    │
│ metadata: JSONField                                  │
│ error_message: TextField (nullable)                  │
│ retry_count: Integer (default=0)                     │
│ started_at: DateTime (nullable)                      │
│ completed_at: DateTime (nullable)                    │
│ created_at: DateTime                                 │
│ updated_at: DateTime                                 │
└─────────────────────────────────────────────────────┘
          │
          │ preset_id
          ▼
┌─────────────────────────────────────────────────────┐
│                    VideoPreset                       │
├─────────────────────────────────────────────────────┤
│ id: UUID (PK)                                        │
│ name: CharField (unique)                             │
│ description: TextField                               │
│ output_format: ENUM(mp4, webm, hls)                  │
│ video_codec: CharField (e.g., 'libx264', 'libvpx-vp9')│
│ audio_codec: CharField (e.g., 'aac', 'libopus')      │
│ resolution: CharField (e.g., '1920x1080', '1280x720')│
│ bitrate_video: CharField (e.g., '5M', '2M')          │
│ bitrate_audio: CharField (e.g., '128k', '192k')      │
│ framerate: Integer (nullable, e.g., 30, 60)          │
│ crf: Integer (nullable, quality factor 0-51)         │
│ extra_params: JSONField (FFmpeg flags)               │
│ is_system: Boolean (default=False)                   │
│ created_at: DateTime                                 │
│ updated_at: DateTime                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  PlatformExport                      │
├─────────────────────────────────────────────────────┤
│ id: UUID (PK)                                        │
│ platform: ENUM(instagram, tiktok, youtube, stories)  │
│ aspect_ratio: CharField (e.g., '1:1', '9:16', '16:9')│
│ max_duration_seconds: Integer (nullable)             │
│ max_file_size_mb: Integer (nullable)                 │
│ resolution: CharField                                │
│ preset: FK(VideoPreset)                              │
│ crop_strategy: ENUM(crop, letterbox, fit)            │
│ is_active: Boolean (default=True)                    │
│ created_at: DateTime                                 │
│ updated_at: DateTime                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    VideoOverlay                      │
├─────────────────────────────────────────────────────┤
│ id: UUID (PK)                                        │
│ job: FK(VideoJob)                                    │
│ overlay_type: ENUM(logo, watermark, text, intro, outro)│
│ position: ENUM(top-left, top-right, bottom-left,    │
│           bottom-right, center, custom)              │
│ position_x: Integer (nullable, for custom)           │
│ position_y: Integer (nullable, for custom)           │
│ padding_percent: Integer (default=5)                 │
│ opacity: Float (0.0-1.0, default=1.0)               │
│ start_time: Float (seconds, nullable)                │
│ end_time: Float (seconds, nullable)                  │
│ z_index: Integer (default=0)                         │
│ content: JSONField (type-specific config)            │
│ asset_file: FK(File, nullable)                       │
│ created_at: DateTime                                 │
└─────────────────────────────────────────────────────┘

┌───────────────────────┐
│   WorkflowInstance    │
│   (B37 - exists)      │
└───────────────────────┘
```

## Model Specifications

### VideoJob

Primary entity tracking video processing requests.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto | Unique identifier |
| `project` | FK | NOT NULL | Project scope (B07) |
| `created_by` | FK | NOT NULL | User who created job |
| `job_type` | Enum | NOT NULL | transcode, thumbnail, compose |
| `status` | Enum | NOT NULL, default='queued' | Job state |
| `progress_percent` | Integer | 0-100, default=0 | Processing progress |
| `input_file` | FK | NOT NULL | Source video file (B22) |
| `output_file` | FK | NULL | Result file (B22) |
| `preset` | FK | NULL | Encoding preset (optional) |
| `workflow_instance` | FK | NULL, SET_NULL | Approval workflow (B37) |
| `config` | JSON | NOT NULL, default={} | Job-specific configuration |
| `metadata` | JSON | NOT NULL, default={} | Output metadata (duration, etc.) |
| `error_message` | Text | NULL | Error details on failure |
| `retry_count` | Integer | default=0 | Number of retry attempts |
| `started_at` | DateTime | NULL | Processing start time |
| `completed_at` | DateTime | NULL | Processing completion time |
| `created_at` | DateTime | auto | Record creation time |
| `updated_at` | DateTime | auto | Last update time |

**Indexes**:
- `project_id` + `status` (list jobs by project and status)
- `created_by` + `created_at` (user's recent jobs)
- `status` + `created_at` (queue ordering)

**Status Transitions**:
```
queued → processing → completed
                   → failed → (retry) → queued
queued → cancelled
```

**Config JSON Schema** (by job_type):
```json
// transcode
{
  "output_format": "mp4",
  "quality": "720p",
  "platform_export_id": "uuid" // optional
}

// thumbnail
{
  "timestamp": "00:00:05",
  "grid": null  // or {"rows": 3, "cols": 3}
}

// compose
{
  "overlays": ["overlay_uuid_1", "overlay_uuid_2"]
}
```

**Metadata JSON Schema**:
```json
{
  "duration_seconds": 185.5,
  "resolution": "1280x720",
  "bitrate": "2500000",
  "codec_video": "h264",
  "codec_audio": "aac",
  "file_size_bytes": 45678901,
  "framerate": 30
}
```

### VideoPreset

Reusable encoding configurations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto | Unique identifier |
| `name` | CharField | UNIQUE, max=100 | Preset name |
| `description` | TextField | NULL | Human description |
| `output_format` | Enum | NOT NULL | mp4, webm, hls |
| `video_codec` | CharField | max=50 | FFmpeg codec name |
| `audio_codec` | CharField | max=50 | FFmpeg audio codec |
| `resolution` | CharField | max=20 | e.g., '1920x1080' |
| `bitrate_video` | CharField | max=20, NULL | e.g., '5M' |
| `bitrate_audio` | CharField | max=20, NULL | e.g., '128k' |
| `framerate` | Integer | NULL | Target framerate |
| `crf` | Integer | NULL, 0-51 | Quality factor |
| `extra_params` | JSON | default={} | Additional FFmpeg params |
| `is_system` | Boolean | default=False | System preset (read-only) |
| `created_at` | DateTime | auto | Record creation time |
| `updated_at` | DateTime | auto | Last update time |

**Seed Data (System Presets)**:
```python
PRESETS = [
    {"name": "1080p_high", "resolution": "1920x1080", "crf": 18, ...},
    {"name": "1080p_standard", "resolution": "1920x1080", "crf": 23, ...},
    {"name": "720p_standard", "resolution": "1280x720", "crf": 23, ...},
    {"name": "480p_web", "resolution": "854x480", "crf": 26, ...},
    {"name": "thumbnail", "resolution": "320x180", ...},
]
```

### PlatformExport

Platform-specific export configurations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto | Unique identifier |
| `platform` | Enum | NOT NULL | Target platform |
| `aspect_ratio` | CharField | max=10 | e.g., '1:1', '9:16' |
| `max_duration_seconds` | Integer | NULL | Platform max duration |
| `max_file_size_mb` | Integer | NULL | Platform max file size |
| `resolution` | CharField | max=20 | Target resolution |
| `preset` | FK | NOT NULL | Encoding preset to use |
| `crop_strategy` | Enum | default='crop' | How to fit aspect ratio |
| `is_active` | Boolean | default=True | Available for use |
| `created_at` | DateTime | auto | Record creation time |
| `updated_at` | DateTime | auto | Last update time |

**Seed Data (Platform Exports)**:
```python
PLATFORMS = [
    {"platform": "instagram", "aspect_ratio": "1:1", "resolution": "1080x1080", ...},
    {"platform": "instagram", "aspect_ratio": "4:5", "resolution": "1080x1350", ...},
    {"platform": "instagram", "aspect_ratio": "9:16", "resolution": "1080x1920", ...},
    {"platform": "tiktok", "aspect_ratio": "9:16", "resolution": "1080x1920", "max_duration_seconds": 600, ...},
    {"platform": "youtube", "aspect_ratio": "16:9", "resolution": "1920x1080", ...},
    {"platform": "stories", "aspect_ratio": "9:16", "resolution": "1080x1920", "max_duration_seconds": 60, ...},
]
```

### VideoOverlay

Overlay configurations for video composition jobs.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto | Unique identifier |
| `job` | FK | NOT NULL, CASCADE | Parent job |
| `overlay_type` | Enum | NOT NULL | Type of overlay |
| `position` | Enum | NOT NULL | Position preset |
| `position_x` | Integer | NULL | Custom X coordinate |
| `position_y` | Integer | NULL | Custom Y coordinate |
| `padding_percent` | Integer | default=5 | Edge padding |
| `opacity` | Float | 0.0-1.0, default=1.0 | Transparency |
| `start_time` | Float | NULL | Start seconds |
| `end_time` | Float | NULL | End seconds |
| `z_index` | Integer | default=0 | Layer order |
| `content` | JSON | NOT NULL | Type-specific config |
| `asset_file` | FK | NULL | Asset file (logo, intro) |
| `created_at` | DateTime | auto | Record creation time |

**Content JSON Schema** (by overlay_type):
```json
// logo, watermark
{
  "scale": 0.15  // 15% of video width
}

// text
{
  "text": "Goal: Player Name",
  "font": "Arial",
  "font_size": 48,
  "color": "#FFFFFF",
  "background_color": "#00000080"  // semi-transparent black
}

// intro, outro
{
  "transition": "fade",  // fade, cut, dissolve
  "transition_duration": 1.0
}
```

## Enums

```python
class JobType(models.TextChoices):
    TRANSCODE = 'transcode', 'Transcode'
    THUMBNAIL = 'thumbnail', 'Thumbnail'
    COMPOSE = 'compose', 'Compose'

class JobStatus(models.TextChoices):
    QUEUED = 'queued', 'Queued'
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    CANCELLED = 'cancelled', 'Cancelled'

class OutputFormat(models.TextChoices):
    MP4 = 'mp4', 'MP4'
    WEBM = 'webm', 'WebM'
    HLS = 'hls', 'HLS'

class Platform(models.TextChoices):
    INSTAGRAM = 'instagram', 'Instagram'
    TIKTOK = 'tiktok', 'TikTok'
    YOUTUBE = 'youtube', 'YouTube'
    STORIES = 'stories', 'Stories'

class CropStrategy(models.TextChoices):
    CROP = 'crop', 'Crop to fit'
    LETTERBOX = 'letterbox', 'Add letterbox'
    FIT = 'fit', 'Scale to fit'

class OverlayType(models.TextChoices):
    LOGO = 'logo', 'Logo'
    WATERMARK = 'watermark', 'Watermark'
    TEXT = 'text', 'Text'
    INTRO = 'intro', 'Intro'
    OUTRO = 'outro', 'Outro'

class OverlayPosition(models.TextChoices):
    TOP_LEFT = 'top-left', 'Top Left'
    TOP_RIGHT = 'top-right', 'Top Right'
    BOTTOM_LEFT = 'bottom-left', 'Bottom Left'
    BOTTOM_RIGHT = 'bottom-right', 'Bottom Right'
    CENTER = 'center', 'Center'
    CUSTOM = 'custom', 'Custom'
```

## Validation Rules

### VideoJob
- `input_file` must have MIME type in: video/mp4, video/quicktime, video/x-msvideo, video/webm, video/x-matroska
- `input_file.size` must be ≤ 2GB (configurable: `VIDEO_MAX_FILE_SIZE_MB`)
- Input video duration must be ≤ 15 minutes (configurable: `VIDEO_MAX_DURATION_SECONDS`)
- `progress_percent` must be between 0 and 100
- `status` transitions must follow valid state machine

### VideoOverlay
- `opacity` must be between 0.0 and 1.0
- `start_time` must be < `end_time` if both specified
- `position_x` and `position_y` required when `position` = 'custom'
- `asset_file` required for overlay_type in (logo, watermark, intro, outro)

## Relationships to Existing Models

| Model | Relationship | Notes |
|-------|--------------|-------|
| Project (B07) | VideoJob.project | All jobs scoped to projects |
| User (B08) | VideoJob.created_by | Job ownership |
| File (B22) | VideoJob.input_file, output_file | Storage integration |
| WorkflowInstance (B37) | VideoJob.workflow_instance | Optional approval flow |

## Migration Strategy

1. Create VideoPreset and PlatformExport first (no dependencies)
2. Create VideoJob (depends on existing models)
3. Create VideoOverlay (depends on VideoJob)
4. Seed system presets and platform exports
5. No destructive operations on existing tables
