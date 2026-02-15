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

# Style priority for intro variants (most common poses first)
_INTRO_STYLE_PRIORITY = ["arms_crossed", "thumbs_up", "hand_up"]


def _find_best_intro_url(
    intro_variants: dict,
    kit_type: str,
    get_best_url_fn: callable,
) -> str | None:
    """Find the best intro URL from variants dict.

    Priority order:
    1. kit_type variants in style priority order (e.g. goalkeeper_arms_crossed)
    2. home variants in style priority order (fallback)
    3. Bare style keys (old format without kit prefix)
    4. Any remaining variant that has content

    Args:
        intro_variants: Dict of intro variants {key: value}
        kit_type: Kit type to prefer (home, goalkeeper, etc.)
        get_best_url_fn: Function to extract URL from variant value

    Returns:
        Best intro URL or None if none found
    """

    def find_with_prefix(prefix: str) -> str | None:
        # Try styled variants in priority order
        for style in _INTRO_STYLE_PRIORITY:
            key = f"{prefix}_{style}"
            val = intro_variants.get(key)
            if val:
                url = get_best_url_fn(val)
                if url:
                    return url
        # Fallback: any key starting with prefix
        for key, val in intro_variants.items():
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
    for style in _INTRO_STYLE_PRIORITY:
        val = intro_variants.get(style)
        if val:
            url = get_best_url_fn(val)
            if url:
                return url

    # Pass 4: any remaining variant
    for val in intro_variants.values():
        if val:
            url = get_best_url_fn(val)
            if url:
                return url

    return None


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
    opponent_logo_url: str | None
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
        selected_member_ids: list[str] | None = None,
    ):
        """Initialize builder with activity and optional template.

        Args:
            activity_id: The match/activity ID
            template_id: Optional ContentTemplate ID (uses default 4-3-3 if None)
            output_resolution: Resolution preset (vertical_1080p, 1080p, 720p)
            selected_member_ids: Optional list of member IDs (from frontend selection)
        """
        self.activity_id = str(activity_id)
        self.template_id = str(template_id) if template_id else None
        self.output_resolution = output_resolution
        self._render_mode: str = "classic"
        self._debug_trace: list[str] = []

        # Normalise selected_member_ids into role-keyed dict.
        # Accept either:
        #   dict  {"goalkeeper": [...], "player": [...]}   (new format)
        #   list  ["id1", "id2", ...]                     (legacy flat format)
        if isinstance(selected_member_ids, dict):
            self.selected_member_ids_by_role: dict[str, list[str]] = selected_member_ids
            all_ids = []
            for v in selected_member_ids.values():
                all_ids.extend(v if isinstance(v, list) else [v])
            self.selected_member_ids: list[str] | None = all_ids or None
            self._debug_trace.append(
                f"Role-keyed: GK={len(selected_member_ids.get('goalkeeper', []))} "
                f"P={len(selected_member_ids.get('player', []))} "
                f"C={len(selected_member_ids.get('coach', []))} "
                f"A={len(selected_member_ids.get('assistant', []))}"
            )
        elif isinstance(selected_member_ids, list) and selected_member_ids:
            self.selected_member_ids = selected_member_ids
            self.selected_member_ids_by_role = {}  # unknown roles
            self._debug_trace.append(f"Flat list: {len(selected_member_ids)} members")
        else:
            self.selected_member_ids = None
            self.selected_member_ids_by_role = {}

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
        from src.video.services.lineup_scene_generator import reset_image_cache

        reset_image_cache()  # Fresh cache for this job
        try:
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
        finally:
            reset_image_cache()  # Free memory

    def gather_lineup_data(self) -> LineupData:
        """Gather all required data from database.

        Public entry point used by lineup_composer for formation-based
        video compositing without building segments.
        """
        self._load_render_mode()
        return self._gather_lineup_data()

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
            "opponent_project__parent_project",
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

        # Resolve opponent logo from opponent_project's brand profile
        opponent_logo_url: str | None = None
        if activity.opponent_project:
            opp_project = activity.opponent_project
            opp_club = opp_project.parent_project
            opp_brand_profiles = []
            opp_team_brand = BrandProfile.objects.filter(
                project=opp_project, is_active=True
            ).first()
            if opp_team_brand:
                opp_brand_profiles.append(opp_team_brand)
            if opp_club:
                opp_club_brand = BrandProfile.objects.filter(
                    project=opp_club, is_active=True
                ).first()
                if opp_club_brand and opp_club_brand not in opp_brand_profiles:
                    opp_brand_profiles.append(opp_club_brand)
            for opp_profile in opp_brand_profiles:
                asset = (
                    BrandAsset.objects.filter(
                        profile=opp_profile,
                        asset_type__in=["logo_light", "logo_dark", "logo_upload"],
                    )
                    .select_related("file")
                    .first()
                )
                if asset:
                    asset_url = getattr(asset, "url", None)
                    if asset_url:
                        opponent_logo_url = asset_url
                        break
                    if asset.file:
                        presigned = self._get_presigned_url(asset.file.storage_path)
                        if presigned:
                            opponent_logo_url = presigned
                            break
            if opponent_logo_url:
                logger.info("Resolved opponent logo from %s", opp_project.name)
            else:
                logger.info("No logo found for opponent %s", opp_project.name)

        # Get team/club names
        if project.parent_project:
            # Team under club
            own_team_name = f"{project.parent_project.name} {project.name}"
        else:
            own_team_name = project.name

        # Get match data — prefer opponent_project FK, then metadata, then fallback
        meta = activity.metadata or {}
        if activity.opponent_project:
            opponent_name = activity.opponent_project.name
        else:
            opponent_name = (
                meta.get("teamreel", {}).get("vars", {}).get("away_team_name")
                or meta.get("teamreel", {}).get("vars", {}).get("home_team_name")
                or getattr(activity, "opponent", None)
                or "Opponent"
            )
        match_date = activity.start_time.strftime("%d-%m-%Y") if activity.start_time else ""
        kickoff_time = activity.start_time.strftime("%H:%M") if activity.start_time else None
        is_home = meta.get("is_home", meta.get("venue", "Home") == "Home")
        score_meta = meta.get("score", {})
        score_home = score_meta.get("home") if isinstance(score_meta, dict) else None
        score_away = score_meta.get("away") if isinstance(score_meta, dict) else None
        venue = meta.get("venue") or getattr(activity, "location", None)

        # Get season/competition names — period name often IS the competition
        season_name = activity.period.name if activity.period else None
        competition_name = meta.get("teamreel", {}).get("vars", {}).get("competition_name")
        if not competition_name and activity.period:
            # Period name is often the competition (e.g. "Eredivisie")
            competition_name = activity.period.name

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

        # If frontend sent selected_member_ids (ProjectMembership UUIDs),
        # resolve them to user_ids so we can filter Participations to only selected players.
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        selected_user_ids: set[int] | None = None
        if self.selected_member_ids:
            pm_qs = ProjectMembership.objects.filter(
                id__in=self.selected_member_ids,
            ).values_list("user_id", flat=True)
            selected_user_ids = set(pm_qs)
            self._debug_trace.append(
                f"Resolved {len(selected_user_ids)} user_ids from {len(self.selected_member_ids)} PM ids"
            )

        # Get lineup (participations) - expanded role matching
        participations = Participation.objects.filter(
            activity=activity,
            role__in=["starter", "starting", "player", "speler", "lineup"],
            status__in=["confirmed", "active", "accepted"],
        ).select_related("member__user", "member__organisation")

        # If user selected specific members, filter to only those
        if selected_user_ids is not None:
            participations = participations.filter(member__user_id__in=selected_user_ids)
            self._debug_trace.append(
                f"Filtered participations to {participations.count()} (selected members only)"
            )

        logger.info(
            "DEBUG: Filtered participations: count=%d",
            participations.count(),
        )

        # If no participations found but we have selected_member_ids,
        # build lineup directly from ProjectMembership data (no Participation records needed).
        if participations.count() == 0 and selected_user_ids:
            logger.info(
                "DEBUG: No Participation records match, building from ProjectMembership data"
            )
            self._debug_trace.append("No Participations found, using ProjectMembership directly")
            return self._gather_lineup_from_memberships(
                activity=activity,
                project=project,
                organisation=organisation,
                brand_profiles=brand_profiles,
                logo_url=logo_url,
                sponsor_url=sponsor_url,
                field_background_url=field_background_url,
            )

        # Fail fast if there is no lineup data. We intentionally do NOT fall back to frontend segments.
        if participations.count() == 0:
            raise ValueError(
                "No participations found for this activity to build a lineup. "
                "Fill the match lineup (Participation records) first."
            )

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

            # Resolve URLs: prefer per-variant processed → per-variant raw → flat media slot
            from src.video.services.asset_processing_specs import get_best_url

            images = teamreel_assets.get("images", {})
            videos = teamreel_assets.get("videos", {})

            # Determine kit type from functional role (goalkeeper → "goalkeeper", else → "home")
            fr_lower = (functional_role or "").lower()
            kit_type = "goalkeeper" if fr_lower in ("keeper", "doelman") else "home"

            # Kit (fullbody) — check images.fullbody.{kit_type} first, fallback to "home", then media.kit
            fullbody_dict = images.get("fullbody", {}) or {}
            fullbody_val = fullbody_dict.get(kit_type)
            kit_url = get_best_url(fullbody_val)
            if not kit_url and kit_type != "home":
                kit_url = get_best_url(fullbody_dict.get("home"))
            if not kit_url:
                kit_url = media.get("kit", {}).get("url")
            logger.info(
                "DEBUG: Player %s - kit_type=%s, fullbody raw value type=%s → kit_url=%s",
                member,
                kit_type,
                type(fullbody_val).__name__,
                kit_url[:80] if kit_url else None,
            )

            # Intro — check videos.intro.{kit_type}_* first, then "home_*", then bare style keys, then media.intro
            # Priority: arms_crossed > thumbs_up > hand_up (most common first)
            intro_variants = videos.get("intro", {}) or {}
            intro_url = _find_best_intro_url(intro_variants, kit_type, get_best_url)

            # Pass 5: legacy media.intro slot
            if not intro_url:
                intro_url = media.get("intro", {}).get("url")

            logger.info(
                "DEBUG: Player %s - intro_url=%s (kit_type=%s, from %d variants: %s)",
                member,
                intro_url[:80] if intro_url else None,
                kit_type,
                len(intro_variants),
                list(intro_variants.keys()),
            )

            # Closeup — check images.closeup.{kit_type} first, fallback to "home", then media.closeup
            closeup_dict = images.get("closeup", {}) or {}
            closeup_url = get_best_url(closeup_dict.get(kit_type))
            if not closeup_url and kit_type != "home":
                closeup_url = get_best_url(closeup_dict.get("home"))
            if not closeup_url:
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

            # Group by functional role / position (case-insensitive, supports Dutch words + abbreviations)
            fr_lower = (functional_role or "").lower()
            pos_lower = (position or "").lower()

            if fr_lower in ("keeper", "doelman") or pos_lower in (
                "gk",
                "keeper",
                "doelman",
            ):
                keepers.append(player)
            elif fr_lower in ("verdediger",) or pos_lower in (
                "verdediger",
                "lb",
                "cb",
                "rb",
                "lwb",
                "rwb",
            ):
                defenders.append(player)
            elif fr_lower in ("middenvelder",) or pos_lower in (
                "middenvelder",
                "cdm",
                "cm",
                "cam",
                "lm",
                "rm",
            ):
                midfielders.append(player)
            elif fr_lower in ("aanvaller", "spits") or pos_lower in (
                "aanvaller",
                "spits",
                "lw",
                "rw",
                "st",
                "cf",
            ):
                attackers.append(player)
            else:
                # Unknown position — park in unassigned, distribute later
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
            opponent_logo_url=opponent_logo_url,
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

    def _gather_lineup_from_memberships(
        self,
        activity,
        project,
        organisation,
        brand_profiles: list,
        logo_url: str | None,
        sponsor_url: str | None,
        field_background_url: str | None,
    ) -> LineupData:
        """Build LineupData directly from ProjectMembership records.

        Used when there are no Participation records for the activity,
        but the user selected members in the frontend.
        """
        from django.apps import apps

        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        memberships = ProjectMembership.objects.filter(
            id__in=self.selected_member_ids,
        ).select_related("user")

        width, height, fps = self._get_resolution_settings()

        # Get team/club names
        if project.parent_project:
            own_team_name = f"{project.parent_project.name} {project.name}"
        else:
            own_team_name = project.name

        # Get match data — prefer opponent_project FK, then metadata
        meta = activity.metadata or {}
        if activity.opponent_project:
            opponent_name = activity.opponent_project.name
        else:
            opponent_name = (
                meta.get("teamreel", {}).get("vars", {}).get("away_team_name")
                or meta.get("teamreel", {}).get("vars", {}).get("home_team_name")
                or "Opponent"
            )
        match_date = activity.start_time.strftime("%d-%m-%Y") if activity.start_time else ""
        kickoff_time = activity.start_time.strftime("%H:%M") if activity.start_time else None
        is_home = meta.get("is_home", meta.get("venue", "Home") == "Home")
        score_meta = meta.get("score", {})
        score_home = score_meta.get("home") if isinstance(score_meta, dict) else None
        score_away = score_meta.get("away") if isinstance(score_meta, dict) else None
        venue = meta.get("venue") or getattr(activity, "location", None)
        season_name = activity.period.name if activity.period else None
        competition_name = meta.get("teamreel", {}).get("vars", {}).get("competition_name")
        if not competition_name and activity.period:
            competition_name = activity.period.name

        # Resolve opponent logo (reuse logic from _gather_lineup_data)
        opponent_logo_url: str | None = None
        if activity.opponent_project:
            BrandProfile = apps.get_model("branding", "BrandProfile")
            BrandAsset = apps.get_model("branding", "BrandAsset")
            opp_project = activity.opponent_project
            opp_club = getattr(opp_project, "parent_project", None)
            for bp_target in [opp_project, opp_club] if opp_club else [opp_project]:
                bp = BrandProfile.objects.filter(project=bp_target, is_active=True).first()
                if not bp:
                    continue
                asset = (
                    BrandAsset.objects.filter(
                        profile=bp,
                        asset_type__in=["logo_light", "logo_dark", "logo_upload"],
                    )
                    .select_related("file")
                    .first()
                )
                if asset:
                    asset_url = getattr(asset, "url", None)
                    if asset_url:
                        opponent_logo_url = asset_url
                        break
                    if asset.file:
                        presigned = self._get_presigned_url(asset.file.storage_path)
                        if presigned:
                            opponent_logo_url = presigned
                            break

        # Build player segments from ProjectMembership metadata
        keepers: list[PlayerSegment] = []
        defenders: list[PlayerSegment] = []
        midfielders: list[PlayerSegment] = []
        attackers: list[PlayerSegment] = []

        # Default field positions per line (evenly spaced)
        line_y_positions = {"keeper": 90, "verdediger": 70, "middenvelder": 45, "aanvaller": 20}

        # Use role-keyed IDs from frontend to know who is GK vs field player
        gk_ids = {str(x) for x in self.selected_member_ids_by_role.get("goalkeeper", [])}
        player_ids = {str(x) for x in self.selected_member_ids_by_role.get("player", [])}

        self._debug_trace.append(f"PM fallback: gk_ids={len(gk_ids)}, player_ids={len(player_ids)}")

        for idx, pm in enumerate(memberships):
            meta = pm.metadata or {}
            teamreel_assets = meta.get("teamreel_assets", {})
            media = teamreel_assets.get("media", {})
            images = teamreel_assets.get("images", {})
            videos = teamreel_assets.get("videos", {})

            from src.video.services.asset_processing_specs import get_best_url

            # Get role from metadata (may be empty)
            functional_role = meta.get("functional_role", "") or meta.get("role", "")
            position = meta.get("position", "")
            jersey_number = meta.get("shirt_number") or meta.get("jersey_number")

            # Determine kit type from functional role (goalkeeper → "goalkeeper", else → "home")
            fr_lower = (functional_role or "").lower()
            kit_type = "goalkeeper" if fr_lower in ("keeper", "doelman") else "home"

            # Kit (fullbody) — images.fullbody.{kit_type} → images.fullbody.home → media.kit
            fullbody_dict = images.get("fullbody", {}) or {}
            kit_url = get_best_url(fullbody_dict.get(kit_type))
            if not kit_url and kit_type != "home":
                kit_url = get_best_url(fullbody_dict.get("home"))
            if not kit_url:
                kit_url = media.get("kit", {}).get("url")

            # Intro — videos.intro.{kit_type}_* → videos.intro.home_* → bare keys → media.intro
            intro_variants = videos.get("intro", {}) or {}
            intro_url = _find_best_intro_url(intro_variants, kit_type, get_best_url)
            if not intro_url:
                intro_url = media.get("intro", {}).get("url")

            # Closeup — images.closeup.{kit_type} → images.closeup.home → media.closeup
            closeup_dict = images.get("closeup", {}) or {}
            closeup_url = get_best_url(closeup_dict.get(kit_type))
            if not closeup_url and kit_type != "home":
                closeup_url = get_best_url(closeup_dict.get("home"))
            if not closeup_url:
                closeup_url = media.get("closeup", {}).get("url")

            # Convert relative paths to presigned URLs
            if kit_url and not kit_url.startswith("http"):
                kit_url = self._get_presigned_url(kit_url)
            if intro_url and not intro_url.startswith("http"):
                intro_url = self._get_presigned_url(intro_url)
            if closeup_url and not closeup_url.startswith("http"):
                closeup_url = self._get_presigned_url(closeup_url)

            user = pm.user
            name = user.get_full_name() if user else "Unknown"

            player = PlayerSegment(
                slot=idx,
                position=position,
                functional_role=functional_role,
                member_id=str(pm.id),
                member_name=name,
                jersey_number=str(jersey_number) if jersey_number else None,
                kit_url=kit_url,
                intro_url=intro_url,
                closeup_url=closeup_url,
                x=50,  # Default center, will be spread per line
                y=50,
            )

            pm_id_str = str(pm.id)

            # If frontend told us this is a GK, use that
            if pm_id_str in gk_ids:
                player.y = line_y_positions["keeper"]
                keepers.append(player)
            elif pm_id_str in player_ids or not gk_ids:
                # Field player — try metadata.position for sub-grouping
                fr_lower = (functional_role or "").lower()
                pos_lower = (position or "").lower()
                if fr_lower in ("verdediger",) or pos_lower in (
                    "verdediger",
                    "lb",
                    "cb",
                    "rb",
                    "lwb",
                    "rwb",
                ):
                    player.y = line_y_positions["verdediger"]
                    defenders.append(player)
                elif fr_lower in ("aanvaller", "spits") or pos_lower in (
                    "aanvaller",
                    "spits",
                    "lw",
                    "rw",
                    "st",
                    "cf",
                ):
                    player.y = line_y_positions["aanvaller"]
                    attackers.append(player)
                elif fr_lower in ("middenvelder",) or pos_lower in (
                    "middenvelder",
                    "cdm",
                    "cm",
                    "cam",
                    "lm",
                    "rm",
                ):
                    player.y = line_y_positions["middenvelder"]
                    midfielders.append(player)
                else:
                    # No position info — collect as unassigned (redistributed below)
                    midfielders.append(player)
            else:
                # Fallback
                midfielders.append(player)

        # Auto-split unpositioned field players using default formation (4-3-3)
        # If ALL field players ended up in midfield (no def/att), redistribute.
        if player_ids and len(defenders) == 0 and len(attackers) == 0 and len(midfielders) > 0:
            field_players = list(midfielders)
            midfielders.clear()
            n = len(field_players)

            # Pick formation split based on number of field players
            if n <= 6:
                n_def, n_mid = 2, 2  # rest attackers
            elif n <= 8:
                n_def, n_mid = 3, 3
            else:
                n_def, n_mid = 4, 3  # 4-3-3

            for i, p in enumerate(field_players):
                if i < n_def:
                    p.y = line_y_positions["verdediger"]
                    defenders.append(p)
                elif i < n_def + n_mid:
                    p.y = line_y_positions["middenvelder"]
                    midfielders.append(p)
                else:
                    p.y = line_y_positions["aanvaller"]
                    attackers.append(p)

            self._debug_trace.append(
                f"Auto-split {n} field players: D={len(defenders)} M={len(midfielders)} A={len(attackers)}"
            )

        # Spread players evenly across x-axis within each line
        for line in [keepers, defenders, midfielders, attackers]:
            if len(line) == 1:
                line[0].x = 50
            else:
                for i, p in enumerate(line):
                    p.x = int(15 + (70 * i / max(len(line) - 1, 1)))

        self._debug_trace.append(
            f"From PM: K={len(keepers)} D={len(defenders)} M={len(midfielders)} A={len(attackers)}"
        )

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
            opponent_logo_url=opponent_logo_url,
            sponsor_url=sponsor_url,
            field_background_url=field_background_url,
            keepers=keepers,
            defenders=defenders,
            midfielders=midfielders,
            attackers=attackers,
            coach_name=None,
            coach_kit_url=None,
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
                opponent_logo_url=data.opponent_logo_url,
                sponsor_url=data.sponsor_url,
                match_date=f"Za {data.match_date}",
                own_team_name=data.own_team_name,
                opponent_name=data.opponent_name,
                is_home=data.is_home,
                score_home=data.score_home,
                score_away=data.score_away,
                kickoff_time=data.kickoff_time,
                coach_name=data.coach_name,
                competition_name=data.competition_name,
            )
        except Exception:  # noqa: BLE001
            header_url = None
            logger.warning("Failed to generate header image")

        # Resolve background (prefer brand stadium_background)
        background_url = data.field_background_url

        # Scene mode: per-LINE with full body → intro → closeup sequence
        # Closeups accumulate across lines (keeper closeups visible during verdediging, etc.)
        if self._render_mode == "line_scenes":
            from src.video.services.lineup_scene_generator import (
                CloseupOverlay,
                ScenePlayer,
                generate_composite_scene,
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
                ("KEEPER", data.keepers, 85),  # (title, players, y_position_pct)
                ("VERDEDIGING", data.defenders, 65),
                ("MIDDENVELD", data.midfielders, 40),
                ("AANVAL", data.attackers, 15),
            ]

            # Accumulated closeups that persist across ALL lines
            accumulated_closeups: list[CloseupOverlay] = []

            for title, players, y_pct in line_defs:
                try:
                    if not players:
                        continue

                    # Position all players in this line side by side
                    n = len(players)
                    scene_players: list[ScenePlayer] = []
                    for i, p in enumerate(players):
                        if not p.kit_url:
                            logger.warning("Skipping player %s - no kit URL", p.member_name)
                            continue

                        # Spread players evenly across x-axis (15% to 85%)
                        if n == 1:
                            x_pct = 50
                        else:
                            x_pct = 15 + int(70 * i / (n - 1))

                        player_label = f"{p.jersey_number or ''} {p.member_name}".strip()
                        scene_players.append(
                            ScenePlayer(
                                name=player_label,
                                kit_url=p.kit_url,
                                x_pct=x_pct,
                                y_pct=y_pct,
                            )
                        )

                    if not scene_players:
                        continue

                    # --- STEP 1: Generate Static Full Body Image (Always required) ---
                    fullbody_url = generate_line_scene_image(
                        width=data.output_width,
                        height=data.output_height,
                        background_url=background_url,
                        header_url=header_url,
                        title=title,
                        players=scene_players,
                    )

                    # Add 1st Segment: Full Body Static
                    segments.append(
                        {
                            "type": "image",
                            "url": fullbody_url,
                            "duration": 2.0,
                            "transition": "cut",
                            "label": f"{title} - Full Body",
                        }
                    )

                    # --- STEP 2: Line Scene (Intro Video) ---
                    # Check if we should use animated composition
                    has_intros = any(p.intro_url for p in players)
                    line_video_url = None

                    if has_intros and self._render_mode == "line_scenes":
                        try:
                            # Collect inputs for composition
                            comp_inputs = []
                            for sp, p in zip(scene_players, players):
                                comp_inputs.append(
                                    {
                                        "intro_url": p.intro_url,
                                        "kit_url": p.kit_url,
                                        "x_pct": sp.x_pct,
                                        "y_pct": sp.y_pct,
                                    }
                                )

                            logger.info(
                                f"Composing line video for {title} with {len(comp_inputs)} players"
                            )
                            line_video_url = self._compose_line_intro_video(
                                background_url=background_url,
                                players=comp_inputs,
                                width=data.output_width,
                                height=data.output_height,
                                fps=data.output_fps,
                                prefix=f"intro_{title.lower().replace(' ', '_')}",
                                header_url=header_url,
                            )
                        except Exception as e:
                            logger.error(
                                f"Failed to compose line video for {title}: {e}", exc_info=True
                            )
                            line_video_url = None

                    if line_video_url:
                        # Add 2nd Segment: Intro Video
                        segments.append(
                            {
                                "type": "video",
                                "url": line_video_url,
                                "duration": 5.0,  # Target duration
                                "transition": "cut",  # Video handles transition or cut to next
                                "label": f"{title} - Intro",
                            }
                        )
                        # Add 3rd Segment: Full Body Static (Again)
                        segments.append(
                            {
                                "type": "image",
                                "url": fullbody_url,
                                "duration": 2.0,
                                "transition": "fade",
                                "label": f"{title} - Full Body (Return)",
                            }
                        )

                        # Add 4th Segment: Individual Closeups for each player in this line
                        # "Fullbody in tenue -> Short intro -> Fullbody in tenue -> Closeup"
                        for p in players:
                            closeup_asset = p.closeup_url or p.kit_url
                            if closeup_asset:
                                player_label = f"{p.jersey_number or ''} {p.member_name}".strip()
                                segments.append(
                                    {
                                        "type": "image",
                                        "url": closeup_asset,
                                        "duration": 1.5,
                                        "transition": "cut",
                                        "label": f"{player_label} - Closeup",
                                    }
                                )
                    else:
                        # If no video, we just keep the first Full Body image we added
                        # But maybe extend duration? Or just add individual intros?

                        # Legacy sequential intros if we failed to compose (or mode != line_scenes)
                        for p in players:
                            if p.intro_url:
                                player_label = f"{p.jersey_number or ''} {p.member_name}".strip()
                                segments.append(
                                    {
                                        "type": "video",
                                        "url": p.intro_url,
                                        "label": player_label,
                                        "transition": "cut",
                                    }
                                )

                    # --- STEP 3: Add this line's players to accumulated closeups ---
                    for i, p in enumerate(players):
                        if not p.closeup_url and not p.kit_url:
                            continue
                        closeup_image = p.closeup_url or p.kit_url
                        player_label = f"{p.jersey_number or ''} {p.member_name}".strip()

                        # Use player's actual field position for closeup placement
                        accumulated_closeups.append(
                            CloseupOverlay(
                                name=player_label,
                                image_url=closeup_image,
                                x_pct=int(p.x),
                                y_pct=int(p.y),
                            )
                        )

                    # --- STEP 4: Closeup scene showing ALL closeups so far ---
                    try:
                        closeup_scene_url = generate_composite_scene(
                            width=data.output_width,
                            height=data.output_height,
                            background_url=background_url,
                            header_url=header_url,
                            title=title,
                            accumulated_closeups=list(accumulated_closeups),
                            featured_player=None,
                            prefix=f"closeups_{title.lower().replace(' ', '_')}",
                        )
                        segments.append(
                            {
                                "type": "image",
                                "url": closeup_scene_url,
                                "duration": 1.5,
                                "transition": "cut",
                                "label": f"{title} - Closeups",
                            }
                        )
                    except Exception as e:
                        logger.error(
                            f"Failed to generate composite closeup scene for {title}: {e}",
                            exc_info=True,
                        )

                    logger.info(
                        "Generated %s: fullbody + %d intros + closeup scene (%d total closeups)",
                        title,
                        sum(1 for p in players if p.intro_url),
                        len(accumulated_closeups),
                    )

                except Exception as e:
                    logger.error(f"Generate Line Scene Failed for {title}: {e}", exc_info=True)
                    continue

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

                # 2. Intro video (pre-composed on background)
                if player.intro_url:
                    composed_url = None
                    if background_url:
                        composed_url = self._pre_compose_intro_on_background(
                            intro_url=player.intro_url,
                            background_url=background_url,
                            width=data.output_width,
                            height=data.output_height,
                            fps=data.output_fps,
                            prefix=f"intro_{player.member_name.replace(' ', '_').lower()}",
                        )
                    segments.append(
                        {
                            "type": "video",
                            "url": composed_url or player.intro_url,
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
            # S3StorageBackend uses get_url(path, signed=True, expiry_seconds=3600)
            url = backend.get_url(storage_path, signed=True, expiry_seconds=3600)
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

    def _pre_compose_intro_on_background(
        self, intro_url: str, background_url: str, width: int, height: int, fps: int, prefix: str
    ) -> str | None:
        """Pre-compose a transparent intro video on a stadium background.

        Downloads the WebM (alpha) and background image, runs a single FFmpeg
        overlay, uploads the composited MP4 to S3, and returns its presigned URL.
        This moves heavy compositing OUT of the lineup processor so it becomes
        a simple assembler.
        """
        import subprocess
        import tempfile
        import uuid as uuid_module
        from pathlib import Path

        import requests as req

        tmp_dir = Path(tempfile.mkdtemp(prefix="lineup_compose_"))
        try:
            # 1. Download intro video
            ext = ".webm" if ".webm" in intro_url.lower() else ".mp4"
            intro_path = tmp_dir / f"intro{ext}"
            resp = req.get(intro_url, timeout=60, stream=True)
            resp.raise_for_status()
            with open(intro_path, "wb") as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)

            # 2. Download background image
            bg_path = tmp_dir / "background.png"
            resp_bg = req.get(background_url, timeout=60, stream=True)
            resp_bg.raise_for_status()
            with open(bg_path, "wb") as f:
                for chunk in resp_bg.iter_content(8192):
                    f.write(chunk)

            # 3. Compose: overlay transparent video on looped background
            out_path = tmp_dir / "composed.mp4"
            is_alpha = ext == ".webm"  # WebM VP9 has alpha

            if is_alpha:
                filter_complex = (
                    f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                    f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,"
                    f"setsar=1,format=rgba[bg];"
                    f"[1:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                    f"format=rgba,setsar=1[fg];"
                    f"[bg][fg]overlay=(W-w)/2:(H-h)/2:format=auto,fps={fps}[v]"
                )
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-loop",
                    "1",
                    "-i",
                    str(bg_path),
                    "-i",
                    str(intro_path),
                    "-filter_complex",
                    filter_complex,
                    "-map",
                    "[v]",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "23",
                    "-an",
                    "-shortest",
                    str(out_path),
                ]
            else:
                # Non-alpha MP4: just scale/pad to target resolution (fast re-encode)
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(intro_path),
                    "-vf",
                    (
                        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
                        f"setsar=1,fps={fps}"
                    ),
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "23",
                    "-an",
                    str(out_path),
                ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)  # noqa: S603
            if result.returncode != 0:
                logger.error(
                    "Pre-compose FFmpeg failed: %s",
                    result.stderr[:2000],
                    extra={"prefix": prefix},
                )
                return None

            # 4. Upload to S3
            from src.files.utils import get_storage_backend

            storage_path = f"generated/lineup/{prefix}/{uuid_module.uuid4().hex}.mp4"
            backend = get_storage_backend()
            with open(out_path, "rb") as f:
                backend.save(storage_path, f)
            url = backend.get_url(storage_path, signed=True, expiry_seconds=3600)
            logger.info("Pre-composed intro uploaded: %s", prefix)
            return url

        except Exception as exc:  # noqa: BLE001
            logger.warning("Pre-compose failed for %s: %s", prefix, exc)
            return None
        finally:
            import shutil

            shutil.rmtree(tmp_dir, ignore_errors=True)

    def _compose_line_intro_video(
        self,
        background_url: str,
        players: list[dict],
        width: int,
        height: int,
        fps: int,
        prefix: str,
        header_url: str | None = None,
    ) -> str | None:
        """Compose multiple player intro videos/images onto a background.

        Args:
            players: List of dicts with {intro_url, kit_url, x_pct, y_pct}
        """
        import subprocess
        import tempfile
        import shutil
        import uuid
        from pathlib import Path
        import requests as req
        from src.files.utils import get_storage_backend

        tmp_dir = Path(tempfile.mkdtemp(prefix="lineup_line_"))

        try:
            # 1. Download Background
            bg_path = tmp_dir / "background.png"
            with open(bg_path, "wb") as f:
                f.write(req.get(background_url, timeout=30).content)

            # 2. Prepare Inputs
            # Input 0: Background
            inputs = ["-loop", "1", "-i", str(bg_path)]

            # Input 1: Header (if exists, overlay it)
            header_idx = None
            if header_url:
                header_path = tmp_dir / "header.png"
                with open(header_path, "wb") as f:
                    f.write(req.get(header_url, timeout=30).content)
                inputs.extend(["-loop", "1", "-i", str(header_path)])
                header_idx = 1

            # Player inputs
            player_inputs = []
            base_idx = 2 if header_idx else 1

            for i, p in enumerate(players):
                # Prefer intro, fallback to kit
                url = p.get("intro_url") or p.get("kit_url")
                if not url:
                    continue

                is_video = bool(p.get("intro_url"))
                ext = ".webm" if is_video and "webm" in url else ".mp4" if is_video else ".png"
                path = tmp_dir / f"p{i}{ext}"

                # Only download if not exists (dedupe?) - Players distinct usually
                with open(path, "wb") as f:
                    resp = req.get(url, stream=True, timeout=60)
                    resp.raise_for_status()
                    for chunk in resp.iter_content(8192):
                        f.write(chunk)

                if not is_video:
                    inputs.extend(["-loop", "1"])
                inputs.extend(["-i", str(path)])

                is_webm = ext == ".webm"
                player_inputs.append(
                    {
                        "idx": base_idx + i,
                        "x_pct": p["x_pct"],
                        "y_pct": p["y_pct"],
                        "is_video": is_video,
                        "is_webm": is_webm,
                    }
                )

            if not player_inputs:
                return None

            # 3. Filter Complex
            fc = []
            # Scale background to output size
            fc.append(
                f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
                f"crop={width}:{height},setsar=1[bg]"
            )
            last = "bg"

            if header_idx:
                fc.append(f"[{header_idx}:v]scale={width}:-1[header]")
                fc.append("[bg][header]overlay=0:0[bg_h]")
                last = "bg_h"

            # Player height ≈ 1/3 of the football field area.
            # Field occupies 85% of frame (header=15%), so 0.85/3 ≈ 0.28.
            target_h = int(height * 0.28)

            for p in player_inputs:
                pid = p["idx"]
                # Always apply colorkey to remove black background.
                # Even "processed" WebMs use yuv420p (no real alpha channel),
                # so colorkey is needed for all input formats.
                fc.append(
                    f"[{pid}:v]format=rgba,colorkey=0x000000:0.15:0.1,scale=-1:{target_h}[p{pid}_s]"
                )

                # Position calculation
                # x: Center of player is at x_pct of Field Width (width)
                #    x = (width * x_pct / 100) - (w / 2)
                x_expr = f"(W*{p['x_pct']}/100-w/2)"

                # y: Matches generate_line_scene_image heuristic
                #    y = header_h + field_h * y_pct/100 - h
                #    Approx: y = 0.15*H + 0.85*H * y_pct/100 - h
                #    Data: Defenders y=15, Attackers y=25
                y_expr = f"(H*0.15+(H*0.85)*{p['y_pct']}/100-h)"

                # Use eof_action=repeat to hold the last frame of the overlay if it ends before the background
                # This prevents the video from disappearing or cutting short
                fc.append(
                    f"[{last}][p{pid}_s]overlay=x={x_expr}:y={y_expr}:shortest=0:eof_action=repeat[ov{pid}]"
                )
                last = f"ov{pid}"

            fc.append(f"[{last}]fps={fps},format=yuv420p[out]")

            out_path = tmp_dir / "composed.mp4"
            cmd = (
                ["ffmpeg", "-y"]
                + inputs
                + [
                    "-filter_complex",
                    ";".join(fc),
                    "-map",
                    "[out]",
                    "-t",
                    "5",  # Force duration to 5s
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-an",
                    str(out_path),
                ]
            )

            # Run composition
            subprocess.run(
                cmd, check=True, capture_output=True, text=True, timeout=300
            )  # 5 min timeout for line comp

            # 4. Upload
            s3_path = f"generated/lineup/{prefix}/{uuid.uuid4().hex}.mp4"
            backend = get_storage_backend()
            with open(out_path, "rb") as f:
                backend.save(s3_path, f)

            return backend.get_url(s3_path, signed=True, expiry_seconds=3600)

        except Exception as e:
            logger.error(f"Compose Multi Intro Failed: {e} prefix={prefix}")
            return None
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

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
    selected_member_ids: list[str] | None = None,
) -> dict:
    """Convenience function to build lineup video config.

    Args:
        activity_id: The match/activity UUID
        template_id: Optional ContentTemplate ID
        output_resolution: Resolution preset
        selected_member_ids: Optional list of member IDs from frontend

    Returns:
        Config dict ready for LineupProcessor
    """
    builder = LineupSegmentBuilder(
        activity_id=activity_id,
        template_id=template_id,
        output_resolution=output_resolution,
        selected_member_ids=selected_member_ids,
    )
    return builder.build()
