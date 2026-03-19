"""
B62: Activity Feed — Permissions

Org-member-only access to the activity feed.
"""

from rest_framework import permissions


class ActivityFeedPermission(permissions.BasePermission):
    """
    Allow access only to authenticated users who are members of at least
    one organisation (org scoping is enforced via get_queryset).
    """

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        # Staff and superusers can access any feed
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Regular users: must have at least one active membership
        from organisations.models import Membership

        return Membership.objects.filter(
            user=request.user,
            is_active=True,
        ).exists()


class FeedPositionPermission(permissions.BasePermission):
    """
    Allow users to manage only their own feed position.
    """

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        return obj.user_id == request.user.pk
