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

logger = logging.getLogger(__name__)

# Style priority for celebration variants (most common poses first)
_CELEBRATION_STYLE_PRIORITY = ["fist_pump", "arms_wide", "point_to_sky", "slide"]


def _find_best_celebration_url(
    celebration_variants: dict,
    kit_type: str,
    get_best_url_fn: callable,
) -> str | None:
    """Find the best celebration URL from variants dict.

    Same logic as _find_best_intro_url from lineup_builder.py.
    """

    def find_with_prefix(prefix: str) -> str | None:
        for style in _CELEBRATION_STYLE_PRIORITY:
            key = f"{prefix}_{style}"
            val = celebration_variants.get(key)
            if val:
                url = get_best_url_fn(val)
                if url:
                    return url
        for key, val in celebration_variants.items():
            if key.startswith(prefix) and val:
                url = get_best_url_fn(val)
                if url:
                    return url
        return None

    # Pass 1: kit_type variants
    url = find_with_prefix(kit_type)
    if url:
        return url

    # Pass 2: fallback to home
    if kit_type != "home":
        url = find_with_prefix("home")
        if url:
            return url

    # Pass 3: bare style keys
    for style in _CELEBRATION_STYLE_PRIORITY:
        val = celebration_variants.get(style)
        if val:
            url = get_best_url_fn(val)
            if url:
                return url

    # Pass 4: any remaining variant
    for val in celebration_variants.values():
        if val:
            url = get_best_url_fn(val)
            if url:
                return url

    return None


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

    def _get_presigned_url(self, storage_path: str) -> str | None:
        """Generate a presigned URL for a storage path."""
        try:
            from files.utils import get_storage_backend

            backend = get_storage_backend()
            return backend.get_url(storage_path, signed=True, expiry_seconds=3600)
        except Exception:  # noqa: BLE001
            logger.warning("Failed to generate presigned URL for %s", storage_path)
            return None

    def _gather_data(self) -> GoalCelebrationData:
        """Gather all required data from database."""
        from django.apps import apps

        Activity = apps.get_model("activities", "Activity")
        BrandProfile = apps.get_model("branding", "BrandProfile")
        BrandAsset = apps.get_model("branding", "BrandAsset")
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        # Get activity (match)
        activity = Activity.objects.select_related(
            "project__organisation",
            "project__parent_project",
            "period",
            "opponent_project__parent_project",
        ).get(id=self.activity_id)

        project = activity.project
        organisation = project.organisation

        # ── Brand resolution (same pattern as lineup_builder) ──
        brand_profiles: list = []

        team_brand = BrandProfile.objects.filter(project=project, is_active=True).first()
        if team_brand:
            brand_profiles.append(team_brand)

        club_project = project.parent_project or None
        if club_project:
            club_brand = BrandProfile.objects.filter(project=club_project, is_active=True).first()
            if club_brand and club_brand not in brand_profiles:
                brand_profiles.append(club_brand)

        org_brand = BrandProfile.objects.filter(organisation=organisation, is_active=True).first()
        if org_brand and org_brand not in brand_profiles:
            brand_profiles.append(org_brand)

        club_org_profiles = [p for p in brand_profiles if p != team_brand]

        def _resolve_asset_url(
            asset_types: list[str],
            *,
            skip_team: bool = False,
        ) -> str | None:
            profiles = club_org_profiles if skip_team else brand_profiles
            for profile in profiles:
                asset = None
                for at in asset_types:
                    asset = (
                        BrandAsset.objects.filter(
                            profile=profile,
                            asset_type=at,
                            is_active=True,
                        )
                        .select_related("file")
                        .first()
                    )
                    if asset:
                        if asset.file and getattr(asset.file, "file_size", 0) in (None, 0):
                            asset = None
                            continue
                        break
                if not asset:
                    continue

                asset_url = getattr(asset, "url", None)
                if asset_url:
                    return asset_url
                if asset.file:
                    presigned = self._get_presigned_url(asset.file.storage_path)
                    if presigned:
                        return presigned
            return None

        logo_url = _resolve_asset_url(["logo"], skip_team=True)
        sponsor_url = _resolve_asset_url(["sponsor_logo"])
        field_background_url = self.background_url or _resolve_asset_url(["stadium_background"])

        # Opponent logo
        opponent_logo_url: str | None = None
        if activity.opponent_project:
            opp_club = activity.opponent_project.parent_project
            if opp_club:
                opp_brand = BrandProfile.objects.filter(project=opp_club, is_active=True).first()
                if opp_brand:
                    asset = (
                        BrandAsset.objects.filter(
                            profile=opp_brand,
                            asset_type="logo",
                            is_active=True,
                        )
                        .select_related("file")
                        .first()
                    )
                    if asset:
                        opponent_logo_url = getattr(asset, "url", None)
                        if not opponent_logo_url and asset.file:
                            opponent_logo_url = self._get_presigned_url(asset.file.storage_path)

        # ── Match info ──
        match_date = ""
        kickoff_time = None
        if activity.start_time:
            match_date = activity.start_time.strftime("%d-%m-%Y")
            kickoff_time = activity.start_time.strftime("%H:%M")

        own_team_name = project.name or ""
        opponent_name = activity.opponent_project.name if activity.opponent_project else ""
        meta = activity.metadata or {}
        is_home = meta.get("is_home", meta.get("venue", "Home") == "Home")

        # Venue: prefer the actual location field or teamreel match_location
        # over metadata.venue which is just a generic "Home"/"Away" label.
        raw_venue = (
            getattr(activity, "location", None)
            or meta.get("teamreel", {}).get("vars", {}).get("match_location")
            or meta.get("teamreel", {}).get("match_context", {}).get("location")
            or meta.get("teamreel", {}).get("match_context", {}).get("home_club_default_location")
            or meta.get("venue")
        )
        venue = (
            None
            if raw_venue and raw_venue.strip().lower() in ("home", "away", "thuis", "uit", "")
            else raw_venue
        )

        # Season / competition
        season_name = activity.period.name if activity.period else None
        competition_name = meta.get("teamreel", {}).get("vars", {}).get("competition_name")
        if not competition_name:
            competition_name = meta.get("competition_name")
        if not competition_name and activity.period:
            competition_name = activity.period.name

        # ── Goal scorer assets ──
        membership = ProjectMembership.objects.filter(id=self.scorer_member_id).first()
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
            celebration_url = self._get_presigned_url(celebration_url)
        if kit_url and not kit_url.startswith("http"):
            kit_url = self._get_presigned_url(kit_url)
        if closeup_url and not closeup_url.startswith("http"):
            closeup_url = self._get_presigned_url(closeup_url)

        # Output dimensions
        res_presets = {
            "vertical_1080p": (1080, 1920, 30),
            "vertical_720p": (720, 1280, 30),
            "1080p": (1920, 1080, 30),
        }
        w, h, fps = res_presets.get(self.output_resolution, (1080, 1920, 30))

        return GoalCelebrationData(
            activity_id=self.activity_id,
            match_date=match_date,
            kickoff_time=kickoff_time,
            own_team_name=own_team_name,
            opponent_name=opponent_name,
            is_home=is_home,
            venue=venue,
            season_name=season_name,
            competition_name=competition_name,
            score_home=self.score_home,
            score_away=self.score_away,
            logo_url=logo_url,
            opponent_logo_url=opponent_logo_url,
            sponsor_url=sponsor_url,
            field_background_url=field_background_url,
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
