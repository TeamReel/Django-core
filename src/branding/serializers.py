"""Brand Identity Manager serializers.

This module implements DRF serializers for BrandProfile, DesignToken, and
BrandAsset models with comprehensive validation logic.
"""
import re

from rest_framework import serializers

from .models import BrandAsset, BrandProfile, DesignToken


class BrandProfileSerializer(serializers.ModelSerializer):
    """Serializer for BrandProfile with nested counts.

    Provides basic profile information with computed counts for related tokens
    and assets. Used for list views and basic profile operations.
    """

    token_count = serializers.SerializerMethodField()
    asset_count = serializers.SerializerMethodField()

    class Meta:
        model = BrandProfile
        fields = [
            "id",
            "organisation",
            "project",
            "name",
            "is_active",
            "token_count",
            "asset_count",
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
        ]

    def get_token_count(self, obj: BrandProfile) -> int:
        """Return count of design tokens for this profile."""
        return obj.design_tokens.count()

    def get_asset_count(self, obj: BrandProfile) -> int:
        """Return count of active brand assets for this profile."""
        return obj.brand_assets.filter(is_active=True).count()

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
    FileAsset integration.
    """

    file_details = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()

    class Meta:
        model = BrandAsset
        fields = [
            "id",
            "profile",
            "file",
            "asset_type",
            "alt_text",
            "is_active",
            "file_details",
            "url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "file_details", "url"]

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
        """Return file URL.

        Args:
            obj: BrandAsset instance

        Returns:
            File URL or None if no file attached
        """
        return obj.get_url()

    def validate(self, data: dict) -> dict:
        """Check for duplicate asset_type per profile.

        Prevents multiple assets of the same type (e.g., multiple logos) for
        one profile. Users should update existing assets instead.

        Args:
            data: Validated field data

        Returns:
            Validated data

        Raises:
            serializers.ValidationError: If duplicate asset type exists
        """
        profile = data.get("profile")
        asset_type = data.get("asset_type")

        if profile and asset_type:
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
