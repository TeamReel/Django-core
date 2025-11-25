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


# Viewsets will be added in WP03
