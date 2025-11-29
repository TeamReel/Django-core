"""Permission classes for i18n preference API endpoints."""
from rest_framework import permissions


class IsOrganisationAdmin(permissions.BasePermission):
    """Permission check: user is admin of the organisation."""

    def has_object_permission(self, request, view, obj):  # noqa: ARG002
        """Check if user has admin role for organisation (via B08).

        Args:
            request: The DRF request object
            view: The view being accessed (unused, required by DRF signature)
            obj: The Organisation instance

        Returns:
            bool: True if user has admin role, False otherwise
        """
        from permissions.evaluator import check_permission

        return check_permission(
            user_id=request.user.id,
            permission="organisation.manage_settings",
            resource_id=obj.id,
            resource_type="organisation",
        )
