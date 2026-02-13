"""Lineup Segment Builder Service.

Builds segments config for LineupProcessor from ContentTemplate + Match data.

This service bridges:
- ContentTemplate.input_requirements (defines what assets are needed)
- Activity.participations (the actual lineup with players + positions)
- ProjectMembership.metadata.teamreel_assets (player images/videos)
- BrandAsset (logos, sponsors)

Output: segments[] array ready for LineupProcessor (FFmpeg concatenation)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

logger = logging.getLogger(__name__)


@dataclass
class PlayerSegment:
    """A single player's segment data for the lineup video."""

    slot: int
    position: str
    functional_role: str
    member_id: str
    member_name: str
    jersey_number: str | None
    kit_url: str | None  # fullbody in tenue (image)
    intro_url: str | None  # short intro video
    closeup_url: str | None  # closeup image
    x: int  # position on field (percentage)
    y: int  # position on field (percentage)


@dataclass
class LineupData:
    """All data needed to build lineup video segments."""

    # Match info
    activity_id: str
    match_date: str
    kickoff_time: str | None
    own_team_name: str
    opponent_name: str
    score_home: int | None
    score_away: int | None
    is_home: bool
    venue: str | None
    season_name: str | None
    competition_name: str | None

    # Brand assets
    logo_url: str | None
    sponsor_url: str | None
    field_background_url: str | None

    # Players by line (grouped for animation)
    keepers: list[PlayerSegment]
    defenders: list[PlayerSegment]
    midfielders: list[PlayerSegment]
    attackers: list[PlayerSegment]

    # Staff
    coach_name: str | None
    coach_kit_url: str | None
    assistant_name: str | None
    assistant_kit_url: str | None

    # Output settings
    output_width: int
    output_height: int
    output_fps: int


class LineupSegmentBuilder:
    """Builds video segments from ContentTemplate + Activity data."""

    # Default durations (seconds)
    HEADER_DURATION = 3.0
    FULLBODY_DURATION = 2.0
    INTRO_VIDEO_DURATION = None  # Use video's natural duration
    CLOSEUP_DURATION = 2.5
    LINE_TRANSITION_DURATION = 1.0

    def __init__(
        self,
        activity_id: str | UUID,
        template_id: str | UUID | None = None,
        output_resolution: str = "vertical_1080p",
    ):
        """Initialize builder with activity and optional template.

        Args:
            activity_id: The match/activity ID
            template_id: Optional ContentTemplate ID (uses default 4-3-3 if None)
            output_resolution: Resolution preset (vertical_1080p, 1080p, 720p)
        """
        self.activity_id = str(activity_id)
        self.template_id = str(template_id) if template_id else None
        self.output_resolution = output_resolution

    def build(self) -> dict:
        """Build the complete segments config for LineupProcessor.

        Returns:
            dict with segments[] and other config for LineupProcessor
        """
        lineup_data = self._gather_lineup_data()
        segments = self._build_segments(lineup_data)

        return {
            "segments": segments,
            "output_resolution": self.output_resolution,
            "output_fps": lineup_data.output_fps,
            "background_color": "#1a472a",  # Dark green (field)
            "fade_duration": 0.3,
            "match_id": self.activity_id,
            "activity_id": self.activity_id,
        }

    def _gather_lineup_data(self) -> LineupData:
        """Gather all required data from database."""
        from django.apps import apps

        # Use apps.get_model to avoid app_label issues
        Activity = apps.get_model("activities", "Activity")
        Participation = apps.get_model("activities", "Participation")
        BrandProfile = apps.get_model("branding", "BrandProfile")
        BrandAsset = apps.get_model("branding", "BrandAsset")

        # Get activity (match)
        activity = Activity.objects.select_related(
            "period__project__organisation",
            "period__project__parent_project",
        ).get(id=self.activity_id)

        project = activity.period.project
        organisation = project.organisation

        # Get brand profile and assets
        brand_profile = BrandProfile.objects.filter(
            organisation=organisation,
            is_active=True,
        ).first()

        logo_url = None
        sponsor_url = None
        field_background_url = None

        if brand_profile:
            # Get logo
            # Ensure we select_related('file') to access storage_path
            logo_asset = (
                BrandAsset.objects.filter(
                    profile=brand_profile,
                    asset_type__in=["logo_light", "logo_dark", "logo_upload"],
                    is_active=True,
                )
                .select_related("file")
                .first()
            )
            if logo_asset and logo_asset.file:
                logo_url = self._get_presigned_url(logo_asset.file.storage_path)

            # Get sponsor
            # Ensure we select_related('file') to access storage_path
            sponsor_asset = (
                BrandAsset.objects.filter(
                    profile=brand_profile,
                    asset_type__in=["sponsor_logo", "sponsor_logo_upload"],
                    is_active=True,
                )
                .select_related("file")
                .first()
            )
            if sponsor_asset and sponsor_asset.file:
                sponsor_url = self._get_presigned_url(sponsor_asset.file.storage_path)

        # Get team/club names
        if project.parent_project:
            # Team under club
            own_team_name = f"{project.parent_project.name} {project.name}"
        else:
            own_team_name = project.name

        # Get match data
        opponent_name = getattr(activity, "opponent", None) or "Opponent"
        match_date = activity.start_time.strftime("%d-%m-%Y") if activity.start_time else ""
        kickoff_time = activity.start_time.strftime("%H:%M") if activity.start_time else None
        is_home = getattr(activity, "home_away", "home") == "home"
        score_home = getattr(activity, "score_home", None)
        score_away = getattr(activity, "score_away", None)
        venue = getattr(activity, "venue", None)

        # Get season/competition names
        season_name = activity.period.name if activity.period else None
        competition_name = None
        if hasattr(activity, "competition") and activity.competition:
            competition_name = activity.competition.name

        # Get lineup (participations)
        participations = Participation.objects.filter(
            activity=activity,
            role__in=["starter", "starting"],
            status="confirmed",
        ).select_related("member__user", "member__organisation")

        # Get ProjectMembership model
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        # Build a cache of ProjectMemberships for quick lookup
        user_ids = [p.member.user_id for p in participations if p.member.user_id]
        if not user_ids:
            # No users to fetch memberships for
            membership_by_user = {}
        else:
            membership_by_user = {}

            # First, try to get period-specific memberships
            if activity.period:
                period_memberships = ProjectMembership.objects.filter(
                    project=project,
                    period=activity.period,
                    user_id__in=user_ids,
                    deleted_at__isnull=True,
                ).select_related("user")
                membership_by_user.update({pm.user_id: pm for pm in period_memberships})

            # Then, for any missing users, get non-period memberships
            remaining_user_ids = [uid for uid in user_ids if uid not in membership_by_user]
            if remaining_user_ids:
                general_memberships = ProjectMembership.objects.filter(
                    project=project,
                    period__isnull=True,
                    user_id__in=remaining_user_ids,
                    deleted_at__isnull=True,
                ).select_related("user")
                membership_by_user.update({pm.user_id: pm for pm in general_memberships})

        # Group players by functional role
        keepers: list[PlayerSegment] = []
        defenders: list[PlayerSegment] = []
        midfielders: list[PlayerSegment] = []
        attackers: list[PlayerSegment] = []

        for p in participations:
            data = p.data or {}
            position = data.get("position", "")
            functional_role = data.get("functional_role", "")
            jersey_number = data.get("jersey_number") or data.get("shirt_number")
            slot = data.get("slot", 0)
            x = data.get("x", 50)
            y = data.get("y", 50)

            # Get member asset URLs from ProjectMembership.metadata
            member = p.member
            project_membership = membership_by_user.get(member.user_id) if member.user_id else None
            teamreel_assets = (
                (project_membership.metadata or {}).get("teamreel_assets", {})
                if project_membership
                else {}
            )
            media = teamreel_assets.get("media", {})

            kit_url = media.get("kit", {}).get("url")
            intro_url = media.get("intro", {}).get("url")
            closeup_url = media.get("closeup", {}).get("url")

            # Convert relative paths to presigned URLs if needed
            if kit_url and not kit_url.startswith("http"):
                kit_url = self._get_presigned_url(kit_url)
            if intro_url and not intro_url.startswith("http"):
                intro_url = self._get_presigned_url(intro_url)
            if closeup_url and not closeup_url.startswith("http"):
                closeup_url = self._get_presigned_url(closeup_url)

            player = PlayerSegment(
                slot=slot,
                position=position,
                functional_role=functional_role,
                member_id=str(member.id),
                member_name=member.user.get_full_name() if member.user else "",
                jersey_number=str(jersey_number) if jersey_number else None,
                kit_url=kit_url,
                intro_url=intro_url,
                closeup_url=closeup_url,
                x=x,
                y=y,
            )

            # Group by functional role
            if functional_role == "keeper" or position in ["GK"]:
                keepers.append(player)
            elif functional_role == "verdediger" or position in ["LB", "CB", "RB", "LWB", "RWB"]:
                defenders.append(player)
            elif functional_role == "middenvelder" or position in ["CDM", "CM", "CAM", "LM", "RM"]:
                midfielders.append(player)
            elif functional_role == "aanvaller" or position in ["LW", "RW", "ST", "CF"]:
                attackers.append(player)
            else:
                # Default to midfield if unknown
                midfielders.append(player)

        # Sort each line by x position (left to right)
        defenders.sort(key=lambda p: p.x)
        midfielders.sort(key=lambda p: p.x)
        attackers.sort(key=lambda p: p.x)

        # Get coach info
        coach_participation = (
            Participation.objects.filter(
                activity=activity,
                role__in=["coach", "trainer", "head_coach"],
            )
            .select_related("member__user")
            .first()
        )

        coach_name = None
        coach_kit_url = None
        if coach_participation:
            coach_name = (
                coach_participation.member.user.get_full_name()
                if coach_participation.member.user
                else None
            )
            # Get coach assets from ProjectMembership.metadata
            coach_member = coach_participation.member
            coach_project_membership = (
                membership_by_user.get(coach_member.user_id) if coach_member.user_id else None
            )
            coach_teamreel_assets = (
                (coach_project_membership.metadata or {}).get("teamreel_assets", {})
                if coach_project_membership
                else {}
            )
            coach_assets = coach_teamreel_assets.get("media", {})
            coach_kit_url = coach_assets.get("kit", {}).get("url")
            if coach_kit_url and not coach_kit_url.startswith("http"):
                coach_kit_url = self._get_presigned_url(coach_kit_url)

        # Get resolution settings
        width, height, fps = self._get_resolution_settings()

        return LineupData(
            activity_id=self.activity_id,
            match_date=match_date,
            kickoff_time=kickoff_time,
            own_team_name=own_team_name,
            opponent_name=opponent_name,
            score_home=score_home,
            score_away=score_away,
            is_home=is_home,
            venue=venue,
            season_name=season_name,
            competition_name=competition_name,
            logo_url=logo_url,
            sponsor_url=sponsor_url,
            field_background_url=field_background_url,
            keepers=keepers,
            defenders=defenders,
            midfielders=midfielders,
            attackers=attackers,
            coach_name=coach_name,
            coach_kit_url=coach_kit_url,
            assistant_name=None,
            assistant_kit_url=None,
            output_width=width,
            output_height=height,
            output_fps=fps,
        )

    # Default duration for field background
    FIELD_DURATION = 2.5

    def _build_segments(self, data: LineupData) -> list[dict]:
        """Build the segments array for LineupProcessor.

        Video structure:
        1. Header (logo, sponsor, match info) - 3s
        2. Field background fade-in - 2.5s
        3. Keeper line (1 player)
        4. Defender line (4 players side by side)
        5. Midfield line (3 players)
        6. Attacker line (3 players)
        7. Coach info (optional)
        8. End card with final lineup
        """
        from src.video.services.header_generator import (
            generate_field_background,
            generate_header_image,
        )

        segments: list[dict] = []

        # 1. Generate and add header image
        try:
            header_path = generate_header_image(
                width=data.output_width,
                height=int(data.output_height * 0.15),  # 15% of video height
                logo_url=data.logo_url,
                sponsor_url=data.sponsor_url,
                match_date=f"Za {data.match_date}",
                own_team_name=data.own_team_name,
                opponent_name=data.opponent_name,
                is_home=data.is_home,
                score_home=data.score_home,
                score_away=data.score_away,
                kickoff_time=data.kickoff_time,
                coach_name=data.coach_name,
            )
            segments.append(
                {
                    "type": "image",
                    "url": f"file://{header_path}",
                    "duration": self.HEADER_DURATION,
                    "transition": "fade",
                }
            )
        except Exception:  # noqa: BLE001
            logger.warning("Failed to generate header image, skipping header segment")

        # 2. Generate and add field background
        try:
            field_path = generate_field_background(
                width=data.output_width,
                height=data.output_height,
                field_color="#228B22",  # Forest green
                line_color="#ffffff",
            )
            segments.append(
                {
                    "type": "image",
                    "url": f"file://{field_path}",
                    "duration": self.FIELD_DURATION,
                    "label": "OPSTELLING",
                    "transition": "fade",
                }
            )
        except Exception:  # noqa: BLE001
            logger.warning("Failed to generate field background, skipping field segment")

        # Process each line
        all_lines = [
            ("Keeper", data.keepers),
            ("Verdediging", data.defenders),
            ("Middenveld", data.midfielders),
            ("Aanval", data.attackers),
        ]

        for _line_name, players in all_lines:
            if not players:
                continue

            for player in players:
                # Add player segments in sequence: fullbody → intro → closeup
                # Each with name label

                # 1. Fullbody image
                if player.kit_url:
                    segments.append(
                        {
                            "type": "image",
                            "url": player.kit_url,
                            "duration": self.FULLBODY_DURATION,
                            "label": f"{player.jersey_number or ''} {player.member_name}".strip(),
                            "transition": "fade",
                        }
                    )

                # 2. Intro video
                if player.intro_url:
                    segments.append(
                        {
                            "type": "video",
                            "url": player.intro_url,
                            "label": f"{player.jersey_number or ''} {player.member_name}".strip(),
                            "transition": "cut",
                        }
                    )

                # 3. Closeup as small overlay (PiP effect)
                if player.closeup_url:
                    segments.append(
                        {
                            "type": "image",
                            "url": player.closeup_url,
                            "duration": self.CLOSEUP_DURATION,
                            "label": player.member_name,
                            "scale": 0.4,  # Small PiP in corner
                            "transition": "fade",
                        }
                    )

        # If no segments generated, add placeholder
        if not segments:
            logger.warning(
                "No player assets found for lineup",
                extra={"activity_id": self.activity_id},
            )

        return segments

    def _get_presigned_url(self, storage_path: str) -> str | None:
        """Get presigned URL for a storage path."""
        if not storage_path:
            return None

        try:
            from src.files.utils import get_storage_backend

            backend = get_storage_backend()
            return backend.get_presigned_url(storage_path, expires_in=3600)
        except Exception:  # noqa: BLE001
            logger.warning("Failed to get presigned URL for %s", storage_path)
            return None

    def _get_resolution_settings(self) -> tuple[int, int, int]:
        """Get width, height, fps for output resolution."""
        presets = {
            "720p": (1280, 720, 30),
            "1080p": (1920, 1080, 30),
            "4k": (3840, 2160, 30),
            "vertical_720p": (720, 1280, 30),
            "vertical_1080p": (1080, 1920, 30),
        }
        return presets.get(self.output_resolution, (1080, 1920, 30))


def build_lineup_video_config(
    activity_id: str | UUID,
    template_id: str | UUID | None = None,
    output_resolution: str = "vertical_1080p",
) -> dict:
    """Convenience function to build lineup video config.

    Args:
        activity_id: The match/activity UUID
        template_id: Optional ContentTemplate ID
        output_resolution: Resolution preset

    Returns:
        Config dict ready for LineupProcessor
    """
    builder = LineupSegmentBuilder(
        activity_id=activity_id,
        template_id=template_id,
        output_resolution=output_resolution,
    )
    return builder.build()
