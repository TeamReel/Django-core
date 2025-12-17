"""DRF serializers for Projects & Workspaces."""

from rest_framework import serializers

from projects.models import Project


class OrganisationNestedSerializer(serializers.Serializer):
    """Nested organisation representation."""

    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()


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

    class Meta:
        model = Project
        fields = [
            "id",
            "organisation",
            "name",
            "slug",
            "description",
            "is_active",
            "created_at",
            "updated_at",
            "archived_at",
        ]
        read_only_fields = ["id", "slug", "is_active", "created_at", "updated_at", "archived_at"]


class ProjectDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for project detail view (create/retrieve/update).

    Includes nested organisation and creator information.
    """

    organisation = OrganisationNestedSerializer(read_only=True)
    creator = UserNestedSerializer(read_only=True)

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
            "created_at",
            "updated_at",
            "archived_at",
        ]
        read_only_fields = ["id", "slug", "is_active", "created_at", "updated_at", "archived_at"]

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
        """Validate case-insensitive name uniqueness per organisation."""
        name = attrs.get("name")
        organisation = self.context.get("organisation")

        if not organisation:
            raise serializers.ValidationError({"organisation": "Organisation context is required."})

        # Check for case-insensitive name uniqueness within the organisation
        # Exclude the current instance if updating
        queryset = Project.all_objects.filter(organisation=organisation, name__iexact=name)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                {"name": f"A project with this name already exists in {organisation.name}."}
            )

        return attrs

    def create(self, validated_data):
        """Create project with organisation and creator from context."""
        validated_data["organisation"] = self.context["organisation"]
        validated_data["creator"] = self.context["request"].user
        return super().create(validated_data)


class ProjectUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for project updates.

    Only allows updating name and description.
    Slug is immutable after creation.
    """

    class Meta:
        model = Project
        fields = ["name", "description"]

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
        """Validate case-insensitive name uniqueness per organisation."""
        name = attrs.get("name")

        if not name:
            return attrs

        organisation = self.instance.organisation

        # Check for case-insensitive name uniqueness within the organisation
        queryset = Project.all_objects.filter(organisation=organisation, name__iexact=name).exclude(
            pk=self.instance.pk
        )

        if queryset.exists():
            raise serializers.ValidationError(
                {"name": f"A project with this name already exists in {organisation.name}."}
            )

        return attrs
