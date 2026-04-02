"""activities.api.views

DRF ViewSets for Activities & Period Hierarchy API.

TeamReel (Option A) notes:
- We restrict list/retrieve querysets to avoid UUID guessing.
- Match write operations are gated via TeamReel RBAC permissions.
"""

import uuid

from activities.models import Activity, ActivityEvent, Participation, Period
from api.pagination import BaseAPIPagination
from django.db import connection
from django.db.models import Count, OuterRef, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .permissions import (
    ActivityEventPermission,
    ActivityPermission,
    ParticipationPermission,
    PeriodPermission,
)
from .serializers import (
    ActivityDetailSerializer,
    ActivityEventSerializer,
    ActivitySerializer,
    ParticipationSerializer,
    PeriodSerializer,
)


class PeriodPagination(BaseAPIPagination):
    """Allow larger page sizes for periods to reduce multi-page fetches in the demo UI."""

    max_page_size = 500


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

    # Only org *admins* get implicit visibility into all projects within an organisation.
    # Regular org members should only see projects they have explicit access to (direct
    # ProjectMembership / project-scoped RoleAssignment).
    org_ids = set(
        Membership.objects.filter(user=user, is_active=True, role="admin").values_list(
            "organisation_id", flat=True
        )
    )
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

    queryset = Period.objects.select_related(
        "organisation", "project", "parent_period", "created_by", "sport", "sport__parent_sport"
    ).order_by("start_date", "name")
    serializer_class = PeriodSerializer
    permission_classes = [PeriodPermission]
    pagination_class = PeriodPagination

    def get_queryset(self):
        """Apply query param filters"""
        queryset = super().get_queryset()

        # Guard: the Railway demo DB can drift from code during rollouts.
        # If a related table is missing, annotations that JOIN it will 500.
        try:
            table_names = set(connection.introspection.table_names())
        except Exception:
            table_names = set()

        annotations: dict[str, object] = {
            "children_count": Count("children", distinct=True),
        }

        # Activities tables exist for the demo in normal cases.
        if not table_names or "activities_activity" in table_names:
            annotations.update(
                {
                    "activities_count": Count("activities", distinct=True),
                    "matches_count": Count(
                        "activities",
                        filter=Q(activities__activity_type="match"),
                        distinct=True,
                    ),
                    # Aggregate counts across direct children (e.g. Season -> Competitions).
                    # This enables root periods (seasons) to show totals when matches live on
                    # child periods.
                    "children_activities_count": Count("children__activities", distinct=True),
                    "children_matches_count": Count(
                        "children__activities",
                        filter=Q(children__activities__activity_type="match"),
                        distinct=True,
                    ),
                }
            )

        # Project memberships table may be absent in some demo DBs.
        # Count members for THIS specific period (season), not all team members.
        if not table_names or "projects_membership" in table_names:
            from django.db.models import Subquery
            from projects.models import ProjectMembership

            # Subquery to count memberships that belong to this specific period
            members_subquery = Subquery(
                ProjectMembership.objects.filter(
                    project=OuterRef("project"),
                    period=OuterRef("pk"),
                    deleted_at__isnull=True,
                )
                .values("project")
                .annotate(cnt=Count("id"))
                .values("cnt")[:1]
            )
            annotations["members_count"] = members_subquery

        queryset = queryset.annotate(**annotations)

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

        # Filter by project_id__in (comma separated list)
        project_id_in = self.request.query_params.get("project_id__in")
        if project_id_in:
            try:
                ids = [int(i.strip()) for i in project_id_in.split(",") if i.strip().isdigit()]
                if ids:
                    queryset = queryset.filter(project_id__in=ids)
            except (TypeError, ValueError):
                pass

        # Filter by project_id__in (comma separated list)
        project_id_in = self.request.query_params.get("project_id__in")
        if project_id_in:
            try:
                ids = [int(i.strip()) for i in project_id_in.split(",") if i.strip().isdigit()]
                if ids:
                    queryset = queryset.filter(project_id__in=ids)
            except (TypeError, ValueError):
                pass

        # Filter by parent_id (supports parent_id=null for roots)
        parent_id = self.request.query_params.get("parent_id")
        if parent_id == "null":
            queryset = queryset.filter(parent_period__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_period_id=parent_id)

        return queryset

    def destroy(self, request, *args, **kwargs):
        """Override destroy to prevent deletion if children or activities exist.

        Uses soft-delete.
        """
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

        # Soft-delete instead of hard-delete
        instance.soft_delete(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

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

    queryset = Activity.objects.select_related(
        "project",
        "project__parent_project",
        "opponent_project",
        "opponent_project__parent_project",
        "period",
        "period__parent_period",
        "formation",
        "created_by",
    ).order_by("-start_time")
    serializer_class = ActivitySerializer
    permission_classes = [ActivityPermission]
    pagination_class = BaseAPIPagination

    def get_serializer_class(self):
        """Return detail serializer for single lookups"""
        if self.action == "retrieve":
            return ActivityDetailSerializer
        return super().get_serializer_class()

    def get_object(self):
        """Support lookups by UUID (pk) or by slug."""
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        if lookup_value is None:
            return super().get_object()

        try:
            uuid.UUID(str(lookup_value))
            obj = get_object_or_404(queryset, pk=lookup_value)
        except (ValueError, TypeError):
            obj = get_object_or_404(queryset, slug=str(lookup_value))

        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        """Apply query param filters"""
        queryset = super().get_queryset()

        # Participant count can be expensive on broad activity feeds.
        # Only include it when it's likely needed (match lists / explicit opt-in / detail).
        activity_type = (self.request.query_params.get("activity_type") or "").strip().lower()
        include_participations_count = (
            self.request.query_params.get("include_participations_count") or ""
        ).strip().lower() in {"1", "true", "yes"}
        needs_participations_count = (
            self.action == "retrieve" or include_participations_count or activity_type == "match"
        )
        if needs_participations_count:
            queryset = queryset.annotate(
                participations_count=Count("participations", distinct=True)
            )

        # Optimize for detail view
        if self.action == "retrieve":
            queryset = queryset.prefetch_related(
                "participations",
                "participations__member__user",
                "participations__project_membership",
                "events",
                "events__member",
                "events__member__user",
                "events__related_member",
                "events__related_member__user",
            )

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
        activity_type_param = self.request.query_params.get("activity_type")
        if activity_type_param:
            queryset = queryset.filter(activity_type=activity_type_param)

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
        serializer = ParticipationSerializer(participations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        """Get all events for an activity."""
        activity = self.get_object()
        events = (
            ActivityEvent.objects.filter(activity=activity)
            .select_related(
                "member__user",
                "related_member__user",
                "team_project",
            )
            .order_by("minute", "created_at")
        )
        serializer = ActivityEventSerializer(events, many=True)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        """Soft-delete the activity instead of hard-deleting."""
        instance.soft_delete(user=self.request.user)


class ActivityEventViewSet(viewsets.ModelViewSet):
    """CRUD + filtering for ActivityEvent.

    Endpoints:
    - GET /api/v1/activity-events/
    - POST /api/v1/activity-events/
    - GET /api/v1/activity-events/{id}/
    - PUT/PATCH/DELETE /api/v1/activity-events/{id}/

    Query parameters:
    - activity_id
    - event_type
    - member_id
    - related_member_id
    """

    queryset = ActivityEvent.objects.select_related(
        "activity",
        "activity__project",
        "member__user",
        "related_member__user",
        "team_project",
        "created_by",
    ).order_by("-created_at")
    serializer_class = ActivityEventSerializer
    permission_classes = [ActivityEventPermission]
    pagination_class = BaseAPIPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Restrict to visible projects (prevents UUID guessing).
        visible_project_ids = _visible_project_ids_for_user(self.request.user)
        if visible_project_ids is not None:
            queryset = queryset.filter(activity__project_id__in=visible_project_ids)

        activity_id = self.request.query_params.get("activity_id")
        if activity_id:
            queryset = queryset.filter(activity_id=activity_id)

        event_type = self.request.query_params.get("event_type")
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        member_id = self.request.query_params.get("member_id")
        if member_id:
            queryset = queryset.filter(member_id=member_id)

        related_member_id = self.request.query_params.get("related_member_id")
        if related_member_id:
            queryset = queryset.filter(related_member_id=related_member_id)

        return queryset

    def create(self, request, *args, **kwargs):
        """Enforce TeamReel match permissions for match-event creation."""
        if _user_is_system_admin(request.user):
            return super().create(request, *args, **kwargs)

        activity_id = (request.data or {}).get("activity_id")
        if not activity_id:
            raise PermissionDenied("activity_id is required")

        try:
            activity = Activity.objects.select_related("project").get(id=activity_id)
        except Activity.DoesNotExist as e:
            raise PermissionDenied("Invalid activity") from e

        if getattr(activity, "activity_type", None) != "match":
            raise PermissionDenied("Only match events are writable in TeamReel mode")

        from permissions.evaluator import check_permission

        # Direct team permission
        if check_permission(
            request.user.id,
            "match.edit_own_team",
            resource_type="project",
            resource_id=activity.project_id,
        ):
            return super().create(request, *args, **kwargs)

        # Club admin acting on child team
        parent_project_id = getattr(activity.project, "parent_project_id", None)
        if parent_project_id and check_permission(
            request.user.id,
            "match.edit_own_team",
            resource_type="project",
            resource_id=parent_project_id,
        ):
            return super().create(request, *args, **kwargs)

        raise PermissionDenied("You do not have permission to edit this match")


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

    def create(self, request, *args, **kwargs):
        """Enforce TeamReel match permissions for match-participation writes."""
        if _user_is_system_admin(request.user):
            return super().create(request, *args, **kwargs)

        activity_id = (request.data or {}).get("activity_id")
        if activity_id:
            try:
                activity = Activity.objects.select_related("project").get(id=activity_id)
            except Activity.DoesNotExist as e:
                raise PermissionDenied("Invalid activity") from e

            if getattr(activity, "activity_type", None) == "match":
                from permissions.evaluator import check_permission

                # Some roles may be granted lineup rights via B08 (project.manage_participations)
                # instead of match.* permissions.
                try:
                    from permissions.utils import has_permission as b08_has_permission

                    if b08_has_permission(
                        request.user, "project.manage_participations", activity.project
                    ):
                        return super().create(request, *args, **kwargs)
                except ImportError:
                    pass

                # Direct team permission
                if check_permission(
                    request.user.id,
                    "match.edit_own_team",
                    resource_type="project",
                    resource_id=activity.project_id,
                ):
                    return super().create(request, *args, **kwargs)

                # Club admin acting on child team
                parent_project_id = getattr(activity.project, "parent_project_id", None)
                if parent_project_id and check_permission(
                    request.user.id,
                    "match.edit_own_team",
                    resource_type="project",
                    resource_id=parent_project_id,
                ):
                    return super().create(request, *args, **kwargs)

                raise PermissionDenied("You do not have permission to edit this match")

        return super().create(request, *args, **kwargs)

    def _check_can_edit_match_participations(self, request, activity: Activity) -> None:
        """Centralize match lineup permission checks for bulk endpoints."""

        if _user_is_system_admin(request.user):
            return

        if getattr(activity, "activity_type", None) != "match":
            # For non-match activities, fall back to standard ParticipationPermission behavior.
            return

        from permissions.evaluator import check_permission

        # Some roles may be granted lineup rights via B08 (project.manage_participations)
        # instead of match.* permissions.
        try:
            from permissions.utils import has_permission as b08_has_permission

            if b08_has_permission(request.user, "project.manage_participations", activity.project):
                return
        except ImportError:
            pass

        # Direct team permission
        if check_permission(
            request.user.id,
            "match.edit_own_team",
            resource_type="project",
            resource_id=activity.project_id,
        ):
            return

        # Club admin acting on child team
        parent_project_id = getattr(activity.project, "parent_project_id", None)
        if parent_project_id and check_permission(
            request.user.id,
            "match.edit_own_team",
            resource_type="project",
            resource_id=parent_project_id,
        ):
            return

        raise PermissionDenied("You do not have permission to edit this match")

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        """Bulk create participations (primarily for match lineups).

        Payload options:
        - {"activity_id": "...", "member_ids": ["..."],
          "role": "starter", "status": "confirmed", "data": {...}}
        - {"participations": [{"member_id": "...",
          "activity_id": "...", ...}, ...]}

        Returns:
        - {"created": N, "skipped": N, "errors": [...]}
        """

        payload = request.data
        if not isinstance(payload, dict):
            return Response({"detail": "Invalid payload."}, status=status.HTTP_400_BAD_REQUEST)

        items: list[dict] | None = None

        if isinstance(payload.get("participations"), list):
            items = payload.get("participations")
        elif payload.get("activity_id") and isinstance(payload.get("member_ids"), list):
            activity_id = payload.get("activity_id")
            role = payload.get("role", "starter")
            status_value = payload.get("status", "confirmed")
            data = payload.get("data")
            notes = payload.get("notes")
            items = [
                {
                    "member_id": mid,
                    "activity_id": activity_id,
                    "role": role,
                    "status": status_value,
                    "data": data,
                    "notes": notes,
                }
                for mid in payload.get("member_ids")
            ]

        if not isinstance(items, list):
            return Response(
                {"detail": "Expected 'participations' list or 'activity_id' + 'member_ids'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_batch = 200
        if len(items) > max_batch:
            return Response(
                {"detail": f"Too many participations in one request (max {max_batch})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine the activity once (enforces match permissions once).
        activity_id = None
        for it in items:
            if isinstance(it, dict) and it.get("activity_id"):
                activity_id = it.get("activity_id")
                break

        if not activity_id:
            return Response({"detail": "Missing activity_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            activity = Activity.objects.select_related("project").get(id=activity_id)
        except Activity.DoesNotExist as e:
            raise PermissionDenied("Invalid activity") from e

        self._check_can_edit_match_participations(request, activity)

        created_count = 0
        skipped_count = 0
        errors: list[dict] = []

        for raw_item in items:
            if not isinstance(raw_item, dict):
                errors.append({"detail": "Invalid participation item"})
                continue

            serializer = self.get_serializer(data=raw_item)
            try:
                serializer.is_valid(raise_exception=True)
                serializer.save()
                created_count += 1
            except Exception as e:
                msg = str(e)
                # Treat common duplicate-ish failures as skips (idempotent bulk UI)
                if "unique" in msg.lower() or "already" in msg.lower() or "exists" in msg.lower():
                    skipped_count += 1
                else:
                    errors.append(
                        {
                            "member_id": raw_item.get("member_id"),
                            "detail": msg,
                        }
                    )

        return Response(
            {"created": created_count, "skipped": skipped_count, "errors": errors},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """Bulk delete participations by ID.

        Payload:
        - {"participation_ids": ["uuid", ...]}
        """

        payload = request.data
        if not isinstance(payload, dict) or not isinstance(payload.get("participation_ids"), list):
            return Response(
                {"detail": "Expected 'participation_ids' list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participation_ids = payload.get("participation_ids")
        max_batch = 200
        if len(participation_ids) > max_batch:
            return Response(
                {"detail": f"Too many participations in one request (max {max_batch})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Participation.objects.select_related("activity__project").filter(
            id__in=participation_ids
        )
        first = qs.first()
        if not first:
            return Response({"removed": 0, "errors": []}, status=status.HTTP_200_OK)

        # Ensure all ids belong to the same activity for safety.
        activity_id = first.activity_id
        if qs.exclude(activity_id=activity_id).exists():
            return Response(
                {"detail": "All participation_ids must belong to the same activity."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if first.activity:
            self._check_can_edit_match_participations(request, first.activity)

        removed = 0
        errors: list[dict] = []
        for p in qs:
            try:
                p.soft_delete(user=request.user)
                removed += 1
            except Exception as e:
                errors.append({"participation_id": str(p.id), "detail": str(e)})

        return Response({"removed": removed, "errors": errors}, status=status.HTTP_200_OK)

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

    def perform_destroy(self, instance):
        """Soft-delete the participation instead of hard-deleting."""
        instance.soft_delete(user=self.request.user)
