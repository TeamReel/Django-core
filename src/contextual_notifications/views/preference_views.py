"""DRF viewsets for notification preferences."""

from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from ..models import NotificationPreference
from ..serializers.routing_serializers import NotificationPreferenceSerializer


class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination for API results."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification preferences.

    Users can view and manage their own opt-out preferences.
    Org admins can view preferences for users in their organization.
    """

    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["event_type", "channel", "enabled"]
    pagination_class = StandardResultsSetPagination
    ordering = ["-created_at"]
    ordering_fields = ["created_at", "event_type", "channel"]

    def get_queryset(self):
        """
        Return preferences visible to the user.

        Regular users see only their own preferences.
        Org admins see preferences for users in their organization (ACL-enforced via B06).
        Superusers see all preferences.
        """
        user = self.request.user

        # Superusers see all preferences
        if user.is_superuser:
            return NotificationPreference.objects.all().select_related("user")

        # Org admins see preferences for users in their organizations
        # Use B06 service layer (calls evaluate_permission() internally)
        from organisations.services import get_user_organizations

        # Get all organizations where user has admin role
        admin_orgs = get_user_organizations(
            user=user,
            permission="organization.view_members",
            role_filter=["admin", "owner"],
        )

        # For each org, get all member user IDs
        org_user_ids = set()
        for org in admin_orgs:
            # Get members for this organization (already ACL-checked)
            from organisations.models import Membership

            memberships = Membership.objects.filter(
                organisation=org, is_active=True
            ).select_related("user")
            org_user_ids.update(m.user.id for m in memberships if m.user.is_active)

        if org_user_ids:
            return NotificationPreference.objects.filter(user_id__in=org_user_ids).select_related(
                "user"
            )

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
