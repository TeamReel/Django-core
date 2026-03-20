from unittest.mock import MagicMock, patch

import pytest
from rest_framework.exceptions import ValidationError

from src.video.models import JobStatus, JobType
from src.video.services.constants import VIDEO_MAX_FILE_SIZE
from src.video.services.video_service import VideoService


@pytest.fixture
def video_service():
    return VideoService()


@pytest.mark.django_db
class TestVideoService:
    @patch("src.video.services.video_service.transaction.on_commit", side_effect=lambda fn: fn())
    @patch("src.video.tasks.transcode_video.delay")
    @patch("src.video.services.video_service.get_storage_backend")
    def test_create_transcode_job_success(
        self,
        mock_get_backend,
        mock_transcode_task,
        mock_on_commit,
        video_service,
        project,
        user,
        video_file,
        video_preset,
    ):
        """Test creating a valid transcode job dispatches task."""
        # Setup backend mock
        backend = MagicMock()
        backend.exists.return_value = True
        mock_get_backend.return_value = backend

        job = video_service.create_job(
            project=project,
            user=user,
            input_file=video_file,
            job_type=JobType.TRANSCODE,
            preset=video_preset,
        )

        assert job.status == JobStatus.QUEUED
        assert job.preset == video_preset
        mock_transcode_task.assert_called_once_with(str(job.id))

    @patch("src.video.services.video_service.transaction.on_commit", side_effect=lambda fn: fn())
    @patch("src.video.tasks.generate_thumbnail.delay")
    @patch("src.video.services.video_service.get_storage_backend")
    def test_create_thumbnail_job_success(
        self,
        mock_get_backend,
        mock_thumbnail_task,
        mock_on_commit,
        video_service,
        project,
        user,
        video_file,
    ):
        """Test creating a thumbnail job."""
        backend = MagicMock()
        backend.exists.return_value = True
        mock_get_backend.return_value = backend

        job = video_service.create_job(
            project=project, user=user, input_file=video_file, job_type=JobType.THUMBNAIL
        )

        assert job.job_type == JobType.THUMBNAIL
        mock_thumbnail_task.assert_called_once_with(str(job.id))

    @patch("src.video.services.video_service.get_storage_backend")
    def test_create_job_missing_file_validation(
        self, mock_get_backend, video_service, project, user, video_file
    ):
        """Test validation fails if file doesn't exist in storage."""
        backend = MagicMock()
        backend.exists.return_value = False
        mock_get_backend.return_value = backend

        with pytest.raises(ValidationError) as exc:
            video_service.create_job(
                project=project, user=user, input_file=video_file, job_type=JobType.THUMBNAIL
            )
        assert "Source file not found" in str(exc.value)

    @patch("src.video.services.video_service.get_storage_backend")
    def test_create_job_file_too_large(
        self, mock_get_backend, video_service, project, user, video_file
    ):
        """Test validation fails if file is too large."""
        backend = MagicMock()
        backend.exists.return_value = True
        mock_get_backend.return_value = backend

        video_file.file_size = VIDEO_MAX_FILE_SIZE + 1024
        video_file.save()

        with pytest.raises(ValidationError) as exc:
            video_service.create_job(
                project=project, user=user, input_file=video_file, job_type=JobType.THUMBNAIL
            )
        assert "File exceeds max size" in str(exc.value)

    def test_validate_job_config_missing_preset(self, video_service, project, user, video_file):
        """Test transcode job fails without preset."""
        with patch("src.video.services.video_service.get_storage_backend") as mock_backend:
            mock_backend.return_value.exists.return_value = True

            with pytest.raises(ValidationError) as exc:
                video_service.create_job(
                    project=project,
                    user=user,
                    input_file=video_file,
                    job_type=JobType.TRANSCODE,
                    preset=None,
                )
            assert "Preset is required" in str(exc.value)

    def test_cancel_job(self, video_service, video_job):
        """Test cancelling a queued job."""
        video_job.status = JobStatus.QUEUED
        video_job.save()

        success = video_service.cancel_job(video_job)

        video_job.refresh_from_db()
        assert success is True
        assert video_job.status == JobStatus.CANCELLED
        assert video_job.completed_at is not None

    def test_cancel_job_not_queued(self, video_service, video_job):
        """Test cancelling a processing job fails."""
        video_job.status = JobStatus.PROCESSING
        video_job.save()

        success = video_service.cancel_job(video_job)
        assert success is False

        video_job.refresh_from_db()
        assert video_job.status == JobStatus.PROCESSING

    @patch("src.video.services.video_service.transaction.on_commit", side_effect=lambda fn: fn())
    @patch("src.video.tasks.transcode_video.delay")
    def test_retry_job(self, mock_transcode, mock_on_commit, video_service, video_job):
        """Test retrying a failed job."""
        video_job.status = JobStatus.FAILED
        video_job.job_type = JobType.TRANSCODE
        video_job.retry_count = 0
        video_job.save()

        retried_job = video_service.retry_job(video_job)

        assert retried_job.status == JobStatus.QUEUED
        assert retried_job.retry_count == 1
        assert retried_job.error_message == ""

        mock_transcode.assert_called_once_with(str(video_job.id))

    def test_retry_job_invalid_status(self, video_service, video_job):
        """Test retrying non-failed job raises error."""
        video_job.status = JobStatus.COMPLETED
        video_job.save()

        with pytest.raises(ValidationError):
            video_service.retry_job(video_job)
