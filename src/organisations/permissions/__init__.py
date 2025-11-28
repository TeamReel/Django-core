"""
DRF permission classes for organisation access control.
"""

from rest_framework import permissions


class IsOrganisationAdmin(permissions.BasePermission):
    """
    Permission to check if user is an admin of the organisation.

    Checks the organisation_id from view kwargs or request data.
    """

    def has_permission(self, request, view):
        """Check if user is an admin of the target organisation."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers are always admins
        if request.user.is_superuser:
            return True

        # Get organisation_id from view kwargs or request data
        organisation_id = view.kwargs.get("organisation_id") or view.kwargs.get("pk")
        if not organisation_id and hasattr(request, "data"):
            organisation_id = request.data.get("organisation")

        if not organisation_id:
            return False

        # Check if user is admin of the organisation
        return request.user.organisation_memberships.filter(
            organisation_id=organisation_id,
            role="admin",
            is_active=True,
        ).exists()


class IsOrganisationMember(permissions.BasePermission):
    """
    Permission to check if user is a member of the organisation.
    """

    def has_permission(self, request, view):
        """Check if user is a member of the target organisation."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers can access all
        if request.user.is_superuser:
            return True

        # Get organisation_id from view kwargs
        organisation_id = view.kwargs.get("organisation_id") or view.kwargs.get("pk")

        if not organisation_id:
            return False

        # Check if user is member of the organisation
        return request.user.organisation_memberships.filter(
            organisation_id=organisation_id,
            is_active=True,
        ).exists()
