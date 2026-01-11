"""DRF serializers for Projects & Workspaces."""

from django.db.models import Q
from rest_framework import serializers
from django.contrib.auth import get_user_model

from projects.models import Project, ProjectMembership, ProjectInvite, ProjectMembershipPromotion
from activities.models import Activity, Period

User = get_user_model()


class UserNestedSerializer(serializers.ModelSerializer):
    """Serializer for nested user data."""

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]


class ProjectMembershipSerializer(serializers.ModelSerializer):
    """Serializer for project membership management."""

    user = UserNestedSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ProjectMembership
        fields = [
            "id",
            "user",
            "user_id",
            "role",
            "assignment_reason",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "assignment_reason"]

    def validate_user_id(self, value):
        """Ensure user exists."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User does not exist.")
        return value


class OrganisationNestedSerializer(serializers.Serializer):
    """Nested organisation representation."""

    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()
    user_role = serializers.SerializerMethodField()

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
    member_count = serializers.SerializerMethodField()
    seasons_count = serializers.SerializerMethodField()
    competitions_count = serializers.SerializerMethodField()
    matches_count = serializers.SerializerMethodField()
    parent_id = serializers.UUIDField(source="parent_project.id", allow_null=True, read_only=True)
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
            "created_at",
            "updated_at",
            "archived_at",
            "member_count",
            "seasons_count",
            "competitions_count",
            "matches_count",
            "parent_id",
            "parent_name",
        ]
        read_only_fields = ["id", "slug", "is_active", "created_at", "updated_at", "archived_at"]

    def get_member_count(self, obj):
        # Aggregated count for Clubs (parent projects)
        return (
            ProjectMembership.objects.filter(Q(project=obj) | Q(project__parent_project=obj))
            .values("user")
            .distinct()
            .count()
        )

    def get_seasons_count(self, obj):
        # Seasons are periods without a parent
        return Period.objects.filter(
            Q(project=obj) | Q(project__parent_project=obj), parent_period=None
        ).count()

    def get_competitions_count(self, obj):
        # Competitions are periods with a parent (Season)
        return Period.objects.filter(
            Q(project=obj) | Q(project__parent_project=obj), parent_period__isnull=False
        ).count()

    def get_matches_count(self, obj):
        # Matches are activities of type 'match'
        return Activity.objects.filter(
            Q(project=obj) | Q(project__parent_project=obj), activity_type="match"
        ).count()


class ProjectDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for project detail view (create/retrieve/update).

    Includes nested organisation and creator information.
    """

    organisation = OrganisationNestedSerializer(read_only=True)
    creator = UserNestedSerializer(read_only=True)
    current_user_access = serializers.SerializerMethodField()

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
            "created_at",
            "updated_at",
            "archived_at",
            "current_user_access",
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

    def update(self, instance, validated_data):
        """Update project.

        Contract: Meta.fields only exposes name/description.
        However, some workflows update privacy via this serializer by sending
        `is_private` as an input key. DRF will ignore unknown keys during
        validation, so we explicitly apply it here when present.
        """
        if "is_private" in getattr(self, "initial_data", {}):
            raw_value = self.initial_data.get("is_private")
            # Coerce typical representations; DRF already parsed JSON booleans.
            if isinstance(raw_value, str):
                raw_value = raw_value.strip().lower() in {"1", "true", "yes", "on"}
            instance.is_private = bool(raw_value)

        return super().update(instance, validated_data)


class ProjectInviteSerializer(serializers.ModelSerializer):
    """Serializer for project invitations."""

    invited_by = UserNestedSerializer(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = ProjectInvite
        fields = [
            "id",
            "email",
            "role",
            "status",
            "invited_by",
            "project_name",
            "created_at",
            "expires_at",
            "accepted_at",
            "is_expired",
        ]
        read_only_fields = [
            "id",
            "status",
            "invited_by",
            "created_at",
            "expires_at",
            "accepted_at",
        ]

    def get_is_expired(self, obj):
        """Check if invitation is expired."""
        return obj.is_expired()

    def validate_email(self, value):
        """Validate email format."""
        if not value:
            raise serializers.ValidationError("Email is required.")
        return value.lower().strip()

    def validate_role(self, value):
        """Validate role is valid."""
        if value not in dict(ProjectMembership.Role.choices):
            raise serializers.ValidationError(f"Invalid role: {value}")
        return value


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer for accepting an invitation."""

    token = serializers.CharField(required=True, max_length=64)

    def validate_token(self, value):
        """Validate token exists."""
        if not ProjectInvite.objects.filter(token=value).exists():
            raise serializers.ValidationError("Invalid invitation token.")
        return value


class ProjectMembershipPromotionSerializer(serializers.ModelSerializer):
    """Serializer for project membership promotions."""

    target_user = UserNestedSerializer(read_only=True)
    requested_by = UserNestedSerializer(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = ProjectMembershipPromotion
        fields = [
            "id",
            "project",
            "project_name",
            "target_user",
            "requested_by",
            "from_role",
            "to_role",
            "status",
            "is_suspicious",
            "suspicious_reason",
            "created_at",
            "expires_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "project",
            "target_user",
            "requested_by",
            "from_role",
            "status",
            "is_suspicious",
            "suspicious_reason",
            "created_at",
            "expires_at",
            "resolved_at",
        ]

    def validate_to_role(self, value):
        """Validate target role."""
        if value not in dict(ProjectMembership.Role.choices):
            raise serializers.ValidationError(f"Invalid role: {value}")
        return value
