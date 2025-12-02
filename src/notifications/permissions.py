"""Permission classes for notifications API."""

from rest_framework import permissions


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission: User can only access their own notifications unless admin.

    Used for in-app notifications to enforce user-specific queries.
    """

    def has_permission(self, request, view):
        """Check if user is authenticated."""
        if not request.user:
            return False
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """
        Check if user owns the notification or is admin.

        Args:
            request: HTTP request
            view: ViewSet instance
            obj: Notification instance

        Returns:
            True if user owns notification or is admin/staff
        """
        # Admin/staff can access all notifications
        if request.user.is_staff or request.user.is_superuser:
            return True

        # User can only access their own in-app notifications
        if obj.channel == "in_app":
            return obj.recipient_user_id == request.user.id

        # For other channels, allow if user is recipient (email match)
        return obj.recipient == request.user.email
