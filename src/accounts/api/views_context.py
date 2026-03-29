"""User context views — auth_me, default context resolution."""
from __future__ import annotations

import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.serializers import UserListSerializer

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_me(request):
    """
    Get current authenticated user profile.

    Returns:
        200 OK: User profile (id, email, first_name, last_name, role, email_verified, is_active)
        401 Unauthorized: Session expired or not authenticated
    """
    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    serializer = UserListSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_default_context(request):
    """Return a deterministic default TeamReel navigation context for the current user.

    This is designed for the frontend sidebar (Panel A) to avoid guessing vanity URL
    segments from the current route or localStorage.

    Selection rules (80/20):
    - Organisation: inferred from team membership if available, else club membership,
      else organisation membership.
    - Club/Team: derived from the first team the user is a member of; club is the
      parent project of that team.
    - Season: current root period for that team (today within start/end); fallback to
      most recent.
    - Competition/Match: choose the next upcoming match; competition is that match's
      period (child under season). Fallback to most recent match.

    Returns 200 with nullable fields; 401 with B13 envelope when unauthenticated.
    """

    import re
    import unicodedata

    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    from django.db.models import Exists, OuterRef

    from accounts.models import UserActiveContext
    from organisations.models import Membership as OrganisationMembership
    from projects.models import ProjectMembership
    from activities.models import Activity, Period

    user = request.user
    now = timezone.now()
    today = timezone.localdate()

    def project_payload(project):
        if not project:
            return None
        parent = project.parent_project
        return {
            "id": project.id,
            "slug": project.slug,
            "name": project.name,
            "parent": (
                {
                    "id": parent.id,
                    "slug": parent.slug,
                    "name": parent.name,
                }
                if parent
                else None
            ),
        }

    def organisation_payload(org):
        if not org:
            return None
        return {"id": str(org.id), "slug": org.slug, "name": org.name}

    def _frontend_slugify(value: str) -> str:
        """Match demo/src/utils/periodPath.ts slugify() for consistent URLs."""

        input_value = str(value or "").strip().lower()
        if not input_value:
            return ""

        normalized = unicodedata.normalize("NFKD", input_value)
        without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")

        cleaned = re.sub(r"[^a-z0-9]+", "-", without_marks)
        cleaned = re.sub(r"^-+|-+$", "", cleaned)
        cleaned = re.sub(r"--+", "-", cleaned)
        return cleaned

    def period_key(period):
        if not period:
            return ""
        return _frontend_slugify(period.name or "") or str(period.id)

    def period_payload(period):
        if not period:
            return None
        return {
            "id": str(period.id),
            "key": period_key(period),
            "name": period.name,
            "start_date": period.start_date,
            "end_date": period.end_date,
        }

    def match_payload(activity):
        if not activity:
            return None
        key = (activity.slug or "").strip() or str(activity.id)
        return {
            "id": str(activity.id),
            "key": key,
            "slug": activity.slug,
            "title": activity.title,
            "start_time": activity.start_time,
        }

    source = {
        "organisation": None,
        "club": None,
        "team": None,
        "season": None,
        "competition": None,
        "match": None,
    }

    organisation = None
    club = None
    team = None

    # Lower levels may be filled by active context or computed later.
    season = None
    competition = None
    match = None

    # 0) If the user explicitly chose an active context, prefer it.
    # We still compute missing lower levels deterministically.
    active_ctx = (
        UserActiveContext.objects.select_related(
            "organisation",
            "club",
            "team",
            "season",
            "competition",
            "match",
            "match__period",
            "match__project",
            "team__parent_project",
            "club__organisation",
        )
        .filter(user=user)
        .first()
    )

    if active_ctx:
        if active_ctx.match_id and active_ctx.match:
            match = active_ctx.match
            competition = getattr(match, "period", None)
            season = getattr(competition, "parent_period", None) if competition else None
            team = getattr(match, "project", None)
            club = getattr(team, "parent_project", None) if team else None
            organisation = getattr(team, "organisation", None) or getattr(
                club, "organisation", None
            )
            source.update(
                {
                    "match": "active_context",
                    "competition": "derived_from_active_match" if competition else None,
                    "season": "derived_from_active_match" if season else None,
                    "team": "derived_from_active_match" if team else None,
                    "club": "derived_from_active_match" if club else None,
                    "organisation": "derived_from_active_match" if organisation else None,
                }
            )

        elif active_ctx.competition_id and active_ctx.competition:
            competition = active_ctx.competition
            season = getattr(competition, "parent_period", None)
            team = getattr(competition, "project", None)
            club = getattr(team, "parent_project", None) if team else None
            organisation = getattr(team, "organisation", None) or getattr(
                club, "organisation", None
            )
            source.update(
                {
                    "competition": "active_context",
                    "season": "derived_from_active_competition" if season else None,
                    "team": "derived_from_active_competition" if team else None,
                    "club": "derived_from_active_competition" if club else None,
                    "organisation": "derived_from_active_competition" if organisation else None,
                }
            )

        elif active_ctx.season_id and active_ctx.season:
            season = active_ctx.season
            team = getattr(season, "project", None)
            club = getattr(team, "parent_project", None) if team else None
            organisation = (
                getattr(season, "organisation", None)
                or getattr(team, "organisation", None)
                or getattr(club, "organisation", None)
            )
            source.update(
                {
                    "season": "active_context",
                    "team": "derived_from_active_season" if team else None,
                    "club": "derived_from_active_season" if club else None,
                    "organisation": "derived_from_active_season" if organisation else None,
                }
            )

        elif active_ctx.team_id and active_ctx.team:
            team = active_ctx.team
            club = getattr(team, "parent_project", None)
            organisation = getattr(team, "organisation", None) or getattr(
                club, "organisation", None
            )
            source.update(
                {
                    "team": "active_context",
                    "club": "derived_from_active_team" if club else None,
                    "organisation": "derived_from_active_team" if organisation else None,
                }
            )

        elif active_ctx.club_id and active_ctx.club:
            club = active_ctx.club
            organisation = getattr(club, "organisation", None)
            source.update(
                {
                    "club": "active_context",
                    "organisation": "derived_from_active_club" if organisation else None,
                }
            )

        elif active_ctx.organisation_id and active_ctx.organisation:
            organisation = active_ctx.organisation
            source.update({"organisation": "active_context"})

    # 1) Prefer: team membership (child project)
    # Primary criterion: pick a team that actually has matches (so the returned
    # season/competition/match are always meaningful for navigation).
    team_memberships_qs = (
        ProjectMembership.objects.active()
        .select_related("project__organisation", "project__parent_project")
        .filter(
            user=user,
            project__is_active=True,
            project__parent_project__isnull=False,
        )
    )
    team_memberships_with_matches = team_memberships_qs.annotate(
        has_matches=Exists(
            Activity.objects.filter(
                project_id=OuterRef("project_id"),
                activity_type="match",
            )
        )
    ).filter(has_matches=True)

    team_membership = (
        team_memberships_with_matches.order_by(
            "project__organisation__slug",
            "project__parent_project__slug",
            "project__slug",
            "created_at",
        ).first()
        or team_memberships_qs.order_by(
            "project__organisation__slug",
            "project__parent_project__slug",
            "project__slug",
            "created_at",
        ).first()
    )
    if team_membership:
        team = team_membership.project
        club = team.parent_project
        organisation = team.organisation
        source["team"] = "project_membership"
        source["club"] = "derived_from_team"
        source["organisation"] = "derived_from_team"

    # 2) Fallback: club membership (root project)
    if not organisation:
        club_membership = (
            ProjectMembership.objects.active()
            .select_related("project__organisation")
            .filter(
                user=user,
                project__is_active=True,
                project__parent_project__isnull=True,
            )
            .order_by("project__organisation__slug", "project__slug", "created_at")
            .first()
        )
        if club_membership:
            club = club_membership.project
            organisation = club.organisation
            source["club"] = "project_membership"
            source["organisation"] = "derived_from_club"

            # If possible, also pick a team within this club the user is a member of.
            team_membership = (
                ProjectMembership.objects.active()
                .select_related("project__organisation", "project__parent_project")
                .filter(
                    user=user,
                    project__is_active=True,
                    project__parent_project_id=club.id,
                )
                .order_by("project__slug", "created_at")
                .first()
            )
            if team_membership:
                team = team_membership.project
                source["team"] = "project_membership"

    # 3) Fallback: organisation membership
    if not organisation:
        org_membership = (
            OrganisationMembership.objects.filter(
                user=user, is_active=True, organisation__is_active=True
            )
            .select_related("organisation")
            .order_by("organisation__slug", "joined_at")
            .first()
        )
        if org_membership:
            organisation = org_membership.organisation
            source["organisation"] = "organisation_membership"

    # 4) Resolve season/competition/match
    # These may have been set by active context above; if not, compute lower levels.

    if organisation and team:
        match_qs = Activity.objects.filter(
            project=team,
            activity_type="match",
        ).select_related("period")

        # Prefer season scoped on the membership (TeamReel-specific), but only if
        # that season actually contains matches.
        membership_season = None
        if getattr(team_membership, "period_id", None):
            scoped_period = team_membership.period
            if (
                scoped_period
                and scoped_period.organisation_id == organisation.id
                and scoped_period.project_id == team.id
                and scoped_period.parent_period_id is None
            ):
                membership_season = scoped_period

        if (
            season
            and getattr(season, "parent_period_id", None) is None
            and season.project_id == team.id
        ):
            # Season explicitly selected (active context). Prefer next match within it.
            source["season"] = source["season"] or "active_context"
            match = (
                match_qs.filter(period__parent_period=season)
                .filter(start_time__gte=now)
                .order_by("start_time")
                .first()
            )
            if match:
                source["match"] = source["match"] or "next_upcoming"
            else:
                match = (
                    match_qs.filter(period__parent_period=season)
                    .filter(start_time__lt=now)
                    .order_by("-start_time")
                    .first()
                )
                if match:
                    source["match"] = source["match"] or "most_recent_past"

            if match and match.period_id:
                competition = match.period
                source["competition"] = source["competition"] or "from_match"

        elif (
            competition
            and getattr(competition, "parent_period_id", None)
            and getattr(competition, "project_id", None) == team.id
        ):
            # Competition explicitly selected (active context). Prefer next match within it.
            source["competition"] = source["competition"] or "active_context"
            match = (
                match_qs.filter(period=competition)
                .filter(start_time__gte=now)
                .order_by("start_time")
                .first()
            )
            if match:
                source["match"] = source["match"] or "next_upcoming"
            else:
                match = (
                    match_qs.filter(period=competition)
                    .filter(start_time__lt=now)
                    .order_by("-start_time")
                    .first()
                )
                if match:
                    source["match"] = source["match"] or "most_recent_past"

            season = getattr(competition, "parent_period", None)
            if season:
                source["season"] = source["season"] or "from_competition"

        elif (
            membership_season and match_qs.filter(period__parent_period=membership_season).exists()
        ):
            season = membership_season
            source["season"] = "membership_period"
            match = (
                match_qs.filter(period__parent_period=season)
                .filter(start_time__gte=now)
                .order_by("start_time")
                .first()
            )
            if match:
                source["match"] = "next_upcoming"
            else:
                match = (
                    match_qs.filter(period__parent_period=season)
                    .filter(start_time__lt=now)
                    .order_by("-start_time")
                    .first()
                )
                if match:
                    source["match"] = "most_recent_past"

            if match and match.period_id:
                competition = match.period
                source["competition"] = "from_match"
        else:
            # Primary criterion: pick a match first (across seasons), then derive
            # competition + season from that match.
            match = match_qs.filter(start_time__gte=now).order_by("start_time").first()
            if match:
                source["match"] = "next_upcoming"
            else:
                match = match_qs.filter(start_time__lt=now).order_by("-start_time").first()
                if match:
                    source["match"] = "most_recent_past"

            if match and match.period_id:
                competition = match.period
                source["competition"] = "from_match"
                if getattr(competition, "parent_period_id", None):
                    season = competition.parent_period
                    source["season"] = "from_match"

        # If we still don't have a season (no matches), fall back deterministically.
        if not season:
            season_qs = Period.objects.filter(
                organisation=organisation,
                project=team,
                parent_period__isnull=True,
            )
            season = (
                season_qs.filter(start_date__lte=today, end_date__gte=today)
                .order_by("-start_date", "name")
                .first()
            )
            if season:
                source["season"] = source["season"] or "current_by_date"
            else:
                season = season_qs.order_by("-end_date", "-start_date", "name").first()
                if season:
                    source["season"] = source["season"] or "most_recent"

        if season and not competition:
            competition = (
                Period.objects.filter(
                    organisation=organisation,
                    project=team,
                    parent_period=season,
                )
                .order_by("start_date", "name")
                .first()
            )
            if competition:
                source["competition"] = "first_child_period"

    return Response(
        {
            "computed_at": now.isoformat(),
            "organisation": organisation_payload(organisation),
            "club": project_payload(club),
            "team": project_payload(team),
            "season": period_payload(season),
            "competition": period_payload(competition),
            "match": match_payload(match),
            "source": source,
        },
        status=status.HTTP_200_OK,
    )

