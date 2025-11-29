"""
API views for organisations app.

Provides:
- OrganisationViewSet: CRUD operations for organisations
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.exceptions import Throttled
from rest_framework.pagination import PageNumberPagination

from src.organisations.metrics import rate_limit_hits
from src.organisations.models import Membership, Organisation
from src.organisations.ratelimit import check_rate_limit

from .serializers import (
    OrganisationCreateSerializer,
    OrganisationListSerializer,
    OrganisationSerializer,
)


class OrganisationPagination(PageNumberPagination):
    """Pagination configuration for organisation list."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class OrganisationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Organisation model.

    Endpoints:
    - POST /api/organisations/ - Create organisation (creator becomes first admin)
    - GET /api/organisations/ - List organisations (user is member of)
    - GET /api/organisations/{id}/ - Retrieve organisation details
    - PUT/PATCH /api/organisations/{id}/ - Update organisation (admin only)
    - DELETE /api/organisations/{id}/ - Soft-delete organisation (admin only)
    """

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OrganisationPagination

    def get_queryset(self):
        """
        Filter organisations to only those the user is a member of.

        Optimizations:
        - select_related('creator'): Avoid N+1 for creator field
        - prefetch_related('memberships'): Optimize member count queries
        - distinct(): Ensure no duplicates from join
        """
        return (
            Organisation.objects.filter(
                memberships__user=self.request.user, memberships__is_active=True, is_active=True
            )
            .select_related("creator")
            .prefetch_related("memberships")
            .distinct()
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return OrganisationCreateSerializer
        if self.action == "list":
            return OrganisationListSerializer
        return OrganisationSerializer

    def get_permissions(self):
        """Require admin permission for update and delete actions."""
        if self.action in ["update", "partial_update", "destroy"]:
            from organisations.permissions import IsOrganisationAdmin

            return [permissions.IsAuthenticated(), IsOrganisationAdmin()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """
        Create organisation with rate limiting (5 per user per day).

        Rate limit: 5 organisations per user per 24 hours.
        Returns 429 Too Many Requests if limit exceeded.
        """
        # Check rate limit
        key = f"ratelimit:org_create:{request.user.id}:{timezone.now().date()}"
        allowed, remaining, reset = check_rate_limit(key, 5, 86400)  # 24 hours

        if not allowed:
            # Track rate limit hit in metrics
            rate_limit_hits.labels(endpoint="organisation_create").inc()
            raise Throttled(wait=reset - timezone.now().timestamp())

        # Proceed with creation
        response = super().create(request, *args, **kwargs)

        # Add rate limit headers
        response["X-RateLimit-Limit"] = "5"
        response["X-RateLimit-Remaining"] = str(remaining)
        response["X-RateLimit-Reset"] = str(int(reset))

        return response

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

    def create(self, request, *args, **kwargs):
        """
        Invite member with rate limiting (20 per org per hour).

        Rate limit: 20 invitations per organisation per hour.
        Returns 429 Too Many Requests if limit exceeded.
        """
        org_id = self.kwargs.get("organisation_pk")

        # Check rate limit
        key = f"ratelimit:member_invite:{org_id}:{timezone.now().strftime('%Y-%m-%d-%H')}"
        allowed, remaining, reset = check_rate_limit(key, 20, 3600)  # 1 hour

        if not allowed:
            # Track rate limit hit in metrics
            rate_limit_hits.labels(endpoint="member_invite").inc()
            raise Throttled(wait=reset - timezone.now().timestamp())

        # Proceed with creation
        response = super().create(request, *args, **kwargs)

        # Add rate limit headers
        response["X-RateLimit-Limit"] = "20"
        response["X-RateLimit-Remaining"] = str(remaining)
        response["X-RateLimit-Reset"] = str(int(reset))

        return response

    def perform_create(self, serializer):
        """Set invited_by to current user when creating membership."""
        serializer.save(invited_by=self.request.user)

    def update(self, request, *args, **kwargs):
        """
        Update membership role with last-admin protection.

        Prevents:
        - Downgrading last admin to member (returns 409 Conflict)
        - Removing admin role when it would leave org without admins
        """
        from rest_framework.exceptions import ValidationError

        membership = self.get_object()
        new_role = request.data.get("role")

        # Check if this would remove the last admin
        if membership.role == "admin" and new_role == "member":
            admin_count = membership.organisation.get_admin_count()
            if admin_count <= 1:
                raise ValidationError(
                    {
                        "role": (
                            "Cannot demote the last admin. "
                            "Promote another member to admin first."
                        )
                    },
                    code="last_admin_protection",
                )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Remove membership with last-admin and self-removal protection.

        Prevents:
        - Removing last admin (returns 409 Conflict)
        - Last admin from removing themselves
        """
        from rest_framework.exceptions import ValidationError

        membership = self.get_object()

        # Check if removing an admin
        if membership.role == "admin":
            admin_count = membership.organisation.get_admin_count()
            if admin_count <= 1:
                # Prevent last admin removal
                raise ValidationError(
                    {
                        "detail": (
                            "Cannot remove the last admin. "
                            "Promote another member to admin first."
                        )
                    },
                    code="last_admin_protection",
                )

        return super().destroy(request, *args, **kwargs)
