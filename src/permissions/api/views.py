"""
DRF viewsets for permissions API.
"""

from django.core.cache import cache
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from permissions.api.permissions import HasPermission
from permissions.api.serializers import RoleAssignmentSerializer, RoleSerializer
from permissions.audit import emit_role_assignment_audit, emit_role_modification_audit
from permissions.models import Role, RoleAssignment, ScopeChoices


class RoleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing roles.

    Permissions:
    - List/Retrieve: Requires permissions.view_roles
    - Create/Update/Destroy: Requires permissions.modify_role

    Filtering:
    - ?scope=global - Filter by scope
    - ?search=admin - Search by name
    """

    permission_classes = [IsAuthenticated]
    queryset = Role.objects.all().prefetch_related("permissions")
    serializer_class = RoleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["scope"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["scope", "name"]

    def get_permissions(self):
        """Require modify_role permission for write operations."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), HasPermission("permissions.modify_role")]
        return [IsAuthenticated(), HasPermission("permissions.view_roles")]

    def perform_update(self, serializer):
        """Emit audit event when role is modified."""
        instance = serializer.instance
        old_permissions = set(instance.permissions.values_list("permission", flat=True))

        # Save the changes
        serializer.save()

        # Determine what changed
        new_permissions = set(instance.permissions.values_list("permission", flat=True))
        added_permissions = new_permissions - old_permissions
        removed_permissions = old_permissions - new_permissions

        if added_permissions or removed_permissions or serializer.validated_data.keys():
            emit_role_modification_audit(
                user_id=str(self.request.user.id),
                role_id=str(instance.id),
                role_name=instance.name,
                changes={
                    "permissions_added": list(added_permissions),
                    "permissions_removed": list(removed_permissions),
                    "fields_updated": list(serializer.validated_data.keys()),
                },
            )


class RoleAssignmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing role assignments.

    Permissions:
    - List/Retrieve: Requires permissions.view_roles
    - Create/Destroy: Requires permissions.assign_role

    Filtering:
    - ?user={uuid} - Filter by user
    - ?role={uuid} - Filter by role
    - ?scope=global - Filter by scope
    - ?target_organization={uuid} - Filter by target org
    - ?target_project={uuid} - Filter by target project

    Note: Update not supported (delete old assignment, create new one)
    """

    permission_classes = [IsAuthenticated]
    queryset = RoleAssignment.objects.all().select_related(
        "user", "role", "target_organization", "target_project", "assigned_by"
    )
    serializer_class = RoleAssignmentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["user", "role", "scope", "target_organization", "target_project"]
    ordering_fields = ["assigned_at"]
    ordering = ["-assigned_at"]
    http_method_names = ["get", "post", "delete", "head", "options"]  # No PUT/PATCH

    def get_permissions(self):
        """Require assign_role permission for write operations."""
        if self.action in ["create", "destroy"]:
            return [IsAuthenticated(), HasPermission("permissions.assign_role")]
        return [IsAuthenticated(), HasPermission("permissions.view_roles")]

    def perform_create(self, serializer):
        """Emit audit event when role assignment is created."""
        instance = serializer.save()

        emit_role_assignment_audit(
            user_id=str(self.request.user.id),
            assigned_to_user_id=str(instance.user_id),
            role_id=str(instance.role_id),
            role_name=instance.role.name,
            scope=instance.scope,
            target_org_id=(
                str(instance.target_organization_id) if instance.target_organization_id else None
            ),
            target_project_id=(
                str(instance.target_project_id) if instance.target_project_id else None
            ),
            action="created",
        )

    def perform_destroy(self, instance):
        """Emit audit event when role assignment is revoked."""
        emit_role_assignment_audit(
            user_id=str(self.request.user.id),
            assigned_to_user_id=str(instance.user_id),
            role_id=str(instance.role_id),
            role_name=instance.role.name,
            scope=instance.scope,
            target_org_id=(
                str(instance.target_organization_id) if instance.target_organization_id else None
            ),
            target_project_id=(
                str(instance.target_project_id) if instance.target_project_id else None
            ),
            action="revoked",
        )
        instance.delete()


class PermissionsCurrentView(APIView):
    """
    Return hierarchical permission structure for the current authenticated user.

    Response format:
    {
        "global": ["permission.code", ...],
        "organizations": {
            "<org_id>": {
                "name": "Org Name",
                "permissions": ["org.permission", ...],
                "projects": {
                    "<project_id>": {
                        "name": "Project Name",
                        "permissions": ["project.permission", ...]
                    }
                }
            }
        }
    }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return hierarchical permission structure for current user."""
        user = request.user
        cache_key = f"permissions:user:{user.id}"

        # Check cache first
        try:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)
        except Exception:
            # If cache fails (e.g. Redis down), proceed without it
            pass

        # Build hierarchical structure
        permissions_data = {
            "global": self._get_global_permissions(user),
            "organizations": self._get_organization_permissions(user),
        }

        # Cache for 5 minutes (300 seconds)
        try:
            cache.set(cache_key, permissions_data, timeout=300)
        except Exception:
            # If cache fails, ignore
            pass

        return Response(permissions_data)

    def _get_global_permissions(self, user):
        """Get user's global-scoped permissions."""
        assignments = RoleAssignment.objects.filter(
            user=user,
            scope=ScopeChoices.GLOBAL,
            target_organization__isnull=True,
            target_project__isnull=True,
        ).select_related("role")

        permissions = set()
        for assignment in assignments:
            permissions.update(assignment.role.permissions.values_list("permission", flat=True))

        return sorted(permissions)

    def _get_organization_permissions(self, user):
        """Get user's organization-scoped permissions with nested project permissions."""
        # Import here to avoid circular dependency
        from organisations.models import Organisation
        from projects.models import Project

        # Get all organizations where user has role assignments
        org_ids = (
            RoleAssignment.objects.filter(user=user, scope=ScopeChoices.ORGANIZATION)
            .values_list("target_organization_id", flat=True)
            .distinct()
        )

        orgs = Organisation.objects.filter(id__in=org_ids)

        result = {}
        for org in orgs:
            # Get organization-level permissions
            org_assignments = RoleAssignment.objects.filter(
                user=user, scope=ScopeChoices.ORGANIZATION, target_organization=org
            ).select_related("role")

            org_permissions = set()
            for assignment in org_assignments:
                org_permissions.update(
                    assignment.role.permissions.values_list("permission", flat=True)
                )

            # Get projects within this organization
            project_ids = (
                RoleAssignment.objects.filter(
                    user=user, scope=ScopeChoices.PROJECT, target_project__organisation=org
                )
                .values_list("target_project_id", flat=True)
                .distinct()
            )

            projects = Project.objects.filter(id__in=project_ids)

            project_data = {}
            for project in projects:
                project_assignments = RoleAssignment.objects.filter(
                    user=user, scope=ScopeChoices.PROJECT, target_project=project
                ).select_related("role")

                project_permissions = set()
                for assignment in project_assignments:
                    project_permissions.update(
                        assignment.role.permissions.values_list("permission", flat=True)
                    )

                project_data[str(project.id)] = {
                    "name": project.name,
                    "permissions": sorted(project_permissions),
                }

            result[str(org.id)] = {
                "name": org.name,
                "permissions": sorted(org_permissions),
                "projects": project_data,
            }

        return result
