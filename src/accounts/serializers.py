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
    organisations = serializers.SerializerMethodField()

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
            "organisations",
        ]

    def get_role(self, obj):
        """Get user's role."""
        if obj.is_superuser:
            return "superadmin"
        elif obj.is_admin:
            return "admin"
        return "user"

    def get_organisations(self, obj):
        """Get user's organisations."""
        orgs_data = {}

        # 1. Direct Memberships
        try:
            from organisations.models import Membership

            memberships = Membership.objects.filter(user=obj, is_active=True).select_related(
                "organisation"
            )
            for m in memberships:
                orgs_data[m.organisation.id] = {
                    "id": str(m.organisation.id),
                    "name": m.organisation.name,
                    "slug": m.organisation.slug,
                    "role": m.role,
                    "membership_id": str(m.id),
                }
        except ImportError:
            pass

        # 2. Role Assignments (Project or Org scope)
        try:
            from permissions.models import RoleAssignment, ScopeChoices

            assignments = RoleAssignment.objects.filter(user=obj).select_related(
                "target_organization", "target_project__organisation", "role"
            )

            for ra in assignments:
                org = None
                role_info = ra.role.name

                if ra.scope == ScopeChoices.ORGANIZATION and ra.target_organization:
                    org = ra.target_organization
                elif ra.scope == ScopeChoices.PROJECT and ra.target_project:
                    org = ra.target_project.organisation
                    role_info = f"{ra.role.name} (in {ra.target_project.name})"

                if org:
                    if org.id not in orgs_data:
                        orgs_data[org.id] = {
                            "id": str(org.id),
                            "name": org.name,
                            "slug": org.slug,
                            "role": role_info,
                        }
                    else:
                        # If user has both membership and project role, we could combine them
                        # But for UI simplicity, let's keep the membership role as primary
                        # or maybe append? Let's append for clarity.
                        current_role = orgs_data[org.id]["role"]
                        if role_info not in current_role:
                            orgs_data[org.id]["role"] = f"{current_role}, {role_info}"

        except ImportError:
            pass

        return list(orgs_data.values())


class UserDetailSerializer(UserListSerializer):
    """Serializer for user detail (admin)."""

    groups = serializers.StringRelatedField(many=True)

    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + ["is_staff", "is_superuser", "groups"]


class ChangeRoleSerializer(serializers.Serializer):
    """Serializer for changing user role."""

    role = serializers.ChoiceField(choices=["superadmin", "admin", "user"])


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user details (admin)."""

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "is_active"]
        extra_kwargs = {
            "email": {"required": False},
            "first_name": {"required": False},
            "last_name": {"required": False},
            "is_active": {"required": False},
        }

    def validate_email(self, value):
        """Check if email is already in use by another user."""
        user = self.context["user"]
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value
