"""Scope-aware permission classes for Settings & Feature Flags."""

from rest_framework.permissions import BasePermission
from permissions.evaluator import check_permission
from .models import ScopeType


class ScopeAwarePermission(BasePermission):
    """
    Permission class that enforces scope-aware access control.

    Rules:
    - Global scope: Only superusers
    - Organisation scope: Org admins and superusers
    - Project scope: Project admins, org admins, and superusers
    """

    def has_permission(self, request, view):
        """Check if user has permission for the requested action and scope."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Get scope info from request
        scope_info = self._get_scope_from_request(request, view)

        return self._check_scope_permission(
            request.user,
            scope_info["scope_type"],
            scope_info.get("resource_id"),
            scope_info.get("resource_type"),
        )

    def has_object_permission(self, request, view, obj):
        """Check if user has permission for specific object."""
        # view parameter required by DRF interface but not used here
        del view  # Suppress unused parameter warning

        if not request.user or not request.user.is_authenticated:
            return False

        # Get scope from object
        if obj.scope_type == ScopeType.GLOBAL:
            scope_info = {
                "scope_type": ScopeType.GLOBAL,
                "resource_id": None,
                "resource_type": "global",
            }
        elif obj.scope_type == ScopeType.ORGANISATION:
            scope_info = {
                "scope_type": ScopeType.ORGANISATION,
                "resource_id": obj.organisation_id,
                "resource_type": "organisation",
            }
        else:  # PROJECT
            scope_info = {
                "scope_type": ScopeType.PROJECT,
                "resource_id": obj.project_id,
                "resource_type": "project",
            }

        return self._check_scope_permission(
            request.user,
            scope_info["scope_type"],
            scope_info.get("resource_id"),
            scope_info.get("resource_type"),
        )

    def _get_scope_from_request(self, request, view):
        """Extract scope information from request/view context."""
        # Check URL kwargs first (for nested routes)
        org_id = view.kwargs.get("org_id") or getattr(request, "organisation_id", None)
        project_id = view.kwargs.get("project_id") or getattr(request, "project_id", None)

        # Check request data for scope info
        if not org_id and not project_id and hasattr(request, "data"):
            org_id = request.data.get("organisation")
            project_id = request.data.get("project")

        # Determine scope type
        if project_id:
            return {
                "scope_type": ScopeType.PROJECT,
                "resource_id": project_id,
                "resource_type": "project",
            }
        elif org_id:
            return {
                "scope_type": ScopeType.ORGANISATION,
                "resource_id": org_id,
                "resource_type": "organisation",
            }
        else:
            return {"scope_type": ScopeType.GLOBAL, "resource_id": None, "resource_type": "global"}

    def _check_scope_permission(self, user, scope_type, resource_id=None, resource_type=None):
        """Check permission using B08 hierarchical access control."""
        # Superusers have access to everything
        if user.is_superuser:
            return True

        # Use appropriate permissions based on the existing B08 system
        # For settings, we'll use a general 'settings.manage' permission
        # and rely on B08's hierarchical scoping to handle org/project restrictions
        if scope_type == ScopeType.GLOBAL:
            # Global settings require superuser status
            return user.is_superuser
        elif scope_type == ScopeType.ORGANISATION:
            # Organisation settings require org management permission
            return check_permission(
                user.id,
                "org.manage_settings",  # Using existing permission
                resource_id,
                "organisation",
            )
        else:  # PROJECT
            # Project settings - check both project permissions and org permissions
            # (org admins can manage project settings too)
            has_project_perm = check_permission(
                user.id,
                "projects.update",  # Using existing project permission
                resource_id,
                "project",
            )

            # Also allow org admins to manage project settings in their org
            if not has_project_perm and resource_type == "project":
                # Get the project's organisation to check org-level permissions
                try:
                    from projects.models import Project

                    project = Project.objects.select_related("organisation").get(id=resource_id)
                    has_org_perm = check_permission(
                        user.id, "org.manage_settings", project.organisation.id, "organisation"
                    )
                    return has_org_perm
                except (ImportError, AttributeError, ValueError):
                    # Handle import errors or project not found
                    pass

            return has_project_perm
