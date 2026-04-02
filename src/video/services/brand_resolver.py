"""Shared brand resolution utilities for video services.

Centralises the brand profile → brand asset → presigned URL resolution
pattern that was duplicated across lineup_builder, goal_celebration_builder,
and match_flyer_generator.

Usage:
    resolver = BrandResolver(project, organisation)
    logo_url = resolver.resolve_asset_url(["logo"], skip_team=True)
    opponent_url = resolver.resolve_opponent_logo(activity)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from src.video.services._common import DEFAULT_SECONDARY_COLOR

logger = logging.getLogger(__name__)


def get_presigned_url(storage_path: str) -> str | None:
    """Generate a presigned URL for an S3 storage path.

    Returns the path unchanged if it's already a full URL.
    """
    if not storage_path:
        return None

    if storage_path.startswith(("http://", "https://")):
        return storage_path

    try:
        from files.utils import get_storage_backend

        backend = get_storage_backend()
        return backend.get_url(storage_path, signed=True, expiry_seconds=3600)
    except Exception:  # noqa: BLE001
        logger.warning("Failed to generate presigned URL for %s", storage_path)
        return None


@dataclass
class BrandResolver:
    """Resolves brand assets (logos, sponsors, backgrounds) for a project.

    Collects BrandProfiles in priority order (team → club → org) and
    resolves BrandAsset URLs with presigned-URL fallback.
    """

    brand_profiles: list[Any] = field(default_factory=list)
    team_brand: Any = None
    _club_org_profiles: list[Any] = field(default_factory=list)

    @classmethod
    def for_project(cls, project: Any, organisation: Any = None) -> BrandResolver:
        """Build a BrandResolver from a project and optional organisation.

        Collects active BrandProfiles in priority order:
        1. Team brand (project level)
        2. Club brand (parent_project level)
        3. Organisation brand
        """
        from django.apps import apps

        BrandProfile = apps.get_model("branding", "BrandProfile")

        profiles: list[Any] = []
        team_brand = BrandProfile.objects.filter(project=project, is_active=True).first()
        if team_brand:
            profiles.append(team_brand)

        club_project = getattr(project, "parent_project", None)
        if club_project:
            club_brand = BrandProfile.objects.filter(
                project=club_project, is_active=True
            ).first()
            if club_brand and club_brand not in profiles:
                profiles.append(club_brand)

        if organisation is None:
            organisation = getattr(project, "organisation", None)
        if organisation:
            org_brand = BrandProfile.objects.filter(
                organisation=organisation, is_active=True
            ).first()
            if org_brand and org_brand not in profiles:
                profiles.append(org_brand)

        club_org = [p for p in profiles if p != team_brand]

        return cls(
            brand_profiles=profiles,
            team_brand=team_brand,
            _club_org_profiles=club_org,
        )

    def resolve_asset_url(
        self,
        asset_types: list[str],
        *,
        skip_team: bool = False,
    ) -> str | None:
        """Resolve the first matching BrandAsset URL for the given asset types.

        Args:
            asset_types: Ordered list of asset_type values to try (first match wins).
            skip_team: If True, only search club/org profiles (useful for logos
                       that should always come from the club level).

        Returns:
            Presigned URL string, or None if no matching asset found.
        """
        from django.apps import apps

        BrandAsset = apps.get_model("branding", "BrandAsset")

        profiles = self._club_org_profiles if skip_team else self.brand_profiles

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
                    # Skip zero-byte / missing files (broken seed data).
                    if asset.file and getattr(asset.file, "file_size", 0) in (None, 0):
                        asset = None
                        continue
                    break

            if not asset:
                continue

            # Prefer the API-facing URL if already persisted.
            asset_url = getattr(asset, "url", None)
            if asset_url:
                return asset_url

            if asset.file:
                presigned = get_presigned_url(asset.file.storage_path)
                if presigned:
                    return presigned

        return None

    def resolve_opponent_logo(self, activity: Any) -> str | None:
        """Resolve the opponent club's logo URL from their brand profile.

        Args:
            activity: Activity instance with opponent_project relation.

        Returns:
            Presigned URL string for the opponent logo, or None.
        """
        from django.apps import apps

        BrandProfile = apps.get_model("branding", "BrandProfile")
        BrandAsset = apps.get_model("branding", "BrandAsset")

        opponent_project = getattr(activity, "opponent_project", None)
        if not opponent_project:
            return None

        opp_club = getattr(opponent_project, "parent_project", None)
        if not opp_club:
            return None

        opp_brand = BrandProfile.objects.filter(project=opp_club, is_active=True).first()
        if not opp_brand:
            return None

        asset = (
            BrandAsset.objects.filter(
                profile=opp_brand,
                asset_type="logo",
                is_active=True,
            )
            .select_related("file")
            .first()
        )
        if not asset:
            return None

        asset_url = getattr(asset, "url", None)
        if asset_url:
            return asset_url

        if asset.file:
            return get_presigned_url(asset.file.storage_path)

        return None

    def resolve_brand_colors(self, project: Any) -> tuple[str, str]:
        """Resolve brand primary and secondary colors.

        Searches club (parent_project) first, then team, then org.

        Returns:
            Tuple of (primary_color, secondary_color) with safe defaults.
        """
        from django.apps import apps

        BrandProfile = apps.get_model("branding", "BrandProfile")

        primary = "#333333"
        secondary = DEFAULT_SECONDARY_COLOR

        # Search club (parent_project) first, then team
        search_projects = []
        parent = getattr(project, "parent_project", None)
        if parent:
            search_projects.append(parent)
        search_projects.append(project)

        for proj in search_projects:
            if not proj:
                continue
            brand = BrandProfile.objects.filter(project=proj, is_active=True).first()
            if brand:
                tokens = brand.get_tokens()
                if tokens.get("primary_color"):
                    primary = tokens["primary_color"]
                    if tokens.get("secondary_color"):
                        secondary = tokens["secondary_color"]
                    return primary, secondary

        # Fallback: org-level brand
        org = getattr(project, "organisation", None)
        if org:
            brand = BrandProfile.objects.filter(organisation=org, is_active=True).first()
            if brand:
                tokens = brand.get_tokens()
                if tokens.get("primary_color"):
                    primary = tokens["primary_color"]
                if tokens.get("secondary_color"):
                    secondary = tokens["secondary_color"]

        return primary, secondary


# ── Shared data-gathering shortcut ─────────────────────────────────────────


@dataclass
class MatchBrandAssets:
    """All common brand + match context data shared by every builder."""

    activity: Any
    project: Any
    organisation: Any
    resolver: BrandResolver
    logo_url: str | None
    sponsor_url: str | None
    field_background_url: str | None
    opponent_logo_url: str | None
    brand_primary: str
    brand_secondary: str
    # MatchContext fields
    match_date: str | None
    kickoff_time: str | None
    own_team_name: str
    opponent_name: str
    is_home: bool
    venue: str | None
    season_name: str | None
    competition_name: str | None
    own_club_name: str | None = None
    opponent_club_name: str | None = None
    score_home: int | None = None
    score_away: int | None = None
    activity_id: str | None = None


def resolve_match_brand_assets(activity_id: str) -> MatchBrandAssets:
    """One-shot resolution of Activity + brand assets + match context.

    Replaces the ~15-line brand resolution boilerplate that was previously
    duplicated across every builder and generator.
    """
    from django.apps import apps

    from src.video.services.match_context import resolve_match_context

    Activity = apps.get_model("activities", "Activity")  # noqa: N806

    activity = Activity.objects.select_related(
        "project__organisation",
        "project__parent_project",
        "period",
        "period__parent_period",
        "opponent_project__parent_project",
    ).get(id=activity_id)

    project = activity.project
    organisation = project.organisation

    resolver = BrandResolver.for_project(project, organisation)

    logo_url = resolver.resolve_asset_url(["logo"], skip_team=True)
    sponsor_url = resolver.resolve_asset_url(["sponsor_logo"])
    field_background_url = resolver.resolve_asset_url(["stadium_background"])
    opponent_logo_url = resolver.resolve_opponent_logo(activity)
    brand_primary, brand_secondary = resolver.resolve_brand_colors(project)

    ctx = resolve_match_context(activity)

    return MatchBrandAssets(
        activity=activity,
        project=project,
        organisation=organisation,
        resolver=resolver,
        logo_url=logo_url,
        sponsor_url=sponsor_url,
        field_background_url=field_background_url,
        opponent_logo_url=opponent_logo_url,
        brand_primary=brand_primary,
        brand_secondary=brand_secondary,
        match_date=ctx.match_date,
        kickoff_time=ctx.kickoff_time,
        own_team_name=ctx.own_team_name,
        opponent_name=ctx.opponent_name,
        is_home=ctx.is_home,
        venue=ctx.venue,
        season_name=ctx.season_name,
        competition_name=ctx.competition_name,
        own_club_name=ctx.own_club_name,
        opponent_club_name=ctx.opponent_club_name,
        score_home=ctx.score_home,
        score_away=ctx.score_away,
        activity_id=ctx.activity_id,
    )
