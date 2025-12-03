"""DRF viewsets for notification preferences."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from ..models import NotificationPreference
from ..serializers.routing_serializers import NotificationPreferenceSerializer


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification preferences.

    Users can view and manage their own opt-out preferences.
    Org admins can view preferences for users in their organization.
    """

    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["event_type", "channel", "enabled"]
    ordering = ["-created_at"]
    ordering_fields = ["created_at", "event_type", "channel"]

    def get_queryset(self):
        """
        Return preferences visible to the user.

        Regular users see only their own preferences.
        Org admins see preferences for users in their organization.
        Superusers see all preferences.
        """
        user = self.request.user

        # Superusers see all preferences
        if user.is_superuser:
            return NotificationPreference.objects.all().select_related("user")

        # Org admins see preferences for users in their organization
        from organisations.models import OrganisationUser

        admin_org_ids = OrganisationUser.objects.filter(
            user=user, role__in=["admin", "owner"]
        ).values_list("organisation_id", flat=True)

        if admin_org_ids:
            # Get all users in these organizations
            org_user_ids = OrganisationUser.objects.filter(
                organisation_id__in=admin_org_ids
            ).values_list("user_id", flat=True)

            return NotificationPreference.objects.filter(
                user_id__in=org_user_ids
            ).select_related("user")

        # Regular users see only their own preferences
        return NotificationPreference.objects.filter(user=user).select_related("user")

    def perform_create(self, serializer):
        """Ensure user can only create preferences for themselves."""
        user = self.request.user

        # Allow superusers to create for any user
        if user.is_superuser:
            serializer.save()
            return

        # Regular users and org admins create for themselves
        serializer.save(user=user)
