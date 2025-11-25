"""DRF permissions for Projects & Workspaces."""

from rest_framework import permissions


class IsOrganisationMemberOrAdmin(permissions.BasePermission):
    """
    Permission to check if user is a member or admin of the project's organisation.

    - Read operations (GET, HEAD, OPTIONS): Requires organisation membership
    - Write operations (POST, PUT, PATCH, DELETE): Requires organisation admin role
    """

    def has_permission(self, request, view):
        """Check if user has permission to access the view."""
        if not request.user or not request.user.is_authenticated:
            return False

        # For nested routes, check organisation membership via organisation_id
        organisation_id = view.kwargs.get("organisation_id")

        if organisation_id:
            # Check if user is a member of the organisation
            is_member = request.user.organisation_memberships.filter(
                organisation_id=organisation_id, is_active=True
            ).exists()

            if not is_member:
                return False

            # For write operations, check admin status
            if request.method in permissions.SAFE_METHODS:
                return True

            # Check if user is admin of the organisation
            from organisations.permissions import IsOrganisationAdmin

            org_admin_permission = IsOrganisationAdmin()
            return org_admin_permission.has_permission(request, view)

        # For top-level routes, check object permission
        return True

    def has_object_permission(self, request, view, obj):
        """Check if user has permission to access the specific project object."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user is a member of the project's organisation
        is_member = request.user.organisation_memberships.filter(
            organisation=obj.organisation, is_active=True
        ).exists()

        if not is_member:
            return False

        # For read operations, membership is sufficient
        if request.method in permissions.SAFE_METHODS:
            return True

        # For write operations, check admin status
        is_admin = request.user.organisation_memberships.filter(
            organisation=obj.organisation, is_active=True, role="admin"
        ).exists()

        return is_admin
