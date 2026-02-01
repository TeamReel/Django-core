"""
Permission classes for B33 Brand Identity Manager.

Implements cascade permission control:
- Organisation admins can modify org brands AND all child project brands
- Project admins can only modify their own project brands
- All org/project members have read access
"""

from rest_framework import permissions


class BrandProfilePermission(permissions.BasePermission):
    """
    Cascade permissions for brand profiles.

    Read access:
    - Organisation members can read org brands
    - Project members can read project brands

    Write access (create, update, delete):
    - Organisation admins can modify org brands
    - Organisation admins can modify ALL project brands within their org (cascade)
    - Project admins can only modify their own project brands
    """

    def has_permission(self, request, view):
        """All authenticated users can list/retrieve brands."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check permissions for specific brand profile object."""
        user = request.user

        # Read permissions (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            if obj.organisation:
                # Org brand: check org membership
                return user.organisation_memberships.filter(
                    organisation=obj.organisation, is_active=True
                ).exists()

            if obj.project:
                # Project brand: check project membership OR org membership
                # Users can see project brands if they're in the project or org
                has_project_access = user.project_memberships.filter(
                    project=obj.project, deleted_at__isnull=True
                ).exists()

                has_org_access = user.organisation_memberships.filter(
                    organisation=obj.project.organisation, is_active=True
                ).exists()

                return has_project_access or has_org_access

            return False

        # Write permissions (POST, PUT, PATCH, DELETE)
        if obj.organisation:
            # Org brand: must be org admin
            return user.organisation_memberships.filter(
                organisation=obj.organisation, role="admin", is_active=True
            ).exists()

        if obj.project:
            # Project brand: project admin OR org admin (cascade)
            is_project_admin = user.project_memberships.filter(
                project=obj.project, role="admin", deleted_at__isnull=True
            ).exists()

            is_org_admin = user.organisation_memberships.filter(
                organisation=obj.project.organisation, role="admin", is_active=True
            ).exists()

            return is_project_admin or is_org_admin

        return False


class DesignTokenPermission(permissions.BasePermission):
    """
    Permission for design tokens (nested under BrandProfile).

    Inherits permissions from parent BrandProfile.
    """

    def has_permission(self, request, view):
        """All authenticated users can list/retrieve tokens."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Delegate to parent BrandProfile permission check."""
        brand_permission = BrandProfilePermission()
        return brand_permission.has_object_permission(request, view, obj.profile)


class BrandAssetPermission(permissions.BasePermission):
    """
    Permission for brand assets (nested under BrandProfile).

    Inherits permissions from parent BrandProfile.
    """

    def has_permission(self, request, view):
        """All authenticated users can list/retrieve assets."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Delegate to parent BrandProfile permission check."""
        brand_permission = BrandProfilePermission()
        return brand_permission.has_object_permission(request, view, obj.profile)
