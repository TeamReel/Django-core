"""Thumbnail processor."""

from __future__ import annotations

from src.video.services.processors.base import BaseVideoProcessor


class ThumbnailProcessor(BaseVideoProcessor):
    """Processor for thumbnail jobs."""

    output_extension = "jpg"

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        config = self.job.config or {}
        timestamp = config.get("timestamp")
        grid = config.get("grid")

        if not timestamp:
            duration = None
            if self.job.input_file and self.job.input_file.metadata:
                duration = self.job.input_file.metadata.get("duration_seconds")

            if duration:
                timestamp = int(duration * 0.25)
            else:
                timestamp = 5
        if isinstance(timestamp, (int, float)):
            timestamp = f"00:00:{int(timestamp):02d}"

        command = ["ffmpeg", "-y", "-i", input_path, "-ss", str(timestamp)]

        if grid:
            rows = grid.get("rows", 4)
            cols = grid.get("cols", 5)
            command += ["-vf", f"fps=1/10,scale=160:-1,tile={cols}x{rows}"]
        else:
            command += ["-vframes", "1", "-f", "image2"]

        command.append(output_path)
        return command
