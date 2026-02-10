import pytest
from unittest.mock import patch, MagicMock
from src.video.models import JobStatus, JobType
from src.video.tasks.transcode import transcode_video
from src.video.tasks.thumbnail import generate_thumbnail
from src.video.tasks.compose import compose_video


@pytest.mark.django_db
class TestVideoTasks:
    @patch("src.video.tasks.transcode.TranscodeProcessor")
    def test_transcode_success(self, mock_processor_cls, video_job, video_file):
        """Test successful video transcode task."""
        # Setup mock processor
        mock_processor = MagicMock()
        mock_processor_cls.return_value = mock_processor
        mock_processor.execute.return_value = video_file  # Mock output file

        # Initial state
        video_job.status = JobStatus.QUEUED
        video_job.save()

        # Run task
        result = transcode_video(str(video_job.id))

        # Verify
        assert result == str(video_job.id)
        video_job.refresh_from_db()
        assert video_job.status == JobStatus.COMPLETED
        assert video_job.progress_percent == 100
        assert video_job.completed_at is not None
        assert video_job.output_file == video_file

        mock_processor_cls.assert_called_once_with(video_job)
        mock_processor.execute.assert_called_once()

    @patch("src.video.tasks.transcode.TranscodeProcessor")
    def test_transcode_failure(self, mock_processor_cls, video_job):
        """Test transcode failure handling."""
        mock_processor = MagicMock()
        mock_processor_cls.return_value = mock_processor
        mock_processor.execute.side_effect = Exception("FFmpeg failed")

        # Mock retry to prevent actual sleep/retry loop in test
        transcode_video.retry = MagicMock(side_effect=Exception("Retry triggered"))

        with pytest.raises(Exception, match="Retry triggered"):
            transcode_video(str(video_job.id))

        video_job.refresh_from_db()
        # Note: In the real task catch block, we don't set status to FAILED in the try/except
        # shown in the read_file output (it just logs and maybe retries).
        # The 'on_failure' handler of Celery might set it, usually.
        # Looking at the code:
        # except Exception as exc: logger.error...
        # It does NOT set status=FAILED explicitly in the snippet I saw.
        # Use simple assertion of retry call.
        transcode_video.retry.assert_called()

    def test_transcode_job_not_found(self):
        """Test handling of non-existent job."""
        import uuid

        random_id = str(uuid.uuid4())
        result = transcode_video(random_id)
        assert result is None

    @patch("src.video.tasks.thumbnail.ThumbnailProcessor")
    def test_thumbnail_success(self, mock_processor_cls, video_job, video_file):
        """Test successful thumbnail generation task."""
        mock_processor = MagicMock()
        mock_processor_cls.return_value = mock_processor
        mock_processor.execute.return_value = video_file

        video_job.job_type = JobType.THUMBNAIL
        video_job.save()

        result = generate_thumbnail(str(video_job.id))

        assert result == str(video_job.id)
        video_job.refresh_from_db()
        assert video_job.status == JobStatus.COMPLETED

    @patch("src.video.tasks.thumbnail.ThumbnailProcessor")
    def test_thumbnail_failure(self, mock_processor_cls, video_job):
        """Test thumbnail generation failure."""
        mock_processor = MagicMock()
        mock_processor_cls.return_value = mock_processor
        mock_processor.execute.side_effect = RuntimeError("Thumbnail generation failed")

        video_job.job_type = JobType.THUMBNAIL
        video_job.save()

        generate_thumbnail.retry = MagicMock(side_effect=Exception("Retry triggered"))

        with pytest.raises(Exception, match="Retry triggered"):
            generate_thumbnail(str(video_job.id))

        generate_thumbnail.retry.assert_called()

    @patch("src.video.tasks.compose.ComposeProcessor")
    def test_compose_success(self, mock_processor_cls, video_job, video_file):
        """Test successful video compose task."""
        mock_processor = MagicMock()
        mock_processor_cls.return_value = mock_processor
        mock_processor.execute.return_value = video_file

        video_job.job_type = JobType.COMPOSE
        video_job.save()

        result = compose_video(str(video_job.id))

        assert result == str(video_job.id)
        video_job.refresh_from_db()
        assert video_job.status == JobStatus.COMPLETED

    @patch("src.video.tasks.compose.ComposeProcessor")
    def test_compose_failure(self, mock_processor_cls, video_job):
        """Test compose failure handling."""
        mock_processor = MagicMock()
        mock_processor_cls.return_value = mock_processor
        mock_processor.execute.side_effect = RuntimeError("Compose failed")

        video_job.job_type = JobType.COMPOSE
        video_job.save()

        compose_video.retry = MagicMock(side_effect=Exception("Retry triggered"))

        with pytest.raises(Exception, match="Retry triggered"):
            compose_video(str(video_job.id))

        compose_video.retry.assert_called()
