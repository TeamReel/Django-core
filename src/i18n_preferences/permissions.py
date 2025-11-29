"""Permission classes for i18n preference API endpoints."""

from rest_framework import permissions


class IsOrganisationAdmin(permissions.BasePermission):
    """Permission check: user is member of the organisation.

    Note: For now this checks organisation membership. Future work (WP04+):
    integrate with B08 permission system to check organisation.manage_settings permission.
    """

    def has_object_permission(self, request, view, obj):  # noqa: ARG002
        """Check if user is a member of the organisation.

        Args:
            request: The DRF request object
            view: The view being accessed (unused, required by DRF signature)
            obj: The Organisation instance

        Returns:
            bool: True if user is a member, False otherwise
        """
        return obj.memberships.filter(user=request.user).exists()
