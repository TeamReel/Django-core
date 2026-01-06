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


class ActivityPermission(permissions.BasePermission):
    """
    Permission check for Activity operations.

    - Read (GET, HEAD, OPTIONS): Any authenticated organisation member
    - Write (POST, PUT, PATCH, DELETE): Requires manage_activities permission
      - Checks project.manage_activities permission
      - Falls back to organisation.manage_activities

    Falls back to is_staff check if B08 permissions module is unavailable.
    """

    def has_permission(self, request, view):
        """Check if user can access activity endpoints"""
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Write permissions require authentication
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check if user can perform action on specific activity"""
        # Read access for any authenticated user
        # TODO: Could add organisation membership check (B06 integration)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write access requires manage_activities permission
        user = request.user

        try:
            # Attempt B08 integration
            from permissions.utils import has_permission

            # Check project.manage_activities permission
            if has_permission(user, "project.manage_activities", obj.project):
                return True

            # Fallback: Check organisation-level permission
            if obj.period and obj.period.organisation:
                return has_permission(
                    user, "organisation.manage_activities", obj.period.organisation
                )

            return False

        except ImportError:
            # Fallback: If B08 not available, use is_staff
            logger.warning(
                "B08 permissions module not found. Falling back to is_staff check for activity write access."
            )
            return user.is_staff


class ParticipationPermission(permissions.BasePermission):
    """
    Permission check for Participation operations.

    - Read (GET, HEAD, OPTIONS): Any authenticated organisation member
    - Write (POST, PUT, PATCH, DELETE): Requires manage_participations permission
      - For activity participations: project.manage_participations
      - For period participations: project.manage_participations or organisation.manage_participations

    Falls back to is_staff check if B08 permissions module is unavailable.
    """

    def has_permission(self, request, view):
        """Check if user can access participation endpoints"""
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Write permissions require authentication
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check if user can perform action on specific participation"""
        # Read access for any authenticated user
        # TODO: Could add organisation membership check (B06 integration)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write access requires manage_participations permission
        user = request.user

        try:
            # Attempt B08 integration
            from permissions.utils import has_permission

            # For activity participations: check project permission
            if obj.activity:
                return has_permission(user, "project.manage_participations", obj.activity.project)

            # For period participations: check project or organisation permission
            if obj.period:
                if obj.period.project:
                    return has_permission(user, "project.manage_participations", obj.period.project)
                else:
                    return has_permission(
                        user, "organisation.manage_participations", obj.period.organisation
                    )

            return False

        except ImportError:
            # Fallback: If B08 not available, use is_staff
            logger.warning(
                "B08 permissions module not found. Falling back to is_staff check for participation write access."
            )
            return user.is_staff
