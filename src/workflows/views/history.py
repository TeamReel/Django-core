"""ViewSet for transition history management."""

from typing import Any

from django.apps import apps
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from src.workflows.models import TransitionHistory
from src.workflows.serializers import TransitionHistorySerializer


class TransitionHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing transition history.

    **Permissions**:
    - Read-only access: Project members can view history for their instances

    **Endpoints**:
    - GET /history/ - List history (filtered by accessible instances)
    - GET /history/{id}/ - Get history entry details
    - GET /history/{id}/hook_status/ - Query async hook task status
    """

    serializer_class = TransitionHistorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["instance", "actor", "action", "from_state", "to_state"]
    search_fields = ["action", "comment"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]  # Most recent first

    def get_queryset(self):
        """
        Filter history by accessible instances.

        Users can only see history for instances in projects they're members of.
        """
        user = self.request.user
        Project = apps.get_model("projects", "Project")
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        # Get projects where user is creator or has membership
        creator_projects = set(Project.objects.filter(creator=user).values_list("id", flat=True))

        member_projects = set(
            ProjectMembership.objects.filter(user=user, deleted_at__isnull=True).values_list(
                "project_id", flat=True
            )
        )

        # Combine both sets
        accessible_projects = creator_projects | member_projects

        # Filter history by instances in accessible projects
        return (
            TransitionHistory.objects.filter(instance__project_id__in=accessible_projects)
            .select_related("actor", "instance", "instance__project")
            .order_by(self.ordering[0])
        )

    def check_project_access(self, history_entry: TransitionHistory) -> None:
        """
        Verify user has access to the history entry's project.

        Args:
            history_entry: TransitionHistory instance to check access for

        Raises:
            PermissionDenied: If user is not a project member
        """
        user = self.request.user
        project = history_entry.instance.project

        # Check if user is project creator
        if project.creator_id == user.id:
            return

        # Check if user has project membership
        is_member = project.memberships.filter(user=user, deleted_at__isnull=True).exists()

        if not is_member:
            raise PermissionDenied("You must be a project member to view transition history")

    @extend_schema(
        summary="List transition history",
        description="Returns list of transition history entries filtered by accessible projects. "
        "Only project members can view history for their instances.",
        parameters=[
            OpenApiParameter(
                name="instance",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by instance ID",
                required=False,
            ),
            OpenApiParameter(
                name="actor",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by actor (user) ID",
                required=False,
            ),
            OpenApiParameter(
                name="action",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by action name",
                required=False,
            ),
            OpenApiParameter(
                name="from_state",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by source state",
                required=False,
            ),
            OpenApiParameter(
                name="to_state",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by destination state",
                required=False,
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search in action and comment fields",
                required=False,
            ),
            OpenApiParameter(
                name="ordering",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Order by field (prefix with - for descending). Options: created_at",
                required=False,
            ),
        ],
        tags=["History"],
    )
    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """List all transition history entries with pagination and filtering."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Get transition history entry",
        description="Returns transition history entry details. Requires project membership.",
        tags=["History"],
    )
    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Get transition history entry details."""
        instance = self.get_object()

        # Check project access permission
        self.check_project_access(instance)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(
        summary="Get async hook task status",
        description="Query the status of an async hook task associated with this transition. "
        "Returns Celery task state if task_id is present, otherwise returns null.",
        tags=["History"],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "format": "uuid", "nullable": True},
                    "status": {
                        "type": "string",
                        "enum": ["PENDING", "STARTED", "SUCCESS", "FAILURE", "RETRY", "REVOKED"],
                        "nullable": True,
                    },
                    "result": {"type": "object", "nullable": True},
                    "error": {"type": "string", "nullable": True},
                },
            }
        },
    )
    @action(detail=True, methods=["get"], url_path="hook_status")
    def hook_status(self, request: Request, pk: str | None = None) -> Response:
        """
        Get async hook task status.

        Returns the Celery task status if a task_id is associated with this transition.
        """
        history_entry = self.get_object()

        # Check project access permission
        self.check_project_access(history_entry)

        # Check if there's a task_id
        if not history_entry.task_id:
            return Response(
                {
                    "task_id": None,
                    "status": None,
                    "result": None,
                    "error": "No async hook task associated with this transition",
                },
                status=status.HTTP_200_OK,
            )

        # Query Celery task status (B15 integration)
        try:
            from celery.result import AsyncResult

            task = AsyncResult(str(history_entry.task_id))

            return Response(
                {
                    "task_id": str(history_entry.task_id),
                    "status": task.state,
                    "result": task.result if task.successful() else None,
                    "error": str(task.info) if task.failed() else None,
                },
                status=status.HTTP_200_OK,
            )
        except ImportError:
            # Celery not available
            return Response(
                {
                    "task_id": str(history_entry.task_id),
                    "status": "UNKNOWN",
                    "result": None,
                    "error": "Celery not configured",
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            # Generic error querying task status
            return Response(
                {
                    "task_id": str(history_entry.task_id),
                    "status": "ERROR",
                    "result": None,
                    "error": f"Failed to query task status: {str(e)}",
                },
                status=status.HTTP_200_OK,
            )
