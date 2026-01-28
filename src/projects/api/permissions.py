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

        def has_global_view_all() -> bool:
            """True if user has any role assignment granting cross-org read."""
            try:
                from permissions.models import RoleAssignment
            except ImportError:
                return False

            return RoleAssignment.objects.filter(
                user=request.user,
                role__permissions__permission__in=["org.view_all", "project.view_all"],
            ).exists()

        # Superusers (admin role) have full access
        if request.user.is_superuser or request.user.is_staff:
            return True

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
                # This is expensive but necessary for list views if we want to allow
                # project members to see the list
                # Ideally we should filter the list instead of blocking access
                # But for now, let's allow if they have any role
                has_any_project_role = RoleAssignment.objects.filter(
                    user=request.user,
                    target_project__organisation=organisation,
                    scope=ScopeChoices.PROJECT,
                ).exists()

                if has_any_project_role:
                    return True

                # Cross-organisation read roles (e.g., Land Admin)
                if request.method in permissions.SAFE_METHODS and has_global_view_all():
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

        # Superusers (admin role) have full access
        if request.user.is_superuser or request.user.is_staff:
            return True

        # Cross-organisation read roles (e.g., Land Admin)
        if request.method in permissions.SAFE_METHODS:
            try:
                from permissions.models import RoleAssignment
            except ImportError:
                RoleAssignment = None

            if (
                RoleAssignment is not None
                and RoleAssignment.objects.filter(
                    user=request.user,
                    role__permissions__permission__in=["org.view_all", "project.view_all"],
                ).exists()
            ):
                return True

        # 0. TeamReel RBAC: project scoped permissions
        from permissions.evaluator import check_permission

        if request.method in permissions.SAFE_METHODS:
            # Read: allow if they are a member of the project (data layer)
            from projects.models import ProjectMembership

            if ProjectMembership.objects.filter(
                project=obj, user=request.user, deleted_at__isnull=True
            ).exists():
                return True

            # Or if they hold any role assignment on the project/org (handled below),
            # or can view/edit via TeamReel permissions.

        else:
            # Write: allow if they can edit this project
            if check_permission(
                request.user.id,
                "project.edit_own",
                resource_type="project",
                resource_id=obj.id,
            ):
                return True

            # Club Admin: edit child teams
            if obj.parent_project_id and check_permission(
                request.user.id,
                "project.edit_children",
                resource_type="project",
                resource_id=obj.parent_project_id,
            ):
                return True

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
            user=request.user,
            target_organization=obj.organisation,
            scope=ScopeChoices.ORGANIZATION,
        ).exists()

        if has_org_role:
            if request.method in permissions.SAFE_METHODS:
                return True
            return False

        return False


class IsProjectMemberOrOrgAdmin(IsOrganisationMemberOrAdmin):
    """
    Permission to check if user is a member of the project OR admin of the organisation.
    """

    def has_object_permission(self, request, view, obj):
        """Check if user has permission to access the specific project object."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers (admin role) have full access
        if request.user.is_superuser or request.user.is_staff:
            return True

        # Cross-organisation read roles (e.g., Land Admin)
        if request.method in permissions.SAFE_METHODS:
            try:
                from permissions.models import RoleAssignment
            except ImportError:
                RoleAssignment = None

            if (
                RoleAssignment is not None
                and RoleAssignment.objects.filter(
                    user=request.user,
                    role__permissions__permission__in=["org.view_all", "project.view_all"],
                ).exists()
            ):
                return True

        # 1. Check Project Membership (New B26)
        from projects.models import ProjectMembership

        membership = ProjectMembership.objects.filter(
            project=obj, user=request.user, deleted_at__isnull=True
        ).first()

        if membership:
            # For read operations, any membership is sufficient
            if request.method in permissions.SAFE_METHODS:
                return True

            # For write operations, check role
            if membership.role in [
                ProjectMembership.Role.EDITOR,
                ProjectMembership.Role.ADMIN,
            ]:
                return True

        # 1b. TeamReel RBAC: allow write if project permissions are present
        from permissions.evaluator import check_permission

        if request.method not in permissions.SAFE_METHODS:
            if check_permission(
                request.user.id,
                "project.edit_own",
                resource_type="project",
                resource_id=obj.id,
            ):
                return True

            if obj.parent_project_id and check_permission(
                request.user.id,
                "project.edit_children",
                resource_type="project",
                resource_id=obj.parent_project_id,
            ):
                return True

        # 2. Fallback to Org Admin/Member check
        return super().has_object_permission(request, view, obj)
