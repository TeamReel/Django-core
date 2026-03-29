"""Brand Identity Manager serializers.

This module implements DRF serializers for BrandProfile, DesignToken, and
BrandAsset models with comprehensive validation logic.
"""
import logging
import re

from rest_framework import serializers

logger = logging.getLogger(__name__)

from .models import AppBackground, BrandAsset, BrandProfile, DesignToken


class AppBackgroundSerializer(serializers.ModelSerializer):
    """Serializer for global sport-linked background images."""

    url = serializers.SerializerMethodField()
    sport_name = serializers.CharField(source="sport.name", read_only=True)

    class Meta:
        model = AppBackground
        fields = [
            "id",
            "label",
            "sport_name",
            "url",
            "sort_order",
            "created_at",
        ]
        read_only_fields = fields

    def get_url(self, obj: AppBackground) -> str | None:
        return obj.get_url()


class AppBackgroundWriteSerializer(serializers.ModelSerializer):
    """Write serializer for creating/updating sport-linked backgrounds."""

    class Meta:
        model = AppBackground
        fields = [
            "id",
            "sport",
            "file",
            "label",
            "sort_order",
            "is_active",
        ]
        read_only_fields = ["id"]


class BrandProfileSerializer(serializers.ModelSerializer):
    """Serializer for BrandProfile with nested counts.

    Provides basic profile information with computed counts for related tokens
    and assets. Used for list views and basic profile operations.
    """

    token_count = serializers.SerializerMethodField()
    asset_count = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    project_type = serializers.SerializerMethodField()
    parent_project_id = serializers.SerializerMethodField()
    organisation_name = serializers.SerializerMethodField()

    class Meta:
        model = BrandProfile
        fields = [
            "id",
            "organisation",
            "organisation_name",
            "project",
            "project_name",
            "project_type",
            "parent_project_id",
            "name",
            "is_active",
            "token_count",
            "asset_count",
            "can_edit",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "token_count",
            "asset_count",
            "can_edit",
            "project_name",
            "project_type",
            "parent_project_id",
            "organisation_name",
        ]

    def get_token_count(self, obj: BrandProfile) -> int:
        """Return count of design tokens for this profile."""
        return len(obj.design_tokens.all())

    def get_asset_count(self, obj: BrandProfile) -> int:
        """Return count of active brand assets for this profile."""
        return sum(1 for a in obj.brand_assets.all() if a.is_active)

    def get_project_name(self, obj: BrandProfile) -> str | None:
        """Return the project name if profile is project-scoped."""
        if not obj.project_id:
            return None
        # Safely access project (may be None if FK is broken)
        try:
            return obj.project.name if obj.project else None
        except Exception:
            return None

    def get_project_type(self, obj: BrandProfile) -> str | None:
        """Return the hierarchy level: 'club' (root project) or 'team' (child)."""
        if not obj.project_id:
            return None
        # Safely access project (may be None if FK is broken)
        try:
            if not obj.project:
                return None
            return "team" if obj.project.parent_project_id else "club"
        except Exception:
            return None

    def get_parent_project_id(self, obj: BrandProfile) -> int | None:
        """Return the parent project ID for team-level profiles (for club filtering)."""
        if not obj.project_id:
            return None
        try:
            if not obj.project:
                return None
            return obj.project.parent_project_id
        except Exception:
            return None

    def get_organisation_name(self, obj: BrandProfile) -> str | None:
        """Return the organisation name if available."""
        try:
            if obj.organisation_id:
                return obj.organisation.name if obj.organisation else None
            if obj.project_id and obj.project and obj.project.organisation_id:
                return obj.project.organisation.name if obj.project.organisation else None
        except Exception:
            logger.debug("Failed to resolve organisation name for brand profile %s", obj.pk, exc_info=True)
        return None

    def get_can_edit(self, obj: BrandProfile) -> bool:
        """Check if current user can edit this brand profile.

        Write access rules (in order of precedence):
        1. Superusers can edit everything
        2. Organisation admins can modify org brands AND all project brands in their org
        3. Project admins (club level) can modify club brand AND all team brands
        4. Project admins (team level) can only modify their team brand
        """
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False

        user = request.user

        # Superuser can edit everything
        if user.is_superuser:
            return True

        if obj.organisation:
            # Org brand: must be org admin
            return user.organisation_memberships.filter(
                organisation=obj.organisation, role="admin", is_active=True
            ).exists()

        if obj.project:
            # Project brand: check hierarchy
            project = obj.project

            # Direct project admin
            is_project_admin = user.project_memberships.filter(
                project=project, role="admin", deleted_at__isnull=True
            ).exists()
            if is_project_admin:
                return True

            # Parent project admin (club admin can edit team brands)
            if project.parent_project:
                is_parent_admin = user.project_memberships.filter(
                    project=project.parent_project, role="admin", deleted_at__isnull=True
                ).exists()
                if is_parent_admin:
                    return True

            # Org admin (cascade - can edit all project brands in org)
            is_org_admin = user.organisation_memberships.filter(
                organisation=project.organisation, role="admin", is_active=True
            ).exists()
            if is_org_admin:
                return True

        return False

    def validate(self, data: dict) -> dict:
        """Ensure org XOR project constraint.

        Validates that exactly one of organisation or project is specified,
        enforcing the business rule at the serializer level.

        Raises:
            serializers.ValidationError: If neither or both are specified
        """
        org = data.get("organisation")
        proj = data.get("project")

        # Handle update case - check instance values if not provided in data
        if self.instance:
            org = org if org is not None else self.instance.organisation
            proj = proj if proj is not None else self.instance.project

        if not org and not proj:
            raise serializers.ValidationError(
                {"__all__": "Either organisation or project must be specified."}
            )
        if org and proj:
            raise serializers.ValidationError(
                {"__all__": "Cannot specify both organisation and project."}
            )

        return data


class DesignTokenSerializer(serializers.ModelSerializer):
    """Serializer for DesignToken with comprehensive validation.

    Handles design token creation and updates with validation for key format
    and value length. Follows Constitution constraint: product-agnostic
    validation only (no format-specific checks like hex colors).
    """

    class Meta:
        model = DesignToken
        fields = [
            "id",
            "profile",
            "key",
            "value",
            "type",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_key(self, value: str) -> str:
        """Validate token key format.

        Keys must be alphanumeric with underscores and hyphens only.
        Normalized to lowercase for consistency.

        Args:
            value: Raw key string

        Returns:
            Normalized (lowercase) key

        Raises:
            serializers.ValidationError: If key is invalid
        """
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Key cannot be empty.")
        if len(value) > 100:
            raise serializers.ValidationError("Key too long (max 100 chars).")

        # Allow alphanumeric, underscore, hyphen only
        if not re.match(r"^[a-zA-Z0-9_-]+$", value):
            raise serializers.ValidationError(
                "Key must contain only letters, numbers, underscores, and hyphens."
            )

        return value.lower()  # Normalize to lowercase

    def validate_value(self, value: str) -> str:
        """Validate token value length.

        Implements FR-006/007: Length-only validation (1-255 chars).
        Format-specific validation (e.g., hex codes for colors) is
        intentionally NOT implemented per Constitution's product-agnostic
        constraint. Product layers can add format validators as needed.

        Args:
            value: Token value string

        Returns:
            Validated value

        Raises:
            serializers.ValidationError: If value is invalid
        """
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Value cannot be empty.")
        if len(value) > 255:
            raise serializers.ValidationError("Value too long (max 255 chars per FR-006).")

        return value

    def validate(self, data: dict) -> dict:
        """Check unique key per profile.

        Enforces unique_together constraint at serializer level for better
        error messages.

        Args:
            data: Validated field data

        Returns:
            Validated data

        Raises:
            serializers.ValidationError: If key already exists for profile
        """
        profile = data.get("profile")
        key = data.get("key")

        if profile and key:
            qs = DesignToken.objects.filter(profile=profile, key=key)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    {"key": f"Token with key '{key}' already exists for this profile."}
                )

        return data


class BrandAssetSerializer(serializers.ModelSerializer):
    """Serializer for BrandAsset with File relationship.

    Provides brand asset information with computed file details from B22
    FileAsset integration. When fetched via organisation_scope, includes
    profile metadata for hierarchy grouping.
    """

    file_details = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    # Profile metadata for bulk fetching (organisation_scope)
    profile_name = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    project_type = serializers.SerializerMethodField()
    parent_project_id = serializers.SerializerMethodField()
    organisation_name = serializers.SerializerMethodField()

    class Meta:
        model = BrandAsset
        fields = [
            "id",
            "profile",
            "file",
            "asset_type",
            "label",
            "alt_text",
            "is_active",
            "file_details",
            "url",
            # Profile metadata fields
            "profile_name",
            "project_id",
            "project_name",
            "project_type",
            "parent_project_id",
            "organisation_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "file_details",
            "url",
            "profile_name",
            "project_id",
            "project_name",
            "project_type",
            "parent_project_id",
            "organisation_name",
        ]

    def get_profile_name(self, obj: BrandAsset) -> str | None:
        """Return profile name."""
        return obj.profile.name if obj.profile else None

    def get_project_id(self, obj: BrandAsset) -> str | None:
        """Return project ID if profile is linked to a project."""
        if obj.profile and obj.profile.project:
            return str(obj.profile.project.id)
        return None

    def get_project_name(self, obj: BrandAsset) -> str | None:
        """Return project name if profile is linked to a project."""
        if obj.profile and obj.profile.project:
            return obj.profile.project.name
        return None

    def get_project_type(self, obj: BrandAsset) -> str | None:
        """Return hierarchy level for project-scoped assets.

        The Project model does not expose a stable `project_type` field. For the
        80/20 hierarchy we derive:
        - club: root project (no parent_project)
        - team: child project (has parent_project)
        """
        project = getattr(getattr(obj, "profile", None), "project", None)
        if not project:
            return None

        return "team" if getattr(project, "parent_project_id", None) else "club"

    def get_parent_project_id(self, obj: BrandAsset) -> str | None:
        """Return parent project ID if available."""
        if obj.profile and obj.profile.project and obj.profile.project.parent_project:
            return str(obj.profile.project.parent_project.id)
        return None

    def get_organisation_name(self, obj: BrandAsset) -> str | None:
        """Return organisation name."""
        if obj.profile:
            if obj.profile.organisation:
                return obj.profile.organisation.name
            if obj.profile.project and obj.profile.project.organisation:
                return obj.profile.project.organisation.name
        return None

    def get_file_details(self, obj: BrandAsset) -> dict | None:
        """Return file metadata from B22 FileAsset.

        Args:
            obj: BrandAsset instance

        Returns:
            Dict with file metadata or None if no file attached
        """
        if not obj.file:
            return None

        return {
            "id": str(obj.file.id),
            "name": obj.file.original_name,
            "size": obj.file.file_size,
            "content_type": obj.file.mime_type,
        }

    def get_url(self, obj: BrandAsset) -> str | None:
        """Return a usable URL for the asset file.

        Uses the configured storage backend to generate a presigned or public
        URL. In production (S3) this returns a presigned URL. In development
        (local) this returns a local media path.

        Args:
            obj: BrandAsset instance

        Returns:
            URL string or None if no file attached
        """
        if not obj.file or not obj.file.storage_path:
            return None
        try:
            from files.utils import get_storage_backend

            backend = get_storage_backend()
            return backend.get_url(obj.file.storage_path, signed=True)
        except Exception as exc:
            import logging

            logging.getLogger(__name__).warning(
                "Failed to generate URL for asset %s (path=%s): %s",
                obj.id,
                obj.file.storage_path,
                exc,
            )
            return None

    def validate(self, data: dict) -> dict:
        """Check for duplicate asset_type per profile.

        Prevents multiple assets of the same type (e.g., multiple logos) for
        one profile. Users should update existing assets instead.
        Multi-instance types (club_background) are exempt from this check.

        Args:
            data: Validated field data

        Returns:
            Validated data

        Raises:
            serializers.ValidationError: If duplicate asset type exists
        """
        profile = data.get("profile")
        asset_type = data.get("asset_type")

        # Multi-instance types: allow multiple per profile
        MULTI_INSTANCE_TYPES = {"club_background", "club_background_upload"}

        if profile and asset_type and asset_type not in MULTI_INSTANCE_TYPES:
            # On update, exclude self from check
            qs = BrandAsset.objects.filter(profile=profile, asset_type=asset_type)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "asset_type": (
                            f"Asset of type '{asset_type}' already exists for this profile. "
                            "Update the existing asset instead."
                        )
                    }
                )

        return data


class BrandProfileDetailSerializer(BrandProfileSerializer):
    """Detailed serializer with fully nested tokens and assets.

    Used for detail views where full related data is needed. Includes all
    tokens and active assets with their complete data.
    """

    tokens = serializers.SerializerMethodField()
    assets = serializers.SerializerMethodField()

    class Meta(BrandProfileSerializer.Meta):
        fields = BrandProfileSerializer.Meta.fields + ["tokens", "assets"]

    def get_tokens(self, obj: BrandProfile) -> list[dict]:
        """Return all design tokens as serialized list.

        Args:
            obj: BrandProfile instance

        Returns:
            List of serialized DesignToken objects
        """
        return DesignTokenSerializer(obj.design_tokens.all(), many=True).data

    def get_assets(self, obj: BrandProfile) -> list[dict]:
        """Return all active brand assets as serialized list.

        Args:
            obj: BrandProfile instance

        Returns:
            List of serialized BrandAsset objects (active only)
        """
        return BrandAssetSerializer(obj.brand_assets.filter(is_active=True), many=True).data
