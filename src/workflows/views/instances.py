"""ViewSet for workflow instance management."""

from typing import Any

from django.apps import apps
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import QuerySet
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from src.workflows.models import WorkflowInstance
from src.workflows.serializers import (
    TransitionExecuteSerializer,
    TransitionHistorySerializer,
    WorkflowInstanceSerializer,
)
from src.workflows.services.engine import WorkflowEngine


class WorkflowInstanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflow instances.

    **Permissions**:
    - All actions: Project membership required

    **Endpoints**:
    - GET /instances/ - List instances (filtered by accessible projects)
    - POST /instances/ - Create new instance (snapshot workflow)
    - GET /instances/{id}/ - Get instance details
    """

    serializer_class = WorkflowInstanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[WorkflowInstance]:
        """
        Filter instances by user's accessible projects.

        Optimizes queries with select_related to avoid N+1.
        """
        user = self.request.user
        Project = apps.get_model("projects", "Project")
        from django.db.models import Q

        # Get projects user has access to:
        # 1. Projects where user has a non-deleted membership
        # 2. Projects created by the user (project creator has implicit access)
        accessible_projects = Project.objects.filter(
            Q(memberships__user=user, memberships__deleted_at__isnull=True) | Q(creator=user)
        ).values_list("id", flat=True)

        return (
            WorkflowInstance.objects.filter(project_id__in=accessible_projects)
            .select_related("workflow", "project", "content_type", "created_by")
            .order_by("-created_at")
        )

    def check_project_membership(self, project) -> None:
        """
        Verify user has active membership in project or is the project creator.

        Args:
            project: Project instance to check membership for

        Raises:
            PermissionDenied: If user is not an active member and not the project creator
        """
        is_member = project.memberships.filter(
            user=self.request.user, deleted_at__isnull=True
        ).exists()

        is_creator = project.creator_id == self.request.user.id

        if not (is_member or is_creator):
            raise PermissionDenied("You must be a project member to perform this action")

    @extend_schema(
        summary="List workflow instances",
        description="Returns list of workflow instances filtered by user's accessible projects. "
        "Includes workflow snapshot, current state, and available actions.",
        parameters=[
            OpenApiParameter(
                name="project",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by project ID",
                required=False,
            ),
            OpenApiParameter(
                name="workflow",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by workflow template ID",
                required=False,
            ),
            OpenApiParameter(
                name="current_state",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by current state",
                required=False,
            ),
        ],
        tags=["Instances"],
    )
    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """List all workflow instances user has access to."""
        queryset = self.get_queryset()

        # Apply optional filters
        project_id = request.query_params.get("project")
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        workflow_id = request.query_params.get("workflow")
        if workflow_id:
            queryset = queryset.filter(workflow_id=workflow_id)

        current_state = request.query_params.get("current_state")
        if current_state:
            queryset = queryset.filter(current_state=current_state)

        # Paginate and serialize
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create workflow instance",
        description="Create a new workflow instance. "
        "Snapshots the workflow template definition (immutable). "
        "Sets initial state from template. Requires project membership.",
        tags=["Instances"],
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Create new workflow instance using WorkflowEngine."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract validated data
        workflow = serializer.validated_data["workflow"]
        project = serializer.validated_data["project"]
        content_type = serializer.validated_data["content_type"]
        object_id = serializer.validated_data["object_id"]
        context = serializer.validated_data.get("context", {})

        # Check project membership
        self.check_project_membership(project)

        # Get content object
        try:
            content_object = content_type.get_object_for_this_type(pk=object_id)
        except content_type.model_class().DoesNotExist:
            raise PermissionDenied(f"Content object with ID {object_id} not found") from None

        # Create instance using workflow engine (handles snapshot + initial state)
        engine = WorkflowEngine()
        instance = engine.create_instance(
            workflow=workflow,
            project=project,
            content_object=content_object,
            user=request.user,
            context=context,
        )

        # Serialize and return
        output_serializer = self.get_serializer(instance)
        return Response(output_serializer.data, status=201)

    @extend_schema(
        summary="Get workflow instance",
        description="Returns workflow instance details including "
        "snapshot, current state, and available actions. "
        "Requires project membership.",
        tags=["Instances"],
    )
    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Get workflow instance details."""
        instance = self.get_object()

        # Check project membership
        self.check_project_membership(instance.project)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(exclude=True)
    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Update not allowed - use transition actions instead."""
        raise PermissionDenied(
            "Direct updates not allowed. Use transition actions to change state."
        )

    @extend_schema(exclude=True)
    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Partial update not allowed - use transition actions instead."""
        raise PermissionDenied(
            "Direct updates not allowed. Use transition actions to change state."
        )

    @extend_schema(exclude=True)
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Delete not allowed - instances are immutable."""
        raise PermissionDenied("Workflow instances cannot be deleted.")

    @extend_schema(
        summary="Execute state transition",
        description="Execute a workflow transition (state change). "
        "Validates transition permissions, "
        "executes validators, fires hooks, and records "
        "transition history. "
        "Requires project membership and appropriate "
        "transition permissions.",
        request=TransitionExecuteSerializer,
        responses={200: TransitionHistorySerializer},
        tags=["Transitions"],
    )
    @action(detail=True, methods=["post"])
    def execute(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Execute state transition on workflow instance."""
        instance = self.get_object()

        # Check project membership
        self.check_project_membership(instance.project)

        # Deserialize and validate input
        serializer = TransitionExecuteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Execute transition using workflow engine
        engine = WorkflowEngine()
        try:
            history = engine.execute_transition(
                instance=instance,
                action=serializer.validated_data["action"],
                user=request.user,
                comment=serializer.validated_data.get("comment", ""),
                context_updates=serializer.validated_data.get("context_updates"),
            )
        except DjangoValidationError as e:
            # Convert Django validation errors to DRF format
            raise ValidationError({"action": str(e)}) from None

        # Serialize and return transition history
        output_serializer = TransitionHistorySerializer(history)
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get available actions",
        description="Returns list of actions user can execute from the current state. "
        "Each action includes the target state and required permissions.",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "actions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "action": {"type": "string"},
                                "to_state": {"type": "string"},
                                "required_permission": {"type": "string", "nullable": True},
                            },
                        },
                    }
                },
            }
        },
        tags=["Transitions"],
    )
    @action(detail=True, methods=["get"])
    def available_actions(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Get available actions for current instance state."""
        instance = self.get_object()

        # Check project membership
        self.check_project_membership(instance.project)

        # Get available actions from workflow engine
        engine = WorkflowEngine()
        actions = engine.get_available_actions(instance, request.user)

        return Response({"actions": actions}, status=status.HTTP_200_OK)
