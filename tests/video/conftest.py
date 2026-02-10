"""Pytest fixtures for video processing tests."""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import MagicMock

import pytest
from pytest_factoryboy import register

from tests.accounts.factories import UserFactory
from .factories import (
    OrganisationFactory,
    ProjectFactory,
    FileFactory,
    PlatformExportFactory,
    VideoJobFactory,
    VideoOverlayFactory,
    VideoPresetFactory,
)

if TYPE_CHECKING:
    from pytest_mock import MockerFixture

# Register factories for automatic fixture creation
register(UserFactory)
register(OrganisationFactory)
register(ProjectFactory)
register(FileFactory)
register(VideoPresetFactory)
register(PlatformExportFactory)
register(VideoJobFactory)
register(VideoOverlayFactory)


@pytest.fixture
def mock_ffmpeg(mocker: MockerFixture) -> MagicMock:
    """Mock FFmpeg subprocess calls.

    Returns successful completion with sample output.
    """
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = b"frame= 1800 fps= 60 time=00:01:00.00 bitrate=5000.0kbits/s"
    mock_result.stderr = b""

    return mocker.patch("subprocess.run", return_value=mock_result)


@pytest.fixture
def video_file(file_factory, project):
    """Create a sample video file asset."""
    return file_factory(organization=project.organisation)


@pytest.fixture
def mock_ffmpeg_with_progress(mocker: MockerFixture) -> MagicMock:
    """Mock FFmpeg with progress tracking.

    Simulates multiple progress updates during processing.
    """
    progress_outputs = [
        b"frame=  300 fps= 60 time=00:00:10.00 progress=20%",
        b"frame=  900 fps= 60 time=00:00:30.00 progress=50%",
        b"frame= 1800 fps= 60 time=00:01:00.00 progress=100%",
    ]

    mock_popen = MagicMock()
    mock_popen.poll.side_effect = [None, None, 0]
    mock_popen.stderr.readline.side_effect = progress_outputs
    mock_popen.returncode = 0

    return mocker.patch("subprocess.Popen", return_value=mock_popen)


@pytest.fixture
def mock_ffmpeg_failure(mocker: MockerFixture) -> MagicMock:
    """Mock FFmpeg failure scenarios."""
    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stdout = b""
    mock_result.stderr = b"Error: Invalid codec parameters"

    return mocker.patch("subprocess.run", return_value=mock_result)


@pytest.fixture
def mock_s3_upload(mocker: MockerFixture) -> MagicMock:
    """Mock S3 file upload operations."""
    mock_service = mocker.patch("src.video.services.video_service.FileService")
    mock_instance = mock_service.return_value
    mock_instance.upload_file.return_value = MagicMock(
        id="test-file-id",
        name="output.mp4",
        url="https://s3.example.com/output.mp4",
    )
    return mock_instance


@pytest.fixture
def mock_s3_download(mocker: MockerFixture, tmp_path) -> MagicMock:
    """Mock S3 file download operations.

    Returns path to temporary file.
    """
    test_file = tmp_path / "input.mp4"
    test_file.write_bytes(b"fake video content")

    mock_service = mocker.patch("src.video.services.video_service.FileService")
    mock_instance = mock_service.return_value
    mock_instance.download_file.return_value = str(test_file)
    return mock_instance


@pytest.fixture
def celery_eager(settings):
    """Configure Celery to run tasks synchronously for testing."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    return settings


@pytest.fixture
def sample_video_file(tmp_path):
    """Create a sample video file for testing."""
    video_file = tmp_path / "test_video.mp4"
    # Write minimal MP4 header (ftyp box)
    video_file.write_bytes(
        b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2mp41"
        + b"\x00" * 100  # Padding to make it look like a real file
    )
    return video_file


@pytest.fixture
def oversized_video_file(tmp_path, settings):
    """Create a video file exceeding the size limit."""
    max_size = settings.VIDEO_MAX_FILE_SIZE_MB * 1024 * 1024
    video_file = tmp_path / "oversized_video.mp4"
    video_file.write_bytes(b"\x00" * (max_size + 1024))
    return video_file
