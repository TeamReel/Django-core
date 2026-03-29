"""
Views for B32 Sport Configuration API.

Provides DRF ViewSets for Sport, SportConfiguration, and OutfitConfiguration resources.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from sport_configuration.models import Formation, OutfitConfiguration, Sport, SportConfiguration
from sport_configuration.serializers import (
    FormationListSerializer,
    FormationSerializer,
    FormationValidationRequestSerializer,
    OutfitConfigurationCreateSerializer,
    OutfitConfigurationSerializer,
    PositionsValidationRequestSerializer,
    ProjectValidationRequestSerializer,
    SportConfigurationSerializer,
    SportConfigurationUpdateSerializer,
    SportCreateSerializer,
    SportSerializer,
    TeamSizeValidationRequestSerializer,
    ValidationResultSerializer,
)
from sport_configuration.services import OutfitLookupService
from sport_configuration.services.validation import SportValidationService

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


# ==============================================================================
# Outfit Configuration ViewSet (WP04)
# ==============================================================================


@extend_schema_view(
    list=extend_schema(
        summary="List outfit configurations",
        description="Returns outfit configurations filtered by project, outfit_type, or is_active. "
        "Requires authentication.",
        parameters=[
            OpenApiParameter("project", int, description="Filter by project ID", required=False),
            OpenApiParameter(
                "outfit_type",
                str,
                description="Filter by outfit type (home, away, etc.)",
                required=False,
            ),
            OpenApiParameter(
                "is_active", bool, description="Filter by active status", required=False
            ),
        ],
        tags=["Outfits"],
    ),
    retrieve=extend_schema(
        summary="Get outfit configuration",
        description="Returns a single outfit configuration by ID.",
        tags=["Outfits"],
    ),
    create=extend_schema(
        summary="Create outfit configuration",
        description="Creates a new outfit configuration for a project. "
        "Must be unique per project + outfit_type combination.",
        tags=["Outfits"],
    ),
    update=extend_schema(
        summary="Update outfit configuration",
        description="Full update of an outfit configuration.",
        tags=["Outfits"],
    ),
    partial_update=extend_schema(
        summary="Partially update outfit configuration",
        description="Partial update of outfit configuration fields.",
        tags=["Outfits"],
    ),
    destroy=extend_schema(
        summary="Delete outfit configuration",
        description="Deletes an outfit configuration.",
        tags=["Outfits"],
    ),
)
class OutfitConfigurationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for OutfitConfiguration CRUD operations.

    Provides:
    - GET /outfits/ - List all outfits (filterable by project)
    - POST /outfits/ - Create outfit
    - GET /outfits/{id}/ - Retrieve outfit
    - PUT/PATCH /outfits/{id}/ - Update outfit
    - DELETE /outfits/{id}/ - Delete outfit
    - GET /outfits/resolved/?project={id} - Get resolved outfits with inheritance
    """

    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["project", "outfit_type", "is_active"]

    def get_queryset(self):
        """Return outfit configurations with optimized queries."""
        return OutfitConfiguration.objects.select_related("project").filter(is_active=True)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action in ["create", "update", "partial_update"]:
            return OutfitConfigurationCreateSerializer
        return OutfitConfigurationSerializer

    @extend_schema(
        summary="Get resolved outfit configurations",
        description="Returns all outfit configurations for a project including inherited "
        "configurations from parent projects. The `inherited` field indicates whether "
        "the config comes from a parent project.",
        parameters=[
            OpenApiParameter(
                "project", int, required=True, description="Project ID to resolve outfits for"
            ),
        ],
        responses={200: OutfitConfigurationSerializer(many=True)},
        tags=["Outfits"],
    )
    @action(detail=False, methods=["get"])
    def resolved(self, request: Request) -> Response:
        """
        Get resolved outfit configurations for a project.

        Includes inherited configs from parent projects using OutfitLookupService.
        The `inherited` field indicates if a config comes from a parent project.
        """
        project_id = request.query_params.get("project")
        if not project_id:
            return Response(
                {"error": "project query parameter required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Import here to avoid circular imports
        from projects.models import Project

        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Use OutfitLookupService to get resolved outfits with inheritance
        service = OutfitLookupService()
        outfits = service.get_all_outfits(project)

        # Serialize with project context for inherited field
        serializer = OutfitConfigurationSerializer(
            outfits.values(),
            many=True,
            context={"project": project, "request": request},
        )
        return Response(serializer.data)


@extend_schema_view(
    team_size=extend_schema(
        summary="Validate team size against sport constraints",
        description=(
            "Validates if the given player count is within the allowed range "
            "for the specified sport. Returns validation issues if any."
        ),
        request=TeamSizeValidationRequestSerializer,
        responses={200: ValidationResultSerializer},
        tags=["validation"],
    ),
    positions=extend_schema(
        summary="Validate positions against sport definition",
        description=(
            "Validates if the given positions are defined for the specified sport. "
            "Unknown positions are returned as warnings (advisory, not blocking)."
        ),
        request=PositionsValidationRequestSerializer,
        responses={200: ValidationResultSerializer},
        tags=["validation"],
    ),
    formation=extend_schema(
        summary="Validate formation against sport definition",
        description=(
            "Validates if the given formation is defined for the specified sport. "
            "Unknown formations are returned as warnings (advisory, not blocking)."
        ),
        request=FormationValidationRequestSerializer,
        responses={200: ValidationResultSerializer},
        tags=["validation"],
    ),
    project=extend_schema(
        summary="Validate project sport configuration",
        description=(
            "Validates the complete sport configuration for a project, "
            "including team size and assigned player positions."
        ),
        request=ProjectValidationRequestSerializer,
        responses={200: ValidationResultSerializer},
        tags=["validation"],
    ),
)
class ValidationViewSet(viewsets.ViewSet):
    """
    ViewSet for sport configuration validation endpoints.

    All validations are advisory - they return warnings/errors but don't block
    operations. This follows the CL-1 constraint (advisory validation model).

    Endpoints:
    - POST /validation/team_size/ - Validate team size against sport constraints
    - POST /validation/positions/ - Validate positions against sport definition
    - POST /validation/formation/ - Validate formation against sport definition
    - POST /validation/project/ - Validate project sport configuration
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_sport_config(self, sport_slug: str):
        """
        Get sport configuration by slug.

        Returns tuple of (sport_config, error_response).
        If error_response is not None, return it directly.
        """
        try:
            sport = Sport.objects.select_related("configuration").get(slug=sport_slug)
            # Check if sport has a configuration (OneToOne may not exist)
            try:
                return sport.configuration, None
            except SportConfiguration.DoesNotExist:
                return None, Response(
                    {"error": f"Sport '{sport_slug}' has no configuration"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        except Sport.DoesNotExist:
            return None, Response(
                {"error": f"Sport '{sport_slug}' not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    def _serialize_result(self, result) -> dict:
        """Convert ValidationResult dataclass to serializable dict."""
        return {
            "is_valid": result.is_valid,
            "has_errors": result.has_errors,
            "has_warnings": result.has_warnings,
            "issues": [
                {
                    "code": issue.code,
                    "message": issue.message,
                    "level": issue.level.value,
                    "field": issue.field_name,
                    "context": issue.context,
                }
                for issue in result.issues
            ],
        }

    @action(detail=False, methods=["post"])
    def team_size(self, request: Request) -> Response:
        """Validate team size against sport constraints."""
        serializer = TeamSizeValidationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sport_slug = serializer.validated_data["sport_slug"]
        player_count = serializer.validated_data["player_count"]

        sport_config, error_response = self._get_sport_config(sport_slug)
        if error_response:
            return error_response

        validator = SportValidationService()
        result = validator.validate_team_size(sport_config, player_count)

        return Response(self._serialize_result(result))

    @action(detail=False, methods=["post"])
    def positions(self, request: Request) -> Response:
        """Validate positions against sport definition."""
        serializer = PositionsValidationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sport_slug = serializer.validated_data["sport_slug"]
        positions_list = serializer.validated_data["positions"]

        sport_config, error_response = self._get_sport_config(sport_slug)
        if error_response:
            return error_response

        validator = SportValidationService()
        result = validator.validate_positions(sport_config, positions_list)

        return Response(self._serialize_result(result))

    @action(detail=False, methods=["post"])
    def formation(self, request: Request) -> Response:
        """Validate formation against sport definition."""
        serializer = FormationValidationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sport_slug = serializer.validated_data["sport_slug"]
        formation_name = serializer.validated_data["formation"]

        sport_config, error_response = self._get_sport_config(sport_slug)
        if error_response:
            return error_response

        validator = SportValidationService()
        result = validator.validate_formation(sport_config, formation_name)

        return Response(self._serialize_result(result))

    @action(detail=False, methods=["post"])
    def project(self, request: Request) -> Response:
        """Validate project sport configuration."""
        serializer = ProjectValidationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data["project_id"]

        # Import here to avoid circular imports
        from projects.models import Project

        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        validator = SportValidationService()
        result = validator.validate_project(project)

        return Response(self._serialize_result(result))


# ==============================================================================
# Formation ViewSet
# ==============================================================================


@extend_schema_view(
    list=extend_schema(
        summary="List formations",
        description="Returns formations for a sport configuration. "
        "Filter by sport_config to get formations for a specific sport.",
        tags=["Formations"],
    ),
    retrieve=extend_schema(
        summary="Get formation details",
        description="Returns a single formation with positions and metadata.",
        tags=["Formations"],
    ),
    create=extend_schema(
        summary="Create a formation",
        description="Creates a new formation for a sport configuration. Staff only.",
        tags=["Formations"],
    ),
    update=extend_schema(
        summary="Update a formation",
        description="Updates formation details. Staff only.",
        tags=["Formations"],
    ),
    partial_update=extend_schema(
        summary="Partially update a formation",
        description="Partially updates formation details. Staff only.",
        tags=["Formations"],
    ),
    destroy=extend_schema(
        summary="Delete a formation",
        description="Deletes a formation. Staff only.",
        tags=["Formations"],
    ),
)
class FormationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Formation CRUD operations.

    Provides:
    - GET /formations/ - List all formations (filterable by sport_config)
    - POST /formations/ - Create formation (staff only)
    - GET /formations/{id}/ - Retrieve formation
    - PUT/PATCH /formations/{id}/ - Update formation (staff only)
    - DELETE /formations/{id}/ - Delete formation (staff only)
    """

    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["sport_config", "is_active", "is_default"]

    def get_queryset(self):
        """Return formations with optimized queries."""
        return Formation.objects.select_related("sport_config", "sport_config__sport").filter(
            is_active=True
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return FormationListSerializer
        return FormationSerializer
