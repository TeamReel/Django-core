"""Brand Identity Manager views.

This module implements DRF ViewSets for CRUD operations on brand profiles,
design tokens, and brand assets, plus the critical token resolution endpoint.
"""
from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
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
    max_page_size = 500  # Increased for bulk fetching with organisation_scope


class BrandProfileViewSet(viewsets.ModelViewSet):
    """CRUD operations for BrandProfile.

    Provides list, create, retrieve, update, and delete operations for brand
    profiles. Uses optimized queries with select_related and prefetch_related.
    """

    queryset = BrandProfile.objects.select_related(
        "organisation",
        "project",
        "project__parent_project",
        "project__organisation",
        "created_by",
        "updated_by",
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
        - organisation: UUID or slug of organisation (direct org profiles only)
        - organisation_scope: UUID or slug - returns BOTH org profiles AND project profiles
          for all projects belonging to that organisation
        - project: ID (integer), UUID, or slug of project
        - is_active: Boolean string ('true'/'false')
        """
        from django.db.models import Q

        qs = super().get_queryset()

        # Filter by organisation_scope (includes org profiles AND project profiles)
        org_scope_param = self.request.query_params.get("organisation_scope")
        if org_scope_param:
            # Build Q filter for: organisation=X OR project__organisation=X
            try:
                import uuid

                uuid.UUID(org_scope_param)
                # UUID - filter by ID
                qs = qs.filter(
                    Q(organisation_id=org_scope_param) | Q(project__organisation_id=org_scope_param)
                )
            except (ValueError, AttributeError):
                # Slug - filter by slug
                qs = qs.filter(
                    Q(organisation__slug=org_scope_param)
                    | Q(project__organisation__slug=org_scope_param)
                )

        # Filter by organisation (direct org profiles only - supports UUID and slug)
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

        # Filter by project (supports ID, UUID, and slug)
        project_param = self.request.query_params.get("project")
        if project_param:
            # Try integer ID first (projects use int PKs)
            if project_param.isdigit():
                qs = qs.filter(project_id=int(project_param))
            else:
                # Try UUID, fallback to slug lookup
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

    @action(detail=True, methods=["post"], url_path="generate-tokens")
    def generate_tokens(self, request, pk=None):
        """Extract dominant colors from logo and kit assets and generate/update design tokens.

        Analyses uploaded brand assets (logo, kit images) to extract primary,
        secondary, and accent colors using Pillow. Updates the profile's
        design tokens with the extracted values.

        POST /api/v1/branding/profiles/{id}/generate-tokens/

        Returns:
            {"status": "success", "tokens": {"primary_color": "#...", ...}}
        """
        import logging

        logger = logging.getLogger(__name__)
        profile = self.get_object()

        # Gather image URLs from brand assets
        asset_types_priority = [
            "logo_upload",
            "logo",
            "kit_home_upload",
            "kit_home",
            "kit_away_upload",
            "kit_away",
            "kit_legacy_upload",
            "kit_legacy",
        ]

        image_data_list = []
        for asset_type in asset_types_priority:
            asset = profile.brand_assets.filter(asset_type=asset_type, is_active=True).first()
            if asset:
                image_bytes = self._download_asset_image(asset, logger)
                if image_bytes:
                    image_data_list.append((asset_type, image_bytes))

        if not image_data_list:
            return Response(
                {"error": "No logo or kit images found to analyse. Upload images first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract colors from all available images
        all_colors = []
        for asset_type, img_bytes in image_data_list:
            try:
                colors = self._extract_dominant_colors(img_bytes)
                all_colors.extend(colors)
                logger.info("Extracted %d colors from %s asset", len(colors), asset_type)
            except Exception:
                logger.warning("Failed to extract colors from %s", asset_type, exc_info=True)

        if not all_colors:
            return Response(
                {"error": "Could not extract colors from the uploaded images."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Deduplicate and rank colors by frequency
        ranked = self._rank_colors(all_colors)

        # Map to tokens: primary, secondary, accent
        token_map = {}
        if len(ranked) >= 1:
            token_map["primary_color"] = ranked[0]
        if len(ranked) >= 2:
            token_map["secondary_color"] = ranked[1]
        if len(ranked) >= 3:
            token_map["accent_color"] = ranked[2]

        # Upsert design tokens
        for key, value in token_map.items():
            DesignToken.objects.update_or_create(
                profile=profile,
                key=key,
                defaults={
                    "value": value,
                    "type": "color",
                    "description": "Auto-generated from brand assets",
                },
            )

        return Response({"status": "success", "tokens": token_map})

    @staticmethod
    def _download_asset_image(asset, logger):
        """Download image bytes from a BrandAsset's file or URL."""
        try:
            url = asset.get_url()
            if not url:
                return None
            import requests

            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            return resp.content
        except Exception:
            logger.warning("Failed to download asset image: %s", asset.id, exc_info=True)
            return None

    @staticmethod
    def _extract_dominant_colors(image_bytes, max_colors=8):
        """Extract dominant colors from image bytes using Pillow quantization.

        Returns list of hex color strings sorted by pixel frequency (descending).
        """
        from io import BytesIO

        from PIL import Image

        img = Image.open(BytesIO(image_bytes)).convert("RGBA")

        # Remove near-transparent pixels
        pixels = list(img.getdata())
        opaque_pixels = [(r, g, b) for r, g, b, a in pixels if a > 128]

        if not opaque_pixels:
            # Fallback: use all pixels ignoring alpha
            opaque_pixels = [(r, g, b) for r, g, b, a in pixels]

        if not opaque_pixels:
            return []

        # Create new image from opaque pixels for quantisation
        temp_img = Image.new("RGB", (len(opaque_pixels), 1))
        temp_img.putdata(opaque_pixels)

        # Quantise to reduce palette
        quantised = temp_img.quantize(colors=max_colors, method=Image.Quantize.MEDIANCUT)
        palette = quantised.getpalette()
        if not palette:
            return []

        # Count pixels per palette index
        from collections import Counter

        index_counts = Counter(quantised.getdata())

        # Build (hex_color, count) list
        color_counts = []
        for idx, count in index_counts.most_common(max_colors):
            r, g, b = palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2]
            hex_color = f"#{r:02x}{g:02x}{b:02x}"
            color_counts.append((hex_color, count))

        # Filter out near-white, near-black, and very desaturated colors
        filtered = []
        for hex_color, count in color_counts:
            r = int(hex_color[1:3], 16)
            g = int(hex_color[3:5], 16)
            b = int(hex_color[5:7], 16)
            brightness = (r + g + b) / 3
            max_c, min_c = max(r, g, b), min(r, g, b)
            saturation = (max_c - min_c) / max_c if max_c > 0 else 0

            # Skip near-white (>240 brightness) and near-black (<15)
            if brightness > 240 or brightness < 15:
                continue
            # Skip very desaturated (grey-ish) unless it's a strong dark/mid tone
            if saturation < 0.10 and brightness > 60:
                continue
            filtered.append((hex_color, count))

        # If all colors filtered, fall back to originals
        if not filtered:
            filtered = color_counts

        # Sort by count descending and return hex strings
        filtered.sort(key=lambda x: -x[1])
        return [c[0] for c in filtered]

    @staticmethod
    def _rank_colors(all_colors):
        """Rank and deduplicate colors, ensuring visual diversity."""
        from collections import Counter

        counts = Counter(all_colors)
        ranked = [c for c, _ in counts.most_common()]

        # Ensure sufficient visual distance between selected colors
        selected = []
        for color in ranked:
            if len(selected) >= 6:
                break
            r1 = int(color[1:3], 16)
            g1 = int(color[3:5], 16)
            b1 = int(color[5:7], 16)
            too_close = False
            for existing in selected:
                r2 = int(existing[1:3], 16)
                g2 = int(existing[3:5], 16)
                b2 = int(existing[5:7], 16)
                dist = ((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) ** 0.5
                if dist < 40:  # Minimum perceptual distance threshold
                    too_close = True
                    break
            if not too_close:
                selected.append(color)

        return selected


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

    Can be nested under BrandProfile (via profile_pk kwarg) or accessed
    at top level with organisation_scope filter for bulk fetching.
    """

    serializer_class = BrandAssetSerializer
    pagination_class = BrandPagination
    permission_classes = [BrandAssetPermission]

    def get_queryset(self):
        """Get assets with flexible filtering.

        Supported filters:
        - profile_pk (from URL): Scope to specific profile (nested route)
        - organisation_scope: UUID or slug - returns ALL assets for all profiles
          in the organisation (org profiles + project profiles)
        - asset_type: Type of asset (logo, watermark, favicon, etc.)
        - is_active: Boolean string ('true'/'false')
        """
        from django.db.models import Q

        profile_id = self.kwargs.get("profile_pk")

        if profile_id:
            # Nested route - scope to specific profile
            qs = BrandAsset.objects.filter(profile_id=profile_id)
        else:
            # Top-level route - require organisation_scope for bulk fetch
            org_scope_param = self.request.query_params.get("organisation_scope")
            if org_scope_param:
                # Filter assets where profile belongs to org OR project in org
                try:
                    import uuid

                    uuid.UUID(org_scope_param)
                    # UUID - filter by ID
                    qs = BrandAsset.objects.filter(
                        Q(profile__organisation_id=org_scope_param)
                        | Q(profile__project__organisation_id=org_scope_param)
                    )
                except (ValueError, AttributeError):
                    # Slug - filter by slug
                    qs = BrandAsset.objects.filter(
                        Q(profile__organisation__slug=org_scope_param)
                        | Q(profile__project__organisation__slug=org_scope_param)
                    )
            else:
                # No scope provided - return empty to prevent full table scan
                qs = BrandAsset.objects.none()

        # Filter by asset_type
        asset_type = self.request.query_params.get("asset_type")
        if asset_type:
            qs = qs.filter(asset_type=asset_type)

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs.select_related(
            "profile",
            "profile__organisation",
            "profile__project",
            "profile__project__organisation",
            "profile__project__parent_project",
            "file",
        )

    @action(detail=False, methods=["get"], url_path="app-backgrounds")
    def app_backgrounds(self, request):
        """List background images for video generation, filtered by sport.

        GET /api/v1/branding/assets/app-backgrounds/
        GET /api/v1/branding/assets/app-backgrounds/?sport=<sport_id>

        Returns AppBackground entries matching the user's organisation sport.
        Falls back to all active backgrounds if sport cannot be determined.
        Superadmins manage these via Django admin.
        """
        from src.branding.models import AppBackground
        from src.branding.serializers import AppBackgroundSerializer

        sport_id = request.query_params.get("sport")

        # Auto-detect sport from user's organisation if not explicit
        if not sport_id and hasattr(request, "user") and request.user.is_authenticated:
            try:
                from src.organisations.models import Membership

                membership = (
                    Membership.objects.filter(user=request.user, is_active=True)
                    .select_related("organisation__sport")
                    .first()
                )
                if membership and membership.organisation and membership.organisation.sport:
                    sport_id = str(membership.organisation.sport_id)
            except Exception:
                pass

        qs = AppBackground.objects.filter(is_active=True).select_related("sport", "file")
        if sport_id:
            # Include backgrounds for the sport category AND its variants
            qs = qs.filter(models.Q(sport_id=sport_id) | models.Q(sport__parent_sport_id=sport_id))

        serializer = AppBackgroundSerializer(qs, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="club-backgrounds")
    def club_backgrounds(self, request):
        """List club_background assets for a specific profile.

        GET /api/v1/branding/assets/club-backgrounds/?profile=<uuid>

        Returns all club_background assets for the given profile,
        ordered newest first.
        """
        profile_id = request.query_params.get("profile")
        if not profile_id:
            return Response(
                {"detail": "profile query parameter is required."},
                status=400,
            )

        qs = (
            BrandAsset.objects.filter(
                profile_id=profile_id,
                asset_type="club_background",
                is_active=True,
            )
            .select_related(
                "profile",
                "profile__project",
                "profile__project__parent_project",
                "file",
            )
            .order_by("-created_at")
        )
        serializer = BrandAssetSerializer(qs, many=True, context=self.get_serializer_context())
        return Response(serializer.data)


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
