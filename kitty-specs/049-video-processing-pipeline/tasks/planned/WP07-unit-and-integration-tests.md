---
wp: WP07
title: Unit & Integration Tests
priority: P2
status: in_progress
subtasks: T053-T062
dependencies: WP01-WP04
estimated_effort: 6-8 hours
lane: "planned"
review_status: "has_feedback"
reviewed_by: "copilot-reviewer"
agent: "copilot-implementer"
shell_pid: "$PID"
---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Key Issues**:
1. **Insufficient Coverage**: Overall coverage for `src/video` is ~20%. Critical components like `ComposeProcessor` (11%), `ThumbnailProcessor` (14%), and `VideoService` (74%) are significantly below the 85% target.
2. **Missing Processor Tests**: `tests/video/test_processors.py` only tests `TranscodeProcessor`. `ComposeProcessor` and `ThumbnailProcessor` are completely untested.
3. **Missing Task Tests**: `compose_video` task is not tested.

**What Was Done Well**:
- URL configuration and Model definitions are solid.
- API Views have good integration tests (>90% coverage).
- `TranscodeProcessor` is well tested.

**Action Items** (must complete before re-review):
- [ ] Create `tests/video/test_processors_compose.py` to test `ComposeProcessor` logic.
- [ ] Create `tests/video/test_processors_thumbnail.py` to test `ThumbnailProcessor` logic.
- [ ] Add tests for `compose_video` and `generate_thumbnail` error cases in `tests/video/test_tasks.py`.
- [ ] Increase `VideoService` coverage to >85% (add tests for complex validation logic).

# WP07: Unit & Integration Tests

## Activity Log

- 2026-02-10T15:55:00Z – copilot-reviewer – shell_pid=$PID – lane=for_review – Review findings: Needs Changes - Coverage insufficient
- 2026-02-10T14:45:00Z – copilot-implementer – shell_pid=$PID – lane=doing – Started implementation

## Objective

Achieve >85% test coverage with comprehensive unit and integration tests. All external dependencies (FFmpeg, S3, Celery) must be mocked for fast, reliable CI.

## Context

- **Constitution Principle IV**: >85% coverage with pytest-django
- **Testing Guide**: `documents/08-testing/`
- **Depends On**: WP01-WP04 (all code must exist to test)

## Coverage Targets

| Component | Target | Rationale |
|-----------|--------|-----------|
| Models | >90% | Core business logic |
| Serializers | >85% | Validation rules |
| API Views | >85% | Request/response handling |
| Services | >85% | Business operations |
| Tasks | >80% | Async processing |
| Processors | >80% | FFmpeg command generation |

## Subtasks

### T053: Create Test Fixtures and Factories
Create `tests/video/conftest.py`:
```python
import pytest
from pytest_factoryboy import register
from .factories import (
    VideoJobFactory,
    VideoPresetFactory,
    PlatformExportFactory,
    VideoOverlayFactory,
)

register(VideoJobFactory)
register(VideoPresetFactory)
register(PlatformExportFactory)
register(VideoOverlayFactory)

@pytest.fixture
def mock_ffmpeg(mocker):
    """Mock FFmpeg subprocess calls."""
    return mocker.patch("subprocess.run", return_value=MockFFmpegResult())

@pytest.fixture
def mock_s3(mocker):
    """Mock S3 upload/download operations."""
    return mocker.patch("src.files.services.FileService")

@pytest.fixture
def celery_eager(settings):
    """Run Celery tasks synchronously for testing."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
```

Create `tests/video/factories.py`:
```python
import factory
from src.video.models import VideoJob, VideoPreset, PlatformExport, VideoOverlay

class VideoPresetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = VideoPreset

    name = factory.Sequence(lambda n: f"preset_{n}")
    output_format = "mp4"
    resolution_width = 1920
    resolution_height = 1080
    codec = "h264"
    is_system = False

class VideoJobFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = VideoJob

    project = factory.SubFactory("tests.projects.factories.ProjectFactory")
    created_by = factory.SubFactory("tests.accounts.factories.UserFactory")
    job_type = "transcode"
    status = "pending"
    preset = factory.SubFactory(VideoPresetFactory)
```

**Acceptance**: Factories generate valid model instances

### T054: Write Model Tests [P]
Create `tests/video/test_models.py`:
```python
import pytest
from src.video.models import VideoJob, VideoPreset

@pytest.mark.django_db
class TestVideoJob:
    def test_create_job_with_required_fields(self, video_job_factory):
        job = video_job_factory()
        assert job.id is not None
        assert job.status == "pending"

    def test_job_status_transitions(self, video_job_factory):
        job = video_job_factory(status="pending")
        job.status = "queued"
        job.save()
        assert job.status == "queued"

    def test_publishable_property_no_workflow(self, video_job_factory):
        job = video_job_factory(status="completed", workflow_instance=None)
        assert job.publishable is True

    def test_publishable_property_with_unapproved_workflow(self, video_job_factory):
        # ... test workflow integration

@pytest.mark.django_db
class TestVideoPreset:
    def test_create_preset(self, video_preset_factory):
        preset = video_preset_factory()
        assert preset.output_format == "mp4"
```

**Acceptance**: Model tests cover CRUD, properties, and edge cases

### T055: Write Serializer Tests [P]
Create `tests/video/test_serializers.py`:
```python
import pytest
from src.video.serializers import VideoJobCreateSerializer

@pytest.mark.django_db
class TestVideoJobCreateSerializer:
    def test_valid_data(self, project, user, file):
        data = {
            "source_file_id": str(file.id),
            "job_type": "transcode",
            "preset_id": str(preset.id),
        }
        serializer = VideoJobCreateSerializer(data=data, context={"request": mock_request})
        assert serializer.is_valid(), serializer.errors

    def test_invalid_job_type(self, project, user, file):
        data = {"job_type": "invalid"}
        serializer = VideoJobCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "job_type" in serializer.errors

    def test_nested_overlay_validation(self):
        # Test overlay data validation
```

**Acceptance**: Serializer tests cover validation rules

### T056: Write API Tests [P]
Create `tests/video/test_api.py`:
```python
import pytest
from rest_framework.test import APIClient
from rest_framework import status

@pytest.mark.django_db
class TestVideoJobAPI:
    def test_list_jobs_authenticated(self, api_client, user, video_job_factory):
        api_client.force_authenticate(user=user)
        video_job_factory(created_by=user)

        response = api_client.get("/api/v1/video/jobs/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_list_jobs_filters_by_project(self, api_client, user, video_job_factory):
        # User only sees jobs from their projects

    def test_create_job(self, api_client, user, project, file, preset):
        api_client.force_authenticate(user=user)

        response = api_client.post("/api/v1/video/jobs/", {
            "source_file_id": str(file.id),
            "job_type": "transcode",
            "preset_id": str(preset.id),
        })

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "queued"

    def test_retry_failed_job(self, api_client, user, video_job_factory):
        job = video_job_factory(status="failed", created_by=user)
        api_client.force_authenticate(user=user)

        response = api_client.post(f"/api/v1/video/jobs/{job.id}/retry/")

        assert response.status_code == status.HTTP_200_OK

    def test_delete_completed_job(self, api_client, user, video_job_factory):
        job = video_job_factory(status="completed", created_by=user)
        api_client.force_authenticate(user=user)

        response = api_client.delete(f"/api/v1/video/jobs/{job.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
```

**Acceptance**: All 8 API endpoints tested with success/error cases

### T057: Write Service Tests [P]
Create `tests/video/test_services.py`:
```python
import pytest
from src.video.services import VideoService

@pytest.mark.django_db
class TestVideoService:
    def test_create_job_dispatches_task(self, mocker, project, user, file, preset):
        mock_task = mocker.patch("src.video.tasks.transcode_video.delay")
        service = VideoService()

        job = service.create_job(
            project=project,
            user=user,
            source_file=file,
            job_type="transcode",
            preset=preset,
        )

        assert job.status == "queued"
        mock_task.assert_called_once_with(str(job.id))

    def test_create_job_validates_file_size(self, project, user, oversized_file, preset):
        service = VideoService()

        with pytest.raises(ValidationError) as exc:
            service.create_job(
                project=project,
                user=user,
                source_file=oversized_file,
                job_type="transcode",
                preset=preset,
            )

        assert "file size" in str(exc.value).lower()

    def test_cancel_pending_job(self, video_job_factory):
        job = video_job_factory(status="pending")
        service = VideoService()

        result = service.cancel_job(job)

        assert result is True
        job.refresh_from_db()
        assert job.status == "cancelled"
```

**Acceptance**: Service tests cover create, cancel, retry operations

### T058: Write Task Tests [P]
Create `tests/video/test_tasks.py`:
```python
import pytest
from unittest.mock import MagicMock
from src.video.tasks import transcode_video

@pytest.mark.django_db
class TestTranscodeTask:
    def test_transcode_success(self, video_job_factory, mock_ffmpeg, mock_s3):
        job = video_job_factory(status="queued")

        transcode_video(str(job.id))

        job.refresh_from_db()
        assert job.status == "completed"
        assert job.output_file is not None

    def test_transcode_failure_retries(self, video_job_factory, mock_ffmpeg):
        mock_ffmpeg.side_effect = Exception("FFmpeg error")
        job = video_job_factory(status="queued")

        with pytest.raises(Exception):
            transcode_video(str(job.id))

        job.refresh_from_db()
        assert job.status == "failed"
        assert "FFmpeg error" in job.error_message

    def test_progress_updates(self, video_job_factory, mock_ffmpeg_with_progress):
        job = video_job_factory(status="queued")

        transcode_video(str(job.id))

        # Verify progress was updated
        assert VideoJob.objects.get(id=job.id).progress_percent > 0
```

**Acceptance**: Task tests cover success, failure, retry, progress

### T059: Write Processor Tests [P]
Create `tests/video/test_processors.py`:
```python
import pytest
from src.video.services.processors import TranscodeProcessor, ThumbnailProcessor

class TestTranscodeProcessor:
    def test_build_command_mp4(self, video_job_factory, video_preset_factory):
        preset = video_preset_factory(output_format="mp4", codec="h264", crf=23)
        job = video_job_factory(preset=preset)
        processor = TranscodeProcessor(job)

        command = processor.build_command("/tmp/input.mp4", "/tmp/output.mp4")

        assert "ffmpeg" in command[0]
        assert "-crf" in command
        assert "23" in command
        assert "-c:v" in command
        assert "libx264" in command

    def test_build_command_webm(self, video_job_factory, video_preset_factory):
        preset = video_preset_factory(output_format="webm", codec="vp9")
        job = video_job_factory(preset=preset)
        processor = TranscodeProcessor(job)

        command = processor.build_command("/tmp/input.mp4", "/tmp/output.webm")

        assert "-c:v" in command
        assert "libvpx-vp9" in command

class TestThumbnailProcessor:
    def test_build_command_single_frame(self, video_job_factory):
        job = video_job_factory(job_type="thumbnail")
        processor = ThumbnailProcessor(job)

        command = processor.build_command("/tmp/input.mp4", "/tmp/thumb.jpg", timestamp=5.0)

        assert "-ss" in command
        assert "5" in command
        assert "-vframes" in command
        assert "1" in command
```

**Acceptance**: Processor tests verify FFmpeg command generation

### T060: Create FFmpeg Mock Fixtures
Add to `conftest.py`:
```python
@pytest.fixture
def mock_ffmpeg_output():
    """Sample FFmpeg output for parsing tests."""
    return b"""
frame=100
fps=30.0
stream_0_0_q=23.0
bitrate=1500.0kbits/s
total_size=1048576
out_time_ms=3333333
out_time=00:00:03.333333
dup_frames=0
drop_frames=0
speed=2.5x
progress=continue
"""

@pytest.fixture
def mock_ffmpeg_success(mocker, mock_ffmpeg_output):
    """Mock successful FFmpeg execution."""
    mock = mocker.patch("subprocess.Popen")
    mock.return_value.stdout = iter(mock_ffmpeg_output.split(b"\n"))
    mock.return_value.stderr = iter([])
    mock.return_value.returncode = 0
    mock.return_value.wait.return_value = 0
    return mock

@pytest.fixture
def mock_ffmpeg_failure(mocker):
    """Mock failed FFmpeg execution."""
    mock = mocker.patch("subprocess.Popen")
    mock.return_value.returncode = 1
    mock.return_value.stderr = iter([b"Error: Invalid codec"])
    return mock
```

**Acceptance**: FFmpeg mocks provide realistic output

### T061: Create S3 Mock Fixtures
Add to `conftest.py`:
```python
@pytest.fixture
def mock_s3_download(mocker, tmp_path):
    """Mock S3 file download."""
    def download_to_path(file_obj, local_path):
        # Create a dummy video file
        Path(local_path).write_bytes(b"dummy video content")
        return local_path

    mock = mocker.patch("src.files.services.FileService.download_to_path")
    mock.side_effect = download_to_path
    return mock

@pytest.fixture
def mock_s3_upload(mocker):
    """Mock S3 file upload."""
    def upload_file(path, project, created_by):
        return FileFactory(
            project=project,
            created_by=created_by,
            file_size=Path(path).stat().st_size,
        )

    mock = mocker.patch("src.files.services.FileService.upload_file")
    mock.side_effect = upload_file
    return mock
```

**Acceptance**: S3 mocks work without real AWS calls

### T062: Add Coverage Configuration
Update `pytest.ini` or `pyproject.toml`:
```toml
[tool.pytest.ini_options]
addopts = "--cov=src/video --cov-report=html --cov-fail-under=85"

[tool.coverage.run]
source = ["src/video"]
omit = ["*/migrations/*", "*/tests/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
]
```

**Acceptance**: `pytest` runs with coverage reporting

## Validation Criteria

1. `pytest tests/video/ -v` passes
2. Coverage report shows >85% overall
3. No real FFmpeg/S3 calls in tests
4. Tests run fast (<30s total)
5. CI pipeline passes

## Files to Create

- `tests/video/__init__.py`
- `tests/video/conftest.py`
- `tests/video/factories.py`
- `tests/video/test_models.py`
- `tests/video/test_serializers.py`
- `tests/video/test_api.py`
- `tests/video/test_services.py`
- `tests/video/test_tasks.py`
- `tests/video/test_processors.py`

## Review Checklist

- [ ] All tests use pytest fixtures (not setUp/tearDown)
- [ ] Factory Boy used for model creation
- [ ] External calls mocked (FFmpeg, S3, Celery)
- [ ] Edge cases covered (errors, empty results)
- [ ] Async tasks tested with CELERY_TASK_ALWAYS_EAGER
- [ ] Coverage >85%
- [ ] Tests run in <30s
- [ ] No flaky tests
