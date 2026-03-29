"""
Serializers for B32 Sport Configuration API.

Provides DRF serializers for Sport, SportConfiguration, and OutfitConfiguration resources.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from rest_framework import serializers
from sport_configuration.models import Formation, OutfitConfiguration, Sport, SportConfiguration

if TYPE_CHECKING:
    from projects.models import Project


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
    parent_sport_id = serializers.PrimaryKeyRelatedField(
        source="parent_sport", queryset=Sport.objects.all(), required=False, allow_null=True
    )
    is_category = serializers.SerializerMethodField()
    is_variant = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Sport
        fields = [
            "id",
            "name",
            "slug",
            "sport_icon",
            "parent_sport_id",
            "is_category",
            "is_variant",
            "category_name",
            "federation_metadata",
            "is_active",
            "configuration",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "is_category",
            "is_variant",
            "category_name",
        ]

    def get_is_category(self, obj: Sport) -> bool:
        """Returns True if this sport is a category (no parent)."""
        return obj.is_category

    def get_is_variant(self, obj: Sport) -> bool:
        """Returns True if this sport is a variant (has parent)."""
        return obj.is_variant

    def get_category_name(self, obj: Sport) -> str | None:
        """Returns the parent category name if this is a variant."""
        return obj.category.name if obj.is_variant and obj.category else None


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


# ==============================================================================
# Formation Serializers
# ==============================================================================


class FormationListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for Formation listing.

    Used in dropdowns and selection lists.
    """

    sport_name = serializers.CharField(source="sport_config.sport.name", read_only=True)

    class Meta:
        model = Formation
        fields = [
            "id",
            "code",
            "name",
            "sport_name",
            "is_default",
            "is_active",
            "display_order",
        ]
        read_only_fields = ["id", "sport_name"]


class FormationSerializer(serializers.ModelSerializer):
    """
    Full serializer for Formation with positions and metadata.

    Used for detail views and creation/editing.
    """

    sport_config_id = serializers.PrimaryKeyRelatedField(
        source="sport_config",
        queryset=SportConfiguration.objects.all(),
        write_only=True,
        required=False,
    )
    sport_name = serializers.CharField(source="sport_config.sport.name", read_only=True)
    sport_id = serializers.IntegerField(source="sport_config.sport.id", read_only=True)

    class Meta:
        model = Formation
        fields = [
            "id",
            "sport_config",
            "sport_config_id",
            "sport_name",
            "sport_id",
            "code",
            "name",
            "positions",
            "description",
            "is_default",
            "is_active",
            "display_order",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "sport_config",
            "sport_name",
            "sport_id",
            "created_at",
            "updated_at",
        ]


# ==============================================================================
# Outfit Configuration Serializers (WP04)
# ==============================================================================


class OutfitConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for OutfitConfiguration with inheritance indicators.

    Includes `inherited` field to indicate if config comes from parent project
    and `source_project_name` to identify the source.
    """

    inherited = serializers.SerializerMethodField()
    source_project_name = serializers.SerializerMethodField()

    class Meta:
        model = OutfitConfiguration
        fields = [
            "id",
            "project",
            "outfit_type",
            "colors",
            "sponsor_config",
            "number_font",
            "badge_position",
            "metadata",
            "is_active",
            "inherited",
            "source_project_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "inherited",
            "source_project_name",
            "created_at",
            "updated_at",
        ]

    def get_inherited(self, obj: OutfitConfiguration) -> bool:
        """
        Check if this config is inherited from a parent project.

        Returns True if the config's project differs from the request context project.
        """
        request_project: Project | None = self.context.get("project")
        if request_project:
            return obj.project_id != request_project.id
        return False

    def get_source_project_name(self, obj: OutfitConfiguration) -> str:
        """Return the name of the project that owns this configuration."""
        return obj.project.name if obj.project else ""


class OutfitConfigurationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating OutfitConfiguration.

    Handles validation of unique_together constraint (project + outfit_type).
    """

    class Meta:
        model = OutfitConfiguration
        fields = [
            "id",
            "project",
            "outfit_type",
            "colors",
            "sponsor_config",
            "number_font",
            "badge_position",
            "metadata",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate(self, data: dict) -> dict:
        """
        Validate unique_together constraint for project + outfit_type.

        Ensures no duplicate outfit types exist for the same project.
        """
        project = data.get("project")
        outfit_type = data.get("outfit_type")

        # Handle update case - need to exclude current instance
        if self.instance:
            project = project or self.instance.project
            outfit_type = outfit_type or self.instance.outfit_type

            exists = (
                OutfitConfiguration.objects.filter(
                    project=project,
                    outfit_type=outfit_type,
                )
                .exclude(pk=self.instance.pk)
                .exists()
            )
        else:
            # Create case
            exists = OutfitConfiguration.objects.filter(
                project=project,
                outfit_type=outfit_type,
            ).exists()

        if exists:
            raise serializers.ValidationError(
                {
                    "outfit_type": (
                        "Outfit configuration for this type already exists in this project."
                    )
                }
            )

        return data


# ==============================================================================
# Validation Serializers (WP05)
# ==============================================================================


class ValidationIssueSerializer(serializers.Serializer):
    """
    Serializer for individual validation issues.

    Maps to the ValidationIssue dataclass from services.validation.
    """

    code = serializers.CharField()
    message = serializers.CharField()
    level = serializers.CharField()
    field = serializers.CharField(allow_null=True)
    context = serializers.DictField(required=False, default=dict)


class ValidationResultSerializer(serializers.Serializer):
    """
    Serializer for validation results.

    Maps to the ValidationResult dataclass from services.validation.
    """

    is_valid = serializers.BooleanField()
    has_errors = serializers.BooleanField()
    has_warnings = serializers.BooleanField()
    issues = ValidationIssueSerializer(many=True)


class TeamSizeValidationRequestSerializer(serializers.Serializer):
    """Request serializer for team size validation."""

    sport_slug = serializers.SlugField()
    player_count = serializers.IntegerField(min_value=0)


class PositionsValidationRequestSerializer(serializers.Serializer):
    """Request serializer for positions validation."""

    sport_slug = serializers.SlugField()
    positions = serializers.ListField(child=serializers.CharField())


class FormationValidationRequestSerializer(serializers.Serializer):
    """Request serializer for formation validation."""

    sport_slug = serializers.SlugField()
    formation = serializers.CharField()


class ProjectValidationRequestSerializer(serializers.Serializer):
    """Request serializer for full project validation."""

    project_id = serializers.IntegerField()
