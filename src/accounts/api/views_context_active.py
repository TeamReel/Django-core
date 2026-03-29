"""Active context view — get/update user's active TeamReel navigation context."""

from __future__ import annotations

import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def auth_active_context(request):
    """Get or update the authenticated user's active TeamReel context."""

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

    import re
    import unicodedata

    from django.db import transaction
    from organisations.models import Membership as OrganisationMembership
    from projects.models import Project, ProjectMembership
    from activities.models import Activity, Period
    from accounts.models import UserActiveContext

    user = request.user

    def _frontend_slugify(value: str) -> str:
        input_value = str(value or "").strip().lower()
        if not input_value:
            return ""

        normalized = unicodedata.normalize("NFKD", input_value)
        without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")

        cleaned = re.sub(r"[^a-z0-9]+", "-", without_marks)
        cleaned = re.sub(r"^-+|-+$", "", cleaned)
        cleaned = re.sub(r"--+", "-", cleaned)
        return cleaned

    def period_key(period: Period | None) -> str:
        if not period:
            return ""
        return _frontend_slugify(period.name or "") or str(period.id)

    def organisation_payload(org):
        if not org:
            return None
        return {"id": str(org.id), "slug": org.slug, "name": org.name}

    def project_payload(project):
        if not project:
            return None
        return {"id": str(project.id), "slug": project.slug, "name": project.name}

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

    def user_label(u) -> str:
        if not u:
            return ""
        name = str(getattr(u, "name", "") or "").strip()
        if name:
            return name
        first = str(getattr(u, "first_name", "") or "").strip()
        last = str(getattr(u, "last_name", "") or "").strip()
        full = f"{first} {last}".strip()
        if full:
            return full
        return str(getattr(u, "email", "") or "").strip()

    def membership_payload(m: ProjectMembership | None):
        if not m:
            return None
        return {
            "id": str(m.id),
            "role": str(getattr(m, "role", "") or ""),
            "user": {
                "id": str(getattr(getattr(m, "user", None), "id", "") or ""),
                "name": user_label(getattr(m, "user", None)),
                "email": str(getattr(getattr(m, "user", None), "email", "") or ""),
            },
            "project": project_payload(getattr(m, "project", None)),
            "period": period_payload(getattr(m, "period", None)),
        }

    def user_has_org(org) -> bool:
        if not org:
            return False
        # Superusers have access to everything
        if user.is_superuser:
            return True
        # Check direct organisation membership
        if OrganisationMembership.objects.filter(
            user=user, organisation=org, is_active=True
        ).exists():
            return True
        # Check indirect membership via projects
        has_project_membership = (
            ProjectMembership.objects.active().filter(user=user, project__organisation=org).exists()
        )
        if not has_project_membership:
            # Debug log
            import logging

            logger = logging.getLogger(__name__)
            logger.info(
                f"User {user.id} ({user.email}) has no access to org {org.id} ({org.name}). "
                f"Checking project memberships..."
            )
            # Show which projects the user has access to
            user_projects = list(
                ProjectMembership.objects.active()
                .filter(user=user)
                .values_list("project__id", "project__name", "project__organisation__id")
            )
            logger.info(f"User's projects: {user_projects}")
        return has_project_membership

    def user_has_project(project: Project) -> bool:
        if not project:
            return False
        # Superusers have access to everything
        if user.is_superuser:
            return True
        # Direct project membership
        if ProjectMembership.objects.active().filter(user=user, project=project).exists():
            return True
        # Organisation membership (federation admins)
        if (
            project.organisation
            and OrganisationMembership.objects.filter(
                user=user, organisation=project.organisation, is_active=True
            ).exists()
        ):
            return True
        return False

    def resolve_current_user_membership(team: Project | None, season: Period | None):
        if not team:
            return None

        qs = (
            ProjectMembership.objects.active()
            .select_related(
                "user",
                "project",
                "project__parent_project",
                "project__organisation",
                "period",
            )
            .filter(project=team, user=user)
        )

        if season:
            exact = qs.filter(period=season).first()
            if exact:
                return exact

        return qs.first()

    def ensure_current_user_membership(team: Project | None, season: Period | None):
        """Create/sync the current user's membership for this team+season.

        TeamReel rule: selecting an active season implies an active membership.
        We only do this when the user already has access to the project.
        """
        if not team or not season:
            return None

        if not user_has_project(team):
            return None

        membership = (
            ProjectMembership.objects.active()
            .select_related("user", "project", "period")
            .filter(project=team, user=user)
            .first()
        )
        if membership:
            if getattr(membership, "period_id", None) != getattr(season, "id", None):
                membership.period = season
                membership.save(update_fields=["period", "updated_at"])
            return membership

        # This endpoint is called by multiple frontend components on page load.
        # Avoid 500s if two requests attempt to create the membership concurrently.
        from django.db import IntegrityError

        try:
            return ProjectMembership.objects.create(
                project=team,
                user=user,
                period=season,
                role=ProjectMembership.Role.VIEWER,
                assignment_reason=ProjectMembership.AssignmentReason.ORG_DEFAULT,
            )
        except IntegrityError:
            existing = (
                ProjectMembership.objects.active()
                .select_related("user", "project", "period")
                .filter(project=team, user=user)
                .first()
            )
            if not existing:
                return None

            if getattr(existing, "period_id", None) != getattr(season, "id", None):
                existing.period = season
                existing.save(update_fields=["period", "updated_at"])
            return existing

    def sync_membership_for_context(ctx: UserActiveContext | None) -> ProjectMembership | None:
        """Enforce TeamReel rule: active membership follows active team/season for *this* user."""
        if not ctx:
            return None
        team = getattr(ctx, "team", None)
        season = getattr(ctx, "season", None)
        membership = resolve_current_user_membership(team, season)
        if membership:
            return membership

        # If the user can access the project but has no membership row yet, create one.
        # This supports federation/org admins who are browsing a team/season but still
        # need a stable "Member" detail context.
        return ensure_current_user_membership(team, season)

    def resolve_membership_from_context(ctx: UserActiveContext | None):
        if not ctx:
            return None

        # If a season is active, membership must follow team+season (current user).
        # We do not allow a stored membership from another season to "win".
        team = getattr(ctx, "team", None)
        season = getattr(ctx, "season", None)
        if season or team:
            # For active seasons, enforce the invariant by ensuring a membership exists.
            # (This is a small, intentional side-effect on GET to keep frontend navigation deterministic.)
            if team and season:
                ensured = ensure_current_user_membership(team, season)
                if ensured and user_has_project(getattr(ensured, "project", None)):
                    return ensured

            derived = resolve_current_user_membership(team, season)
            if derived and user_has_project(getattr(derived, "project", None)):
                return derived

        stored = getattr(ctx, "membership", None)
        if stored:
            project = getattr(stored, "project", None)
            if project and user_has_project(project):
                return stored
            return None

        return None

    if request.method == "GET":
        # We may need to enforce invariants (create/sync membership) even on reads.
        with transaction.atomic():
            ctx = (
                UserActiveContext.objects.select_for_update(of=("self",))
                .select_related(
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "match__period",
                    "match__project",
                    "team__parent_project",
                    "membership",
                    "membership__user",
                    "membership__project",
                    "membership__period",
                    "membership__project__parent_project",
                    "membership__project__organisation",
                )
                .filter(user=user)
                .first()
            )

            membership = resolve_membership_from_context(ctx)

            if (
                ctx
                and membership
                and getattr(ctx, "membership_id", None) != getattr(membership, "id", None)
            ):
                ctx.membership = membership
                ctx.save(update_fields=["membership", "updated_at"])

        return Response(
            {
                "updated_at": ctx.updated_at.isoformat() if ctx else None,
                "organisation": organisation_payload(
                    getattr(ctx, "organisation", None) if ctx else None
                ),
                "club": project_payload(getattr(ctx, "club", None) if ctx else None),
                "team": project_payload(getattr(ctx, "team", None) if ctx else None),
                "season": period_payload(getattr(ctx, "season", None) if ctx else None),
                "competition": period_payload(getattr(ctx, "competition", None) if ctx else None),
                "match": match_payload(getattr(ctx, "match", None) if ctx else None),
                "membership": membership_payload(membership),
            },
            status=status.HTTP_200_OK,
        )

    kind = str(request.data.get("kind") or "").strip().lower()
    raw_id = request.data.get("id")
    identifier = str(raw_id or "").strip()

    valid_kinds = {
        "organisation",
        "club",
        "team",
        "season",
        "competition",
        "match",
        "membership",
        "clear",
    }
    if kind not in valid_kinds:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Invalid kind",
                    "details": {
                        "kind": [
                            "Must be one of organisation, club, team, season, competition, match, membership, clear"
                        ]
                    },
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if kind != "clear" and not identifier:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Missing id",
                    "details": {"id": ["This field is required"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        ctx, _ = UserActiveContext.objects.select_for_update(of=("self",)).get_or_create(user=user)

        if kind == "clear":
            ctx.organisation = None
            ctx.club = None
            ctx.team = None
            ctx.season = None
            ctx.competition = None
            ctx.match = None
            ctx.membership = None
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind == "organisation":
            from django.core.exceptions import ValidationError
            from organisations.models import Organisation

            org = Organisation.objects.filter(slug=identifier).first()
            if not org:
                try:
                    org = Organisation.objects.filter(id=identifier).first()
                except (ValidationError, ValueError, TypeError):
                    org = None

            if not org or not user_has_org(org):
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You do not have access to this organisation.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            ctx.organisation = org
            ctx.club = None
            ctx.team = None
            ctx.season = None
            ctx.competition = None
            ctx.match = None
            ctx.membership = None
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind in {"club", "team"}:
            project = (
                Project.objects.filter(slug=identifier).first()
                or Project.objects.filter(id=identifier).first()
            )
            if not project:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Project not found",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            if kind == "team":
                if not user_has_project(project):
                    return Response(
                        {
                            "status": "error",
                            "error": {
                                "code": "permission_denied",
                                "message": "You do not have access to this team.",
                                "details": {},
                            },
                            "meta": {"timestamp": timezone.now().isoformat()},
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                ctx.organisation = project.organisation
                ctx.team = project
                ctx.club = project.parent_project
            else:
                # Club: check direct club access, OR any team under it, OR org membership
                has_direct_access = user_has_project(project)
                has_team_access = (
                    ProjectMembership.objects.active()
                    .filter(user=user, project__parent_project=project)
                    .exists()
                )
                if not (has_direct_access or has_team_access):
                    return Response(
                        {
                            "status": "error",
                            "error": {
                                "code": "permission_denied",
                                "message": "You do not have access to this club.",
                                "details": {},
                            },
                            "meta": {"timestamp": timezone.now().isoformat()},
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                ctx.organisation = project.organisation
                ctx.club = project
                ctx.team = None

            ctx.season = None
            ctx.competition = None
            ctx.match = None
            ctx.membership = sync_membership_for_context(ctx)
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind == "membership":
            membership = (
                ProjectMembership.objects.active()
                .select_related(
                    "user",
                    "project",
                    "project__parent_project",
                    "project__organisation",
                    "period",
                    "period__parent_period",
                )
                .filter(id=identifier)
                .first()
            )
            if not membership:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Membership not found",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            membership_project = getattr(membership, "project", None)
            if not membership_project or not user_has_project(membership_project):
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You do not have access to this membership.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Active context membership is always *your* membership.
            if str(getattr(membership, "user_id", "")) != str(user.id):
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You can only set your own membership as active context.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            ctx.team = membership_project
            ctx.club = getattr(membership_project, "parent_project", None)
            ctx.organisation = getattr(membership_project, "organisation", None) or getattr(
                ctx.club, "organisation", None
            )

            member_period = getattr(membership, "period", None)
            if member_period is None:
                ctx.season = None
            elif getattr(member_period, "parent_period_id", None) is None:
                ctx.season = member_period
            else:
                ctx.season = getattr(member_period, "parent_period", None)

            ctx.competition = None
            ctx.match = None
            ctx.membership = sync_membership_for_context(ctx)
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind in {"season", "competition"}:
            period = Period.objects.filter(id=identifier).first()
            if not period:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Period not found",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Require membership to the team/project OR club OR organisation this period belongs to.
            project = getattr(period, "project", None)
            org = getattr(period, "organisation", None)
            if not project or not org:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Period project or organisation not found.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check access: direct team membership, club membership, or org membership
            has_access = user_has_project(project)
            if not has_access and project.parent_project:
                # Period belongs to team, check if user has club access
                has_access = user_has_project(project.parent_project)

            if not has_access:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You do not have access to this period.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            ctx.organisation = org
            ctx.team = project
            ctx.club = getattr(project, "parent_project", None)

            if kind == "season":
                ctx.season = period
                ctx.competition = None
            else:
                ctx.competition = period
                ctx.season = getattr(period, "parent_period", None)

            ctx.match = None
            ctx.membership = sync_membership_for_context(ctx)
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind == "match":
            activity = (
                Activity.objects.filter(id=identifier).select_related("period", "project").first()
            )
            if not activity:
                return Response(
                    {
                        "status": "error",
                        "error": {"code": "not_found", "message": "Match not found", "details": {}},
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            project = getattr(activity, "project", None)
            if not project:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Match project not found.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check access: direct team membership, club membership, or org membership
            has_access = user_has_project(project)
            if not has_access and project.parent_project:
                # Match belongs to team, check if user has club access
                has_access = user_has_project(project.parent_project)

            if not has_access:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You do not have access to this match.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            ctx.organisation = project.organisation
            ctx.team = project
            ctx.club = getattr(project, "parent_project", None)
            ctx.match = activity
            ctx.competition = getattr(activity, "period", None)
            ctx.season = (
                getattr(ctx.competition, "parent_period", None) if ctx.competition else None
            )
            ctx.membership = sync_membership_for_context(ctx)
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

    ctx = (
        UserActiveContext.objects.select_related(
            "organisation",
            "club",
            "team",
            "season",
            "competition",
            "match",
            "membership",
            "membership__user",
            "membership__project",
            "membership__period",
            "membership__project__parent_project",
            "membership__project__organisation",
        )
        .filter(user=user)
        .first()
    )

    membership = resolve_membership_from_context(ctx)

    return Response(
        {
            "updated_at": ctx.updated_at.isoformat() if ctx else None,
            "organisation": organisation_payload(
                getattr(ctx, "organisation", None) if ctx else None
            ),
            "club": project_payload(getattr(ctx, "club", None) if ctx else None),
            "team": project_payload(getattr(ctx, "team", None) if ctx else None),
            "season": period_payload(getattr(ctx, "season", None) if ctx else None),
            "competition": period_payload(getattr(ctx, "competition", None) if ctx else None),
            "match": match_payload(getattr(ctx, "match", None) if ctx else None),
            "membership": membership_payload(membership),
        },
        status=status.HTTP_200_OK,
    )

