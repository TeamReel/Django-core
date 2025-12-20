"""
DRF permission classes for organisation access control.
"""

import uuid

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
        organisation_id = (
            view.kwargs.get("organisation_id") or view.kwargs.get("pk") or view.kwargs.get("slug")
        )

        # Handle slug from organisation_pk (used in nested routes)
        org_slug = view.kwargs.get("organisation_pk")

        # If organisation_id is present but not a UUID, treat it as a slug
        # This handles cases where organisation_id is used as a slug in URLs
        if not org_slug and organisation_id:
            try:
                uuid.UUID(str(organisation_id))
            except ValueError:
                org_slug = organisation_id

        if org_slug:
            from organisations.models import Organisation

            try:
                organisation_id = Organisation.objects.get(slug=org_slug).id
            except Organisation.DoesNotExist:
                return False

        if not organisation_id and hasattr(request, "data"):
            organisation_id = request.data.get("organisation")

        if not organisation_id:
            return False

        # Check if user is admin of the organisation
        if request.user.organisation_memberships.filter(
            organisation_id=organisation_id,
            role="admin",
            is_active=True,
        ).exists():
            return True

        # Check RoleAssignments (RBAC)
        # We check if the user has an assignment with the 'admin' role on this organisation
        from permissions.models import RoleAssignment

        return RoleAssignment.objects.filter(
            user=request.user, target_organization_id=organisation_id, role__name="admin"
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
