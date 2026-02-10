---
wp: WP03
title: Video Service & Processors
priority: P1
status: planned
subtasks: T021-T030
dependencies: WP01, WP02
estimated_effort: 6-8 hours
lane: "for_review"
agent: "copilot-implementer"
shell_pid: "71676"
review_status: "ready_for_review"
reviewed_by: "copilot-reviewer"
---

## Review Feedback

**Status**: ✅ **Ready for Re-Review**

**Checks Run**:
- ✅ `python manage.py check video` (pass)
- ✅ `python manage.py test src.video` (0 tests found; command works)

**What Looks Good**:
- ✅ Core processor architecture is in place (`BaseVideoProcessor` + transcode/thumbnail/compose)
- ✅ FFmpeg progress parsing via `-progress pipe:1` is implemented
- ✅ Temp directory creation + cleanup in `finally` is present
- ✅ Job lifecycle updates (queued → processing → completed/failed) are wired

**Blocking Issues / Mismatches With WP03 Acceptance**:
1. **HLS output is not end-to-end**: HLS generates a manifest + multiple segment files, but the current upload path assumes a single output file. Either (a) defer HLS for MVP, or (b) implement `-hls_segment_filename` + upload all outputs (manifest + segments) and persist enough metadata to retrieve them.
2. **Thumbnail default timestamp source**: WP03 requires default timestamp of 25% duration. Current logic pulls duration from `VideoJob.metadata`, but duration is stored on the input file (`job.input_file.metadata`) in this design. Defaulting should read source duration and handle missing duration gracefully.
3. **Env var naming mismatch vs docs**: WP03 lists `VIDEO_MAX_FILE_SIZE`/`VIDEO_MAX_DURATION`, while `quickstart.md` references `VIDEO_MAX_FILE_SIZE_MB`/`VIDEO_MAX_DURATION_SECONDS`. Pick one convention (or support both) and ensure docs + `settings/base.py` + `constants.py` are consistent.
4. **S3 integration pattern**: WP03 text calls for B22 `FileService` presigned URLs, but implementation uses the storage backend directly. This can be acceptable, but must ensure downloads/uploads are streaming-safe for large files and align with B22 expectations (paths, ownership, and access model).

**Non-Blocking Notes**:
- T022 text mentions output formats `(mp4, mov, webm, gif)`, but the actual `OutputFormat` model choices are `(mp4, webm, hls)` in WP01. WP03 should be aligned to the actual model (or WP01 spec updated in a later WP).

**Action Items (must complete before re-review)**:
- [x] Decide MVP stance for HLS (disable vs implement multi-file output upload) and update processor + persistence accordingly
- [x] Fix ThumbnailProcessor default timestamp to use input duration from `job.input_file.metadata` (fallback to a safe constant if missing)
- [x] Align env var names across WP03 prompt/docs and code (prefer backwards-compatible parsing if already referenced elsewhere)
- [x] Confirm storage integration is safe for large files (streaming reads/writes) and logs key context (job_id, paths, elapsed)

# WP03: Video Service & Processors 🎯 MVP

## Objective

Implement the VideoService and processor classes that handle FFmpeg operations. This is the core video processing logic - downloading source files, running FFmpeg, and uploading results to S3.

## Context

- **Research**: `kitty-specs/049-video-processing-pipeline/research.md` (FFmpeg patterns)
- **Quickstart**: `kitty-specs/049-video-processing-pipeline/quickstart.md`
- **Depends On**: WP01 (models), WP02 (serializers for validation)

## Architecture

```
VideoService
    ├── create_job() → dispatches to Celery
    ├── cancel_job()
    └── retry_job()

BaseVideoProcessor (ABC)
    ├── TranscodeProcessor
    ├── ThumbnailProcessor
    └── ComposeProcessor

Each processor:
    1. Downloads source from S3 to /tmp/video_jobs/{job_id}/
    2. Builds FFmpeg command
    3. Executes FFmpeg with progress tracking
    4. Uploads output to S3
    5. Cleans up temp files
```

## Subtasks

### T021: Create BaseVideoProcessor ABC
Implement in `src/video/services/processors/base.py`:
```python
from abc import ABC, abstractmethod

class BaseVideoProcessor(ABC):
    def __init__(self, job: VideoJob):
        self.job = job
        self.temp_dir = f"/tmp/video_jobs/{job.id}"

    @abstractmethod
    def build_command(self, input_path: str, output_path: str) -> list[str]:
        """Build FFmpeg command arguments."""
        pass

    def execute(self) -> str:
        """Download → Process → Upload → Cleanup"""
        pass

    def _download_source(self) -> str:
        """Download source file from S3 to temp dir."""
        pass

    def _upload_output(self, output_path: str) -> File:
        """Upload output file to S3, return File model instance."""
        pass

    def _cleanup(self):
        """Remove temp directory."""
        pass

    def _run_ffmpeg(self, command: list[str], progress_callback: Callable):
        """Execute FFmpeg with progress tracking."""
        pass
```

**Acceptance**: ABC defined with all abstract/concrete methods

### T022: Create TranscodeProcessor [P]
Implement in `src/video/services/processors/transcode.py`:
- Build FFmpeg command for transcoding:
  ```bash
  ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 \
         -c:a aac -b:a 128k -movflags +faststart output.mp4
  ```
- Support all OutputFormat values (mp4, mov, webm, gif)
- Apply preset settings (resolution, codec, bitrate, crf)

**Acceptance**: Transcode from one format to another works

### T023: Create ThumbnailProcessor [P]
Implement in `src/video/services/processors/thumbnail.py`:
- Single frame extraction:
  ```bash
  ffmpeg -i input.mp4 -ss 00:00:05 -vframes 1 -f image2 thumb.jpg
  ```
- Grid thumbnail (optional):
  ```bash
  ffmpeg -i input.mp4 -vf "fps=1/10,scale=160:-1,tile=5x4" grid.jpg
  ```
- Support timestamp parameter (default: 25% of duration)

**Acceptance**: Thumbnail generated at specified timestamp

### T024: Create ComposeProcessor [P]
Implement in `src/video/services/processors/compose.py`:
- Apply overlays (logo, text):
  ```bash
  ffmpeg -i input.mp4 -i logo.png \
         -filter_complex "[0:v][1:v]overlay=10:10" output.mp4
  ```
- Support overlay positions (top_left, center, bottom_right, etc.)
- Support text overlays via drawtext filter
- Support intro/outro concatenation

**Acceptance**: Video with logo overlay generates correctly

### T025: Create VideoService
Implement in `src/video/services/video_service.py`:
```python
class VideoService:
    def create_job(
        self,
        project: Project,
        user: User,
        source_file: File,
        job_type: JobType,
        preset: VideoPreset | None = None,
        platform_export: PlatformExport | None = None,
        overlays: list[dict] | None = None,
        workflow_template: WorkflowTemplate | None = None,
    ) -> VideoJob:
        """Create job and dispatch to Celery."""
        pass

    def cancel_job(self, job: VideoJob) -> bool:
        """Cancel pending/queued job."""
        pass

    def retry_job(self, job: VideoJob) -> VideoJob:
        """Reset failed job and redispatch."""
        pass

    def get_processor(self, job: VideoJob) -> BaseVideoProcessor:
        """Factory method to get correct processor."""
        pass
```

**Acceptance**: create_job creates DB record and dispatches task

### T026: Implement Job Creation with Validation
In VideoService.create_job():
- Validate source file exists in S3
- Validate file size ≤ 2GB (VIDEO_MAX_FILE_SIZE env var)
- Validate duration ≤ 15 min (VIDEO_MAX_DURATION env var)
- Validate preset matches job_type capabilities
- Create VideoJob with status=pending
- Create VideoOverlay records if overlays provided
- Create WorkflowInstance if workflow_template provided

**Acceptance**: Validation errors raise appropriate exceptions

### T027: Implement Progress Tracking
Add progress callback mechanism:
```python
def _run_ffmpeg(self, command: list[str], progress_callback: Callable):
    """Execute FFmpeg with -progress pipe:1 for progress tracking."""
    process = subprocess.Popen(
        command + ["-progress", "pipe:1"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    for line in process.stdout:
        if line.startswith(b"out_time_ms="):
            # Parse progress and call callback
            progress_callback(percent)
```

Callback updates VideoJob.progress_percent

**Acceptance**: Job progress_percent updates during processing

### T028: Implement S3 Integration
Use B22 File Storage module:
```python
from src.files.services import FileService

def _download_source(self) -> str:
    """Get presigned URL and download to temp dir."""
    url = FileService.get_presigned_download_url(self.job.source_file)
    # Download using requests/httpx
    return local_path

def _upload_output(self, output_path: str) -> File:
    """Create File record and upload to S3."""
    return FileService.upload_file(
        path=output_path,
        project=self.job.project,
        created_by=self.job.created_by,
    )
```

**Acceptance**: Files download from and upload to S3 correctly

### T029: Implement Temp Directory Management
```python
import os
import shutil
from pathlib import Path

def _ensure_temp_dir(self):
    Path(self.temp_dir).mkdir(parents=True, exist_ok=True)

def _cleanup(self):
    if os.path.exists(self.temp_dir):
        shutil.rmtree(self.temp_dir)
```

Always cleanup in finally block (even on error).

**Acceptance**: Temp files cleaned up after job completes

### T030: Add Structured Logging
```python
import structlog

logger = structlog.get_logger(__name__)

# In processor
logger.info("video_processing_started", job_id=str(self.job.id), job_type=self.job.job_type)
logger.info("ffmpeg_command", command=" ".join(command))
logger.info("video_processing_completed", job_id=str(self.job.id), duration_ms=elapsed)
logger.error("video_processing_failed", job_id=str(self.job.id), error=str(e))
```

**Acceptance**: All operations logged with job context

## Validation Criteria

1. VideoService.create_job() creates job in DB
2. Processor generates correct FFmpeg command
3. Progress tracking works (mock FFmpeg output)
4. S3 download/upload works (mock or localstack)
5. Temp files cleaned up after completion
6. Errors logged with context

## Files to Create

- `src/video/services/__init__.py`
- `src/video/services/video_service.py`
- `src/video/services/processors/__init__.py`
- `src/video/services/processors/base.py`
- `src/video/services/processors/transcode.py`
- `src/video/services/processors/thumbnail.py`
- `src/video/services/processors/compose.py`
- `src/video/services/constants.py` (env var defaults)

## Environment Variables

Add to settings:
```python
VIDEO_MAX_FILE_SIZE = int(os.getenv("VIDEO_MAX_FILE_SIZE", 2 * 1024 * 1024 * 1024))  # 2GB
VIDEO_MAX_DURATION = int(os.getenv("VIDEO_MAX_DURATION", 900))  # 15 minutes
VIDEO_TEMP_DIR = os.getenv("VIDEO_TEMP_DIR", "/tmp/video_jobs")
```

## Review Checklist

- [ ] BaseVideoProcessor ABC is clean and extensible
- [ ] All 3 processors build correct FFmpeg commands
- [ ] VideoService handles all job types
- [ ] Validation catches oversized files early
- [ ] Progress tracking doesn't block execution
- [ ] S3 integration uses existing B22 patterns
- [ ] Temp cleanup happens in finally block
- [ ] All operations logged with job_id
- [ ] Type hints on all methods
- [ ] No hardcoded paths or credentials

## Activity Log

- 2026-02-10T13:32:30Z – claude – shell_pid=71676 – lane=doing – Started implementation
- 2026-02-10T14:01:51Z – claude – shell_pid=71676 – lane=for_review – Ready for review (re-review requested)
- 2026-02-10T14:06:44Z – copilot-reviewer – shell_pid=71676 – lane=planned – Review complete: needs changes (see Review Feedback)
- 2026-02-10T14:09:29Z – copilot-implementer – shell_pid=71676 – lane=doing – Resuming implementation to address review feedback
- 2026-02-10T14:13:09Z – copilot-implementer – shell_pid=71676 – lane=for_review – Ready for re-review: Addressed storage, HLS, env vars, and logging feedback
