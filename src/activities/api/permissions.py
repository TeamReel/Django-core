"""
Permission classes for Activities & Period Hierarchy API.
"""

import logging

from rest_framework import permissions

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
                "B08 permissions module not found. "
                "Falling back to is_staff check for period write access."
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

        user = request.user

        # System admins always allowed
        if user.is_superuser or user.is_staff:
            return True

        # TeamReel Option A: matches use match.* permissions
        if getattr(obj, "activity_type", None) == "match":
            from permissions.evaluator import check_permission

            required = "match.edit_own_team"
            if request.method == "DELETE":
                required = "match.delete"

            # Direct team scope
            if check_permission(
                user.id,
                required,
                resource_type="project",
                resource_id=obj.project_id,
            ):
                return True

            # Club Admin acting on a child team
            parent_project_id = getattr(obj.project, "parent_project_id", None)
            if parent_project_id and check_permission(
                user.id,
                required,
                resource_type="project",
                resource_id=parent_project_id,
            ):
                return True

            return False

        # Non-match activities: keep the existing permissive behavior for now
        # (historically these endpoints used is_staff fallback in tests and
        # in minimal deployments).
        return False


class ParticipationPermission(permissions.BasePermission):
    """
    Permission check for Participation operations.

    - Read (GET, HEAD, OPTIONS): Any authenticated organisation member
    - Write (POST, PUT, PATCH, DELETE): Requires manage_participations permission
      - For activity participations: project.manage_participations
            - For period participations: project.manage_participations
                or organisation.manage_participations

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
                return has_permission(
                    user,
                    "project.manage_participations",
                    obj.activity.project,
                )

            # For period participations: check project or organisation permission
            if obj.period:
                if obj.period.project:
                    return has_permission(
                        user,
                        "project.manage_participations",
                        obj.period.project,
                    )
                else:
                    return has_permission(
                        user, "organisation.manage_participations", obj.period.organisation
                    )

            return False

        except ImportError:
            # Fallback: If B08 not available, use is_staff
            logger.warning(
                "B08 permissions module not found. "
                "Falling back to is_staff check for participation write access."
            )
            return user.is_staff


class ActivityEventPermission(permissions.BasePermission):
    """Permissions for ActivityEvent operations.

    For TeamReel matches, we gate writes using match.* permissions (similar to ActivityPermission).
    Reads remain available to authenticated users (querysets are additionally restricted).
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        if user.is_superuser or user.is_staff:
            return True

        activity = getattr(obj, "activity", None)
        if getattr(activity, "activity_type", None) != "match":
            return False

        from permissions.evaluator import check_permission

        required = "match.edit_own_team"
        if request.method == "DELETE":
            required = "match.delete"

        # Direct team scope
        if check_permission(
            user.id,
            required,
            resource_type="project",
            resource_id=activity.project_id,
        ):
            return True

        # Club Admin acting on a child team
        parent_project_id = getattr(activity.project, "parent_project_id", None)
        if parent_project_id and check_permission(
            user.id,
            required,
            resource_type="project",
            resource_id=parent_project_id,
        ):
            return True

        return False
