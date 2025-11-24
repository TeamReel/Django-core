from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from accounts.models import User


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""

    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name"]

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for user list (admin)."""

    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "email_verified",
            "date_joined",
            "last_login",
        ]

    def get_role(self, obj):
        """Get user's role."""
        if obj.is_superuser:
            return "superadmin"
        elif obj.is_admin:
            return "admin"
        return "user"


class UserDetailSerializer(UserListSerializer):
    """Serializer for user detail (admin)."""

    groups = serializers.StringRelatedField(many=True)

    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + ["is_staff", "is_superuser", "groups"]


class ChangeRoleSerializer(serializers.Serializer):
    """Serializer for changing user role."""

    role = serializers.ChoiceField(choices=["superadmin", "admin", "user"])
