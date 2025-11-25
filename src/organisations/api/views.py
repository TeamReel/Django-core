"""
API views for organisations app.

Provides:
- OrganisationViewSet: CRUD operations for organisations
"""

from django.db import transaction
from rest_framework import permissions, viewsets

from organisations.models import Membership, Organisation

from .serializers import OrganisationCreateSerializer, OrganisationSerializer


class OrganisationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Organisation model.

    Endpoints:
    - POST /api/organisations/ - Create organisation (creator becomes first admin)
    - GET /api/organisations/ - List organisations (user is member of)
    - GET /api/organisations/{id}/ - Retrieve organisation details
    - PUT/PATCH /api/organisations/{id}/ - Update organisation
    - DELETE /api/organisations/{id}/ - Soft-delete organisation
    """

    queryset = Organisation.objects.active()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return OrganisationCreateSerializer
        return OrganisationSerializer

    def perform_create(self, serializer):
        """
        Create organisation and automatically assign creator as first admin.

        Uses atomic transaction to ensure both organisation and membership
        are created together, or neither is created if there's an error.
        """
        with transaction.atomic():
            # Save organisation with creator
            org = serializer.save(creator=self.request.user)

            # Create admin membership for creator
            Membership.objects.create(user=self.request.user, organisation=org, role="admin")


class MembershipViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Membership model (nested under organisations).

    Endpoints:
    - POST /api/organisations/{id}/members/ - Invite member (admin only)
    - GET /api/organisations/{id}/members/ - List members (any member)
    - GET /api/organisations/{id}/members/{id}/ - Retrieve member details
    - PATCH /api/organisations/{id}/members/{id}/ - Update member role (admin only)
    - DELETE /api/organisations/{id}/members/{id}/ - Remove member (admin only)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter memberships by organisation_pk from URL."""
        org_id = self.kwargs.get("organisation_pk")
        return Membership.objects.filter(organisation_id=org_id, is_active=True).select_related(
            "user", "organisation", "invited_by"
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            from .serializers import MembershipCreateSerializer

            return MembershipCreateSerializer
        from .serializers import MembershipSerializer

        return MembershipSerializer

    def get_permissions(self):
        """Require admin permission for create/update/delete actions."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            from organisations.permissions import IsOrganisationAdmin

            return [permissions.IsAuthenticated(), IsOrganisationAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        """Set invited_by to current user when creating membership."""
        serializer.save(invited_by=self.request.user)
