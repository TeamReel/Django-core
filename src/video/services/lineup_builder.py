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
        self._render_mode: str = "classic"
        self._debug_trace: list[str] = []

    def _load_render_mode(self) -> None:
        """Determine how to render lineup based on the selected ContentTemplate.

        - classic: sequential segments (legacy)
        - line_scenes: per-line scenes composited onto a background with header overlay
        """
        if not self.template_id:
            self._render_mode = "classic"
            return

        try:
            from django.apps import apps

            ContentTemplate = apps.get_model("content_generation", "ContentTemplate")
            template = ContentTemplate.objects.filter(id=self.template_id).first()
            if not template:
                self._render_mode = "classic"
                return

            # Default: if a template is explicitly chosen for lineup, use per-line scenes.
            # This matches the desired Instagram-style lineup look.
            self._render_mode = "line_scenes"

            # Allow explicit override via template_settings if present.
            settings = getattr(template, "template_settings", None) or {}
            mode = settings.get("render_mode")
            if mode in {"classic", "line_scenes"}:
                self._render_mode = mode

        except Exception:  # noqa: BLE001
            self._render_mode = "classic"

    def build(self) -> dict:
        """Build the complete segments config for LineupProcessor.

        Returns:
            dict with segments[] and other config for LineupProcessor
        """
        self._load_render_mode()
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
            "project__organisation",
            "project__parent_project",
            "period",
        ).get(id=self.activity_id)

        project = activity.project
        organisation = project.organisation

        # Resolve brand profiles (most specific first)
        # - team brand (project)
        # - club brand (parent_project)
        # - organisation brand
        brand_profiles: list = []

        self._debug_trace.append(f"Activity: {self.activity_id}")
        self._debug_trace.append(f"Project: {project.id} ({project.name})")
        self._debug_trace.append(f"Parent: {project.parent_project_id}")

        logger.info(
            "DEBUG: Resolving brand profiles for Activity %s (Project: %s, Parent: %s, Org: %s)",
            self.activity_id,
            project.id,
            project.parent_project_id if project.parent_project else "None",
            organisation.name if organisation else "None",
        )

        team_brand = BrandProfile.objects.filter(project=project, is_active=True).first()
        if team_brand:
            brand_profiles.append(team_brand)
            msg = f"Found Team BrandProfile: {team_brand.id} (Project {project.id})"
            self._debug_trace.append(msg)
            logger.info("DEBUG: %s", msg)

        club_project = project.parent_project or None
        if club_project:
            club_brand = BrandProfile.objects.filter(project=club_project, is_active=True).first()
            if club_brand and club_brand not in brand_profiles:
                brand_profiles.append(club_brand)
                msg = f"Found Club BrandProfile: {club_brand.id} (Project {club_project.id})"
                self._debug_trace.append(msg)
                logger.info("DEBUG: %s", msg)

        org_brand = BrandProfile.objects.filter(organisation=organisation, is_active=True).first()
        if org_brand and org_brand not in brand_profiles:
            brand_profiles.append(org_brand)
            msg = f"Found Org BrandProfile: {org_brand.id} (Org {organisation.name})"
            self._debug_trace.append(msg)
            logger.info("DEBUG: %s", msg)

        def _resolve_asset_url(asset_types: list[str]) -> str | None:
            self._debug_trace.append(f"Resolving {asset_types}...")
            for profile in brand_profiles:
                asset = (
                    BrandAsset.objects.filter(
                        profile=profile,
                        asset_type__in=asset_types,
                        is_active=True,
                    )
                    .select_related("file")
                    .order_by("-updated_at")
                    .first()
                )
                if not asset:
                    self._debug_trace.append(f"  Profile {profile.id}: No asset")
                    logger.info("DEBUG: No asset %s found in profile %s", asset_types, profile.id)
                    continue

                logger.info(
                    "DEBUG: Found asset %s in profile %s (ID: %s)",
                    asset_types,
                    profile.id,
                    asset.id,
                )
                self._debug_trace.append(f"  Profile {profile.id}: Found asset {asset.id}")

                # Prefer the API-facing URL if it is persisted (often already presigned).
                asset_url = getattr(asset, "url", None)
                if asset_url:
                    self._debug_trace.append("  Using asset.url")
                    return asset_url

                if asset.file:
                    presigned = self._get_presigned_url(asset.file.storage_path)
                    if presigned:
                        self._debug_trace.append("  Generated presigned URL")
                        return presigned
                    self._debug_trace.append(f"  Presign failed for {asset.file.storage_path}")

            logger.warning(
                "DEBUG: Could not resolve asset %s in any of %d profiles",
                asset_types,
                len(brand_profiles),
            )
            self._debug_trace.append("Resolution failed")
            return None

        logo_url = _resolve_asset_url(["logo_light", "logo_dark", "logo_upload"])
        sponsor_url = _resolve_asset_url(["sponsor_logo", "sponsor_logo_upload"])
        field_background_url = _resolve_asset_url(["stadium_background"])

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

        # DEBUG: Log all participations for this activity
        all_participations = Participation.objects.filter(activity=activity).select_related(
            "member__user"
        )
        logger.info(
            "DEBUG: All participations for activity %s: count=%d, roles=%s",
            self.activity_id,
            all_participations.count(),
            list(all_participations.values_list("role", "status")),
        )

        # Get lineup (participations) - expanded role matching
        participations = Participation.objects.filter(
            activity=activity,
            role__in=["starter", "starting", "player", "speler", "lineup"],
            status__in=["confirmed", "active", "accepted"],
        ).select_related("member__user", "member__organisation")

        logger.info(
            "DEBUG: Filtered participations: count=%d",
            participations.count(),
        )

        # Fail fast if there is no lineup data. We intentionally do NOT fall back to frontend segments.
        if participations.count() == 0:
            raise ValueError(
                "No participations found for this activity to build a lineup. "
                "Fill the match lineup (Participation records) first."
            )

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

        logger.info(
            "DEBUG: Processing %d participations, membership_by_user has %d entries",
            len(list(participations)),
            len(membership_by_user),
        )

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

            logger.info(
                "DEBUG: Player %s (user_id=%s) - project_membership=%s",
                member,
                member.user_id,
                project_membership.id if project_membership else None,
            )

            teamreel_assets = (
                (project_membership.metadata or {}).get("teamreel_assets", {})
                if project_membership
                else {}
            )
            media = teamreel_assets.get("media", {})

            logger.info(
                "DEBUG: Player %s - teamreel_assets.media=%s",
                member,
                list(media.keys()) if media else None,
            )

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
            generate_header_image,
        )

        segments: list[dict] = []

        # 1. Generate header overlay (used in both classic and scene modes)
        try:
            header_url = generate_header_image(
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
        except Exception:  # noqa: BLE001
            header_url = None
            logger.warning("Failed to generate header image")

        # Resolve background (prefer brand stadium_background)
        background_url = data.field_background_url

        # Scene mode: render per-line composited frames
        if self._render_mode == "line_scenes":
            from src.video.services.lineup_scene_generator import (
                ScenePlayer,
                generate_line_scene_image,
            )

            if not background_url:
                trace_str = " | ".join(self._debug_trace)
                raise ValueError(
                    "No stadium_background BrandAsset found for this club/team/organisation brand profile. "
                    "Upload asc/background.png as BrandAsset asset_type=stadium_background (e.g. Club → Assets tab). "
                    f"Debug Trace: {trace_str}"
                )

            line_defs = [
                ("KEEPER", data.keepers),
                ("VERDEDIGING", data.defenders),
                ("MIDDENVELD", data.midfielders),
                ("AANVAL", data.attackers),
            ]

            for title, players in line_defs:
                if not players:
                    continue

                scene_players: list[ScenePlayer] = []
                for p in players:
                    if not p.kit_url:
                        raise ValueError(
                            f"Missing kit asset for player '{p.member_name}' in {title}. "
                            "(teamreel_assets.media.kit.url)"
                        )
                    scene_players.append(
                        ScenePlayer(
                            name=f"{p.jersey_number or ''} {p.member_name}".strip(),
                            kit_url=p.kit_url,
                            x_pct=int(p.x),
                            y_pct=int(p.y),
                        )
                    )

                scene_url = generate_line_scene_image(
                    width=data.output_width,
                    height=data.output_height,
                    background_url=background_url,
                    header_url=header_url,
                    title=title,
                    players=scene_players,
                )

                segments.append(
                    {
                        "type": "image",
                        "url": scene_url,
                        "duration": 3.5,
                        "transition": "fade",
                    }
                )

            if not segments:
                raise ValueError("No lineup scenes were generated")

            return segments

        # Classic mode (legacy): keep old behavior (header + field + per-player assets)
        if header_url:
            segments.append(
                {
                    "type": "image",
                    "url": header_url,
                    "duration": self.HEADER_DURATION,
                    "transition": "fade",
                }
            )

        if background_url:
            segments.append(
                {
                    "type": "image",
                    "url": background_url,
                    "duration": self.FIELD_DURATION,
                    "label": "OPSTELLING",
                    "transition": "fade",
                }
            )

        # Process each line
        all_lines = [
            ("Keeper", data.keepers),
            ("Verdediging", data.defenders),
            ("Middenveld", data.midfielders),
            ("Aanval", data.attackers),
        ]

        logger.info(
            "DEBUG _build_segments: keepers=%d, defenders=%d, midfielders=%d, attackers=%d",
            len(data.keepers),
            len(data.defenders),
            len(data.midfielders),
            len(data.attackers),
        )

        for _line_name, players in all_lines:
            if not players:
                continue

            for player in players:
                # Add player segments in sequence: fullbody → intro → closeup
                # Each with name label
                logger.info(
                    "DEBUG: Adding segments for player %s: kit=%s, intro=%s, closeup=%s",
                    player.member_name,
                    bool(player.kit_url),
                    bool(player.intro_url),
                    bool(player.closeup_url),
                )

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

        # If it's already a full URL (startwith http), return as is.
        if storage_path.startswith("http://") or storage_path.startswith("https://"):
            return storage_path

        try:
            from src.files.utils import get_storage_backend

            backend = get_storage_backend()
            url = backend.get_presigned_url(storage_path, expires_in=3600)
            if not url:
                self._debug_trace.append(
                    f"Backend {type(backend).__name__} returned None for {storage_path}"
                )
            return url
        except Exception as e:  # noqa: BLE001
            import traceback

            msg = f"Presign Error ({type(e).__name__}): {e}"
            self._debug_trace.append(msg)
            logger.warning(
                "Failed to get presigned URL for %s: %s\n%s",
                storage_path,
                e,
                traceback.format_exc(),
            )
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
