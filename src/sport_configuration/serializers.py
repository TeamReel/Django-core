"""
Serializers for B32 Sport Configuration API.

Provides DRF serializers for Sport and SportConfiguration resources.
OutfitConfiguration serializers are implemented in WP04.
"""

from __future__ import annotations

from rest_framework import serializers

from sport_configuration.models import Sport, SportConfiguration


class SportConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for SportConfiguration (nested within Sport).

    Exposes team composition rules, positions, formations, and outfit types.
    Read-only when nested; writable via dedicated configuration endpoint.
    """

    class Meta:
        model = SportConfiguration
        fields = [
            "id",
            "team_size_min",
            "team_size_max",
            "max_substitutes",
            "positions",
            "formations",
            "outfit_types",
            "has_goalkeeper",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SportSerializer(serializers.ModelSerializer):
    """
    Serializer for Sport with nested configuration (read-only).

    Used for listing and retrieving sports with their full configuration.
    For creating sports, use SportCreateSerializer instead.
    """

    configuration = SportConfigurationSerializer(read_only=True)

    class Meta:
        model = Sport
        fields = [
            "id",
            "name",
            "slug",
            "sport_icon",
            "federation_metadata",
            "is_active",
            "configuration",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SportCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Sport.

    Automatically creates a SportConfiguration with defaults or provided values.
    Configuration can be customized via nested configuration object.
    """

    # Nested configuration for creation (optional - uses defaults if not provided)
    configuration = SportConfigurationSerializer(required=False)

    class Meta:
        model = Sport
        fields = [
            "id",
            "name",
            "slug",
            "sport_icon",
            "federation_metadata",
            "is_active",
            "configuration",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data: dict) -> Sport:
        """Create Sport with auto-generated SportConfiguration."""
        configuration_data = validated_data.pop("configuration", {})

        # Create the Sport
        sport = Sport.objects.create(**validated_data)

        # Create associated SportConfiguration with defaults or provided data
        SportConfiguration.objects.create(sport=sport, **configuration_data)

        return sport

    def to_representation(self, instance: Sport) -> dict:
        """Return full Sport representation with nested configuration."""
        return SportSerializer(instance).data


class SportConfigurationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating SportConfiguration independently.

    Used by the /sports/{slug}/configuration/ endpoint for PATCH updates.
    """

    class Meta:
        model = SportConfiguration
        fields = [
            "team_size_min",
            "team_size_max",
            "max_substitutes",
            "positions",
            "formations",
            "outfit_types",
            "has_goalkeeper",
            "metadata",
        ]

    def validate(self, attrs: dict) -> dict:
        """Validate team size constraints."""
        instance = self.instance
        team_size_min = attrs.get("team_size_min", getattr(instance, "team_size_min", 1))
        team_size_max = attrs.get("team_size_max", getattr(instance, "team_size_max", 11))

        if team_size_min > team_size_max:
            raise serializers.ValidationError(
                {
                    "team_size_min": "Minimum team size cannot exceed maximum team size.",
                    "team_size_max": "Maximum team size cannot be less than minimum team size.",
                }
            )

        return attrs
