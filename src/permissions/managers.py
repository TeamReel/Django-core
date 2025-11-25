"""Custom model managers with query optimizations"""

from typing import TYPE_CHECKING

from django.db import models

if TYPE_CHECKING:
    from accounts.models import User

    from .models import Role, RoleAssignment


class RoleManager(models.Manager["Role"]):
    """Custom manager for Role model with query optimizations"""

    def with_permissions(self) -> models.QuerySet["Role"]:
        """
        Fetch roles with permissions prefetched for efficient access.

        Usage:
            roles = Role.objects.with_permissions().filter(scope='global')
            for role in roles:
                for perm in role.permissions.all():  # No additional queries
                    print(perm.permission)
        """
        return self.prefetch_related("permissions")


class RoleAssignmentManager(models.Manager["RoleAssignment"]):
    """Custom manager for RoleAssignment model with query optimizations"""

    def for_user(self, user: "User") -> models.QuerySet["RoleAssignment"]:
        """
        Fetch all role assignments for a user with related objects prefetched.

        Optimizes queries by eagerly loading:
        - role (with permissions)
        - target_organization
        - target_project
        - assigned_by user

        Usage:
            assignments = RoleAssignment.objects.for_user(user)
            for assignment in assignments:
                print(assignment.role.name)  # No additional query
                for perm in assignment.role.permissions.all():  # No additional query
                    print(perm.permission)
        """
        return (
            self.filter(user=user)
            .select_related("role", "target_organization", "target_project", "assigned_by")
            .prefetch_related("role__permissions")
        )
