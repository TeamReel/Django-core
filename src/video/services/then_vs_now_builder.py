"""Builder for Then vs Now data.

Extracts data-gathering logic from ThenVsNowProcessor into a standalone
builder, following the same pattern as LineupSegmentBuilder and
GoalCelebrationBuilder.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from src.video.services.then_vs_now_composer import MemberClip, MemberPhotoComposite

logger = logging.getLogger(__name__)


@dataclass
class ThenVsNowData:
    """All data needed to compose a Then vs Now video."""

    team_name: str
    season_name: str | None
    brand_color: str | None
    logo_url: str | None
    background_url: str
    sponsor_url: str | None
    video_type: str
    composition_style: str | None = None
    members: list[MemberClip] | list[MemberPhotoComposite] = field(default_factory=list)


class ThenVsNowBuilder:
    """Gather Then vs Now data from the database.

    Usage::

        builder = ThenVsNowBuilder(
            project_id=project_id,
            video_type="sidebyside",
        )
        data = builder.gather_data()
    """

    def __init__(
        self,
        project_id: str,
        video_type: str,
        selected_member_ids: list[str] | None = None,
        member_variant_keys: dict[str, str] | None = None,
        composition_style: str | None = None,
        period_id: str | None = None,
        background_url_override: str | None = None,
    ) -> None:
        self.project_id = project_id
        self.video_type = video_type
        self.selected_member_ids = selected_member_ids or []
        self.member_variant_keys = member_variant_keys
        self.composition_style = composition_style
        self.period_id = period_id
        self.background_url_override = background_url_override

    # ── public API ──────────────────────────────────────────────

    def gather_data(self) -> ThenVsNowData:
        """Query database and return typed ThenVsNowData."""
        from django.apps import apps

        from src.video.services.brand_resolver import BrandResolver

        Project = apps.get_model("projects", "Project")  # noqa: N806
        ProjectMembership = apps.get_model("projects", "ProjectMembership")  # noqa: N806

        # ── Team / club projects ──
        project = Project.objects.select_related("parent_project", "organisation").get(
            id=self.project_id
        )
        team_name = project.name

        # ── Season / period name ──
        season_name = self._resolve_season_name()

        # ── Brand resolution ──
        organisation = getattr(project, "organisation", None)
        resolver = BrandResolver.for_project(project, organisation)

        # ── Background URL (prefer config override, then brand asset) ──
        background_url = self.background_url_override
        if not background_url:
            bg_types = (
                ["club_background", "stadium_background"]
                if self.video_type == "photo_composite"
                else ["stadium_background"]
            )
            background_url = resolver.resolve_asset_url(bg_types)
        if not background_url:
            logger.warning(
                "No stadium_background BrandAsset — generating synthetic field background",
            )
            from src.video.services._common import FALLBACK_BG_PORTRAIT
            from src.video.services.header_generator import generate_field_background

            background_url = generate_field_background(width=FALLBACK_BG_PORTRAIT[0], height=FALLBACK_BG_PORTRAIT[1])

        # ── Club logo / sponsor / brand color ──
        logo_url = resolver.resolve_asset_url(["logo"], skip_team=True)
        sponsor_url = resolver.resolve_asset_url(["sponsor_logo"])
        brand_color, _ = resolver.resolve_brand_colors(project)

        # ── Members ──
        qs = ProjectMembership.objects.filter(project=project).select_related("user")
        if self.selected_member_ids:
            qs = qs.filter(id__in=self.selected_member_ids)

        members = self._gather_members(qs)

        # Sort by the order specified in selected_member_ids
        if self.selected_member_ids:
            order_map = {mid: idx for idx, mid in enumerate(self.selected_member_ids)}
            members.sort(key=lambda m: order_map.get(m.member_id, len(self.selected_member_ids)))
        else:
            members.sort(key=lambda m: m.name)

        logger.info(
            "then_vs_now_gather: found %d qualifying members (type=%s, project=%s)",
            len(members),
            self.video_type,
            team_name,
        )

        return ThenVsNowData(
            team_name=team_name,
            season_name=season_name,
            brand_color=brand_color,
            logo_url=logo_url,
            background_url=background_url,
            sponsor_url=sponsor_url,
            video_type=self.video_type,
            composition_style=self.composition_style,
            members=members,
        )

    # ── private helpers ─────────────────────────────────────────

    def _resolve_season_name(self) -> str | None:
        """Resolve season name from period_id."""
        if not self.period_id:
            return None
        try:
            from django.apps import apps

            Period = apps.get_model("periods", "Period")  # noqa: N806
            period = Period.objects.get(id=self.period_id)
            return period.name
        except Exception as e:
            logger.info("Failed to fetch period: %s", e)
            return None

    def _gather_members(
        self, qs: object
    ) -> list[MemberClip] | list[MemberPhotoComposite]:
        """Dispatch to the right member-gathering branch."""
        if self.composition_style == "cover":
            return self._gather_cover_members(qs)
        if self.composition_style == "overlay":
            return self._gather_overlay_members(qs)
        if self.video_type == "photo_composite":
            return self._gather_photo_composite_members(qs)
        if self.video_type == "duo_portret":
            return self._gather_duo_portret_members(qs)
        if self.video_type == "walking_composite":
            return self._gather_walking_composite_members(qs)
        return self._gather_clip_members(qs)

    def _gather_cover_members(self, qs: object) -> list[MemberClip]:
        """Cover mode: gather RAW AI-generated videos."""
        from src.video.services.asset_processing_specs import get_ffmpeg_best_url

        members: list[MemberClip] = []
        for pm in qs:
            meta = pm.metadata or {}
            videos = meta.get("teamreel_assets", {}).get("videos", {})

            if self.video_type == "sidebyside":
                variant = videos.get("then_vs_now", {}).get("sidebyside")
                if not variant:
                    continue
                from src.video.services.asset_processing_specs import normalize_variant_value

                normalized = normalize_variant_value(variant)
                url = normalized.get("raw") if normalized else None
                if not url:
                    url = get_ffmpeg_best_url(variant)
            else:
                # duo_portret: use raw from photo_composite
                variant_data = videos.get("photo_composite", {}).get("default", {})
                if not variant_data:
                    continue
                url = variant_data.get("raw") if isinstance(variant_data, dict) else variant_data

            url = self._presign_if_needed(url)
            if url:
                name = pm.user.get_full_name() if pm.user else "Unknown"
                members.append(MemberClip(member_id=str(pm.id), name=name, video_url=url))
        return members

    def _gather_overlay_members(self, qs: object) -> list[MemberPhotoComposite]:
        """Overlay mode: gather RVM-processed transparent videos."""
        from src.video.services.asset_processing_specs import get_ffmpeg_best_url

        members: list[MemberPhotoComposite] = []
        for pm in qs:
            meta = pm.metadata or {}
            videos = meta.get("teamreel_assets", {}).get("videos", {})

            if self.video_type == "sidebyside":
                variant = videos.get("then_vs_now", {}).get("sidebyside", {})
                if not isinstance(variant, dict):
                    continue
                state = variant.get("processing_state", "")
                if state != "processed":
                    logger.info(
                        "Skipping %s: sidebyside not processed (state=%s)",
                        pm.user.get_full_name() if pm.user else "?",
                        state,
                    )
                    continue
                url = get_ffmpeg_best_url(variant)
            else:
                # duo_portret: processed from photo_composite
                variant_data = videos.get("photo_composite", {}).get("default", {})
                if not variant_data or not isinstance(variant_data, dict):
                    continue
                state = variant_data.get("processing_state", "")
                if state != "processed":
                    logger.info(
                        "Skipping %s: photo_composite not processed (state=%s)",
                        pm.user.get_full_name() if pm.user else "?",
                        state,
                    )
                    continue
                url = get_ffmpeg_best_url(variant_data)

            url = self._presign_if_needed(url)
            if url:
                name = pm.user.get_full_name() if pm.user else "Unknown"
                members.append(
                    MemberPhotoComposite(
                        member_id=str(pm.id), name=name, transparent_video_url=url,
                    )
                )
        return members

    def _gather_photo_composite_members(self, qs: object) -> list[MemberPhotoComposite]:
        """Photo composite: gather pre-processed transparent videos."""
        from src.video.services.asset_processing_specs import get_ffmpeg_best_url

        members: list[MemberPhotoComposite] = []
        for pm in qs:
            meta = pm.metadata or {}
            videos = meta.get("teamreel_assets", {}).get("videos", {})
            variant_data = videos.get("photo_composite", {}).get("default", {})
            if not variant_data:
                continue

            if isinstance(variant_data, str):
                video_url = variant_data
            else:
                processing_state = variant_data.get("processing_state", "")
                if processing_state != "processed":
                    logger.info(
                        "Skipping %s: photo_composite not yet processed (state=%s)",
                        pm.user.get_full_name() if pm.user else "?",
                        processing_state,
                    )
                    continue
                video_url = get_ffmpeg_best_url(variant_data)

            video_url = self._presign_if_needed(video_url)
            if video_url:
                name = pm.user.get_full_name() if pm.user else "Unknown"
                members.append(
                    MemberPhotoComposite(
                        member_id=str(pm.id), name=name, transparent_video_url=video_url,
                    )
                )
        return members

    def _gather_duo_portret_members(self, qs: object) -> list[MemberClip]:
        """Duo Portret: use RAW AI-generated video (not RVM-processed)."""
        members: list[MemberClip] = []
        for pm in qs:
            meta = pm.metadata or {}
            videos = meta.get("teamreel_assets", {}).get("videos", {})
            variant_data = videos.get("photo_composite", {}).get("default", {})
            if not variant_data:
                continue

            if isinstance(variant_data, str):
                video_url = variant_data
            else:
                video_url = variant_data.get("raw") or None

            video_url = self._presign_if_needed(video_url)
            if video_url:
                name = pm.user.get_full_name() if pm.user else "Unknown"
                members.append(MemberClip(member_id=str(pm.id), name=name, video_url=video_url))
        return members

    def _gather_walking_composite_members(self, qs: object) -> list[MemberPhotoComposite]:
        """Walking Composite: gather pre-processed transparent walking videos."""
        from src.video.services.asset_processing_specs import get_ffmpeg_best_url

        members: list[MemberPhotoComposite] = []
        for pm in qs:
            meta = pm.metadata or {}
            videos = meta.get("teamreel_assets", {}).get("videos", {})
            variant_data = videos.get("walking_composite", {}).get("default", {})
            if not variant_data:
                continue

            if isinstance(variant_data, str):
                video_url = variant_data
            else:
                processing_state = variant_data.get("processing_state", "")
                if processing_state != "processed":
                    logger.info(
                        "Skipping %s: walking_composite not yet processed (state=%s)",
                        pm.user.get_full_name() if pm.user else "?",
                        processing_state,
                    )
                    continue
                video_url = get_ffmpeg_best_url(variant_data)

            video_url = self._presign_if_needed(video_url)
            if video_url:
                name = pm.user.get_full_name() if pm.user else "Unknown"
                members.append(
                    MemberPhotoComposite(
                        member_id=str(pm.id), name=name, transparent_video_url=video_url,
                    )
                )
        return members

    def _gather_clip_members(self, qs: object) -> list[MemberClip]:
        """Default: gather sidebyside / transformation video clips."""
        from src.video.services.asset_processing_specs import get_ffmpeg_best_url

        members: list[MemberClip] = []
        for pm in qs:
            meta = pm.metadata or {}
            videos = meta.get("teamreel_assets", {}).get("videos", {})
            then_vs_now = videos.get("then_vs_now", {})

            variant = self._find_variant(then_vs_now, str(pm.id))
            if not variant:
                continue

            if self.video_type == "sidebyside":
                from src.video.services.asset_processing_specs import normalize_variant_value

                normalized = normalize_variant_value(variant)
                url = normalized.get("raw") if normalized else None
                if not url:
                    url = get_ffmpeg_best_url(variant)
            else:
                url = get_ffmpeg_best_url(variant)

            url = self._presign_if_needed(url)
            if url:
                name = pm.user.get_full_name() if pm.user else "Unknown"
                members.append(MemberClip(member_id=str(pm.id), name=name, video_url=url))
        return members

    def _find_variant(self, then_vs_now: dict, member_id: str) -> dict | str | None:
        """Find the best video variant for a then_vs_now member."""
        if self.video_type == "sidebyside":
            return then_vs_now.get("sidebyside")

        if self.video_type == "transformation":
            explicit_key = (self.member_variant_keys or {}).get(member_id)
            if explicit_key and explicit_key in then_vs_now:
                return then_vs_now[explicit_key]
            # Prefer RVM-processed transformation variants
            best = None
            for key in list(then_vs_now.keys()):
                if key == "transformation" or key.startswith("transformation_"):
                    candidate = then_vs_now[key]
                    if isinstance(candidate, dict) and candidate.get("processed_source"):
                        return candidate  # RVM-processed is best
                    if best is None:
                        best = candidate
            return best

        return then_vs_now.get(self.video_type)

    @staticmethod
    def _presign_if_needed(url: str | None) -> str | None:
        """Presign relative storage paths into signed URLs."""
        from src.video.services.brand_resolver import get_presigned_url

        return get_presigned_url(url) if url else None
