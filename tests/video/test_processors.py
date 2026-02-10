import pytest
from src.video.services.processors.transcode import TranscodeProcessor
from src.video.models import OutputFormat


@pytest.mark.django_db
class TestTranscodeProcessor:
    def test_build_command_default(self, video_job, video_preset):
        """Test basic build command with preset defaults."""
        video_job.preset = video_preset
        video_preset.video_codec = "libx264"
        video_preset.output_format = OutputFormat.MP4
        video_preset.save()

        processor = TranscodeProcessor(video_job)
        command = processor.build_command("/tmp/input.mp4", "/tmp/output.mp4")

        expected = [
            "ffmpeg",
            "-y",
            "-i",
            "/tmp/input.mp4",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            "/tmp/output.mp4",
        ]

        # Check command structure somewhat loosely or strictly
        assert command[0:4] == ["ffmpeg", "-y", "-i", "/tmp/input.mp4"]
        assert "-c:v" in command
        assert "libx264" in command
        assert "/tmp/output.mp4" in command

    def test_build_command_full_options(self, video_job, video_preset):
        """Test command with resolution, bitrate, framerate."""
        video_job.preset = video_preset
        video_preset.resolution = "1920x1080"
        video_preset.bitrate_video = 5000000
        video_preset.framerate = 60
        video_preset.crf = 23
        video_preset.save()

        processor = TranscodeProcessor(video_job)
        command = processor.build_command("in.mp4", "out.mp4")

        assert "-vf" in command
        assert "scale=1920x1080" in command
        assert "-r" in command
        assert "60" in command
        assert "-b:v" in command
        assert "5000000" in command
        assert "-crf" in command
        assert "23" in command

    def test_build_command_webm_support(self, video_job, video_preset):
        """Test WebM output format flags."""
        video_job.preset = video_preset
        video_preset.output_format = OutputFormat.WEBM
        video_preset.save()

        processor = TranscodeProcessor(video_job)
        command = processor.build_command("in.mp4", "out.webm")

        assert "-f" in command
        assert "webm" in command
        assert "-movflags" not in command

    def test_build_command_extra_params(self, video_job, video_preset):
        """Test extra_params injection."""
        video_job.preset = video_preset
        video_preset.extra_params = {"-tune": "film", "-preset": "slow"}
        video_preset.save()

        processor = TranscodeProcessor(video_job)
        command = processor.build_command("in.mp4", "out.mp4")

        assert "-tune" in command
        assert "film" in command
        assert "-preset" in command
        assert "slow" in command

    def test_hls_not_supported(self, video_job, video_preset):
        """Test that HLS raises not implemented error."""
        video_job.preset = video_preset
        video_preset.output_format = OutputFormat.HLS
        video_preset.save()

        with pytest.raises(NotImplementedError):
            TranscodeProcessor(video_job)
