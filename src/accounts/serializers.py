from accounts.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


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
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return data


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "password", "password_confirm", "first_name", "last_name"]

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for user list (admin)."""

    role = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    organisations = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "avatar_url",
            "two_factor_enabled",
            "is_active",
            "email_verified",
            "date_joined",
            "last_login",
            "organisations",
            "projects",
        ]

    def get_avatar_url(self, obj):
        from accounts.utils import get_avatar_url

        return get_avatar_url(getattr(obj, "avatar", None))

    def get_role(self, obj):
        """Return the canonical platform role slug.

        API contracts and tests expect this to be one of: "superadmin", "admin", "user".
        Organization/project-specific roles are exposed via the organisations/projects fields.
        """

        if getattr(obj, "is_superuser", False):
            return "superadmin"

        if getattr(obj, "is_admin", False) or getattr(obj, "is_staff", False):
            return "admin"

        return "user"

    def get_organisations(self, obj):
        """Get user's organisations."""
        orgs_data = {}

        # 1. Direct Memberships (Organisation level)
        try:
            from organisations.models import Membership  # noqa: F401 (used below)

            memberships = [m for m in obj.organisation_memberships.all() if m.is_active]
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

        # 2. Project Memberships (Team/Project level → infer Organisation)
        try:
            from projects.models import ProjectMembership  # noqa: F401

            project_memberships = list(obj.project_memberships.all())

            for pm in project_memberships:
                if pm.project and pm.project.organisation:
                    org = pm.project.organisation
                    role_info = pm.role

                    if org.id not in orgs_data:
                        orgs_data[org.id] = {
                            "id": str(org.id),
                            "name": org.name,
                            "slug": org.slug,
                            "role": role_info,
                            "project_membership_id": str(pm.id),
                        }
                    # If user has multiple project memberships in same org, keep first role
        except ImportError:
            pass

        # 3. Role Assignments (Project or Org scope)
        try:
            from permissions.models import RoleAssignment, ScopeChoices  # noqa: F401

            assignments = list(obj.role_assignments.all())

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

    def get_projects(self, obj):
        """Get user's project memberships with parent project info."""
        projects_data = {}

        try:
            from projects.models import ProjectMembership

            project_memberships = [
                pm for pm in obj.project_memberships.all() if pm.deleted_at is None
            ]

            def _is_base(pm: "ProjectMembership") -> bool:
                return pm.period_id is None

            for pm in project_memberships:
                if not pm.project:
                    continue

                existing = projects_data.get(pm.project.id)

                # If multiple memberships exist for the same project (e.g. season-scoped),
                # prefer the base membership (no period) for the primary view.
                if existing is not None:
                    existing_period = (
                        (existing.get("period") or {}).get("id")
                        if isinstance(existing, dict)
                        else None
                    )
                    existing_is_base = not bool(existing_period)
                    if existing_is_base:
                        continue
                    if not _is_base(pm):
                        continue

                projects_data[pm.project.id] = {
                    "id": str(pm.project.id),
                    "name": pm.project.name,
                    "slug": pm.project.slug,
                    "role": pm.role,
                    "parent": (
                        str(pm.project.parent_project.id) if pm.project.parent_project else None
                    ),
                    "parent_name": (
                        pm.project.parent_project.name if pm.project.parent_project else None
                    ),
                    "membership_id": str(pm.id),
                    "period": (
                        {
                            "id": str(pm.period.id),
                            "name": pm.period.name,
                            "parent_id": (
                                str(pm.period.parent_period.id)
                                if getattr(pm.period, "parent_period", None)
                                else None
                            ),
                            "parent_name": (
                                pm.period.parent_period.name
                                if getattr(pm.period, "parent_period", None)
                                else None
                            ),
                        }
                        if pm.period
                        else None
                    ),
                }
        except ImportError:
            pass

        return list(projects_data.values())


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
