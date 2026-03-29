"""ViewSet for project permission override management."""

from typing import Any

from django.apps import apps
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import filters, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from src.workflows.models import ProjectPermissionOverride
from src.workflows.serializers import ProjectPermissionOverrideSerializer


class ProjectPermissionOverrideViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing project permission overrides.

    **Permissions**:
    - All actions: Project admin only

    **Endpoints**:
    - GET /permissions/ - List overrides (filtered by accessible projects)
    - POST /permissions/ - Create new override (project admin only)
    - GET /permissions/{id}/ - Get override details
    - PATCH /permissions/{id}/ - Update override (project admin only)
    - DELETE /permissions/{id}/ - Delete override (project admin only)
    """

    serializer_class = ProjectPermissionOverrideSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["project", "workflow"]
    search_fields = ["action_name"]

    def get_queryset(self):
        """
        Filter overrides by accessible projects.

        Users can only see overrides for projects where they are admins.
        """
        user = self.request.user
        Project = apps.get_model("projects", "Project")
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        # Get projects where user is creator
        creator_projects = set(Project.objects.filter(creator=user).values_list("id", flat=True))

        # Get projects where user has admin membership
        admin_memberships = set(
            ProjectMembership.objects.filter(
                user=user, role="admin", deleted_at__isnull=True
            ).values_list("project_id", flat=True)
        )

        # Combine both sets
        admin_projects = creator_projects | admin_memberships

        return (
            ProjectPermissionOverride.objects.filter(project_id__in=admin_projects)
            .select_related("project", "workflow")
            .order_by("-created_at")
        )

    def check_project_admin(self, project) -> None:
        """
        Verify user is project admin.

        Args:
            project: Project instance to check admin status for

        Raises:
            PermissionDenied: If user is not admin or creator
        """
        user = self.request.user

        # Check if user is project creator
        if project.creator_id == user.id:
            return

        # Check if user has admin membership
        is_admin = project.memberships.filter(
            user=user, role="admin", deleted_at__isnull=True
        ).exists()

        if not is_admin:
            raise PermissionDenied("You must be a project admin to manage workflow permissions")

    @extend_schema(
        summary="List permission overrides",
        description=(
            "Returns list of permission overrides filtered by "
            "accessible projects. Only project admins can view overrides."
        ),
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
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search in action_name field",
                required=False,
            ),
        ],
        tags=["Permissions"],
    )
    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """List all permission overrides with pagination and filtering."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create permission override",
        description="Create a new permission override for a workflow action in a project. "
        "Requires project admin role. Validates that action exists in workflow transitions.",
        tags=["Permissions"],
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Create new permission override."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check project admin permission
        project = serializer.validated_data["project"]
        self.check_project_admin(project)

        # Save
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Get permission override",
        description="Returns permission override details. Requires project admin role.",
        tags=["Permissions"],
    )
    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Get permission override details."""
        instance = self.get_object()

        # Check project admin permission
        self.check_project_admin(instance.project)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(
        summary="Update permission override",
        description="Update an existing permission override. Requires project admin role. "
        "Supports partial updates (PATCH).",
        tags=["Permissions"],
    )
    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Update permission override."""
        instance = self.get_object()

        # Check project admin permission
        self.check_project_admin(instance.project)

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    @extend_schema(
        summary="Partially update permission override",
        description="Partially update a permission override. Requires project admin role.",
        tags=["Permissions"],
    )
    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Partially update permission override."""
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @extend_schema(
        summary="Delete permission override",
        description="Delete a permission override. Requires project admin role. "
        "This is a hard delete - the override will be permanently removed.",
        tags=["Permissions"],
    )
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Delete permission override."""
        instance = self.get_object()

        # Check project admin permission
        self.check_project_admin(instance.project)

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
