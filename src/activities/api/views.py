"""activities.api.views

DRF ViewSets for Activities & Period Hierarchy API.

TeamReel (Option A) notes:
- We restrict list/retrieve querysets to avoid UUID guessing.
- Match write operations are gated via TeamReel RBAC permissions.
"""

from api.pagination import BaseAPIPagination
from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from activities.models import Activity, Participation, Period

from .permissions import ActivityPermission, ParticipationPermission, PeriodPermission
from .serializers import ActivitySerializer, ParticipationSerializer, PeriodSerializer


def _user_is_system_admin(user) -> bool:
    return bool(getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))


def _visible_project_ids_for_user(user) -> set[int] | None:
    """Return project IDs visible to user for Activities/Periods.

    Returns:
        - None for system admins (no filtering)
        - set[int] for regular users
    """

    if _user_is_system_admin(user):
        return None

    from organisations.models import Membership
    from permissions.models import RoleAssignment, ScopeChoices
    from projects.models import Project, ProjectMembership

    org_ids = set(Membership.objects.filter(user=user).values_list("organisation_id", flat=True))
    org_ids |= set(
        RoleAssignment.objects.filter(user=user, scope=ScopeChoices.ORGANIZATION).values_list(
            "target_organization_id", flat=True
        )
    )

    project_ids: set[int] = set(
        RoleAssignment.objects.filter(user=user, scope=ScopeChoices.PROJECT).values_list(
            "target_project_id", flat=True
        )
    )

    project_ids |= set(
        ProjectMembership.objects.filter(user=user, deleted_at__isnull=True).values_list(
            "project_id", flat=True
        )
    )

    if org_ids:
        project_ids |= set(
            Project.all_objects.filter(organisation_id__in=org_ids).values_list("id", flat=True)
        )

    if not project_ids:
        return set()

    # Make project-scoped assignments usable in the hierarchy:
    # - Team scope should be able to see its parent club.
    # - Club scope should be able to see its child teams.
    team_parent_ids = set(
        Project.all_objects.filter(id__in=project_ids)
        .exclude(parent_project_id__isnull=True)
        .values_list("parent_project_id", flat=True)
    )
    club_child_ids = set(
        Project.all_objects.filter(parent_project_id__in=project_ids).values_list("id", flat=True)
    )

    project_ids |= team_parent_ids
    project_ids |= club_child_ids
    return project_ids


def _visible_organisation_ids_for_user(user) -> set[str] | None:
    if _user_is_system_admin(user):
        return None

    from organisations.models import Membership
    from permissions.models import RoleAssignment, ScopeChoices
    from projects.models import Project

    org_ids = set(Membership.objects.filter(user=user).values_list("organisation_id", flat=True))
    org_ids |= set(
        RoleAssignment.objects.filter(user=user, scope=ScopeChoices.ORGANIZATION).values_list(
            "target_organization_id", flat=True
        )
    )

    visible_project_ids = _visible_project_ids_for_user(user)
    if visible_project_ids and visible_project_ids is not None:
        org_ids |= set(
            Project.all_objects.filter(id__in=visible_project_ids).values_list(
                "organisation_id", flat=True
            )
        )

    return {str(x) for x in org_ids}


class PeriodViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Period CRUD + tree navigation actions.

    Endpoints:
    - GET /api/v1/periods/ - List periods with filtering
    - POST /api/v1/periods/ - Create period
    - GET /api/v1/periods/{id}/ - Retrieve period
    - PUT /api/v1/periods/{id}/ - Update period
    - DELETE /api/v1/periods/{id}/ - Delete period (prevents if children exist)
    - GET /api/v1/periods/{id}/children/ - Get direct children
    - GET /api/v1/periods/{id}/descendants/ - Get all descendants (CTE)

    Query parameters:
    - organisation_id: Filter by organisation
    - project_id: Filter by project
    - parent_id: Filter by parent (use "null" for root periods)
    """

    queryset = (
        Period.objects.select_related("organisation", "project", "parent_period", "created_by")
        .annotate(
            children_count=Count("children", distinct=True),
            activities_count=Count("activities", distinct=True),
            matches_count=Count(
                "activities", filter=Q(activities__activity_type="match"), distinct=True
            ),
        )
        .order_by("start_date", "name")
    )
    serializer_class = PeriodSerializer
    permission_classes = [PeriodPermission]
    pagination_class = BaseAPIPagination

    def get_queryset(self):
        """Apply query param filters"""
        queryset = super().get_queryset()

        # Option A: restrict periods to orgs/projects the user can see.
        visible_project_ids = _visible_project_ids_for_user(self.request.user)
        visible_org_ids = _visible_organisation_ids_for_user(self.request.user)
        if visible_project_ids is not None:
            queryset = queryset.filter(
                Q(project_id__in=visible_project_ids)
                | Q(project_id__isnull=True, organisation_id__in=(visible_org_ids or []))
            )
        elif visible_org_ids is not None:
            queryset = queryset.filter(organisation_id__in=visible_org_ids)

        # Filter by organisation_id
        organisation_id = self.request.query_params.get("organisation_id")
        if organisation_id:
            queryset = queryset.filter(organisation_id=organisation_id)

        # Filter by project (slug or numeric ID)
        project = self.request.query_params.get("project")
        if project and project not in {"undefined", "null"}:
            if project.isdigit():
                queryset = queryset.filter(project_id=int(project))
            else:
                # Slug is unique per org; visibility filters above prevent leaking data
                queryset = queryset.filter(project__slug=project)

        # Filter by period type (stored in metadata)
        period_type = self.request.query_params.get("type")
        if period_type and period_type not in {"undefined", "null"}:
            queryset = queryset.filter(metadata__type=period_type)

        # Filter by project_id
        project_id = self.request.query_params.get("project_id")
        if project_id and project_id not in {"undefined", "null"}:
            try:
                queryset = queryset.filter(project_id=int(project_id))
            except (TypeError, ValueError):
                return queryset.none()

        # Filter by parent_id (supports parent_id=null for roots)
        parent_id = self.request.query_params.get("parent_id")
        if parent_id == "null":
            queryset = queryset.filter(parent_period__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_period_id=parent_id)

        return queryset

    def destroy(self, request, *args, **kwargs):
        """Override destroy to prevent deletion if children or activities exist"""
        instance = self.get_object()

        # Check if period has children
        children_count = instance.children.count()
        if children_count > 0:
            return Response(
                {
                    "detail": (
                        f"Cannot delete period with {children_count} child period(s). "
                        "Delete children first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if period has activities
        activities_count = instance.activities.count()
        if activities_count > 0:
            return Response(
                {
                    "detail": (
                        f"Cannot delete period with {activities_count} activit(ies). "
                        "Delete activities first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get"])
    def children(self, request, pk=None):
        """
        Get direct children of period.

        Returns list of immediate child periods (one level down).
        """
        period = self.get_object()
        children = (
            period.children.select_related("organisation", "project", "parent_period", "created_by")
            .annotate(children_count=Count("children"), activities_count=Count("activities"))
            .order_by("start_date", "name")
        )
        serializer = self.get_serializer(children, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def descendants(self, request, pk=None):
        """
        Get all descendants of period using recursive CTE.

        Returns all periods in the subtree (children, grandchildren, etc.).
        Uses PostgreSQL recursive CTE for efficient tree traversal.
        """
        period = self.get_object()
        descendants = (
            Period.objects.get_descendants(period.id)
            .select_related("organisation", "project", "parent_period", "created_by")
            .annotate(children_count=Count("children"), activities_count=Count("activities"))
            .order_by("start_date", "name")
        )
        serializer = self.get_serializer(descendants, many=True)
        return Response(serializer.data)


class ActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Activity CRUD + calendar filtering.

    Endpoints:
    - GET /api/v1/activities/ - List activities with filtering
    - POST /api/v1/activities/ - Create activity
    - GET /api/v1/activities/{id}/ - Retrieve activity
    - PUT /api/v1/activities/{id}/ - Update activity
    - DELETE /api/v1/activities/{id}/ - Delete activity

    Query parameters:
    - period_id: Filter by period
    - include_descendants: Include activities from descendant periods (true/false)
    - project_id: Filter by project
    - activity_type: Filter by activity type
    - start_time__gte: Filter activities starting after datetime
    - start_time__lte: Filter activities starting before datetime
    """

    queryset = Activity.objects.select_related("project", "period", "created_by").order_by(
        "-start_time"
    )
    serializer_class = ActivitySerializer
    permission_classes = [ActivityPermission]
    pagination_class = BaseAPIPagination

    def get_queryset(self):
        """Apply query param filters"""
        queryset = super().get_queryset()

        # Option A: restrict activities to projects the user can see.
        visible_project_ids = _visible_project_ids_for_user(self.request.user)
        if visible_project_ids is not None:
            queryset = queryset.filter(project_id__in=visible_project_ids)

        # Filter by period (with optional descendants)
        period_id = self.request.query_params.get("period_id")
        include_descendants = (
            self.request.query_params.get("include_descendants", "false").lower() == "true"
        )

        if period_id:
            if include_descendants:
                try:
                    # Use CTE to get all descendant periods
                    descendant_ids = Period.objects.get_descendants(period_id).values_list(
                        "id", flat=True
                    )
                    all_period_ids = [period_id] + list(descendant_ids)
                    queryset = queryset.filter(period_id__in=all_period_ids)
                except Period.DoesNotExist:
                    # Period doesn't exist, return empty queryset
                    queryset = queryset.none()
            else:
                queryset = queryset.filter(period_id=period_id)

        # Filter by project_id
        project_id = self.request.query_params.get("project_id")
        if project_id and project_id not in {"undefined", "null"}:
            try:
                queryset = queryset.filter(project_id=int(project_id))
            except (TypeError, ValueError):
                return queryset.none()

        # Filter by organisation_id (indirectly via project)
        organisation_id = self.request.query_params.get("organisation_id")
        if organisation_id:
            queryset = queryset.filter(project__organisation_id=organisation_id)

        # Filter by activity_type
        activity_type = self.request.query_params.get("activity_type")
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)

        # Filter by date range
        start_time__gte = self.request.query_params.get("start_time__gte")
        start_time__lte = self.request.query_params.get("start_time__lte")

        if start_time__gte:
            queryset = queryset.filter(start_time__gte=start_time__gte)
        if start_time__lte:
            queryset = queryset.filter(start_time__lte=start_time__lte)

        return queryset

    def create(self, request, *args, **kwargs):
        """Enforce TeamReel match permissions for match creation."""
        if (request.data or {}).get("activity_type") == "match":
            if _user_is_system_admin(request.user):
                return super().create(request, *args, **kwargs)

            from permissions.evaluator import check_permission
            from projects.models import Project

            project_id = (request.data or {}).get("project_id")
            if not project_id:
                raise PermissionDenied("project_id is required")

            try:
                project = Project.all_objects.get(id=project_id)
            except Project.DoesNotExist as e:
                raise PermissionDenied("Invalid project") from e

            # Direct team permission
            if check_permission(
                request.user.id,
                "match.create",
                resource_type="project",
                resource_id=project.id,
            ):
                return super().create(request, *args, **kwargs)

            # Club Admin creating matches for a child team
            if project.parent_project_id and check_permission(
                request.user.id,
                "match.create",
                resource_type="project",
                resource_id=project.parent_project_id,
            ):
                return super().create(request, *args, **kwargs)

            raise PermissionDenied("You do not have permission to create matches for this team.")

        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=["get"])
    def participants(self, request, pk=None):
        """
        Get all participants for an activity.

        Returns list of participations for this activity.
        """
        activity = self.get_object()
        participations = (
            Participation.objects.filter(activity=activity)
            .select_related("member__user", "member__organisation")
            .order_by("-created_at")
        )
        from .serializers import ParticipationSerializer

        serializer = ParticipationSerializer(participations, many=True)
        return Response(serializer.data)


class ParticipationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Participation CRUD + filtering.

    Endpoints:
    - GET /api/v1/participations/ - List participations with filtering
    - POST /api/v1/participations/ - Create participation
    - GET /api/v1/participations/{id}/ - Retrieve participation
    - PUT /api/v1/participations/{id}/ - Update participation
    - DELETE /api/v1/participations/{id}/ - Delete participation

    Query parameters:
    - member_id: Filter by member
    - activity_id: Filter by activity
    - period_id: Filter by period
    - role: Filter by role (squad_member, captain, starter, substitute, etc.)
    - status: Filter by status (confirmed, tentative, declined, no_response)
    """

    queryset = Participation.objects.select_related(
        "member", "activity", "period", "created_by"
    ).order_by("-created_at")
    serializer_class = ParticipationSerializer
    permission_classes = [ParticipationPermission]
    pagination_class = BaseAPIPagination

    def get_queryset(self):
        """Apply query param filters"""
        queryset = super().get_queryset()

        # Option A: restrict participations to visible orgs/projects.
        visible_project_ids = _visible_project_ids_for_user(self.request.user)
        visible_org_ids = _visible_organisation_ids_for_user(self.request.user)
        if visible_project_ids is not None:
            queryset = queryset.filter(
                Q(activity__project_id__in=visible_project_ids)
                | Q(period__project_id__in=visible_project_ids)
                | Q(
                    period__project_id__isnull=True,
                    period__organisation_id__in=(visible_org_ids or []),
                )
            )
        elif visible_org_ids is not None:
            queryset = queryset.filter(
                Q(activity__project__organisation_id__in=visible_org_ids)
                | Q(period__organisation_id__in=visible_org_ids)
            )

        # Filter by member_id
        member_id = self.request.query_params.get("member_id")
        if member_id:
            queryset = queryset.filter(member_id=member_id)

        # Filter by activity_id
        activity_id = self.request.query_params.get("activity_id")
        if activity_id:
            queryset = queryset.filter(activity_id=activity_id)

        # Filter by period_id
        period_id = self.request.query_params.get("period_id")
        if period_id:
            queryset = queryset.filter(period_id=period_id)

        # Filter by role
        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)

        # Filter by status
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset
