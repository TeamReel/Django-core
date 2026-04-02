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

# Formation split definitions: (defenders, midfielders, attackers)
# Matches the frontend FORMATION_LAYOUTS slot ordering.
# Used as FALLBACK when Formation DB record is not available.
FORMATION_SPLITS: dict[str, tuple[int, int, int]] = {
    "4-3-3": (4, 3, 3),
    "4-4-2": (4, 4, 2),
    "3-4-3": (3, 4, 3),
}


def _get_formation_splits(formation_code: str) -> tuple[int, int, int]:
    """Get (n_defenders, n_midfielders, n_attackers) from DB or fallback.

    Reads Formation.positions from DB to count players per line.
    Falls back to FORMATION_SPLITS if DB record not found.
    """
    try:
        from sport_configuration.models import Formation

        formation = Formation.objects.filter(code=formation_code, is_active=True).first()
        if formation and formation.positions:
            counts: dict[str, int] = {}
            for pos in formation.positions:
                line = pos.get("line", "")
                if line and line != "keeper":
                    counts[line] = counts.get(line, 0) + 1
            n_def = counts.get("defender", 0)
            n_mid = counts.get("midfielder", 0)
            n_att = counts.get("attacker", 0)
            if n_def + n_mid + n_att > 0:
                return (n_def, n_mid, n_att)
    except Exception:
        logger.debug("Failed to resolve formation %s from DB, using fallback", formation_code)

    return FORMATION_SPLITS.get(formation_code, (4, 3, 3))


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
    """
    from src.video.services._common import find_best_variant_url

    return find_best_variant_url(intro_variants, kit_type, _INTRO_STYLE_PRIORITY, get_best_url_fn)


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
    is_guest_player: bool = False  # True if no assets, using placeholder silhouette


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
    brand_primary: str | None
    brand_secondary: str | None

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

    # Sentinel ID for guest players (not real members).
    GUEST_PLAYER_ID = "__guest__"

    def __init__(
        self,
        activity_id: str | UUID,
        template_id: str | UUID | None = None,
        output_resolution: str = "vertical_1080p",
        selected_member_ids: list[str] | None = None,
        formation: str = "4-3-3",
    ):
        """Initialize builder with activity and optional template.

        Args:
            activity_id: The match/activity ID
            template_id: Optional ContentTemplate ID (uses default 4-3-3 if None)
            output_resolution: Resolution preset (vertical_1080p, 1080p, 720p)
            selected_member_ids: Optional list of member IDs (from frontend selection).
                Can include ``__guest__`` entries for guest players (anonymous avatars).
            formation: Formation string (4-3-3, 4-4-2, 3-4-3) — used to split
                       frontend-ordered players into defender/midfielder/attacker groups
        """
        self.activity_id = str(activity_id)
        self.template_id = str(template_id) if template_id else None
        self.output_resolution = output_resolution
        self.formation = formation
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

        # Count guest entries per role (before filtering them out of real IDs).
        self._guest_count_by_role: dict[str, int] = {}
        if self.selected_member_ids:
            guest_count = sum(1 for x in self.selected_member_ids if str(x) == self.GUEST_PLAYER_ID)
            if guest_count:
                self._debug_trace.append(f"Guest entries in selection: {guest_count}")
            # Remove guest entries from the real member IDs list (they're not DB objects)
            self.selected_member_ids = [
                x for x in self.selected_member_ids if str(x) != self.GUEST_PLAYER_ID
            ] or None

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
        from src.video.services._common import ImageCache

        cache = ImageCache()
        try:
            self._load_render_mode()
            lineup_data = self._gather_lineup_data()
            segments = self._build_segments(lineup_data, cache=cache)

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
            cache.clear()

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

        from src.video.services.brand_resolver import resolve_match_brand_assets

        # Use apps.get_model to avoid app_label issues
        Participation = apps.get_model("activities", "Participation")

        # ── Brand + match context (shared resolution) ──
        brand = resolve_match_brand_assets(self.activity_id)
        activity = brand.activity
        project = brand.project
        organisation = brand.organisation

        logo_url = brand.logo_url
        sponsor_url = brand.sponsor_url
        field_background_url = brand.field_background_url
        opponent_logo_url = brand.opponent_logo_url
        brand_primary = brand.brand_primary
        brand_secondary = brand.brand_secondary

        logger.info(
            "Resolved brand assets — logo=%s, sponsor=%s, bg=%s, opp=%s",
            logo_url[:120] if logo_url else None,
            sponsor_url[:120] if sponsor_url else None,
            field_background_url[:120] if field_background_url else None,
            bool(opponent_logo_url),
        )

        # ── Match context ──
        # Lineup uses club name to avoid "Ajax Ajax 1" duplication
        own_team_name = brand.own_club_name or brand.own_team_name
        opponent_name = brand.opponent_club_name or brand.opponent_name or "Opponent"
        match_date = brand.match_date
        kickoff_time = brand.kickoff_time
        is_home = brand.is_home
        score_home = brand.score_home
        score_away = brand.score_away
        venue = brand.venue
        season_name = brand.season_name
        competition_name = brand.competition_name

        # Log all participations for this activity
        all_participations = Participation.objects.filter(activity=activity).select_related(
            "member__user"
        )
        logger.debug(
            "All participations for activity %s: count=%d, roles=%s",
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
                f"Resolved {len(selected_user_ids)} user_ids"
                f" from {len(self.selected_member_ids)} PM ids"
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

        logger.debug(
            "Filtered participations: count=%d",
            participations.count(),
        )

        # When the frontend provides role-keyed selected_member_ids (goalkeeper/player),
        # always use the ProjectMembership path.  This is the robust path because:
        #   1) Participation records are often incomplete or missing entirely
        #   2) The PM path already handles role assignment and formation splitting
        #   3) The Participation member_id (OrganisationMember) != PM id, which breaks
        #      supplementation logic that tries to compare the two
        # Also enter this path when the selection consists entirely of guest players
        # (self.selected_member_ids may be empty after stripping __guest__ entries).
        #
        # EXCEPTION: when LineupSyncService has written proper slot/position data into
        # Participation records, those are the authoritative source and we prefer them.
        has_role_selection = bool(self.selected_member_ids_by_role) and any(
            v for v in self.selected_member_ids_by_role.values()
        )

        # Check if Participations have synced slot data from LineupSyncService
        first_p = participations.first()
        has_synced_participations = (
            first_p is not None
            and isinstance(first_p.data, dict)
            and "slot" in first_p.data
        )

        if has_role_selection and not has_synced_participations:
            real_count = len(self.selected_member_ids or [])
            total_count = sum(
                len(v) for v in self.selected_member_ids_by_role.values() if isinstance(v, list)
            )
            logger.info(
                "Using ProjectMembership path — frontend provided"
                " %d real + %d total members with roles "
                "(participations found: %d, but PM path is preferred)",
                real_count,
                total_count,
                participations.count(),
            )
            self._debug_trace.append(
                f"Using PM path: {real_count} real + {total_count} total members with roles "
                f"(skipping {participations.count()} participations)"
            )
            return self._gather_lineup_from_memberships(
                activity=activity,
                project=project,
                organisation=organisation,
                logo_url=logo_url,
                opponent_logo_url=opponent_logo_url,
                sponsor_url=sponsor_url,
                field_background_url=field_background_url,
                brand_primary=brand_primary,
                brand_secondary=brand_secondary,
            )

        if has_synced_participations:
            logger.info(
                "Using Participation path (synced by LineupSyncService) — "
                "%d participations with slot data",
                participations.count(),
            )
            self._debug_trace.append(
                f"Using synced Participations: {participations.count()} records with slot data"
            )

        # Legacy fallback: no role-keyed IDs but participations exist
        if participations.count() == 0 and selected_user_ids:
            logger.debug(
                "No Participation records match, building from ProjectMembership data"
            )
            self._debug_trace.append("No Participations found, using ProjectMembership directly")
            return self._gather_lineup_from_memberships(
                activity=activity,
                project=project,
                organisation=organisation,
                logo_url=logo_url,
                opponent_logo_url=opponent_logo_url,
                sponsor_url=sponsor_url,
                field_background_url=field_background_url,
                brand_primary=brand_primary,
                brand_secondary=brand_secondary,
            )

        # Fail fast if there is no lineup data.
        # We intentionally do NOT fall back to frontend segments.
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

        logger.debug(
            "Processing %d participations, membership_by_user has %d entries",
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

            logger.debug(
                "Player %s (user_id=%s) - project_membership=%s",
                member,
                member.user_id,
                project_membership.id if project_membership else None,
            )

            teamreel_assets = (
                (project_membership.metadata or {}).get("teamreel_assets", {})
                if project_membership
                else {}
            )
            logger.debug(
                "Player %s - teamreel_assets keys=%s",
                member,
                list(teamreel_assets.keys()) if teamreel_assets else None,
            )

            # Resolve URLs: roles.{role} first, then legacy flat paths
            from src.video.services.asset_processing_specs import (
                get_best_url,
                get_ffmpeg_best_url,
            )
            from src.video.utils.asset_metadata import resolve_lineup_member_assets

            # Determine kit type from functional role (goalkeeper → "goalkeeper", else → "home")
            fr_lower = (functional_role or "").lower()
            kit_type = "goalkeeper" if fr_lower in ("keeper", "doelman") else "home"

            kit_url, intro_url, closeup_url = resolve_lineup_member_assets(
                teamreel_assets=teamreel_assets,
                functional_role=functional_role,
                kit_type=kit_type,
                get_best_url_fn=get_best_url,
                get_ffmpeg_best_url_fn=get_ffmpeg_best_url,
                find_best_intro_url_fn=_find_best_intro_url,
            )

            logger.debug(
                "Player %s - kit_type=%s, kit_url=%s, intro_url=%s, closeup_url=%s",
                member,
                kit_type,
                kit_url[:80] if kit_url else None,
                intro_url[:80] if intro_url else None,
                closeup_url[:80] if closeup_url else None,
            )

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

            # Group by functional role / position
            # (case-insensitive, supports Dutch words + abbreviations)
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

        # ── Supplement missing players from ProjectMembership ──
        # When only some players have Participation records (e.g. keeper has one but
        # field players don't), the list above will be incomplete.  Detect this by
        # comparing the collected member IDs with the frontend-selected IDs and pull
        # in the missing members from ProjectMembership metadata directly.
        if self.selected_member_ids_by_role:
            collected_pm_ids = set()
            for pl in keepers + defenders + midfielders + attackers:
                collected_pm_ids.add(pl.member_id)

            # Find selected player IDs that weren't matched to a Participation
            selected_player_ids = {
                str(x) for x in self.selected_member_ids_by_role.get("player", [])
            }
            selected_gk_ids = {
                str(x) for x in self.selected_member_ids_by_role.get("goalkeeper", [])
            }
            missing_player_ids = selected_player_ids - collected_pm_ids
            missing_gk_ids = selected_gk_ids - collected_pm_ids

            if missing_player_ids or missing_gk_ids:
                all_missing = list(missing_player_ids | missing_gk_ids)
                logger.info(
                    "Supplementing %d missing members from"
                    " ProjectMembership"
                    " (missing_players=%d, missing_gk=%d)",
                    len(all_missing),
                    len(missing_player_ids),
                    len(missing_gk_ids),
                )
                self._debug_trace.append(
                    f"Supplementing {len(all_missing)} missing members from PM"
                )

                from src.video.services.asset_processing_specs import (
                    get_best_url as _get_best_url,
                )
                from src.video.services.asset_processing_specs import (
                    get_ffmpeg_best_url as _get_ffmpeg_best_url,
                )

                supplement_pms = ProjectMembership.objects.filter(
                    id__in=all_missing,
                ).select_related("user")

                for pm in supplement_pms:
                    pm_meta = pm.metadata or {}
                    pm_tr = pm_meta.get("teamreel_assets", {})
                    pm_media = pm_tr.get("media", {})
                    pm_images = pm_tr.get("images", {})
                    pm_videos = pm_tr.get("videos", {})

                    pm_id_str = str(pm.id)
                    is_gk = pm_id_str in missing_gk_ids
                    pm_kit_type = "goalkeeper" if is_gk else "home"

                    # Kit (fullbody)
                    fb_dict = pm_images.get("fullbody", {}) or {}
                    s_kit_url = _get_best_url(fb_dict.get(pm_kit_type))
                    if not s_kit_url and pm_kit_type != "home":
                        s_kit_url = _get_best_url(fb_dict.get("home"))
                    if not s_kit_url:
                        s_kit_url = pm_media.get("kit", {}).get("url")

                    # Intro - use _get_ffmpeg_best_url to get alpha-enabled .mov
                    s_intro_variants = pm_videos.get("intro", {}) or {}
                    s_intro_url = _find_best_intro_url(
                        s_intro_variants, pm_kit_type, _get_ffmpeg_best_url
                    )
                    if not s_intro_url:
                        s_intro_url = pm_media.get("intro", {}).get("url")

                    # Closeup
                    cu_dict = pm_images.get("closeup", {}) or {}
                    s_closeup_url = _get_best_url(cu_dict.get(pm_kit_type))
                    if not s_closeup_url and pm_kit_type != "home":
                        s_closeup_url = _get_best_url(cu_dict.get("home"))
                    if not s_closeup_url:
                        s_closeup_url = pm_media.get("closeup", {}).get("url")

                    # Presign relative paths
                    if s_kit_url and not s_kit_url.startswith("http"):
                        s_kit_url = self._get_presigned_url(s_kit_url)
                    if s_intro_url and not s_intro_url.startswith("http"):
                        s_intro_url = self._get_presigned_url(s_intro_url)
                    if s_closeup_url and not s_closeup_url.startswith("http"):
                        s_closeup_url = self._get_presigned_url(s_closeup_url)

                    user = pm.user
                    name = user.get_full_name() if user else "Unknown"

                    supplemented_player = PlayerSegment(
                        slot=len(keepers) + len(defenders) + len(midfielders) + len(attackers),
                        position="",
                        functional_role="goalkeeper" if is_gk else "",
                        member_id=pm_id_str,
                        member_name=name,
                        jersey_number=None,
                        kit_url=s_kit_url,
                        intro_url=s_intro_url,
                        closeup_url=s_closeup_url,
                        x=50,
                        y=50,
                    )

                    if is_gk:
                        keepers.append(supplemented_player)
                    else:
                        midfielders.append(supplemented_player)

                # Auto-split if all supplemented field players ended up in midfield
                total_field = len(defenders) + len(midfielders) + len(attackers)
                if total_field > 0 and len(defenders) == 0 and len(attackers) == 0:
                    field_players_to_split = list(midfielders)
                    midfielders.clear()
                    n = len(field_players_to_split)
                    if n <= 6:
                        n_def, n_mid = 2, 2
                    elif n <= 8:
                        n_def, n_mid = 3, 3
                    else:
                        n_def, n_mid = 4, 3

                    for i, p in enumerate(field_players_to_split):
                        if i < n_def:
                            defenders.append(p)
                        elif i < n_def + n_mid:
                            midfielders.append(p)
                        else:
                            attackers.append(p)

                    self._debug_trace.append(
                        f"Auto-split supplemented:"
                        f" D={len(defenders)}"
                        f" M={len(midfielders)}"
                        f" A={len(attackers)}"
                    )

                # Spread x positions
                for line in [keepers, defenders, midfielders, attackers]:
                    if len(line) == 1:
                        line[0].x = 50
                    else:
                        for i, p in enumerate(line):
                            p.x = int(15 + (70 * i / max(len(line) - 1, 1)))

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
            brand_primary=brand_primary,
            brand_secondary=brand_secondary,
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
        logo_url: str | None,
        opponent_logo_url: str | None,
        sponsor_url: str | None,
        field_background_url: str | None,
        brand_primary: str | None = None,
        brand_secondary: str | None = None,
    ) -> LineupData:
        """Build LineupData directly from ProjectMembership records.

        Used when there are no Participation records for the activity,
        but the user selected members in the frontend.
        """
        from django.apps import apps

        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        # Filter out guest IDs before querying real memberships.
        real_member_ids = [
            x for x in (self.selected_member_ids or []) if str(x) != self.GUEST_PLAYER_ID
        ]
        memberships = ProjectMembership.objects.filter(
            id__in=real_member_ids,
        ).select_related("user")

        # ── Resolve guest player avatar from project metadata ─────────────
        guest_assets = (project.metadata or {}).get("teamreel_assets", {}).get("guest_player", {})
        guest_images = guest_assets.get("images", {})
        guest_kit_url = None
        guest_closeup_url = None
        # Try fullbody.home → media.kit
        fullbody = guest_images.get("fullbody", {})
        if fullbody.get("home"):
            from src.video.services.asset_processing_specs import get_best_url

            guest_kit_url = get_best_url(fullbody["home"])
        if not guest_kit_url:
            guest_kit_url = guest_assets.get("media", {}).get("kit", {}).get("url")
        # Try closeup.home
        closeup_d = guest_images.get("closeup", {})
        if closeup_d.get("home"):
            from src.video.services.asset_processing_specs import get_best_url

            guest_closeup_url = get_best_url(closeup_d["home"])
        # Convert relative paths to presigned URLs
        if guest_kit_url and not guest_kit_url.startswith("http"):
            guest_kit_url = self._get_presigned_url(guest_kit_url)
        if guest_closeup_url and not guest_closeup_url.startswith("http"):
            guest_closeup_url = self._get_presigned_url(guest_closeup_url)
        self._debug_trace.append(
            f"Guest avatar: kit={bool(guest_kit_url)} closeup={bool(guest_closeup_url)}"
        )

        width, height, fps = self._get_resolution_settings()

        # ── Match context ──
        from src.video.services.match_context import resolve_match_context

        ctx = resolve_match_context(activity)
        own_team_name = ctx.own_club_name or ctx.own_team_name
        opponent_name = ctx.opponent_club_name or ctx.opponent_name or "Opponent"
        match_date = ctx.match_date
        kickoff_time = ctx.kickoff_time
        is_home = ctx.is_home
        score_home = ctx.score_home
        score_away = ctx.score_away
        venue = ctx.venue
        season_name = ctx.season_name
        competition_name = ctx.competition_name

        # Build player segments from ProjectMembership metadata
        keepers: list[PlayerSegment] = []
        # Dict to collect field player segments keyed by PM id (preserves lookup)
        field_player_segments: dict[str, PlayerSegment] = {}

        # Default field positions per line (evenly spaced)
        line_y_positions = {"keeper": 90, "verdediger": 70, "middenvelder": 45, "aanvaller": 20}

        # Use role-keyed IDs from frontend to know who is GK vs field player.
        # Guest entries (``__guest__``) are preserved in the ordered lists but
        # excluded from the set-based lookups so they don't collide with real IDs.
        GUEST = self.GUEST_PLAYER_ID
        raw_gk_ids = [str(x) for x in self.selected_member_ids_by_role.get("goalkeeper", [])]
        gk_ids = {x for x in raw_gk_ids if x != GUEST}
        # Ordered list from frontend — the order matches formation slots
        ordered_player_ids_raw = [
            str(x) for x in self.selected_member_ids_by_role.get("player", [])
        ]
        player_ids = {x for x in ordered_player_ids_raw if x != GUEST}

        # IMPORTANT: Exclude goalkeeper IDs from player_ids to avoid double-counting.
        # The frontend may send a goalkeeper in both 'player' and 'goalkeeper' arrays.
        player_ids = player_ids - gk_ids
        ordered_player_ids = [
            pid for pid in ordered_player_ids_raw if pid == GUEST or pid not in gk_ids
        ]

        # Count guests per role for debug trace
        gk_guest_count = sum(1 for x in raw_gk_ids if x == GUEST)
        player_guest_count = sum(1 for x in ordered_player_ids_raw if x == GUEST)

        self._debug_trace.append(
            f"PM fallback: gk_ids={len(gk_ids)}, player_ids={len(player_ids)} (after dedup)"
            f" | guests: gk={gk_guest_count}, player={player_guest_count}"
        )

        for idx, pm in enumerate(memberships):
            meta = pm.metadata or {}
            teamreel_assets = meta.get("teamreel_assets", {})

            # Cross-membership asset fallback: if this membership has no
            # teamreel_assets, check other memberships of the same user in
            # the same project (mirrors the API serializer logic).
            if not teamreel_assets and pm.user_id:
                other_pm = (
                    ProjectMembership.objects.filter(
                        project_id=pm.project_id,
                        user_id=pm.user_id,
                        deleted_at__isnull=True,
                        metadata__has_key="teamreel_assets",
                    )
                    .exclude(id=pm.id)
                    .first()
                )
                if other_pm:
                    teamreel_assets = (other_pm.metadata or {}).get("teamreel_assets", {})
                    self._debug_trace.append(f"PM {pm.id}: assets inherited from PM {other_pm.id}")

            from src.video.services.asset_processing_specs import (
                get_best_url,
                get_ffmpeg_best_url,
            )

            # Get role from metadata (may be empty)
            functional_role = meta.get("functional_role", "") or meta.get("role", "")
            position = meta.get("position", "")
            jersey_number = meta.get("shirt_number") or meta.get("jersey_number")

            # Determine kit type: frontend role assignment takes precedence over metadata.
            # The frontend explicitly tells us who is a GK via gk_ids — use that to
            # look up goalkeeper-variant assets (images.fullbody.goalkeeper, etc.).
            pm_id_str = str(pm.id)
            fr_lower = (functional_role or "").lower()
            if pm_id_str in gk_ids:
                kit_type = "goalkeeper"
            elif fr_lower in ("keeper", "doelman"):
                kit_type = "goalkeeper"
            else:
                kit_type = "home"

            # Resolve assets: roles.{role} first, then legacy flat paths
            from src.video.utils.asset_metadata import resolve_lineup_member_assets

            kit_url, intro_url, closeup_url = resolve_lineup_member_assets(
                teamreel_assets=teamreel_assets,
                functional_role=functional_role
                or ("keeper" if kit_type == "goalkeeper" else "player"),
                kit_type=kit_type,
                get_best_url_fn=get_best_url,
                get_ffmpeg_best_url_fn=get_ffmpeg_best_url,
                find_best_intro_url_fn=_find_best_intro_url,
            )

            # Convert relative paths to presigned URLs
            if kit_url and not kit_url.startswith("http"):
                kit_url = self._get_presigned_url(kit_url)
            if intro_url and not intro_url.startswith("http"):
                intro_url = self._get_presigned_url(intro_url)
            if closeup_url and not closeup_url.startswith("http"):
                closeup_url = self._get_presigned_url(closeup_url)

            user = pm.user
            name = user.get_full_name() if user else "Unknown"

            # Diagnostic logging for asset resolution
            is_guest = not kit_url and not closeup_url
            self._debug_trace.append(
                f"PM {pm.id} ({name}): kit_type={kit_type} "
                f"kit={bool(kit_url)} intro={bool(intro_url)} closeup={bool(closeup_url)}"
                f"{' [GUEST]' if is_guest else ''}"
            )
            if is_guest:
                logger.info(
                    "Player %s (PM %s) marked as guest player — no assets available",
                    name,
                    pm.id,
                )

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
                is_guest_player=is_guest,
            )

            # Separate GKs from field players using frontend role assignment
            if pm_id_str in gk_ids:
                player.y = line_y_positions["keeper"]
                keepers.append(player)
            elif pm_id_str in player_ids or not gk_ids:
                # Field player — store keyed by PM id for reordering later
                field_player_segments[pm_id_str] = player
            else:
                # Fallback — treat as field player
                field_player_segments[pm_id_str] = player

        # ── Reorder field players to match the frontend's formation-slot order ──
        # The frontend sends player IDs in slot order (e.g. for 4-3-3:
        #   slots 2-5 = DEF, slots 6-8 = MID, slots 9-11 = ATT).
        # We must preserve this ordering so the formation split puts each
        # player in the correct line (defender/midfielder/attacker).
        # Guest entries (``__guest__``) are inserted as anonymous PlayerSegments.
        ordered_field_players: list[PlayerSegment] = []
        _guest_seq = 0  # sequential counter across all guest slots
        for pid in ordered_player_ids:
            if pid == GUEST:
                guest = PlayerSegment(
                    slot=0,
                    position="",
                    functional_role="",
                    member_id=f"__guest__{_guest_seq}",
                    member_name="Gast",
                    jersey_number=None,
                    kit_url=guest_kit_url,
                    intro_url=None,
                    closeup_url=guest_closeup_url,
                    x=50,
                    y=50,
                    is_guest_player=True,
                )
                ordered_field_players.append(guest)
                _guest_seq += 1
            elif pid in field_player_segments:
                ordered_field_players.append(field_player_segments.pop(pid))
        # Append any remaining field players not in the ordered list (safety net)
        for seg in field_player_segments.values():
            ordered_field_players.append(seg)

        # ── Also handle guest goalkeepers ──
        for _i in range(gk_guest_count):
            guest_gk = PlayerSegment(
                slot=0,
                position="GK",
                functional_role="keeper",
                member_id=f"__guest_gk_{_i}",
                member_name="Gast",
                jersey_number=None,
                kit_url=guest_kit_url,
                intro_url=None,
                closeup_url=guest_closeup_url,
                x=50,
                y=line_y_positions["keeper"],
                is_guest_player=True,
            )
            keepers.append(guest_gk)

        # Split field players by formation counts (from DB or fallback)
        n_def, n_mid, _n_att = _get_formation_splits(self.formation)
        defenders: list[PlayerSegment] = []
        midfielders: list[PlayerSegment] = []
        attackers: list[PlayerSegment] = []

        for i, p in enumerate(ordered_field_players):
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
            f"Formation-split ({self.formation}):"
            f" D={len(defenders)} M={len(midfielders)}"
            f" A={len(attackers)}"
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
            brand_primary=brand_primary,
            brand_secondary=brand_secondary,
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

    def _build_segments(self, data: LineupData, *, cache: ImageCache | None = None) -> list[dict]:
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
                logger.warning(
                    "No stadium_background BrandAsset — generating synthetic field background",
                    extra={"debug_trace": self._debug_trace},
                )
                from src.video.services._common import FALLBACK_BG_PORTRAIT
                from src.video.services.header_generator import generate_field_background

                background_url = generate_field_background(width=FALLBACK_BG_PORTRAIT[0], height=FALLBACK_BG_PORTRAIT[1])
                data.field_background_url = background_url

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
                        cache=cache,
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
                    for _, p in enumerate(players):
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
                            cache=cache,
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
                logger.debug(
                    "Adding segments for player %s: kit=%s, intro=%s, closeup=%s",
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
        from src.video.services.brand_resolver import get_presigned_url

        url = get_presigned_url(storage_path)
        if storage_path and not url:
            self._debug_trace.append(
                f"Presign returned None for {storage_path}"
            )
        return url

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
            from files.utils import get_storage_backend

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
        import shutil
        import subprocess
        import tempfile
        import uuid
        from pathlib import Path

        import requests as req
        from files.utils import get_storage_backend

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

                # Use eof_action=repeat to hold the last frame
                # of the overlay if it ends before the background.
                # This prevents the video from disappearing or
                # cutting short.
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
    formation: str = "4-3-3",
) -> dict:
    """Convenience function to build lineup video config.

    Args:
        activity_id: The match/activity UUID
        template_id: Optional ContentTemplate ID
        output_resolution: Resolution preset
        selected_member_ids: Optional list of member IDs from frontend
        formation: Formation string (4-3-3, 4-4-2, 3-4-3)

    Returns:
        Config dict ready for LineupProcessor
    """
    builder = LineupSegmentBuilder(
        activity_id=activity_id,
        template_id=template_id,
        output_resolution=output_resolution,
        selected_member_ids=selected_member_ids,
        formation=formation,
    )
    return builder.build()
