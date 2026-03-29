"""
Django REST Framework serializers for Settings and Feature Flags.

Provides validation for CRUD operations and proper type checking for settings values.
"""

import re

from rest_framework import serializers

from .models import FeatureFlag, ScopeType, Setting, SettingType


class FeatureFlagSerializer(serializers.ModelSerializer):
    """
    Serializer for FeatureFlag model with validation.

    Validates:
    - Key format (alphanumeric + underscores only)
    - Scope consistency (organisation_id required for ORGANISATION scope)
    - FK validation for organisation and project
    """

    class Meta:
        model = FeatureFlag
        fields = [
            "id",
            "key",
            "enabled",
            "description",
            "scope_type",
            "organisation",
            "project",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_key(self, value):
        """Validate key format - alphanumeric + underscores only."""
        if not re.match(r"^[a-zA-Z0-9_]+$", value):
            raise serializers.ValidationError(
                "Key must contain only alphanumeric characters and underscores"
            )
        if len(value) < 2:
            raise serializers.ValidationError("Key must be at least 2 characters long")
        if len(value) > 100:
            raise serializers.ValidationError("Key must not exceed 100 characters")
        return value

    def validate(self, data):
        """Validate scope consistency."""
        scope_type = data.get("scope_type")
        organisation = data.get("organisation")
        project = data.get("project")

        # Validate scope consistency
        if scope_type == ScopeType.GLOBAL:
            if organisation or project:
                raise serializers.ValidationError(
                    "Global scope flags cannot have organisation or project set"
                )
        elif scope_type == ScopeType.ORGANISATION:
            if not organisation:
                raise serializers.ValidationError("Organisation scope requires organisation_id")
            if project:
                raise serializers.ValidationError(
                    "Organisation scope flags cannot have project set"
                )
        elif scope_type == ScopeType.PROJECT:
            if not project:
                raise serializers.ValidationError("Project scope requires project_id")
            # Organisation will be inferred from project if not provided

        return data


class SettingSerializer(serializers.ModelSerializer):
    """
    Serializer for Setting model with type validation.

    Validates:
    - Key format (alphanumeric + underscores only)
    - Value matches value_type (type checking)
    - Default value is provided and matches type
    - Scope consistency
    """

    class Meta:
        model = Setting
        fields = [
            "id",
            "key",
            "value",
            "value_type",
            "default_value",
            "description",
            "scope_type",
            "organisation",
            "project",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_key(self, value):
        """Validate key format - alphanumeric + underscores only."""
        if not re.match(r"^[a-zA-Z0-9_]+$", value):
            raise serializers.ValidationError(
                "Key must contain only alphanumeric characters and underscores"
            )
        if len(value) < 2:
            raise serializers.ValidationError("Key must be at least 2 characters long")
        if len(value) > 100:
            raise serializers.ValidationError("Key must not exceed 100 characters")
        return value

    def validate_value_type(self, value):
        """Validate value_type is valid choice."""
        if value not in [choice[0] for choice in SettingType.choices]:
            raise serializers.ValidationError(f"Invalid value_type: {value}")
        return value

    def validate_value(self, value):
        """Validate value based on value_type."""
        # We'll do the full validation in validate() where we have access to value_type
        return value

    def validate_default_value(self, value):
        """Ensure default_value is provided."""
        if value is None:
            raise serializers.ValidationError("Default value is required")
        return value

    def validate(self, data):
        """Validate scope consistency and type matching."""
        scope_type = data.get("scope_type")
        organisation = data.get("organisation")
        project = data.get("project")
        value_type = data.get("value_type")
        value = data.get("value")
        default_value = data.get("default_value")

        # Validate scope consistency (same as FeatureFlag)
        if scope_type == ScopeType.GLOBAL:
            if organisation or project:
                raise serializers.ValidationError(
                    "Global scope settings cannot have organisation or project set"
                )
        elif scope_type == ScopeType.ORGANISATION:
            if not organisation:
                raise serializers.ValidationError("Organisation scope requires organisation_id")
            if project:
                raise serializers.ValidationError(
                    "Organisation scope settings cannot have project set"
                )
        elif scope_type == ScopeType.PROJECT:
            if not project:
                raise serializers.ValidationError("Project scope requires project_id")

        # Validate value matches value_type
        if value is not None and value_type:
            self._validate_value_type_match(value, value_type, "value")

        # Validate default_value matches value_type
        if default_value is not None and value_type:
            self._validate_value_type_match(default_value, value_type, "default_value")

        return data

    def _validate_value_type_match(self, value, value_type, field_name):
        """Helper to validate a value matches the expected type."""
        try:
            if value_type == SettingType.STRING:
                if not isinstance(value, str):
                    raise serializers.ValidationError(
                        f"{field_name} must be a string for STRING type"
                    )
            elif value_type == SettingType.INTEGER:
                if not isinstance(value, int):
                    raise serializers.ValidationError(
                        f"{field_name} must be an integer for INTEGER type"
                    )
            elif value_type == SettingType.BOOLEAN:
                if not isinstance(value, bool):
                    raise serializers.ValidationError(
                        f"{field_name} must be a boolean for BOOLEAN type"
                    )
            elif value_type == SettingType.JSON:
                # JSON type accepts any JSON-serializable value (dict, list, etc.)
                # JSONField handles the serialization automatically
                pass
        except Exception as e:
            raise serializers.ValidationError(f"Type validation failed for {field_name}: {str(e)}") from e


class FeatureFlagResolveSerializer(serializers.Serializer):
    """Serializer for feature flag resolve action response."""

    key = serializers.CharField()
    value = serializers.BooleanField()
    scope_used = serializers.CharField()
    scope_id = serializers.CharField(allow_null=True)


class SettingResolveSerializer(serializers.Serializer):
    """Serializer for setting resolve action response."""

    key = serializers.CharField()
    value = serializers.JSONField()
    scope_used = serializers.CharField()
    scope_id = serializers.CharField(allow_null=True)
