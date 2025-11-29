"""
Custom permission classes for organisations app.

Provides:
- IsOrganisationAdmin: Requires user to be active admin of organisation
"""

from rest_framework import permissions

from organisations.models import Membership


class IsOrganisationAdmin(permissions.BasePermission):
    """
    Permission class that checks if user is an active admin of the organisation.

    Used for endpoints that require admin privileges (e.g., inviting members).
    Expects 'organisation_pk' in view.kwargs.
    """

    def has_permission(self, request, view):
        """Check if user is admin of the organisation specified in URL."""
        org_id = view.kwargs.get("organisation_pk")
        if not org_id:
            return False

        return Membership.objects.filter(
            user=request.user, organisation_id=org_id, role="admin", is_active=True
        ).exists()
