"""Goal Celebration Video Builder Service.

Gathers data for a single goal celebration video:
- Match context (teams, date, score, competition)
- Brand assets (logos, sponsor, field background)
- Goal scorer's celebration video asset
- Goal scorer's fullbody image (for score overlay)

Reuses the LineupSegmentBuilder's brand/asset resolution logic.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

from src.video.services.brand_resolver import get_presigned_url

logger = logging.getLogger(__name__)

# Style priority for celebration variants (most common poses first)
_CELEBRATION_STYLE_PRIORITY = ["fist_pump", "arms_wide", "point_to_sky", "slide"]


def _find_best_celebration_url(
    celebration_variants: dict,
    kit_type: str,
    get_best_url_fn: callable,
) -> str | None:
    """Find the best celebration URL from variants dict."""
    from src.video.services._common import find_best_variant_url

    return find_best_variant_url(
        celebration_variants, kit_type, _CELEBRATION_STYLE_PRIORITY, get_best_url_fn
    )


@dataclass
class GoalCelebrationData:
    """All data needed to build a goal celebration video."""

    # Match info
    activity_id: str
    match_date: str
    kickoff_time: str | None
    own_team_name: str
    opponent_name: str
    is_home: bool
    venue: str | None
    season_name: str | None
    competition_name: str | None

    # Score
    score_home: int
    score_away: int

    # Brand assets
    logo_url: str | None
    opponent_logo_url: str | None
    sponsor_url: str | None
    field_background_url: str | None
    brand_primary: str | None
    brand_secondary: str | None

    # Goal scorer
    scorer_name: str
    scorer_member_id: str
    scorer_jersey_number: str | None
    scorer_celebration_url: str | None  # celebration video (WebM/MP4 with alpha)
    scorer_kit_url: str | None  # fullbody in tenue image
    scorer_closeup_url: str | None  # closeup image

    # Output settings
    output_width: int
    output_height: int
    output_fps: int


class GoalCelebrationBuilder:
    """Builds data for goal celebration video from Activity + member data."""

    def __init__(
        self,
        activity_id: str | UUID,
        scorer_member_id: str,
        score_home: int,
        score_away: int,
        background_url: str | None = None,
        output_resolution: str = "vertical_1080p",
    ):
        self.activity_id = str(activity_id)
        self.scorer_member_id = scorer_member_id
        self.score_home = score_home
        self.score_away = score_away
        self.background_url = background_url
        self.output_resolution = output_resolution
        self._debug_trace: list[str] = []

    def build(self) -> GoalCelebrationData:
        """Gather all required data and return GoalCelebrationData."""
        return self._gather_data()

    def _gather_data(self) -> GoalCelebrationData:
        """Gather all required data from database."""
        from django.apps import apps

        from src.video.services.brand_resolver import resolve_match_brand_assets

        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        # ── Brand + match context (shared resolution) ──
        brand = resolve_match_brand_assets(self.activity_id)

        field_background_url = self.background_url or brand.field_background_url

        # ── Goal scorer assets ──
        membership = ProjectMembership.objects.filter(id=self.scorer_member_id).select_related("user").first()
        if not membership:
            raise ValueError(f"Scorer membership {self.scorer_member_id} not found")

        scorer_name = ""
        if membership.user:
            user = membership.user
            scorer_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
            if not scorer_name:
                scorer_name = (
                    getattr(user, "name", "") or getattr(user, "user_name", "") or "Unknown"
                )

        tr_assets = (membership.metadata or {}).get("teamreel_assets", {})
        videos = tr_assets.get("videos", {})
        images = tr_assets.get("images", {})

        # Determine kit type based on membership role
        role = (membership.metadata or {}).get("functional_role", "player")
        kit_type = "goalkeeper" if role == "goalkeeper" else "home"

        jersey_number = (membership.metadata or {}).get("jersey_number")

        # Use get_ffmpeg_best_url for videos (prefers processed_source .mov with alpha)
        # and get_best_url for images (prefers processed browser-playable)
        from src.video.services.asset_processing_specs import (
            get_best_url,
            get_ffmpeg_best_url,
        )

        # Find celebration video
        celebration_variants = videos.get("celebration", {}) or {}
        celebration_url = _find_best_celebration_url(
            celebration_variants, kit_type, get_ffmpeg_best_url
        )

        # Find intro video as fallback for celebration
        if not celebration_url:
            intro_variants = videos.get("intro", {}) or {}
            from src.video.services.lineup_builder import _find_best_intro_url

            celebration_url = _find_best_intro_url(intro_variants, kit_type, get_ffmpeg_best_url)

        # Fullbody image
        kit_url = None
        fullbody_data = images.get("fullbody", {}) or {}
        kit_val = fullbody_data.get(kit_type)
        if not kit_val:
            kit_val = fullbody_data.get("home")
        kit_url = get_best_url(kit_val) if kit_val else None
        if not kit_url:
            media = tr_assets.get("media", {})
            kit_media = media.get("kit", {})
            kit_url = kit_media.get("url") if isinstance(kit_media, dict) else None

        # Closeup image
        closeup_url = None
        closeup_data = images.get("closeup", {}) or {}
        closeup_val = closeup_data.get(kit_type)
        if not closeup_val:
            closeup_val = closeup_data.get("home")
        closeup_url = get_best_url(closeup_val) if closeup_val else None

        # Convert relative paths to presigned URLs if needed
        if celebration_url and not celebration_url.startswith("http"):
            celebration_url = get_presigned_url(celebration_url)
        if kit_url and not kit_url.startswith("http"):
            kit_url = get_presigned_url(kit_url)
        if closeup_url and not closeup_url.startswith("http"):
            closeup_url = get_presigned_url(closeup_url)

        # Output dimensions
        res_presets = {
            "vertical_1080p": (1080, 1920, 30),
            "vertical_720p": (720, 1280, 30),
            "1080p": (1920, 1080, 30),
        }
        w, h, fps = res_presets.get(self.output_resolution, (1080, 1920, 30))

        return GoalCelebrationData(
            activity_id=self.activity_id,
            match_date=brand.match_date,
            kickoff_time=brand.kickoff_time,
            own_team_name=brand.own_team_name,
            opponent_name=brand.opponent_name,
            is_home=brand.is_home,
            venue=brand.venue,
            season_name=brand.season_name,
            competition_name=brand.competition_name,
            score_home=self.score_home,
            score_away=self.score_away,
            logo_url=brand.logo_url,
            opponent_logo_url=brand.opponent_logo_url,
            sponsor_url=brand.sponsor_url,
            field_background_url=field_background_url,
            brand_primary=brand.brand_primary,
            brand_secondary=brand.brand_secondary,
            scorer_name=scorer_name,
            scorer_member_id=self.scorer_member_id,
            scorer_jersey_number=jersey_number,
            scorer_celebration_url=celebration_url,
            scorer_kit_url=kit_url,
            scorer_closeup_url=closeup_url,
            output_width=w,
            output_height=h,
            output_fps=fps,
        )
