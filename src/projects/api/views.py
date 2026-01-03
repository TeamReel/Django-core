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

    permission_classes = [IsAuthenticated, IsOrganisationMemberOrAdmin]
    pagination_class = ProjectCursorPagination

    @action(detail=True, methods=["get"])
    def members(self, request, slug=None, organisation_id=None):
        """
        List users with access to this project.
        Includes:
        1. Users with explicit RoleAssignments on this project.
        2. Organisation Admins (who implicitly have access).
        """
        project = self.get_object()

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

        # Combine and format
        members_data = []
        seen_user_ids = set()

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
        if user.is_authenticated and not user.is_superuser:
            from django.db.models import Q
            from permissions.models import RoleAssignment, ScopeChoices

            # 1. Direct membership
            user_org_ids = user.organisation_memberships.values_list("organisation_id", flat=True)

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
                if user.is_authenticated and not user.is_superuser:
                    from django.db.models import Q
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

        # Ensure distinct is always applied to prevent duplicates
        return queryset.distinct()

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

        # Trigger notification on successful creation
        if response.status_code == status.HTTP_201_CREATED:
            from notifications.services import notify_project_created

            from projects.models import Project

            project = Project.objects.get(id=response.data["id"])
            notify_project_created(project=project, creator=request.user)

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
