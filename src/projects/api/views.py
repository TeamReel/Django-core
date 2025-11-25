"""DRF views for Projects & Workspaces."""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from projects.models import Project

from .permissions import IsOrganisationMemberOrAdmin
from .serializers import (
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectUpdateSerializer,
)


class ProjectCursorPagination(CursorPagination):
    """
    Cursor pagination for project lists.

    Uses created_at for ordering to ensure stable pagination.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = "-created_at"


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for project management.

    Supports both nested (under organisations) and top-level routes.

    Actions:
    - list: GET /api/organisations/{org_id}/projects/ or /api/projects/
    - create: POST /api/organisations/{org_id}/projects/
    - retrieve: GET /api/organisations/{org_id}/projects/{id}/
      or /api/projects/{id}/
    - update: PATCH /api/organisations/{org_id}/projects/{id}/
      or /api/projects/{id}/
    - archive: POST /api/organisations/{org_id}/projects/{id}/archive/
      or /api/projects/{id}/archive/
    - restore: POST /api/organisations/{org_id}/projects/{id}/restore/
      or /api/projects/{id}/restore/
    """

    permission_classes = [IsAuthenticated, IsOrganisationMemberOrAdmin]
    pagination_class = ProjectCursorPagination
    lookup_field = "id"

    def get_queryset(self):
        """
        Return projects queryset with optimizations.

        For nested routes: filter by organisation_id
        For top-level routes: filter by user's organisation memberships

        Applies select_related for organisation and creator to minimize queries.
        """
        # Base queryset with select_related for performance
        queryset = Project.objects.select_related("organisation", "creator")

        # Check if this is a nested route (organisation_id in URL)
        organisation_id = self.kwargs.get("organisation_id")

        if organisation_id:
            # Nested route: filter by organisation
            queryset = queryset.filter(organisation_id=organisation_id)
        else:
            # Top-level route: filter by user's organisations
            user = self.request.user
            if user.is_authenticated:
                # Get all organisations where user is a member
                user_org_ids = user.organisation_memberships.values_list(
                    "organisation_id", flat=True
                )
                queryset = queryset.filter(organisation_id__in=user_org_ids)

        # Handle include_archived query parameter
        include_archived = (
            self.request.query_params.get("include_archived", "false").lower() == "true"
        )

        if include_archived:
            # Use all_objects manager to include archived projects
            queryset = Project.all_objects.select_related("organisation", "creator")

            # Reapply organisation filter
            if organisation_id:
                queryset = queryset.filter(organisation_id=organisation_id)
            else:
                user = self.request.user
                if user.is_authenticated:
                    user_org_ids = user.organisation_memberships.values_list(
                        "organisation_id", flat=True
                    )
                    queryset = queryset.filter(organisation_id__in=user_org_ids)

        # Handle search query parameter
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return ProjectListSerializer
        elif self.action in ["update", "partial_update"]:
            return ProjectUpdateSerializer
        return ProjectDetailSerializer

    def get_serializer_context(self):
        """Add organisation to serializer context for nested routes."""
        context = super().get_serializer_context()

        organisation_id = self.kwargs.get("organisation_id")
        if organisation_id:
            # For nested routes, fetch the organisation and add to context
            from organisations.models import Organisation

            try:
                organisation = Organisation.objects.get(id=organisation_id)
                context["organisation"] = organisation
            except Organisation.DoesNotExist:
                pass

        return context

    def create(self, request, *args, **kwargs):
        """Create a new project."""
        # Ensure organisation is in context
        organisation_id = self.kwargs.get("organisation_id")
        if not organisation_id:
            return Response(
                {"detail": "Organisation ID is required for project creation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().create(request, *args, **kwargs)

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
