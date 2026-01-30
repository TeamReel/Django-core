"""
Views for B32 Sport Configuration API.

Provides DRF ViewSets for Sport and SportConfiguration resources.
OutfitConfiguration and Validation viewsets are implemented in WP04/WP05.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from sport_configuration.models import Sport
from sport_configuration.serializers import (
    SportConfigurationSerializer,
    SportConfigurationUpdateSerializer,
    SportCreateSerializer,
    SportSerializer,
)

if TYPE_CHECKING:
    from rest_framework.request import Request

logger = logging.getLogger(__name__)


class IsStaffOrReadOnly(BasePermission):
    """
    Custom permission: staff can write, authenticated users can read.

    - Staff users (is_staff=True): Full CRUD access
    - Authenticated users: Read-only access (list, retrieve)
    - Unauthenticated users: No access
    """

    def has_permission(self, request: Request, view) -> bool:
        """Check if user has permission for this request."""
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Safe methods (GET, HEAD, OPTIONS) allowed for all authenticated users
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True

        # Write methods require staff status
        return request.user.is_staff


@extend_schema_view(
    list=extend_schema(
        summary="List all sports",
        description="Returns all available sports with their configurations. "
        "Accessible to all authenticated users.",
        tags=["Sports"],
    ),
    retrieve=extend_schema(
        summary="Get sport details",
        description="Returns a single sport with its full configuration. "
        "Uses slug as the lookup field.",
        tags=["Sports"],
    ),
    create=extend_schema(
        summary="Create a new sport",
        description="Creates a new sport with default configuration. "
        "Staff only. Configuration can be customized in the request body.",
        tags=["Sports"],
    ),
    update=extend_schema(
        summary="Update a sport",
        description="Updates sport details (not configuration). Staff only.",
        tags=["Sports"],
    ),
    partial_update=extend_schema(
        summary="Partially update a sport",
        description="Partially updates sport details. Staff only.",
        tags=["Sports"],
    ),
    destroy=extend_schema(
        summary="Delete a sport",
        description="Deletes a sport and its configuration. Staff only.",
        tags=["Sports"],
    ),
)
class SportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Sport CRUD operations.

    Provides:
    - GET /sports/ - List all sports (authenticated)
    - GET /sports/{slug}/ - Retrieve sport by slug (authenticated)
    - POST /sports/ - Create sport (staff only)
    - PUT/PATCH /sports/{slug}/ - Update sport (staff only)
    - DELETE /sports/{slug}/ - Delete sport (staff only)
    - GET/PATCH /sports/{slug}/configuration/ - Sport configuration (staff for PATCH)
    """

    queryset = Sport.objects.select_related("configuration").filter(is_active=True)
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = "slug"
    lookup_url_kwarg = "slug"

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return SportCreateSerializer
        return SportSerializer

    def get_queryset(self):
        """Return sports queryset with related configuration."""
        qs = Sport.objects.select_related("configuration")

        # Staff can see all sports, others only active ones
        if self.request.user.is_staff:
            return qs.all()
        return qs.filter(is_active=True)

    @extend_schema(
        summary="Get sport configuration",
        description="Returns the configuration for a specific sport.",
        responses={200: SportConfigurationSerializer},
        tags=["Sports"],
    )
    @action(detail=True, methods=["get", "patch"], url_path="configuration")
    def configuration(self, request: Request, slug: str = None) -> Response:
        """
        GET/PATCH sport configuration.

        GET: Returns configuration for the sport (authenticated users)
        PATCH: Updates configuration (staff only)
        """
        sport = self.get_object()

        if request.method == "GET":
            serializer = SportConfigurationSerializer(sport.configuration)
            return Response(serializer.data)

        # PATCH - staff only
        if not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SportConfigurationUpdateSerializer(
            sport.configuration,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Return full configuration after update
        return Response(SportConfigurationSerializer(sport.configuration).data)
