"""Django REST Framework permission classes for accounts module."""

from rest_framework import permissions


class IsSuperadmin(permissions.BasePermission):
    """Permission class for superadmin-only access."""

    def has_permission(self, request, view):
        """Check if user is authenticated and is a superuser."""
        return request.user and request.user.is_authenticated and request.user.is_superuser


class IsAdmin(permissions.BasePermission):
    """Permission class for admin or superadmin access."""

    def has_permission(self, request, view):
        """Check if user is authenticated and is admin or superuser."""
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or request.user.groups.filter(name="admin").exists())
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow admins to modify, but allow authenticated users to read."""

    def has_permission(self, request, view):
        """Check permissions based on request method."""
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or request.user.groups.filter(name="admin").exists())
        )
