"""DRF views for Project management."""

import logging

from django.db.models import Count, IntegerField, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from projects.models import (
    Project,
    ProjectInvite,
    ProjectMembership,
    ProjectMembershipPromotion,
)
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .permissions import IsProjectMemberOrOrgAdmin
from .serializers import (
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectUpdateSerializer,
)

logger = logging.getLogger(__name__)


def _annotate_project_list_counts(queryset):
    """Annotate queryset with count subqueries for ProjectListSerializer.

    Replaces N+1 SerializerMethodField queries (5 per project) with correlated
    subqueries executed in a single SQL statement.

    Each count aggregates across the project itself AND its child projects,
    matching the original get_*_count() logic.
    """
    from activities.models import Activity, Period

    member_count_sq = Subquery(
        ProjectMembership.objects.filter(
            Q(project_id=OuterRef("pk")) | Q(project__parent_project_id=OuterRef("pk"))
        )
        .values(x=Value(1))
        .annotate(cnt=Count("user_id", distinct=True))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    seasons_count_sq = Subquery(
        Period.objects.filter(
            Q(project_id=OuterRef("pk")) | Q(project__parent_project_id=OuterRef("pk")),
            parent_period__isnull=True,
        )
        .values(x=Value(1))
        .annotate(cnt=Count("id"))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    competitions_count_sq = Subquery(
        Period.objects.filter(
            Q(project_id=OuterRef("pk")) | Q(project__parent_project_id=OuterRef("pk")),
            parent_period__isnull=False,
        )
        .values(x=Value(1))
        .annotate(cnt=Count("id"))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    matches_count_sq = Subquery(
        Activity.objects.filter(
            Q(project_id=OuterRef("pk")) | Q(project__parent_project_id=OuterRef("pk")),
            activity_type="match",
        )
        .values(x=Value(1))
        .annotate(cnt=Count("id"))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    sport_variants_count_sq = Subquery(
        Period.objects.filter(
            Q(project_id=OuterRef("pk")) | Q(project__parent_project_id=OuterRef("pk")),
            sport__isnull=False,
            sport__parent_sport__isnull=False,
        )
        .values(x=Value(1))
        .annotate(cnt=Count("sport_id", distinct=True))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    return queryset.annotate(
        member_count=Coalesce(member_count_sq, Value(0)),
        seasons_count=Coalesce(seasons_count_sq, Value(0)),
        competitions_count=Coalesce(competitions_count_sq, Value(0)),
        matches_count=Coalesce(matches_count_sq, Value(0)),
        sport_variants_count=Coalesce(sport_variants_count_sq, Value(0)),
    )


def _safe_check_permission(
    *, user_id: int, permission_code: str, resource_type: str, resource_id: int
) -> bool:
    """Wrapper around permissions.evaluator.check_permission.

    The permission evaluator may depend on external services (e.g. cache) and can raise.
    Member/roster endpoints should never 500 due to evaluator infrastructure issues.
    """

    try:
        from permissions.evaluator import check_permission

        return bool(
            check_permission(
                user_id,
                permission_code,
                resource_type=resource_type,
                resource_id=resource_id,
            )
        )
    except Exception:
        logger.exception(
            "check_permission failed",
            extra={
                "user_id": user_id,
                "permission": permission_code,
                "resource_type": resource_type,
                "resource_id": resource_id,
            },
        )
        return False


class ProjectCursorPagination(CursorPagination):
    """
    Cursor pagination for project lists.

    Uses created_at for ordering to ensure stable pagination.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200  # Reasonable page size - frontend recursively fetches all pages
    ordering = "-created_at"


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for project management.

    Supports both nested (under organisations) and top-level routes.

    Actions:
    - list: GET /api/organisations/{org_slug}/projects/ or /api/projects/
    - create: POST /api/organisations/{org_slug}/projects/
    - retrieve: GET /api/organisations/{org_slug}/projects/{slug}/
      or /api/projects/{slug}/
    - update: PATCH /api/organisations/{org_slug}/projects/{slug}/
      or /api/projects/{slug}/
    - archive: POST /api/organisations/{org_slug}/projects/{slug}/archive/
      or /api/projects/{slug}/archive/
    - restore: POST /api/organisations/{org_slug}/projects/{slug}/restore/
      or /api/projects/{slug}/restore/
    """

    lookup_field = "slug"

    permission_classes = [IsAuthenticated, IsProjectMemberOrOrgAdmin]
    pagination_class = ProjectCursorPagination

    def _has_cross_org_project_view_permission(self) -> bool:
        """True if user has any role assignment granting global project visibility.

        This is intentionally a coarse check (exists anywhere) to support federation
        roles like Land Admin where `project.view_all` should enable discovery across
        organisations.
        """

        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False

        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return True

        try:
            from permissions.models import RoleAssignment
        except ImportError:
            return False

        return RoleAssignment.objects.filter(
            user=user,
            role__permissions__permission__in=["project.view_all", "org.view_all"],
        ).exists()

    def get_object(self):
        """Retrieve a Project by numeric ID or slug.

        Slugs are not necessarily unique within an organisation for child projects (teams).
        In ambiguous cases, callers must use the numeric project ID or the nested team endpoint.
        """

        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        raw_lookup = str(self.kwargs.get(lookup_url_kwarg, "") or "").strip()
        queryset = self.filter_queryset(self.get_queryset())

        # Prefer numeric IDs when provided.
        if raw_lookup.isdigit():
            obj = get_object_or_404(queryset, pk=int(raw_lookup))
            self.check_object_permissions(self.request, obj)
            return obj

        matches = queryset.filter(slug=raw_lookup)
        match_count = matches.count()

        if match_count == 0:
            obj = get_object_or_404(queryset, slug=raw_lookup)
            self.check_object_permissions(self.request, obj)
            return obj

        if match_count > 1:
            raise ValidationError(
                {
                    "slug": [
                        "Project slug is ambiguous within this scope. "
                        "Use the numeric project id, or resolve a team via "
                        "/api/v1/organisations/{org}/projects/{club}/teams/{team}/."
                    ]
                }
            )

        obj = matches.first()
        self.check_object_permissions(self.request, obj)
        return obj

    def retrieve_team_under_club(
        self, request, organisation_id=None, club_slug=None, team_slug=None
    ):
        """Resolve a team project by (organisation, club, team) keys.

        This endpoint is necessary because team slugs are only unique within a club.
        Supports both slugs and numeric IDs for club/team.
        """

        from organisations.models import Organisation

        organisation = get_object_or_404(Organisation, slug=str(organisation_id))

        club_key = str(club_slug or "").strip()
        team_key = str(team_slug or "").strip()

        club_qs = Project.objects.filter(
            organisation_id=organisation.id, parent_project__isnull=True
        )
        if club_key.isdigit():
            club = get_object_or_404(club_qs, pk=int(club_key))
        else:
            club = get_object_or_404(club_qs, slug=club_key)

        team_qs = Project.objects.filter(organisation_id=organisation.id, parent_project_id=club.id)
        if team_key.isdigit():
            team = get_object_or_404(team_qs, pk=int(team_key))
        else:
            team = get_object_or_404(team_qs, slug=team_key)

        self.check_object_permissions(request, team)
        serializer = self.get_serializer(team)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def members(self, request, slug=None, organisation_id=None):
        """
        List users with access to this project.
        Includes:
        1. Users with explicit RoleAssignments on this project.
        2. Organisation Admins (who implicitly have access).
        """
        project = self.get_object()

        # Minimal access control: only project members or admins that can edit team profiles
        if not request.user.is_superuser:
            is_project_member = ProjectMembership.objects.filter(
                project=project,
                user=request.user,
                deleted_at__isnull=True,
            ).exists()

            # TeamReel: rosters live on teams (child projects). Root projects (clubs)
            # are containers and should not expose membership lists to basic viewers.
            is_team_project = project.parent_project_id is not None

            can_edit_team_profiles = _safe_check_permission(
                user_id=request.user.id,
                permission_code="profile.edit_team",
                resource_type="project",
                resource_id=project.id,
            )

            if not ((is_project_member and is_team_project) or can_edit_team_profiles):
                raise PermissionDenied("You do not have access to this project's members.")

        # 1. Role Assignments
        from permissions.models import RoleAssignment, ScopeChoices

        assignments = RoleAssignment.objects.filter(
            target_project=project, scope=ScopeChoices.PROJECT
        ).select_related("user", "role")

        # 2. Org Admins
        from organisations.models import Membership

        org_admins = Membership.objects.filter(
            organisation=project.organisation, role="admin", is_active=True
        ).select_related("user")

        # 3. Project Memberships (TeamReel data layer)
        project_memberships = (
            ProjectMembership.objects.filter(project=project, deleted_at__isnull=True)
            .select_related("user")
            .order_by("-created_at")
        )

        # Combine and format
        members_data = []
        seen_user_ids = set()

        # Add project memberships
        for pm in project_memberships:
            if pm.user.id not in seen_user_ids:
                members_data.append(
                    {
                        "id": str(pm.id),
                        "user": {
                            "id": str(pm.user.id),
                            "email": pm.user.email,
                            "first_name": pm.user.first_name,
                            "last_name": pm.user.last_name,
                        },
                        "role": pm.role,
                        "joined_at": pm.created_at,
                        "source": "project_membership",
                    }
                )
                seen_user_ids.add(pm.user.id)

        # Add explicit assignments
        for ra in assignments:
            if ra.user.id not in seen_user_ids:
                members_data.append(
                    {
                        "id": str(ra.id),  # Use assignment ID as unique key
                        "user": {
                            "id": str(ra.user.id),
                            "email": ra.user.email,
                            "first_name": ra.user.first_name,
                            "last_name": ra.user.last_name,
                        },
                        "role": ra.role.name,  # Use the actual role name (e.g. "Coach", "Player")
                        "joined_at": ra.assigned_at,
                        "source": "assignment",
                    }
                )
                seen_user_ids.add(ra.user.id)

        # Add org admins
        for m in org_admins:
            if m.user.id not in seen_user_ids:
                members_data.append(
                    {
                        "id": str(m.id),
                        "user": {
                            "id": str(m.user.id),
                            "email": m.user.email,
                            "first_name": m.user.first_name,
                            "last_name": m.user.last_name,
                        },
                        "role": "Org Admin",
                        "joined_at": m.joined_at,
                        "source": "membership",
                    }
                )
                seen_user_ids.add(m.user.id)

        return Response({"results": members_data})

    def get_queryset(self):
        """
        Return projects queryset with optimizations.

        For nested routes: filter by organisation_id (slug)
        For top-level routes: filter by user's organisation memberships

        Applies select_related for organisation and creator to minimize queries.
        """
        # For archive/restore actions, include archived projects
        if self.action in ["restore", "archive"]:
            base_queryset = Project.all_objects.select_related(
                "organisation", "creator"
            ).prefetch_related("organisation__memberships")
        else:
            base_queryset = Project.objects.select_related(
                "organisation", "creator"
            ).prefetch_related("organisation__memberships")

        queryset = base_queryset

        # Apply visibility filter for all routes
        user = self.request.user
        has_cross_org_view = (
            user.is_authenticated
            and not user.is_superuser
            and self._has_cross_org_project_view_permission()
        )

        if user.is_authenticated and not user.is_superuser and not has_cross_org_view:
            from permissions.models import RoleAssignment, ScopeChoices

            # 1. Direct org membership
            user_org_ids = user.organisation_memberships.values_list("organisation_id", flat=True)

            # 2. Role Assignments on Projects
            assigned_project_ids = RoleAssignment.objects.filter(
                user=user, scope=ScopeChoices.PROJECT
            ).values_list("target_project_id", flat=True)

            # 2b. Include related hierarchy for project-scoped roles
            # - Team Admin (team project) should be able to see its club container
            assigned_parent_project_ids = Project.all_objects.filter(
                id__in=assigned_project_ids,
                parent_project__isnull=False,
            ).values_list("parent_project_id", flat=True)

            # - Club Admin (club project) should be able to see child teams
            assigned_child_project_ids = Project.all_objects.filter(
                parent_project_id__in=assigned_project_ids
            ).values_list("id", flat=True)

            # 3. Role Assignments on Organisations
            assigned_org_ids = RoleAssignment.objects.filter(
                user=user, scope=ScopeChoices.ORGANIZATION
            ).values_list("target_organization_id", flat=True)

            # 4. Project Memberships (TeamReel data layer)
            membership_project_ids = ProjectMembership.objects.filter(
                user=user, deleted_at__isnull=True
            ).values_list("project_id", flat=True)

            # 4b. Include hierarchy for membership-based access
            # - Team members should be able to see their club container
            membership_parent_project_ids = Project.all_objects.filter(
                id__in=membership_project_ids,
                parent_project__isnull=False,
            ).values_list("parent_project_id", flat=True)

            # - Club admins/members should be able to see child teams
            membership_child_project_ids = Project.all_objects.filter(
                parent_project_id__in=membership_project_ids
            ).values_list("id", flat=True)

            queryset = queryset.filter(
                Q(organisation_id__in=user_org_ids)
                | Q(organisation_id__in=assigned_org_ids)
                | Q(id__in=assigned_project_ids)
                | Q(id__in=assigned_parent_project_ids)
                | Q(id__in=assigned_child_project_ids)
                | Q(id__in=membership_project_ids)
                | Q(id__in=membership_parent_project_ids)
                | Q(id__in=membership_child_project_ids)
            ).distinct()
        else:
            # Ensure distinct results for superusers as well, just in case
            queryset = queryset.distinct()

        # Check if this is a nested route (organisation_id slug in URL)
        organisation_slug = self.kwargs.get("organisation_id")

        if organisation_slug:
            # Nested route: resolve slug to organisation and filter
            from organisations.models import Organisation

            try:
                organisation = Organisation.objects.get(slug=organisation_slug)
                queryset = queryset.filter(organisation_id=organisation.id)
            except Organisation.DoesNotExist:
                # Return empty queryset if organisation not found
                return queryset.none()

        # Handle include_archived query parameter
        include_archived = (
            self.request.query_params.get("include_archived", "false").lower() == "true"
        )

        if include_archived:
            # Use all_objects manager to include archived projects
            queryset = Project.all_objects.select_related(
                "organisation", "creator"
            ).prefetch_related("organisation__memberships")

            # Reapply organisation filter
            if organisation_slug:
                from organisations.models import Organisation

                try:
                    organisation = Organisation.objects.get(slug=organisation_slug)
                    queryset = queryset.filter(organisation_id=organisation.id)
                except Organisation.DoesNotExist:
                    return queryset.none()
            else:
                user = self.request.user
                has_cross_org_view = (
                    user.is_authenticated
                    and not user.is_superuser
                    and self._has_cross_org_project_view_permission()
                )

                if user.is_authenticated and not user.is_superuser and not has_cross_org_view:
                    from permissions.models import RoleAssignment, ScopeChoices

                    # 1. Direct membership
                    user_org_ids = user.organisation_memberships.values_list(
                        "organisation_id", flat=True
                    )

                    # 2. Role Assignments on Projects
                    assigned_project_ids = RoleAssignment.objects.filter(
                        user=user, scope=ScopeChoices.PROJECT
                    ).values_list("target_project_id", flat=True)

                    # 3. Role Assignments on Organisations
                    assigned_org_ids = RoleAssignment.objects.filter(
                        user=user, scope=ScopeChoices.ORGANIZATION
                    ).values_list("target_organization_id", flat=True)

                    queryset = queryset.filter(
                        Q(organisation_id__in=user_org_ids)
                        | Q(id__in=assigned_project_ids)
                        | Q(organisation_id__in=assigned_org_ids)
                    ).distinct()

        # Handle search query parameter
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search)

        # Handle parent_project filtering for clubs/teams distinction
        parent_filter = self.request.query_params.get("parent_project__isnull")
        if parent_filter is not None:
            if parent_filter.lower() in ["true", "1"]:
                # Clubs only (no parent)
                queryset = queryset.filter(parent_project__isnull=True)
            elif parent_filter.lower() in ["false", "0"]:
                # Teams only (has parent)
                queryset = queryset.filter(parent_project__isnull=False)

        # Handle parent_project_id filtering (teams of a specific club)
        parent_project_id = self.request.query_params.get("parent_project_id")
        if parent_project_id:
            queryset = queryset.filter(parent_project_id=parent_project_id)

        # Ensure distinct is always applied to prevent duplicates
        queryset = queryset.distinct()

        # Annotate with count subqueries for list serializer (avoids N+1)
        if self.action == "list":
            queryset = _annotate_project_list_counts(queryset)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            if self._has_cross_org_project_view_permission() and not getattr(
                self.request.user, "is_superuser", False
            ):
                from projects.api.serializers import ProjectPublicListSerializer

                return ProjectPublicListSerializer

            return ProjectListSerializer
        elif self.action in ["update", "partial_update"]:
            return ProjectUpdateSerializer
        return ProjectDetailSerializer

    def get_serializer_context(self):
        """Add organisation to serializer context for nested routes."""
        context = super().get_serializer_context()

        organisation_slug = self.kwargs.get("organisation_id")
        if organisation_slug:
            # For nested routes, fetch the organisation by slug and add to context
            from organisations.models import Organisation

            try:
                organisation = Organisation.objects.get(slug=organisation_slug)
                context["organisation"] = organisation
            except Organisation.DoesNotExist:
                pass

        return context

    def create(self, request, *args, **kwargs):
        """Create a new project."""
        # Ensure organisation is in context
        organisation_slug = self.kwargs.get("organisation_id")
        if not organisation_slug:
            return Response(
                {"detail": "Organisation slug is required for project creation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = super().create(request, *args, **kwargs)

        # Trigger notification on successful creation (best-effort; never fail create)
        if response.status_code == status.HTTP_201_CREATED:
            try:
                from notifications.services import notify_project_created
                from projects.models import Project

                project_id = getattr(response, "data", {}).get("id")
                if project_id:
                    project = Project.objects.get(id=project_id)
                    notify_project_created(project=project, creator=request.user)
            except Exception:
                logger.exception("notify_project_created failed")

        return response

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, *args, **kwargs):
        """
        Archive a project (soft deletion).

        POST /api/organisations/{org_id}/projects/{id}/archive/
        POST /api/projects/{id}/archive/
        """
        project = self.get_object()

        if not project.is_active:
            return Response(
                {"detail": "Project is already archived."}, status=status.HTTP_400_BAD_REQUEST
            )

        project.archive()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, *args, **kwargs):
        """
        Restore an archived project.

        POST /api/organisations/{org_id}/projects/{id}/restore/
        POST /api/projects/{id}/restore/
        """
        project = self.get_object()

        if project.is_active:
            return Response(
                {"detail": "Project is already active."}, status=status.HTTP_400_BAD_REQUEST
            )

        project.restore()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="membership-stats")
    def membership_stats(self, request, pk=None, organisation_slug=None, slug=None):
        """
        Get membership statistics for the project.
        """
        project = self.get_object()

        # Check permissions (only admins should see stats)
        user = request.user
        if not user.is_superuser:
            from permissions.evaluator import check_permission

            can_edit_team_profiles = check_permission(
                user.id,
                "profile.edit_team",
                resource_type="project",
                resource_id=project.id,
            )

            is_org_admin = user.organisation_memberships.filter(
                organisation=project.organisation,
                role="admin",
                is_active=True,
            ).exists()

            is_project_admin = ProjectMembership.objects.filter(
                project=project,
                user=user,
                role=ProjectMembership.Role.ADMIN,
                deleted_at__isnull=True,
            ).exists()

            if not (can_edit_team_profiles or is_org_admin or is_project_admin):
                raise PermissionDenied("Only admins can view membership statistics.")

        # Calculate stats — single query with conditional aggregation
        from django.db.models import Count, Q

        stats = ProjectMembership.objects.filter(
            project=project, deleted_at__isnull=True
        ).aggregate(
            total_members=Count("id"),
            admin_count=Count("id", filter=Q(role=ProjectMembership.Role.ADMIN)),
            editor_count=Count("id", filter=Q(role=ProjectMembership.Role.EDITOR)),
            viewer_count=Count("id", filter=Q(role=ProjectMembership.Role.VIEWER)),
        )

        pending_invites = ProjectInvite.objects.filter(
            project=project,
            status=ProjectInvite.Status.PENDING,
        ).count()

        pending_promotions = ProjectMembershipPromotion.objects.filter(
            project=project,
            status=ProjectMembershipPromotion.Status.PENDING,
        ).count()

        data = {
            "total_members": stats["total_members"],
            "breakdown": {
                "admin": stats["admin_count"],
                "editor": stats["editor_count"],
                "viewer": stats["viewer_count"],
            },
            "pending_invites": pending_invites,
            "pending_promotions": pending_promotions,
        }

        return Response(data)

    # ── Guest Player Avatar ─────────────────────────────────────────
    @action(detail=True, methods=["get", "patch", "delete"], url_path="guest-player")
    def guest_player(self, request, pk=None, organisation_slug=None, slug=None):
        """Manage the guest player avatar for this team/project.

        GET  → returns current guest player data
        PATCH → set/update guest player metadata (asset URLs etc.)
        DELETE → remove guest player data
        """
        project = self.get_object()

        if request.method == "GET":
            guest_data = (project.metadata or {}).get("teamreel_assets", {}).get("guest_player", {})
            return Response(
                {
                    "project_id": str(project.id),
                    "guest_player": guest_data,
                    "has_avatar": bool(
                        guest_data.get("images", {}).get("fullbody", {}).get("home")
                    ),
                }
            )

        if request.method == "DELETE":
            meta = dict(project.metadata or {})
            ta = dict(meta.get("teamreel_assets", {}))
            ta.pop("guest_player", None)
            meta["teamreel_assets"] = ta
            project.metadata = meta
            project.save(update_fields=["metadata", "updated_at"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH — update guest player assets
        guest_patch = request.data.get("guest_player", {})
        if not guest_patch or not isinstance(guest_patch, dict):
            return Response(
                {"error": "Provide 'guest_player' object with asset data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        meta = dict(project.metadata or {})
        ta = dict(meta.get("teamreel_assets", {}))
        existing = dict(ta.get("guest_player", {}))

        # Deep-merge images/media sub-keys
        for top_key in ("images", "media", "videos"):
            if top_key in guest_patch:
                existing_sub = dict(existing.get(top_key, {}))
                for sub_key, sub_val in guest_patch[top_key].items():
                    existing_sub[sub_key] = sub_val
                existing[top_key] = existing_sub

        # Copy any other top-level keys
        for key, val in guest_patch.items():
            if key not in ("images", "media", "videos"):
                existing[key] = val

        ta["guest_player"] = existing
        meta["teamreel_assets"] = ta
        project.metadata = meta
        project.save(update_fields=["metadata", "updated_at"])

        return Response(
            {
                "project_id": str(project.id),
                "guest_player": existing,
                "has_avatar": bool(existing.get("images", {}).get("fullbody", {}).get("home")),
            }
        )
