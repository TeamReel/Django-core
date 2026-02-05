"""Scope-aware permission classes for Settings & Feature Flags."""

from organisations.models import Organisation
from permissions.audit import evaluate_permission
from projects.models import Project
from rest_framework.exceptions import PermissionDenied
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

        # For detail views (retrieve/update/delete), defer to has_object_permission
        # Check if this is a detail view by looking for 'pk' in view.kwargs
        if hasattr(view, "kwargs") and "pk" in view.kwargs:
            # Let has_object_permission handle the actual permission check
            return True

        # For custom actions like 'resolve' and 'resolve-all', allow if authenticated
        # These are read-only operations that respect org context
        if hasattr(view, "action") and view.action in ["resolve", "resolve_all"]:
            return True

        # For list/create views, check permission based on request context
        # Determine permission based on HTTP method
        permission_code = self._get_permission_for_method(request.method)

        # Get scope info from request
        scope_info = self._get_scope_from_request(request, view)

        has_perm = self._check_scope_permission(
            request.user,
            permission_code,
            scope_info["scope_type"],
            scope_info.get("resource_id"),
            scope_info.get("resource_type"),
        )

        if not has_perm:
            # Raise structured 403 response (WP06-T038)
            # Convert ScopeType enum to string (e.g., ScopeType.ORGANISATION -> "ORGANISATION")
            scope_name = (
                scope_info["scope_type"].name
                if hasattr(scope_info["scope_type"], "name")
                else str(scope_info["scope_type"])
            )
            detail = (
                f"Permission denied: '{permission_code}' required "
                f"for {scope_info['resource_type']} scope"
            )
            raise PermissionDenied(
                {
                    "error": "forbidden",
                    "permission": permission_code,
                    "detail": detail,
                    "scope": scope_name,
                }
            )

        return has_perm

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
            if obj.user_id != request.user.id:
                return False
            return True

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

        has_perm = self._check_scope_permission(
            request.user,
            permission_code,
            scope_info["scope_type"],
            scope_info.get("resource_id"),
            scope_info.get("resource_type"),
        )

        if not has_perm:
            # Raise structured 403 response (WP06-T038)
            scope_name = (
                scope_info["scope_type"].name
                if hasattr(scope_info["scope_type"], "name")
                else str(scope_info["scope_type"])
            )
            detail = (
                f"Permission denied: '{permission_code}' required "
                f"for {scope_info['resource_type']} scope"
            )
            raise PermissionDenied(
                {
                    "error": "forbidden",
                    "permission": permission_code,
                    "detail": detail,
                    "scope": scope_name,
                }
            )

        return has_perm

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

        # Check query params for scope info (for GET requests)
        if not org_id and not project_id and hasattr(request, "query_params"):
            org_id = request.query_params.get("organisation_id") or request.query_params.get(
                "organisation"
            )
            project_id = request.query_params.get("project_id") or request.query_params.get(
                "project"
            )

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
            # Fetch organisation object to pass as resource
            try:
                organisation = Organisation.objects.get(id=resource_id)
            except Organisation.DoesNotExist:
                return False

            # Organisation settings - use evaluate_permission
            # For WRITE operations, check both settings.edit AND org.manage_settings
            # Organization Admin role has org.manage_settings
            # But for backwards compatibility, also check settings.edit

            # For edit operations, check org.manage_settings first (preferred)
            # Then fallback to settings.edit for backwards compatibility
            if permission_code == "settings.edit":
                # Try org.manage_settings first
                has_permission = evaluate_permission(
                    user=user,
                    permission="org.manage_settings",
                    resource=organisation,
                    context={
                        "scope": "ORGANIZATION",
                        "organization_id": resource_id,
                    },
                )
                # Fallback to settings.edit if org.manage_settings failed
                if not has_permission:
                    has_permission = evaluate_permission(
                        user=user,
                        permission=permission_code,
                        resource=organisation,
                        context={
                            "scope": "ORGANIZATION",
                            "organization_id": resource_id,
                        },
                    )
            else:
                # For settings.view or other permissions, use as-is
                has_permission = evaluate_permission(
                    user=user,
                    permission=permission_code,
                    resource=organisation,
                    context={
                        "scope": "ORGANIZATION",
                        "organization_id": resource_id,
                    },
                )
            return has_permission
        else:  # PROJECT
            # Fetch project object to pass as resource
            try:
                project = Project.objects.get(id=resource_id)
            except Project.DoesNotExist:
                return False

            # Project settings - check project permission
            # For edit operations, check projects.update first (preferred)
            # Then fallback to settings.edit for backwards compatibility
            if permission_code == "settings.edit":
                # Try projects.update first (project admins have this)
                has_permission = evaluate_permission(
                    user=user,
                    permission="projects.update",
                    resource=project,
                    context={
                        "scope": "PROJECT",
                        "project_id": resource_id,
                    },
                )
                # Fallback to settings.edit if projects.update failed
                if not has_permission:
                    has_permission = evaluate_permission(
                        user=user,
                        permission=permission_code,
                        resource=project,
                        context={
                            "scope": "PROJECT",
                            "project_id": resource_id,
                        },
                    )
            else:
                # For settings.view or other permissions, use as-is
                has_permission = evaluate_permission(
                    user=user,
                    permission=permission_code,
                    resource=project,
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
