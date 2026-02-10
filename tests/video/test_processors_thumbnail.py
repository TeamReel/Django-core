import pytest
from unittest.mock import patch, PropertyMock
from src.video.services.processors.thumbnail import ThumbnailProcessor


@pytest.mark.django_db
class TestThumbnailProcessor:
    def test_build_command_default_timestamp(self, video_job, video_preset, file_factory):
        """Test build_command with default 25% timestamp when metadata available."""
        video_job.preset = video_preset
        video_job.input_file = file_factory(
            organization=video_job.project.organisation, metadata={"duration_seconds": 60.0}
        )
        video_job.config = {}

        processor = ThumbnailProcessor(video_job)
        command = processor.build_command("input.mp4", "output.jpg")

        cmd_str = " ".join(command)
        assert "ffmpeg" in cmd_str
        assert "-i input.mp4" in cmd_str
        assert "-ss 00:00:15" in cmd_str  # 25% of 60 = 15
        assert "-vframes 1" in cmd_str
        assert "output.jpg" in cmd_str

    def test_build_command_explicit_timestamp(self, video_job, video_preset):
        """Test build_command with explicitly provided timestamp."""
        video_job.preset = video_preset
        video_job.config = {"timestamp": 30}

        processor = ThumbnailProcessor(video_job)
        command = processor.build_command("input.mp4", "output.jpg")

        cmd_str = " ".join(command)
        assert "-ss 00:00:30" in cmd_str

    def test_build_command_fallback_timestamp(self, video_job, video_preset):
        """Test build_command falls back to 5s when no metadata."""
        video_job.preset = video_preset
        # Avoid accessing input_file by using hasattr check
        video_job.config = {}

        processor = ThumbnailProcessor(video_job)
        # Set input_file to None by directly manipulating the descriptor
        with patch.object(type(video_job), "input_file", new_callable=PropertyMock) as mock_input:
            mock_input.return_value = None
            command = processor.build_command("input.mp4", "output.jpg")

        cmd_str = " ".join(command)
        assert "-ss 00:00:05" in cmd_str

    def test_build_command_grid_mode(self, video_job, video_preset):
        """Test build_command with grid thumbnail."""
        video_job.preset = video_preset
        video_job.config = {"timestamp": 10, "grid": {"rows": 4, "cols": 5}}

        processor = ThumbnailProcessor(video_job)
        command = processor.build_command("input.mp4", "output.jpg")

        cmd_str = " ".join(command)
        assert "fps=1/10" in cmd_str
        assert "scale=160:-1" in cmd_str
        assert "tile=5x4" in cmd_str

    def test_build_command_custom_grid_size(self, video_job, video_preset):
        """Test build_command with custom grid dimensions."""
        video_job.preset = video_preset
        video_job.config = {"timestamp": 10, "grid": {"rows": 3, "cols": 3}}

        processor = ThumbnailProcessor(video_job)
        command = processor.build_command("input.mp4", "output.jpg")

        cmd_str = " ".join(command)
        assert "tile=3x3" in cmd_str
