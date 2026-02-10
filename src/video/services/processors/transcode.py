"""Transcode processor."""

from __future__ import annotations

from src.video.models import VideoJob
from src.video.models.preset import OutputFormat
from src.video.services.processors.base import BaseVideoProcessor


class TranscodeProcessor(BaseVideoProcessor):
    """Processor for transcode jobs."""

    def __init__(self, job: VideoJob) -> None:
        super().__init__(job)
        preset = job.preset or (job.platform_export.preset if job.platform_export else None)
        if preset and preset.output_format:
            if preset.output_format == OutputFormat.HLS:
                raise NotImplementedError("HLS output is not yet supported in this version.")
            else:
                self.output_extension = preset.output_format

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        preset = self.job.preset or (
            self.job.platform_export.preset if self.job.platform_export else None
        )

        video_codec = getattr(preset, "video_codec", None) or "libx264"
        audio_codec = getattr(preset, "audio_codec", None) or "aac"
        resolution = getattr(preset, "resolution", None)
        bitrate_video = getattr(preset, "bitrate_video", None)
        bitrate_audio = getattr(preset, "bitrate_audio", None) or "128k"
        crf = getattr(preset, "crf", None)
        framerate = getattr(preset, "framerate", None)
        extra_params = getattr(preset, "extra_params", None) or {}

        command = ["ffmpeg", "-y", "-i", input_path]

        if resolution:
            command += ["-vf", f"scale={resolution}"]
        if framerate:
            command += ["-r", str(framerate)]

        command += ["-c:v", video_codec]
        if crf is not None:
            command += ["-crf", str(crf)]
        if bitrate_video:
            command += ["-b:v", str(bitrate_video)]

        command += ["-c:a", audio_codec]
        if bitrate_audio:
            command += ["-b:a", str(bitrate_audio)]

        if extra_params:
            for key, value in extra_params.items():
                command.append(str(key))
                if value is not None:
                    command.append(str(value))

        if preset and preset.output_format == OutputFormat.MP4:
            command += ["-movflags", "+faststart"]
        if preset and preset.output_format == OutputFormat.WEBM:
            command += ["-f", "webm"]
        if preset and preset.output_format == OutputFormat.HLS:
            command += ["-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod"]

        command.append(output_path)
        return command
