---
wp: WP01
title: App Skeleton & Models
priority: P0
status: planned
subtasks: T001-T009
dependencies: none
estimated_effort: 4-6 hours
lane: "planned"
agent: "claude"
shell_pid: "71676"
review_status: "has_feedback"
reviewed_by: "claude-reviewer"
---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Reviewed**: 2026-02-10T12:51:00Z by claude-reviewer

**Key Issues**:
1. **CRITICAL - Field Name Mismatch**: VideoJob model uses `source_file` instead of `input_file` as specified in `data-model.md` line 114. This breaks consistency with the spec and will cause API contract mismatches in WP02.
   - **Impact**: API serializers will need to map between `input_file` (spec) and `source_file` (model), creating technical debt.
   - **Fix Required**: Rename `source_file` → `input_file` in:
     - `src/video/models/job.py` (field definition)
     - Generate new migration to rename column
     - Update admin.py field references if any
     - Update migration `0001_initial.py` or create `0002_rename_field.py`

**What Was Done Well**:
- ✅ Complete app structure with proper organization
- ✅ All 4 models implemented (VideoJob, VideoPreset, PlatformExport, VideoOverlay)
- ✅ Foreign keys correctly reference FileAsset (not File) and WorkflowInstance
- ✅ Migrations generated and applied successfully
- ✅ Admin interface comprehensive with color-coded status badges
- ✅ Enums properly defined (JobType, JobStatus, OutputFormat, Platform, CropStrategy, OverlayType, OverlayPosition)
- ✅ Indexes defined on VideoJob for query patterns (project+status, created_by+created_at, job_type+status)
- ✅ Type hints and docstrings present
- ✅ `publishable` property correctly implements workflow approval logic
- ✅ `python manage.py check` passes with 0 issues
- ✅ Settings updated (INSTALLED_APPS)

**Action Items** (must complete before re-review):
- [ ] Rename `source_file` to `input_file` in `src/video/models/job.py`
- [ ] Create migration for field rename (use `migrations.RenameField`)
- [ ] Apply migration to database
- [ ] Verify no broken references in admin.py or other files
- [ ] Re-run `python manage.py check` to ensure no issues
- [ ] (Optional) Remove unnecessary `pass` statement in `apps.py` line 16

**Validation Steps After Fix**:
```bash
python manage.py makemigrations video  # Should create 0002_rename_field
python manage.py migrate video
python manage.py check video           # Should pass
```

# WP01: App Skeleton & Models

## Objective

Create the `src/video/` Django app with all 4 models (VideoJob, VideoPreset, PlatformExport, VideoOverlay) and generate migrations. This is the foundation for B55 Video Processing Pipeline.

## Context

- **Spec**: `kitty-specs/049-video-processing-pipeline/spec.md`
- **Data Model**: `kitty-specs/049-video-processing-pipeline/data-model.md`
- **Branch**: `049-video-processing-pipeline`

## Subtasks

### T001: Create App Structure
Create the Django app skeleton:
```
src/video/
├── __init__.py
├── apps.py
├── urls.py
├── admin.py
├── models/
│   ├── __init__.py
│   ├── job.py
│   ├── preset.py
│   ├── platform.py
│   └── overlay.py
├── serializers/
│   └── __init__.py
├── views/
│   └── __init__.py
├── services/
│   └── __init__.py
├── tasks/
│   └── __init__.py
└── README.md
```

**Acceptance**: App structure exists, imports work

### T002: Create VideoPreset Model [P]
Implement in `src/video/models/preset.py`:
- Fields per data-model.md: name, description, output_format, resolution_width, resolution_height, codec, bitrate_video, bitrate_audio, crf, fps, is_system, created_at, updated_at
- Enum: OutputFormat (mp4, mov, webm, gif, hls)
- Soft delete support
- `__str__` method

**Acceptance**: Model can be instantiated, saved to DB

### T003: Create PlatformExport Model [P]
Implement in `src/video/models/platform.py`:
- Fields: platform, name, aspect_ratio, max_duration_seconds, max_file_size_mb, preset (FK), crop_strategy, recommended, created_at
- Enum: Platform (instagram, tiktok, youtube, twitter, generic)
- Enum: CropStrategy (letterbox, crop_center, crop_smart, stretch)

**Acceptance**: Model can be instantiated with FK to VideoPreset

### T004: Create VideoJob Model [P]
Implement in `src/video/models/job.py`:
- Fields: project (FK to B07), created_by (FK), source_file (FK to B22 File), job_type, status, preset (FK), platform_export (FK optional), error_message, error_code, progress_percent, output_file (FK to B22 File optional), output_duration_seconds, output_file_size_bytes, thumbnail_url, started_at, completed_at, retry_count, workflow_instance (FK to B37 optional), created_at, updated_at
- Enum: JobType (transcode, thumbnail, compose, platform_export)
- Enum: JobStatus (pending, queued, processing, completed, failed, cancelled)
- Indexes on status, job_type, created_at

**Acceptance**: Model saves with FKs, status transitions work

### T005: Create VideoOverlay Model [P]
Implement in `src/video/models/overlay.py`:
- Fields: job (FK), overlay_type, position, offset_x, offset_y, start_time, end_time, image_file (FK optional), text_content, font_size, font_color, opacity, z_order
- Enum: OverlayType (logo, text, intro, outro)
- Enum: OverlayPosition (top_left, top_center, top_right, center, bottom_left, bottom_center, bottom_right)

**Acceptance**: Multiple overlays can be attached to one job

### T006: Create Model __init__.py
Export all models from `src/video/models/__init__.py`:
```python
from .job import VideoJob
from .preset import VideoPreset
from .platform import PlatformExport
from .overlay import VideoOverlay

__all__ = ["VideoJob", "VideoPreset", "PlatformExport", "VideoOverlay"]
```

**Acceptance**: `from src.video.models import VideoJob` works

### T007: Generate and Validate Migrations
Run:
```bash
python manage.py makemigrations video
python manage.py migrate video
```
Verify:
- All tables created
- FKs work (can create test records)
- Indexes exist

**Acceptance**: `migrate` succeeds, no errors

### T008: Register Models in Admin
Create `src/video/admin.py`:
- Register all 4 models
- Configure list_display, list_filter, search_fields
- VideoJob: show status, job_type, project, created_by
- VideoPreset: show name, output_format, is_system
- PlatformExport: show platform, name, aspect_ratio
- VideoOverlay: show job, overlay_type, position

**Acceptance**: All models visible in Django Admin

### T009: Add App to INSTALLED_APPS
Update settings to include `"src.video"` in INSTALLED_APPS.

**Acceptance**: App loads without errors

## Validation Criteria

1. `python manage.py check` passes
2. `python manage.py migrate video` succeeds
3. Models queryable in Django shell
4. Admin shows all 4 models
5. No import errors

## Files to Create/Modify

**Create**:
- `src/video/__init__.py`
- `src/video/apps.py`
- `src/video/urls.py`
- `src/video/admin.py`
- `src/video/models/__init__.py`
- `src/video/models/job.py`
- `src/video/models/preset.py`
- `src/video/models/platform.py`
- `src/video/models/overlay.py`
- `src/video/serializers/__init__.py`
- `src/video/views/__init__.py`
- `src/video/services/__init__.py`
- `src/video/tasks/__init__.py`
- `src/video/README.md`

**Modify**:
- `src/core/settings/base.py` (INSTALLED_APPS)

## Reference Implementation

See existing modules for patterns:
- `src/media/models/` - File model FK pattern
- `src/workflow/models/` - WorkflowInstance FK pattern
- `src/projects/models/` - Project FK pattern

## Review Checklist

- [ ] All model fields match data-model.md
- [ ] Enums defined correctly
- [ ] FKs use correct on_delete behavior
- [ ] Indexes defined for query patterns
- [ ] Admin registered with useful columns
- [ ] No circular imports
- [ ] Type hints on all methods
- [ ] Docstrings on models

## Activity Log

- 2026-02-10T12:33:19Z – claude – shell_pid=71676 – lane=doing – Started WP01 implementation
- 2026-02-10T12:42:22Z – claude – shell_pid=71676 – lane=for_review – Moved to for_review
