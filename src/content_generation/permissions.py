"""
B31 Content Generation - DRF Permission Classes

Integrates with B08 hierarchical access control for content generation endpoints.
Uses the permissions module's HasPermission class for consistent access control.
"""

from permissions.api.permissions import HasPermission
from rest_framework.permissions import IsAuthenticated

# ========== Permission Strings ==========
# These follow the pattern: module.action

MANAGE_TEMPLATES = "content.manage_templates"
GENERATE_CONTENT = "content.generate_content"
APPROVE_CONTENT = "content.approve_content"
VIEW_LIBRARY = "content.view_library"
DOWNLOAD_CONTENT = "content.download_content"


# ========== Permission Mixins ==========


class ContentTemplatePermissionMixin:
    """
    Permission mixin for ContentTemplateViewSet.

    Read operations (list/retrieve) require only authentication.
    Write operations require manage_templates permission OR superuser status.
    Global templates (organisation=NULL) can only be modified by superusers.
    """

    def get_permissions(self):
        """Return appropriate permissions for template operations."""
        # Read operations: any authenticated user can view templates
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        # Write operations: superusers always allowed, others need permission
        return [IsAuthenticated(), HasPermissionOrSuperuser(MANAGE_TEMPLATES)]


class HasPermissionOrSuperuser(HasPermission):
    """Permission that allows superusers to bypass permission check."""

    def has_permission(self, request, view):
        """Check if user is superuser or has required permission."""
        if request.user and request.user.is_authenticated and request.user.is_superuser:
            return True
        return super().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        """Check object permission, superusers always allowed."""
        if request.user and request.user.is_authenticated and request.user.is_superuser:
            return True
        return super().has_object_permission(request, view, obj)


class ContentItemPermissionMixin:
    """
    Permission mixin for ContentItemViewSet.

    Different actions require different permissions:
    - list/retrieve: IsAuthenticated (view library is implicit for members)
    - create: generate_content
    - approve/reject/request_revision: approve_content
    - download: download_content
    """

    def get_permissions(self):
        """Return appropriate permissions based on action."""
        # List/retrieve: any authenticated user can view content items
        # (project filtering happens in get_queryset)
        if self.action in ["list", "retrieve", "get_status"]:
            return [IsAuthenticated()]
        elif self.action == "download":
            return [IsAuthenticated(), HasPermission(DOWNLOAD_CONTENT)]
        elif self.action in ["approve", "reject", "request_revision"]:
            return [IsAuthenticated(), HasPermission(APPROVE_CONTENT)]
        elif self.action in ["create", "retry"]:
            return [IsAuthenticated(), HasPermission(GENERATE_CONTENT)]
        # Default: require generate permission for other actions
        return [IsAuthenticated(), HasPermission(GENERATE_CONTENT)]


class ContentApprovalPermissionMixin:
    """
    Permission mixin for ContentApprovalViewSet.

    View requires IsAuthenticated, create requires approve_content.
    """

    def get_permissions(self):
        """Return appropriate permissions for approval operations."""
        # List/retrieve: any authenticated user can view approvals
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), HasPermission(APPROVE_CONTENT)]
