"""DRF serializers for Membership, Invitations, and Promotions."""

import logging

from django.contrib.auth import get_user_model
from projects.models import ProjectInvite, ProjectMembership, ProjectMembershipPromotion
from rest_framework import serializers

from .serializers_project import UserNestedSerializer

User = get_user_model()

logger = logging.getLogger(__name__)


class UserAvatarNestedSerializer(serializers.ModelSerializer):
    """Serializer for nested user data with avatar.

    Previously named ``UserNestedSerializer`` — renamed to resolve the
    duplicate with the lightweight :class:`UserNestedSerializer` in
    ``serializers_project.py``.
    """

    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "avatar_url"]

    def get_avatar_url(self, obj):
        from accounts.utils import get_avatar_url

        return get_avatar_url(getattr(obj, "avatar", None))


class ProjectMembershipSerializer(serializers.ModelSerializer):
    """Serializer for project membership management."""

    user = UserAvatarNestedSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    organisation_membership_id = serializers.UUIDField(read_only=True)
    period = serializers.UUIDField(source="period_id", read_only=True)
    period_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    metadata = serializers.SerializerMethodField(read_only=True)
    functional_roles = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProjectMembership
        fields = [
            "id",
            "user",
            "user_id",
            "organisation_membership_id",
            "period",
            "period_id",
            "role",
            "metadata",
            "functional_roles",
            "assignment_reason",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "assignment_reason"]

    def get_metadata(self, obj):
        """Return metadata, enriched with teamreel_assets from other memberships if needed.

        TeamReel assets are stored per-membership but should be accessible when viewing
        a user in any season/period context. This merges assets from the user's other
        memberships in the same project.

        Uses context caching to avoid N+1 queries when serializing multiple memberships.
        """
        try:
            meta = dict(obj.metadata or {})

            # If this membership already has teamreel_assets, return as-is
            if meta.get("teamreel_assets"):
                return meta

            # Check context cache first (populated by view for batch queries)
            teamreel_cache = self.context.get("teamreel_assets_cache")
            if teamreel_cache is not None:
                # Cache key is (project_id, user_id)
                cache_key = (obj.project_id, obj.user_id)
                if cache_key in teamreel_cache:
                    meta["teamreel_assets"] = teamreel_cache[cache_key]
                return meta

            # Fallback: single query (for single object serialization)
            other = (
                ProjectMembership.objects.filter(
                    project_id=obj.project_id,
                    user_id=obj.user_id,
                    deleted_at__isnull=True,
                    metadata__has_key="teamreel_assets",
                )
                .exclude(id=obj.id)
                .only("metadata")
                .first()
            )
            if other and other.metadata:
                tr = other.metadata.get("teamreel_assets")
                if tr:
                    meta["teamreel_assets"] = tr

            return meta
        except Exception:
            # If anything fails, return empty metadata rather than crashing the endpoint
            return dict(obj.metadata or {})

    def get_functional_roles(self, obj):
        """Return functional roles for this user on this project.

        Sources (merged):
        1. ProjectFunctionalRoleAssignment table (authoritative)
        2. metadata.functional_roles list (kept in sync by assign/unassign endpoints)

        Uses context caching to avoid N+1 queries when serializing multiple memberships.
        """
        roles = set()

        try:
            # Check context cache first (populated by view for batch queries)
            roles_cache = self.context.get("functional_roles_cache")
            if roles_cache is not None:
                cache_key = (obj.project_id, obj.user_id)
                if cache_key in roles_cache:
                    roles.update(roles_cache[cache_key])
            else:
                # Fallback: single query (for single object serialization)
                from projects.models import ProjectFunctionalRoleAssignment

                qs = ProjectFunctionalRoleAssignment.objects.filter(
                    project_id=obj.project_id,
                    user_id=obj.user_id,
                ).values_list("role", flat=True)
                roles.update(qs)
        except Exception:
            # Best-effort: do not break members endpoint if functional roles table is missing.
            logger.debug("Failed to fetch functional roles for member", exc_info=True)

        # Derived admin→coach logic REMOVED.
        # Functional roles are now fully managed via the assignment table
        # and metadata.functional_roles. Admins are no longer auto-coaches.

        # Read functional_roles from metadata (primary source for squad page edits)
        meta = getattr(obj, "metadata", None) or {}
        fr_list = meta.get("functional_roles")
        if isinstance(fr_list, list):
            for role_raw in fr_list:
                role_str = str(role_raw or "").strip().lower()
                if role_str:
                    roles.add(role_str)

        # Legacy metadata hints (team_role, character_role) — no longer read.
        # Functional roles are fully managed via metadata.functional_roles
        # and the ProjectFunctionalRoleAssignment table.

        return sorted(roles)


class ProjectFunctionalRoleAssignSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    roles = serializers.ListField(
        child=serializers.ChoiceField(
            choices=[
                "coach",
                "player",
                "keeper",
                "assistant",
                "verzorger",
                "supporter",
                "manager",
            ]
        ),
        allow_empty=False,
    )

    def validate_user_id(self, value):
        """Ensure user exists."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User does not exist.")
        return value

    def validate_period_id(self, value):
        from activities.models import Period

        if value is None:
            return value
        if not Period.objects.filter(id=value).exists():
            raise serializers.ValidationError("Period does not exist.")
        return value


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
