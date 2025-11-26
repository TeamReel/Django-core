"""
DRF viewsets for permissions API.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from permissions.api.permissions import HasPermission
from permissions.api.serializers import RoleAssignmentSerializer, RoleSerializer
from permissions.audit import emit_role_assignment_audit, emit_role_modification_audit
from permissions.models import Role, RoleAssignment


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
        )
