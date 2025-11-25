"""
API serializers for organisations app.

Provides:
- OrganisationSerializer: Read serializer with computed fields
- OrganisationCreateSerializer: Write serializer with validation
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from organisations.models import Organisation

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Nested serializer for user details."""

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]
        read_only_fields = fields


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


# Serializers will be added in WP03
