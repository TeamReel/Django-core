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

    All template operations require manage_templates permission.
    """

    def get_permissions(self):
        """Return appropriate permissions for template operations."""
        return [IsAuthenticated(), HasPermission(MANAGE_TEMPLATES)]


class ContentItemPermissionMixin:
    """
    Permission mixin for ContentItemViewSet.

    Different actions require different permissions:
    - list/retrieve: view_library
    - create: generate_content
    - approve/reject/request_revision: approve_content
    - download: download_content
    """

    def get_permissions(self):
        """Return appropriate permissions based on action."""
        if self.action in ["list", "retrieve", "get_status"]:
            return [IsAuthenticated(), HasPermission(VIEW_LIBRARY)]
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

    View requires view_library, create requires approve_content.
    """

    def get_permissions(self):
        """Return appropriate permissions for approval operations."""
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated(), HasPermission(VIEW_LIBRARY)]
        return [IsAuthenticated(), HasPermission(APPROVE_CONTENT)]
