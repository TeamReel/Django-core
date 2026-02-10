"""Compose processor."""

from __future__ import annotations

import logging
from pathlib import Path

from django.utils import timezone

from src.video.models import VideoOverlay
from src.video.models.job import JobStatus
from src.video.models.overlay import OverlayPosition, OverlayType
from src.video.services.processors.base import BaseVideoProcessor

logger = logging.getLogger(__name__)


class ComposeProcessor(BaseVideoProcessor):
    """Processor for compose jobs (overlays, text, intro/outro)."""

    def execute(self):
        self._ensure_temp_dir()
        logger.info("video_processing_started", job_id=str(self.job.id), job_type=self.job.job_type)
        self.job.status = JobStatus.PROCESSING
        self.job.started_at = timezone.now()
        self.job.save(update_fields=["status", "started_at", "updated_at"])

        try:
            input_path = self._download_source()
            input_path = self._concat_intro_outro(input_path)
            output_path = str(self.temp_dir / f"output.{self.output_extension}")

            def progress_callback(percent: int) -> None:
                self.job.progress_percent = percent
                self.job.save(update_fields=["progress_percent", "updated_at"])

            command = self.build_command(input_path, output_path)
            logger.info("ffmpeg_command", job_id=str(self.job.id), command=" ".join(command))
            self._run_ffmpeg(command, progress_callback)

            output_file = self._upload_output(output_path)
            self.job.output_file = output_file
            self.job.status = JobStatus.COMPLETED
            self.job.completed_at = timezone.now()
            self.job.progress_percent = 100
            self.job.save(
                update_fields=[
                    "output_file",
                    "status",
                    "completed_at",
                    "progress_percent",
                    "updated_at",
                ]
            )
            logger.info("video_processing_completed", job_id=str(self.job.id))
            return output_file
        finally:
            self._cleanup()

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        overlays = list(self.job.overlays.all())
        overlays = [overlay for overlay in overlays if overlay.overlay_type != OverlayType.INTRO]
        overlays = [overlay for overlay in overlays if overlay.overlay_type != OverlayType.OUTRO]

        inputs = ["ffmpeg", "-y", "-i", input_path]
        filter_parts = []
        current = "[0:v]"
        overlay_inputs = 1

        for overlay in overlays:
            if (
                overlay.overlay_type in {OverlayType.LOGO, OverlayType.WATERMARK}
                and overlay.asset_file
            ):
                asset_path = self._download_asset(overlay)
                inputs += ["-i", asset_path]
                x, y = self._position_expr(overlay)
                opacity = max(0.0, min(overlay.opacity or 1.0, 1.0))
                overlay_label = f"[ovr{overlay_inputs}]"
                next_label = f"[v{overlay_inputs}]"
                filter_parts.append(
                    f"[{overlay_inputs}:v]format=rgba,colorchannelmixer=aa={opacity}{overlay_label}"
                )
                enable_expr = self._enable_expr(overlay)
                filter_parts.append(
                    f"{current}{overlay_label}overlay={x}:{y}{enable_expr}{next_label}"
                )
                current = next_label
                overlay_inputs += 1
            elif overlay.overlay_type == OverlayType.TEXT:
                text = (overlay.content or {}).get("text", "")
                text = text.replace("'", "\\'")
                x, y = self._position_expr(overlay)
                font_size = (overlay.content or {}).get("font_size", 24)
                font_color = (overlay.content or {}).get("font_color", "white")
                next_label = f"[v{overlay_inputs}]"
                enable_expr = self._enable_expr(overlay)
                filter_parts.append(
                    f"{current}drawtext=text='{text}':x={x}:y={y}:fontsize={font_size}:fontcolor={font_color}{enable_expr}{next_label}"
                )
                current = next_label
                overlay_inputs += 1

        command = inputs
        if filter_parts:
            command += ["-filter_complex", ";".join(filter_parts), "-map", current, "-map", "0:a?"]
        command.append(output_path)
        return command

    def _position_expr(self, overlay: VideoOverlay) -> tuple[str, str]:
        padding = max(0, overlay.padding_percent or 0)
        pad_expr = f"(main_w*{padding}/100)"

        if overlay.position == OverlayPosition.CUSTOM:
            return str(overlay.position_x or 0), str(overlay.position_y or 0)

        positions = {
            OverlayPosition.TOP_LEFT: (pad_expr, pad_expr),
            OverlayPosition.TOP_CENTER: ("(main_w-overlay_w)/2", pad_expr),
            OverlayPosition.TOP_RIGHT: (f"main_w-overlay_w-{pad_expr}", pad_expr),
            OverlayPosition.CENTER: ("(main_w-overlay_w)/2", "(main_h-overlay_h)/2"),
            OverlayPosition.BOTTOM_LEFT: (pad_expr, f"main_h-overlay_h-{pad_expr}"),
            OverlayPosition.BOTTOM_CENTER: (
                "(main_w-overlay_w)/2",
                f"main_h-overlay_h-{pad_expr}",
            ),
            OverlayPosition.BOTTOM_RIGHT: (
                f"main_w-overlay_w-{pad_expr}",
                f"main_h-overlay_h-{pad_expr}",
            ),
        }
        return positions.get(overlay.position, (pad_expr, pad_expr))

    def _enable_expr(self, overlay: VideoOverlay) -> str:
        if overlay.start_time is None and overlay.end_time is None:
            return ""
        start = overlay.start_time or 0
        end = overlay.end_time if overlay.end_time is not None else 1e9
        return f":enable='between(t,{start},{end})'"

    def _download_asset(self, overlay: VideoOverlay) -> str:
        if not overlay.asset_file:
            raise ValueError("Overlay has no asset file")
        from files.utils import get_storage_backend

        backend = get_storage_backend()
        asset_name = overlay.asset_file.original_name or f"overlay_{overlay.id}"
        asset_path = Path(self.temp_dir) / asset_name
        with backend.open(overlay.asset_file.storage_path, "rb") as source:
            with open(asset_path, "wb") as out:
                out.write(source.read())
        return str(asset_path)

    def _concat_intro_outro(self, input_path: str) -> str:
        intro = self.job.overlays.filter(overlay_type=OverlayType.INTRO).first()
        outro = self.job.overlays.filter(overlay_type=OverlayType.OUTRO).first()
        if not intro and not outro:
            return input_path

        inputs = []
        filter_inputs = []
        index = 0

        if intro and intro.asset_file:
            intro_path = self._download_asset(intro)
            inputs += ["-i", intro_path]
            filter_inputs.append(f"[{index}:v][{index}:a]")
            index += 1

        inputs += ["-i", input_path]
        filter_inputs.append(f"[{index}:v][{index}:a]")
        index += 1

        if outro and outro.asset_file:
            outro_path = self._download_asset(outro)
            inputs += ["-i", outro_path]
            filter_inputs.append(f"[{index}:v][{index}:a]")

        concat_output = str(Path(self.temp_dir) / "concat.mp4")
        filter_complex = "".join(filter_inputs) + f"concat=n={len(filter_inputs)}:v=1:a=1[v][a]"
        command = [
            "ffmpeg",
            "-y",
            *inputs,
            "-filter_complex",
            filter_complex,
            "-map",
            "[v]",
            "-map",
            "[a]",
            concat_output,
        ]
        self._run_ffmpeg(command, lambda percent: None)
        return concat_output
