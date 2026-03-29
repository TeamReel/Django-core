"""DRF serializers for Project CRUD operations."""

from django.contrib.auth import get_user_model
from projects.models import Project
from rest_framework import serializers

User = get_user_model()


class OrganisationNestedSerializer(serializers.Serializer):
    """Nested organisation representation."""

    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()
    sport = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()

    def get_sport(self, obj):
        """Return nested sport representation (category-level)."""
        if getattr(obj, "sport", None):
            return {
                "id": str(obj.sport.id),
                "name": obj.sport.name,
                "slug": obj.sport.slug,
                "sport_icon": obj.sport.sport_icon,
            }
        return None

    def get_user_role(self, obj):
        """Return current user's role in this organisation, or None."""
        user = self.context.get("request").user if self.context.get("request") else None
        if not user or not user.is_authenticated:
            return None

        # Use list comprehension to avoid DB hit if prefetched
        membership = next(
            (m for m in obj.memberships.all() if m.user_id == user.id and m.is_active), None
        )
        return membership.role if membership else None


class UserNestedSerializer(serializers.Serializer):
    """Nested user/creator representation."""

    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()

    def to_representation(self, instance):
        """Add full_name to output."""
        data = super().to_representation(instance)
        data["full_name"] = f"{instance.first_name} {instance.last_name}".strip()
        return data


class ProjectListSerializer(serializers.ModelSerializer):
    """
    Serializer for project list view.

    Returns minimal project information with nested organisation.
    """

    organisation = OrganisationNestedSerializer(read_only=True)
    member_count = serializers.IntegerField(read_only=True, default=0)
    seasons_count = serializers.IntegerField(read_only=True, default=0)
    competitions_count = serializers.IntegerField(read_only=True, default=0)
    matches_count = serializers.IntegerField(read_only=True, default=0)
    sport_variants_count = serializers.IntegerField(read_only=True, default=0)
    parent_id = serializers.IntegerField(
        source="parent_project.id", allow_null=True, read_only=True
    )
    parent_name = serializers.CharField(
        source="parent_project.name", allow_null=True, read_only=True
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "organisation",
            "name",
            "slug",
            "description",
            "is_active",
            "is_private",
            "team_type",
            "created_at",
            "updated_at",
            "archived_at",
            "member_count",
            "seasons_count",
            "competitions_count",
            "matches_count",
            "sport_variants_count",
            "parent_id",
            "parent_name",
        ]
        read_only_fields = ["id", "slug", "is_active", "created_at", "updated_at", "archived_at"]


class ProjectPublicListSerializer(serializers.ModelSerializer):
    """Minimal serializer for cross-organisation project discovery.

    Used when a user has platform-wide read permissions like `project.view_all`.
    Avoids expensive computed counts and reduces data leakage.
    """

    organisation = OrganisationNestedSerializer(read_only=True)
    parent_id = serializers.IntegerField(
        source="parent_project.id", allow_null=True, read_only=True
    )
    parent_name = serializers.CharField(
        source="parent_project.name", allow_null=True, read_only=True
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "organisation",
            "name",
            "slug",
            "description",
            "is_active",
            "is_private",
            "team_type",
            "created_at",
            "updated_at",
            "archived_at",
            "parent_id",
            "parent_name",
        ]
        read_only_fields = fields


class ProjectDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for project detail view (create/retrieve/update).

    Includes nested organisation and creator information.
    """

    organisation = OrganisationNestedSerializer(read_only=True)
    creator = UserNestedSerializer(read_only=True)
    current_user_access = serializers.SerializerMethodField()
    metadata = serializers.JSONField(required=False)
    # Project uses the default Django AutoField (integer) primary key.
    # This is TeamReel's Club 7 Team hierarchy link.
    parent_project_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    parent_id = serializers.IntegerField(
        source="parent_project.id", allow_null=True, read_only=True
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "organisation",
            "creator",
            "name",
            "slug",
            "description",
            "is_active",
            "is_private",
            "team_type",
            "metadata",
            "created_at",
            "updated_at",
            "archived_at",
            "current_user_access",
            "parent_project_id",
            "parent_id",
        ]
        read_only_fields = [
            "id",
            "slug",
            "created_at",
            "updated_at",
            "archived_at",
            "current_user_access",
        ]

    def get_current_user_access(self, obj):
        """Return current user's access level and source."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        from projects.services.permission_resolution import PermissionResolutionService

        service = PermissionResolutionService()
        return service.get_project_role(str(request.user.id), str(obj.id))

    def validate_name(self, value):
        """Validate name length and format."""
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty.")

        if len(value) > 200:
            raise serializers.ValidationError("Name must be 200 characters or less.")

        return value.strip()

    def validate_description(self, value):
        """Validate description length."""
        if value and len(value) > 2000:
            raise serializers.ValidationError("Description must be 2000 characters or less.")

        return value

    def validate(self, attrs):
        """Validate case-insensitive name uniqueness.

        TeamReel hierarchy:
        - Root projects (clubs): unique within organisation
        - Child projects (teams): unique only within the same parent club
        """
        name = attrs.get("name")
        organisation = self.context.get("organisation")

        if not organisation:
            raise serializers.ValidationError({"organisation": "Organisation context is required."})

        parent_project_id = attrs.get("parent_project_id")
        if parent_project_id:
            parent = Project.all_objects.filter(
                organisation=organisation,
                id=parent_project_id,
            ).first()
            if not parent:
                raise serializers.ValidationError(
                    {"parent_project_id": "Parent project not found in this organisation."}
                )

        # Uniqueness scope depends on hierarchy.
        if parent_project_id:
            queryset = Project.all_objects.filter(
                organisation=organisation,
                parent_project_id=parent_project_id,
                name__iexact=name,
            )
        else:
            queryset = Project.all_objects.filter(
                organisation=organisation,
                parent_project__isnull=True,
                name__iexact=name,
            )

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                {"name": f"A project with this name already exists in {organisation.name}."}
            )

        return attrs

    def create(self, validated_data):
        """Create project with organisation and creator from context."""
        parent_project_id = validated_data.pop("parent_project_id", None)
        validated_data["organisation"] = self.context["organisation"]
        validated_data["creator"] = self.context["request"].user

        if parent_project_id:
            validated_data["parent_project_id"] = parent_project_id

        return super().create(validated_data)


class ProjectUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for project updates.

    Only allows updating name and description.
    Slug is immutable after creation.
    """

    metadata = serializers.JSONField(required=False)

    class Meta:
        model = Project
        fields = ["name", "description", "metadata", "team_type"]

    def validate_name(self, value):
        """Validate name length and format."""
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty.")

        if len(value) > 200:
            raise serializers.ValidationError("Name must be 200 characters or less.")

        return value.strip()

    def validate_description(self, value):
        """Validate description length."""
        if value and len(value) > 2000:
            raise serializers.ValidationError("Description must be 2000 characters or less.")

        return value

    def validate(self, attrs):
        """Validate case-insensitive name uniqueness.

        Same rules as create:
        - Root projects: unique within organisation
        - Child projects: unique within the same parent
        """
        name = attrs.get("name")
        if not name:
            return attrs

        organisation = self.instance.organisation
        parent_project_id = self.instance.parent_project_id

        if parent_project_id:
            queryset = Project.all_objects.filter(
                organisation=organisation,
                parent_project_id=parent_project_id,
                name__iexact=name,
            ).exclude(pk=self.instance.pk)
        else:
            queryset = Project.all_objects.filter(
                organisation=organisation,
                parent_project__isnull=True,
                name__iexact=name,
            ).exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                {"name": f"A project with this name already exists in {organisation.name}."}
            )

        return attrs

    def update(self, instance, validated_data):
        """Update project.

        Contract: Meta.fields only exposes name/description.
        However, some workflows update privacy via this serializer by sending
        `is_private` as an input key. DRF will ignore unknown keys during
        validation, so we explicitly apply it here when present.
        """
        incoming_metadata = validated_data.pop("metadata", None)

        if "is_private" in getattr(self, "initial_data", {}):
            raw_value = self.initial_data.get("is_private")
            # Coerce typical representations; DRF already parsed JSON booleans.
            if isinstance(raw_value, str):
                raw_value = raw_value.strip().lower() in {"1", "true", "yes", "on"}
            instance.is_private = bool(raw_value)

        if incoming_metadata is not None:
            existing = getattr(instance, "metadata", None) or {}
            if isinstance(existing, dict) and isinstance(incoming_metadata, dict):
                instance.metadata = {**existing, **incoming_metadata}
            else:
                instance.metadata = incoming_metadata

        instance = super().update(instance, validated_data)

        return instance
