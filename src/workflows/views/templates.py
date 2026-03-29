"""ViewSet for workflow template management."""

from typing import Any

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import filters, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from src.workflows.models import WorkflowInstance, WorkflowTemplate
from src.workflows.serializers import WorkflowTemplateSerializer


class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflow templates.

    **Permissions**:
    - List/Retrieve: Authenticated users
    - Create/Update/Delete: Admin users only

    **Endpoints**:
    - GET /templates/ - List all active templates (paginated)
    - POST /templates/ - Create new template (admin only)
    - GET /templates/{id}/ - Get template details
    - PATCH /templates/{id}/ - Update template (force_update logic)
    - DELETE /templates/{id}/ - Soft-delete template
    """

    permission_classes = [IsAuthenticated]
    queryset = WorkflowTemplate.all_objects.all().order_by(
        "-created_at"
    )  # Use all_objects to allow filtering inactive
    serializer_class = WorkflowTemplateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]

    def get_permissions(self) -> list:
        """
        Return permission classes based on action.

        - Create/Update/Delete: Admin only
        - List/Retrieve: Any authenticated user
        """
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @extend_schema(
        summary="List workflow templates",
        description=(
            "Returns paginated list of workflow templates."
            " Filterable by is_active status and searchable by name/description."
        ),
        parameters=[
            OpenApiParameter(
                name="is_active",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Filter by active status (default: all)",
                required=False,
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search in name and description fields",
                required=False,
            ),
        ],
        tags=["Templates"],
    )
    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """List all workflow templates with pagination and filtering."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create workflow template",
        description=(
            "Create a new workflow template. Admin only."
            " Validates definition structure (states, transitions, initial_state)."
        ),
        tags=["Templates"],
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Create a new workflow template."""
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Get template details",
        description=(
            "Retrieve full details of a specific workflow template"
            " including definition structure."
        ),
        tags=["Templates"],
    )
    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Retrieve a single workflow template."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update workflow template",
        description=(
            "Update template metadata or definition. If active instances exist, "
            "must provide force_update=true query parameter to proceed."
        ),
        parameters=[
            OpenApiParameter(
                name="force_update",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Force update despite active instances (default: false)",
                required=False,
            ),
        ],
        tags=["Templates"],
    )
    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Update a workflow template with force_update logic."""
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Partial update workflow template",
        description=(
            "Partially update template metadata or definition. If active instances exist, "
            "must provide force_update=true query parameter to proceed."
        ),
        parameters=[
            OpenApiParameter(
                name="force_update",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Force update despite active instances (default: false)",
                required=False,
            ),
        ],
        tags=["Templates"],
    )
    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Partially update a workflow template with force_update logic."""
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Soft-delete workflow template",
        description=(
            "Deactivates template by setting is_active=False."
            " Does not delete the actual record. Admin only."
        ),
        tags=["Templates"],
    )
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Soft-delete a workflow template."""
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer: WorkflowTemplateSerializer) -> None:
        """
        Perform update with active instance check.

        Raises ValidationError if active instances exist and force_update is not true.
        """
        template = self.get_object()
        force_update = self.request.query_params.get("force_update", "false").lower() == "true"

        # Check for active instances (WorkflowInstance doesn't have is_active field)
        instance_count = WorkflowInstance.objects.filter(workflow=template).count()

        if instance_count > 0 and not force_update:
            raise ValidationError(
                {
                    "error": (
                        f"{instance_count} active instance(s) exist."
                        " Use force_update=true to proceed."
                    ),
                    "active_instances": instance_count,
                }
            )

        serializer.save()

    def perform_destroy(self, instance: WorkflowTemplate) -> None:
        """
        Soft-delete by setting is_active=False.

        Does not actually delete the database record.
        """
        instance.is_active = False
        instance.save(update_fields=["is_active"])
