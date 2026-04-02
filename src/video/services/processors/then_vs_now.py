"""Then vs Now compilation video processor.

Orchestrates data gathering and video composition for Then vs Now
compilation videos.  Follows the same pattern as LineupProcessor.
"""

from __future__ import annotations

import logging

from src.video.services.processors.base import BaseVideoProcessor
from src.video.services.then_vs_now_builder import ThenVsNowBuilder, ThenVsNowData

logger = logging.getLogger(__name__)


class ThenVsNowProcessor(BaseVideoProcessor):
    """Processor for Then vs Now compilation videos.

    Config schema:
    {
        "project_id": "uuid",          # Team project ID
        "video_type": (
            "sidebyside" | "transformation" | "photo_composite"
            | "duo_portret" | "walking_composite"
        ),
        "composition_style": (
            "cover" | "overlay" | null
        ),  # Optional -- cover (fullscreen, no bg) or overlay (RVM on bg)
        "period_id": "uuid",           # Optional -- season/period ID
        "selected_member_ids": [...],  # Optional -- filter to specific members
        "background_url": "https://...",  # Optional -- override location background
    }
    """

    output_extension = "mp4"

    def _process(self) -> str:
        """Compose Then vs Now video -- routes by composition_style/video_type."""
        config = self.job.config or {}
        project_id = config.get("project_id") or str(self.job.project_id)
        video_type = config.get("video_type", "sidebyside")
        composition_style = config.get("composition_style")  # "cover" | "overlay" | None

        # Resolve data from database via builder
        builder = ThenVsNowBuilder(
            project_id=project_id,
            video_type=video_type,
            selected_member_ids=config.get("selected_member_ids", []),
            member_variant_keys=config.get("member_variant_keys", {}),
            composition_style=composition_style,
            period_id=config.get("period_id"),
            background_url_override=config.get("background_url"),
        )
        data = builder.gather_data()

        if not data.members:
            if video_type in ("photo_composite", "duo_portret"):
                raise ValueError("No members found with duo portret videos.")
            if video_type == "walking_composite":
                raise ValueError("No members found with walking composite videos.")
            raise ValueError(f"No members found with then_vs_now '{video_type}' videos.")

        # Compose the video -- route based on composition_style then video_type
        output_path = self._compose_video(data)
        return str(output_path)

    def _compose_video(self, data: ThenVsNowData) -> str:
        """Route to the correct composer function."""
        if data.composition_style == "cover":
            from src.video.services.then_vs_now_composer import compose_cover_video

            return compose_cover_video(
                members=data.members,
                logo_url=data.logo_url,
                team_name=data.team_name,
                season_name=data.season_name,
                brand_color=data.brand_color,
                video_type=data.video_type,
                output_dir=self.temp_dir,
                progress_callback=self._update_progress,
            )
        if data.composition_style == "overlay" or data.video_type in (
            "photo_composite",
            "walking_composite",
        ):
            from src.video.services.then_vs_now_composer import compose_photo_composite_video

            return compose_photo_composite_video(
                members=data.members,
                background_url=data.background_url,
                logo_url=data.logo_url,
                team_name=data.team_name,
                season_name=data.season_name,
                brand_color=data.brand_color,
                sponsor_url=data.sponsor_url,
                output_dir=self.temp_dir,
                progress_callback=self._update_progress,
            )

        from src.video.services.then_vs_now_composer import compose_then_vs_now_video

        return compose_then_vs_now_video(
            members=data.members,
            background_url=data.background_url,
            logo_url=data.logo_url,
            team_name=data.team_name,
            season_name=data.season_name,
            brand_color=data.brand_color,
            sponsor_url=data.sponsor_url,
            video_type=data.video_type,
            output_dir=self.temp_dir,
            progress_callback=self._update_progress,
        )

    def _update_progress(self, percent: int):
        """Update job progress percentage."""
        self.job.progress_percent = percent
        self.job.save(update_fields=["progress_percent", "updated_at"])

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        """Not used -- composition handles FFmpeg directly."""
        return []
