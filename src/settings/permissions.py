"""Scope-aware permission classes for Settings & Feature Flags."""

from permissions.audit import evaluate_permission
from rest_framework.permissions import BasePermission

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

        # Determine permission based on HTTP method
        permission_code = self._get_permission_for_method(request.method)

        # Get scope info from request
        scope_info = self._get_scope_from_request(request, view)

        return self._check_scope_permission(
            request.user,
            permission_code,
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

        # Determine permission based on HTTP method
        permission_code = self._get_permission_for_method(request.method)

        # USER scope: users can only manage their own settings
        if obj.scope_type == ScopeType.USER:
            return obj.user_id == request.user.id

        # Get scope from object for other scopes
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
            permission_code,
            scope_info["scope_type"],
            scope_info.get("resource_id"),
            scope_info.get("resource_type"),
        )

    def _get_permission_for_method(self, method):
        """Determine permission code based on HTTP method."""
        # Read operations: GET, HEAD, OPTIONS
        if method in ["GET", "HEAD", "OPTIONS"]:
            return "settings.view"
        # Write operations: POST, PUT, PATCH, DELETE
        else:
            return "settings.edit"

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

    def _check_scope_permission(
        self, user, permission_code, scope_type, resource_id=None, resource_type=None
    ):
        """Check permission using B08 hierarchical access control."""
        # Superusers have access to everything
        if user.is_superuser:
            return True

        # Handle different scope types
        if scope_type == ScopeType.USER:
            # USER scope: not applicable here (handled in has_object_permission)
            return True  # Allow creation of user settings (ownership checked later)
        elif scope_type == ScopeType.GLOBAL:
            # Global settings require superuser status (already checked above)
            return False
        elif scope_type == ScopeType.ORGANISATION:
            # Organisation settings - use evaluate_permission
            has_permission = evaluate_permission(
                user=user,
                permission=permission_code,
                context={
                    "scope": "ORGANIZATION",
                    "organization_id": resource_id,
                },
            )
            return has_permission
        else:  # PROJECT
            # Project settings - check project permission
            has_permission = evaluate_permission(
                user=user,
                permission=permission_code,
                context={
                    "scope": "PROJECT",
                    "project_id": resource_id,
                },
            )
            return has_permission


# Helper functions for permission checks used in tests and application code


def can_access_flag(user, flag):
    """
    Check if a user can access (read) a feature flag.

    Args:
        user: The user to check permissions for
        flag: The FeatureFlag instance to check access for

    Returns:
        bool: True if user can access the flag, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    # Superusers can access everything
    if user.is_superuser:
        return True

    # Check based on scope
    if flag.scope_type == ScopeType.GLOBAL:
        # Only superusers can access global flags
        return False

    elif flag.scope_type == ScopeType.ORGANISATION:
        # Check org-level access
        if flag.organisation_id:
            return evaluate_permission(
                user=user,
                permission="settings.view",
                context={
                    "scope": "ORGANIZATION",
                    "organization_id": flag.organisation_id,
                },
            )
        return False

    else:  # PROJECT scope
        # Check project-level access
        if flag.project_id:
            return evaluate_permission(
                user=user,
                permission="settings.view",
                context={
                    "scope": "PROJECT",
                    "project_id": flag.project_id,
                },
            )
        return False


def can_modify_setting(user, setting):
    """
    Check if a user can modify a setting.

    Args:
        user: The user to check permissions for
        setting: The Setting instance to check access for (can be None for general check)

    Returns:
        bool: True if user can modify the setting, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    # Superusers can modify everything
    if user.is_superuser:
        return True

    # If no specific setting, check general write permission
    if setting is None:
        return False

    # Check based on scope
    if setting.scope_type == ScopeType.GLOBAL:
        # Only superusers can modify global settings
        return False

    elif setting.scope_type == ScopeType.ORGANISATION:
        # Check org-level write access
        if setting.organisation_id:
            return evaluate_permission(
                user=user,
                permission="settings.edit",
                context={
                    "scope": "ORGANIZATION",
                    "organization_id": setting.organisation_id,
                },
            )
        return False

    else:  # PROJECT scope
        # Check project-level write access
        if setting.project_id:
            return evaluate_permission(
                user=user,
                permission="settings.edit",
                context={
                    "scope": "PROJECT",
                    "project_id": setting.project_id,
                },
            )
        return False


def can_create_flag(user, scope_type, organisation=None, project=None):
    """
    Check if a user can create a flag with the given scope.

    Args:
        user: The user to check permissions for
        scope_type: The ScopeType for the new flag
        organisation: The Organisation instance (optional)
        project: The Project instance (optional)

    Returns:
        bool: True if user can create the flag, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    # Superusers can create everything
    if user.is_superuser:
        return True

    if scope_type == ScopeType.GLOBAL:
        # Only superusers can create global flags
        return False

    elif scope_type == ScopeType.ORGANISATION:
        # Check org-level create access
        if organisation:
            org_id = organisation.id if hasattr(organisation, "id") else organisation
            return evaluate_permission(
                user=user,
                permission="settings.edit",
                context={
                    "scope": "ORGANIZATION",
                    "organization_id": org_id,
                },
            )
        return False

    else:  # PROJECT scope
        # Check project-level create access
        if project:
            project_id = project.id if hasattr(project, "id") else project
            return evaluate_permission(
                user=user,
                permission="settings.edit",
                context={
                    "scope": "PROJECT",
                    "project_id": project_id,
                },
            )
        return False


def can_delete_setting(user, setting):
    """
    Check if a user can delete a setting.

    Args:
        user: The user to check permissions for
        setting: The Setting instance to check access for (can be None for general check)

    Returns:
        bool: True if user can delete the setting, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    # Superusers can delete everything
    if user.is_superuser:
        return True

    # If no specific setting, check general admin permission
    if setting is None:
        return False

    # Check based on scope
    if setting.scope_type == ScopeType.GLOBAL:
        # Only superusers can delete global settings
        return False

    elif setting.scope_type == ScopeType.ORGANISATION:
        # Check org-level admin access
        if setting.organisation_id:
            return evaluate_permission(
                user=user,
                permission="settings.edit",
                context={
                    "scope": "ORGANIZATION",
                    "organization_id": setting.organisation_id,
                },
            )
        return False

    else:  # PROJECT scope
        # Check project-level admin access
        if setting.project_id:
            return evaluate_permission(
                user=user,
                permission="settings.edit",
                context={
                    "scope": "PROJECT",
                    "project_id": setting.project_id,
                },
            )
        return False
