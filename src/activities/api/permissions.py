"""
Permission classes for Activities & Period Hierarchy API.
"""

from rest_framework import permissions
import logging

logger = logging.getLogger(__name__)


class PeriodPermission(permissions.BasePermission):
    """
    Permission check for Period operations.

    - Read (GET, HEAD, OPTIONS): Any authenticated organisation member
    - Write (POST, PUT, PATCH, DELETE): Requires manage_periods permission
      - For org-wide periods: organisation.manage_periods
      - For project-scoped periods: project.manage_periods

    Falls back to is_staff check if B08 permissions module is unavailable.
    """

    def has_permission(self, request, view):
        """Check if user can access period endpoints"""
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Write permissions require authentication
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check if user can perform action on specific period"""
        # Read access for any authenticated user
        # TODO: Could add organisation membership check (B06 integration)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write access requires manage_periods permission
        user = request.user

        try:
            # Attempt B08 integration
            from permissions.utils import has_permission

            if obj.project:
                # Project-scoped period: check project.manage_periods
                return has_permission(user, "project.manage_periods", obj.project)
            else:
                # Org-wide period: check organisation.manage_periods
                return has_permission(user, "organisation.manage_periods", obj.organisation)

        except ImportError:
            # Fallback: If B08 not available, use is_staff
            logger.warning(
                "B08 permissions module not found. Falling back to is_staff check for period write access."
            )
            return user.is_staff
