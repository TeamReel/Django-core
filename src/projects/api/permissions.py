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

        # For nested routes, check organisation membership via organisation_id (slug)
        organisation_slug = view.kwargs.get("organisation_id")

        if organisation_slug:
            # Resolve slug to organisation ID
            from organisations.models import Organisation

            try:
                organisation = Organisation.objects.get(slug=organisation_slug)
                organisation_id = organisation.id
            except Organisation.DoesNotExist:
                return False

            # Check if user is a member of the organisation
            is_member = request.user.organisation_memberships.filter(
                organisation_id=organisation_id, is_active=True
            ).exists()

            if not is_member:
                # Check for RoleAssignments (Virtual Membership)
                from permissions.models import RoleAssignment, ScopeChoices

                # Check for assignment on the organisation
                has_org_role = RoleAssignment.objects.filter(
                    user=request.user,
                    target_organization=organisation,
                    scope=ScopeChoices.ORGANIZATION,
                ).exists()

                if has_org_role:
                    return True

                # Check for assignment on ANY project in the organisation
                # This is expensive but necessary for list views if we want to allow project members to see the list
                # Ideally we should filter the list instead of blocking access
                # But for now, let's allow if they have any role
                has_any_project_role = RoleAssignment.objects.filter(
                    user=request.user,
                    target_project__organisation=organisation,
                    scope=ScopeChoices.PROJECT,
                ).exists()

                if has_any_project_role:
                    return True

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

        # 1. Check direct organisation membership
        is_member = request.user.organisation_memberships.filter(
            organisation=obj.organisation, is_active=True
        ).exists()

        if is_member:
            # For read operations, membership is sufficient
            if request.method in permissions.SAFE_METHODS:
                return True

            # For write operations, check admin status
            is_admin = request.user.organisation_memberships.filter(
                organisation=obj.organisation, is_active=True, role="admin"
            ).exists()
            return is_admin

        # 2. Check RoleAssignments (Virtual Membership)
        # If not a direct member, check if they have a role assignment
        from permissions.models import RoleAssignment, ScopeChoices

        # Check for assignment on the project itself
        has_project_role = RoleAssignment.objects.filter(
            user=request.user, target_project=obj, scope=ScopeChoices.PROJECT
        ).exists()

        if has_project_role:
            # Project role allows read access
            if request.method in permissions.SAFE_METHODS:
                return True
            # Write access depends on the role capabilities (simplified for now: allow read only)
            # TODO: Check specific permissions based on role
            return False

        # Check for assignment on the organisation
        has_org_role = RoleAssignment.objects.filter(
            user=request.user, target_organization=obj.organisation, scope=ScopeChoices.ORGANIZATION
        ).exists()

        if has_org_role:
            if request.method in permissions.SAFE_METHODS:
                return True
            return False

        return False
