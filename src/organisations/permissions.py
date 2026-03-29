"""
Custom permission classes for organisations app.

Provides:
- IsOrganisationAdmin: Requires user to be active admin of organisation
"""

from organisations.models import Membership
from rest_framework import permissions


class IsOrganisationAdmin(permissions.BasePermission):
    """
    Permission class that checks if user is an active admin of the organisation.

    Used for endpoints that require admin privileges (e.g., inviting members).
    Supports both 'organisation_pk' (nested routes) and 'pk' (direct routes).
    """

    def has_permission(self, request, view):
        """Check if user is admin of the organisation specified in URL."""
        # Superusers always have permission
        if request.user.is_superuser:
            return True

        org_slug = view.kwargs.get("organisation_pk") or view.kwargs.get("slug")
        if not org_slug:
            return False

        # Resolve slug to organisation ID
        from organisations.models import Organisation

        try:
            organisation = Organisation.objects.get(slug=org_slug)
            org_id = organisation.id
        except Organisation.DoesNotExist:
            return False

        has_perm = Membership.objects.filter(
            user=request.user, organisation_id=org_id, role="admin", is_active=True
        ).exists()
        return has_perm

    def has_object_permission(self, request, view, obj):
        """Check if user is admin of the organisation object."""
        # Superusers always have permission
        if request.user.is_superuser:
            return True

        return Membership.objects.filter(
            user=request.user, organisation=obj, role="admin", is_active=True
        ).exists()
