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
            "is_active",
            "email_verified",
            "date_joined",
            "last_login",
            "organisations",
            "projects",
        ]

    def get_role(self, obj):
        """
        Get user's highest role from RBAC system (primary) with fallback to calculated role.

        Role hierarchy (highest to lowest):
        1. Superadmin (Django superuser - all organisations)
        2. Land Admin (Organisation admin - e.g., KNVB/DFB admin)
        3. Club Admin (Project parent admin - e.g., Ajax club)
        4. Team Admin (Project child admin - e.g., Ajax 1 team)
        5. Team Staff (project staff/editor role)
        6. Team Member (project player role)
        7. Viewer (project viewer role)
        8. User (default)
        """
        # 1. Check RBAC RoleAssignment first (primary source of truth)
        try:
            from permissions.models import RoleAssignment

            assignments = RoleAssignment.objects.filter(user=obj).select_related("role")
            if assignments.exists():
                # Return highest role based on hierarchy
                role_priority = {
                    "Land Admin": 1,
                    "Club Admin": 2,
                    "Team Admin": 3,
                    "Team Staff": 4,
                    "Team Member": 5,
                    "Supporter": 6,
                    "Viewer": 7,
                }
                highest = min(assignments, key=lambda ra: role_priority.get(ra.role.name, 999))
                return highest.role.name
        except (ImportError, Exception):
            pass

        # 2. Fallback to calculated role (backwards compatibility)
        if obj.is_superuser:
            return "Superadmin"

        # Check Organisation-level memberships (Land Admin)
        try:
            from organisations.models import Membership

            org_admin = Membership.objects.filter(user=obj, role="admin", is_active=True).exists()
            if org_admin:
                return "Land Admin"
        except ImportError:
            pass

        # Check Project-level memberships (Club Admin/Team Admin/Staff/Member)
        try:
            from projects.models import ProjectMembership

            project_memberships = (
                ProjectMembership.objects.filter(user=obj)
                .select_related("project")
                .order_by("role")
            )

            highest_role = None
            for pm in project_memberships:
                if not pm.project:
                    continue

                # Check if it's a club-level project (no parent) with admin role
                if pm.role == "admin" and not pm.project.parent_project:
                    return "Club Admin"

                # Check if it's a team-level project (has parent) with admin role
                if pm.role == "admin" and pm.project.parent_project:
                    if highest_role not in ["Club Admin"]:
                        highest_role = "Team Admin"

                # Staff/Editor role
                elif pm.role in ["staff", "editor"] and highest_role not in [
                    "Club Admin",
                    "Team Admin",
                ]:
                    highest_role = "Team Staff"

                # Player role
                elif pm.role == "player" and not highest_role:
                    highest_role = "Team Member"

                # Viewer role (lowest, only assign if no other role)
                elif pm.role == "viewer" and not highest_role:
                    highest_role = "Viewer"

            if highest_role:
                return highest_role
        except ImportError:
            pass

        return "User"

    def get_organisations(self, obj):
        """Get user's organisations."""
        orgs_data = {}

        # 1. Direct Memberships (Organisation level)
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

        # 2. Project Memberships (Team/Project level → infer Organisation)
        try:
            from projects.models import ProjectMembership

            project_memberships = ProjectMembership.objects.filter(user=obj).select_related(
                "project__organisation"
            )

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

    def get_projects(self, obj):
        """Get user's project memberships with parent project info."""
        projects_data = {}

        try:
            from projects.models import ProjectMembership

            project_memberships = ProjectMembership.objects.filter(user=obj).select_related(
                "project", "project__parent_project"
            )

            for pm in project_memberships:
                if pm.project:
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
