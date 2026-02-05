"""Brand Identity Manager views.

This module implements DRF ViewSets for CRUD operations on brand profiles,
design tokens, and brand assets, plus the critical token resolution endpoint.
"""
from rest_framework import status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BrandAsset, BrandProfile, DesignToken
from .permissions import (
    BrandAssetPermission,
    BrandProfilePermission,
    DesignTokenPermission,
)
from .serializers import (
    BrandAssetSerializer,
    BrandProfileDetailSerializer,
    BrandProfileSerializer,
    DesignTokenSerializer,
)


class BrandPagination(PageNumberPagination):
    """Standard pagination for brand-related endpoints."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class BrandProfileViewSet(viewsets.ModelViewSet):
    """CRUD operations for BrandProfile.

    Provides list, create, retrieve, update, and delete operations for brand
    profiles. Uses optimized queries with select_related and prefetch_related.
    """

    queryset = BrandProfile.objects.select_related(
        "organisation", "project", "created_by", "updated_by"
    ).prefetch_related("design_tokens", "brand_assets")
    pagination_class = BrandPagination
    permission_classes = [BrandProfilePermission]

    def get_serializer_class(self):
        """Return detailed serializer for retrieve action."""
        if self.action == "retrieve":
            return BrandProfileDetailSerializer
        return BrandProfileSerializer

    def get_queryset(self):
        """Filter queryset by query parameters.

        Supported filters:
        - organisation: UUID or slug of organisation
        - project: UUID or slug of project
        - is_active: Boolean string ('true'/'false')
        """
        qs = super().get_queryset()

        # Filter by organisation (supports both UUID and slug)
        org_param = self.request.query_params.get("organisation")
        if org_param:
            # Try UUID first, fallback to slug lookup
            try:
                import uuid

                uuid.UUID(org_param)
                qs = qs.filter(organisation_id=org_param)
            except (ValueError, AttributeError):
                # Not a valid UUID, try slug lookup
                qs = qs.filter(organisation__slug=org_param)

        # Filter by project (supports both UUID and slug)
        project_param = self.request.query_params.get("project")
        if project_param:
            # Try UUID first, fallback to slug lookup
            try:
                import uuid

                uuid.UUID(project_param)
                qs = qs.filter(project_id=project_param)
            except (ValueError, AttributeError):
                # Not a valid UUID, try slug lookup
                qs = qs.filter(project__slug=project_param)

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        """Set updated_by to current user."""
        serializer.save(updated_by=self.request.user)


class DesignTokenViewSet(viewsets.ModelViewSet):
    """CRUD operations for DesignToken.

    Nested under BrandProfile. All operations are scoped to a specific profile.
    """

    serializer_class = DesignTokenSerializer
    pagination_class = BrandPagination
    permission_classes = [DesignTokenPermission]

    def get_queryset(self):
        """Get tokens for specific profile with optional filters.

        Supported filters:
        - type: Token type (color, font, spacing, etc.)
        - key: Case-insensitive search on key field
        """
        profile_id = self.kwargs.get("profile_pk")
        qs = DesignToken.objects.filter(profile_id=profile_id)

        # Filter by type
        token_type = self.request.query_params.get("type")
        if token_type:
            qs = qs.filter(type=token_type)

        # Search by key
        key_search = self.request.query_params.get("key")
        if key_search:
            qs = qs.filter(key__icontains=key_search)

        return qs.select_related("profile")


class BrandAssetViewSet(viewsets.ModelViewSet):
    """CRUD operations for BrandAsset.

    Nested under BrandProfile. All operations are scoped to a specific profile.
    """

    serializer_class = BrandAssetSerializer
    pagination_class = BrandPagination
    permission_classes = [BrandAssetPermission]

    def get_queryset(self):
        """Get assets for specific profile with optional filters.

        Supported filters:
        - asset_type: Type of asset (logo, watermark, favicon, etc.)
        - is_active: Boolean string ('true'/'false')
        """
        profile_id = self.kwargs.get("profile_pk")
        qs = BrandAsset.objects.filter(profile_id=profile_id)

        # Filter by asset_type
        asset_type = self.request.query_params.get("asset_type")
        if asset_type:
            qs = qs.filter(asset_type=asset_type)

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs.select_related("profile", "file")


class TokenResolutionView(APIView):
    """Resolve merged brand tokens for a project or organisation.

    This is the PRIMARY API endpoint for consuming brand data. Implements
    the merge inheritance pattern where project tokens override org tokens.

    Query Parameters:
        project (UUID): Project ID to resolve tokens for
        organisation (UUID): Organisation ID to resolve tokens for
        include_assets (bool): Include brand assets in response

    Returns:
        {
            "project": "<uuid>",
            "organisation": "<uuid>",
            "tokens": {"key": "value", ...},
            "source": "merged|project|organisation|none",
            "project_brand_id": "<uuid>",
            "org_brand_id": "<uuid>",
            "assets": {...}  // if include_assets=true
        }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Resolve and return merged brand tokens."""
        project_id = request.query_params.get("project")
        org_id = request.query_params.get("organisation")

        if not project_id and not org_id:
            return Response(
                {"error": "Either project or organisation parameter required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tokens = {}
        org_brand = None
        project_brand = None

        # Get project brand (if applicable)
        if project_id:
            from projects.models import Project

            try:
                project = Project.objects.select_related("organisation").get(id=project_id)
                project_brand = (
                    BrandProfile.objects.filter(project=project, is_active=True)
                    .prefetch_related("design_tokens")
                    .first()
                )

                # Fallback to org brand
                if project.organisation:
                    org_id = project.organisation.id
            except Project.DoesNotExist:
                return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get org brand
        if org_id:
            org_brand = (
                BrandProfile.objects.filter(organisation_id=org_id, is_active=True)
                .prefetch_related("design_tokens")
                .first()
            )

        # Merge tokens: org first, project overrides
        if org_brand:
            for token in org_brand.design_tokens.all():
                tokens[token.key] = token.value

        if project_brand:
            for token in project_brand.design_tokens.all():
                tokens[token.key] = token.value

        # Build response
        response_data = {
            "project": project_id,
            "organisation": org_id,
            "tokens": tokens,
            "source": (
                "merged"
                if (org_brand and project_brand)
                else "project"
                if project_brand
                else "organisation"
                if org_brand
                else "none"
            ),
            "project_brand_id": str(project_brand.id) if project_brand else None,
            "org_brand_id": str(org_brand.id) if org_brand else None,
        }

        # Optionally include assets
        include_assets = request.query_params.get("include_assets", "").lower() == "true"
        if include_assets:
            assets = {}
            brand = project_brand or org_brand
            if brand:
                for asset in brand.brand_assets.filter(is_active=True).select_related("file"):
                    assets[asset.asset_type] = {
                        "url": asset.get_url(),
                        "alt_text": asset.alt_text,
                    }
            response_data["assets"] = assets

        return Response(response_data)
