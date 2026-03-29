"""
DRF serializers for permissions API.

Serializers:
- PermissionSerializer: Read-only serializer for permission details
- RoleSerializer: Full CRUD serializer for roles with nested permissions
- RoleAssignmentSerializer: Serializer for assigning roles to users with validation

Usage Examples:
    # List roles
    GET /api/permissions/roles/

    # Create role
    POST /api/permissions/roles/
    {
        "name": "Custom Admin",
        "scope": "organization",
        "description": "Custom admin role",
        "permission_ids": ["<uuid1>", "<uuid2>"]
    }

    # Assign role to user
    POST /api/permissions/role-assignments/
    {
        "user": "<user_uuid>",
        "role": "<role_uuid>",
        "scope": "organization",
        "target_organization": "<org_uuid>"
    }
"""

from permissions.models import Permission, Role, RoleAssignment, ScopeChoices
from rest_framework import serializers


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Permission model (read-only in role context)."""

    class Meta:
        model = Permission
        fields = ["id", "permission", "resource_type", "description", "is_sensitive"]
        read_only_fields = ["id"]


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for Role model with nested permissions.

    Permissions are read-only in this serializer - use separate endpoint
    to modify role permissions (future enhancement).
    """

    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        write_only=True,
        required=False,
        help_text="List of permission IDs to assign to this role",
    )

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "description",
            "scope",
            "permissions",
            "permission_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        """Validate role data."""
        # Ensure at least one permission provided when creating/updating
        if "permission_ids" in attrs and not attrs["permission_ids"]:
            raise serializers.ValidationError(
                {"permission_ids": "Role must have at least one permission"}
            )

        return attrs

    def create(self, validated_data):
        """Create role with permissions."""
        permission_ids = validated_data.pop("permission_ids", [])
        role = Role.objects.create(**validated_data)

        if permission_ids:
            role.permissions.set(permission_ids)

        return role

    def update(self, instance, validated_data):
        """Update role and optionally replace permissions."""
        permission_ids = validated_data.pop("permission_ids", None)

        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update permissions if provided
        if permission_ids is not None:
            instance.permissions.set(permission_ids)

        return instance


class RoleAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for RoleAssignment with validation.

    Validates:
    - User exists
    - Role exists
    - Scope matches role.scope
    - Target organization/project provided when required
    """

    user_email = serializers.EmailField(source="user.email", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = RoleAssignment
        fields = [
            "id",
            "user",
            "user_email",
            "role",
            "role_name",
            "scope",
            "target_organization",
            "target_project",
            "assigned_by",
            "assigned_at",
        ]
        read_only_fields = ["id", "assigned_by", "assigned_at", "user_email", "role_name"]
        extra_kwargs = {
            "target_organization": {"required": False, "allow_null": True},
            "target_project": {"required": False, "allow_null": True},
        }

    def validate(self, attrs):
        """Validate role assignment data."""
        role = attrs.get("role")
        scope = attrs.get("scope")
        target_organization = attrs.get("target_organization")
        target_project = attrs.get("target_project")

        # Validate role scope matches assignment scope
        if role and scope and role.scope != scope:
            raise serializers.ValidationError(
                {"scope": f"Role scope ({role.scope}) must match assignment scope ({scope})"}
            )

        # Validate scope-specific requirements
        if scope == ScopeChoices.GLOBAL:
            if target_organization or target_project:
                raise serializers.ValidationError(
                    {
                        "scope": (
                            "Global scope assignments must not have "
                            "target_organization or target_project"
                        )
                    }
                )
        elif scope == ScopeChoices.ORGANIZATION:
            if not target_organization:
                raise serializers.ValidationError(
                    {"target_organization": "Organization scope requires target_organization"}
                )
            if target_project:
                raise serializers.ValidationError(
                    {"target_project": "Organization scope must not have target_project"}
                )
        elif scope == ScopeChoices.PROJECT:
            if not target_project:
                raise serializers.ValidationError(
                    {"target_project": "Project scope requires target_project"}
                )

        return attrs

    def create(self, validated_data):
        """Create role assignment with assigned_by set to request user."""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["assigned_by"] = request.user

        return RoleAssignment.objects.create(**validated_data)
