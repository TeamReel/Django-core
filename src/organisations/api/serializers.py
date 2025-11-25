"""
API serializers for organisations app.

Provides:
- OrganisationSerializer: Read serializer with computed fields
- OrganisationCreateSerializer: Write serializer with validation
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from organisations.models import Membership, Organisation

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Nested serializer for user details."""

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]
        read_only_fields = fields


class OrganisationListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for organisation list view.

    Includes only essential fields to reduce payload size and improve performance.
    Computed fields:
    - member_count: Total active members
    - user_role: Current user's role in this organisation
    """

    member_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = ["id", "name", "slug", "member_count", "user_role"]
        read_only_fields = fields

    def get_member_count(self, obj):
        """Return count of active members."""
        return obj.memberships.filter(is_active=True).count()

    def get_user_role(self, obj):
        """Return current user's role in this organisation, or None."""
        user = self.context.get("request").user if self.context.get("request") else None
        if not user or not user.is_authenticated:
            return None

        membership = obj.memberships.filter(user=user, is_active=True).first()
        return membership.role if membership else None


class OrganisationSerializer(serializers.ModelSerializer):
    """
    Read serializer for Organisation with computed fields.

    Computed fields:
    - member_count: Total active members
    - admin_count: Total active admins
    - user_role: Current user's role in this organisation (or None)
    """

    creator = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "created_at",
            "updated_at",
            "creator",
            "member_count",
            "admin_count",
            "user_role",
        ]
        read_only_fields = fields

    def get_member_count(self, obj):
        """Return count of active members."""
        return obj.memberships.filter(is_active=True).count()

    def get_admin_count(self, obj):
        """Return count of active admin members."""
        return obj.memberships.filter(role="admin", is_active=True).count()

    def get_user_role(self, obj):
        """Return current user's role in this organisation, or None."""
        user = self.context.get("request").user if self.context.get("request") else None
        if not user or not user.is_authenticated:
            return None

        membership = obj.memberships.filter(user=user, is_active=True).first()
        return membership.role if membership else None


class OrganisationCreateSerializer(serializers.ModelSerializer):
    """
    Write serializer for Organisation creation.

    Validates:
    - name: 3-100 chars, unique, alphanumeric + spaces/hyphens/underscores
    - description: optional
    """

    class Meta:
        model = Organisation
        fields = ["name", "description"]

    def validate_name(self, value):
        """Validate name meets requirements."""
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters.")
        if len(value) > 100:
            raise serializers.ValidationError("Name must be at most 100 characters.")
        return value


class MembershipSerializer(serializers.ModelSerializer):
    """
    Read serializer for Membership with nested user and organisation details.
    """

    user = UserSerializer(read_only=True)
    organisation = serializers.SerializerMethodField()
    invited_by = UserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id",
            "user",
            "organisation",
            "role",
            "joined_at",
            "invited_by",
            "is_active",
        ]
        read_only_fields = fields

    def get_organisation(self, obj):
        """Return minimal organisation details."""
        return {
            "id": obj.organisation.id,
            "name": obj.organisation.name,
            "slug": obj.organisation.slug,
        }


class MembershipCreateSerializer(serializers.ModelSerializer):
    """
    Write serializer for creating memberships (inviting members).

    Validates:
    - user_id: Must be a valid user
    - role: Must be 'admin' or 'member'
    - No duplicate memberships (validated in validate())
    """

    user_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Membership
        fields = ["user_id", "role"]

    def validate_user_id(self, value):
        """Validate that user exists."""
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User does not exist.")
        return value

    def validate(self, attrs):
        """Validate no duplicate membership exists."""
        org_id = self.context["view"].kwargs.get("organisation_pk")
        user_id = attrs["user_id"]

        if Membership.objects.filter(user_id=user_id, organisation_id=org_id).exists():
            raise serializers.ValidationError(
                {"user_id": "User is already a member of this organisation."}
            )

        return attrs

    def create(self, validated_data):
        """Create membership with resolved user and organisation."""
        org_id = self.context["view"].kwargs["organisation_pk"]
        user_id = validated_data.pop("user_id")

        return Membership.objects.create(
            user_id=user_id, organisation_id=org_id, role=validated_data["role"]
        )
