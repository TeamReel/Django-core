"""
API serializers for organisations app.

Barrel module — Organisation serializers live here; membership serializers
are in serializers_membership.py and re-exported for backward compatibility.
"""

from activities.models import Activity, Period
from django.contrib.auth import get_user_model
from projects.models import ProjectMembership
from rest_framework import serializers

from organisations.models import Membership, Organisation

# Re-export membership serializers for backward compatibility
from .serializers_membership import (  # noqa: F401
    MembershipCreateSerializer,
    MembershipListSerializer,
    MembershipSerializer,
    MembershipUpdateSerializer,
    UserBasicSerializer,
    UserSerializer,
)

User = get_user_model()


class OrganisationListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for organisation list view.

    Includes only essential fields to reduce payload size and improve performance.
    Computed fields:
    - member_count: Total active members
    - user_role: Current user's role in this organisation
    """

    member_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    clubs_count = serializers.SerializerMethodField()
    teams_count = serializers.SerializerMethodField()
    total_players_count = serializers.SerializerMethodField()
    seasons_count = serializers.SerializerMethodField()
    competitions_count = serializers.SerializerMethodField()
    matches_count = serializers.SerializerMethodField()
    sport = serializers.SerializerMethodField()
    sport_variants_count = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "slug",
            "is_active",
            "sport",
            "sport_variants_count",
            "member_count",
            "project_count",
            "user_role",
            "enable_theme_toggle",
            "clubs_count",
            "teams_count",
            "total_players_count",
            "seasons_count",
            "competitions_count",
            "matches_count",
        ]
        read_only_fields = fields

    def get_sport(self, obj):
        """Return nested sport representation (category-level)."""
        if obj.sport:
            return {
                "id": str(obj.sport.id),
                "name": obj.sport.name,
                "slug": obj.sport.slug,
                "sport_icon": obj.sport.sport_icon,
            }
        return None

    def get_sport_variants_count(self, obj):
        """Return count of distinct sport variants used in this organisation."""
        return (
            Period.objects.filter(
                organisation=obj,
                sport__isnull=False,
                sport__parent_sport__isnull=False,
            )
            .values_list("sport_id", flat=True)
            .distinct()
            .count()
        )

    def get_member_count(self, obj):
        """Return count of active members (direct org + project members)."""
        direct_user_ids = {m.user_id for m in obj.memberships.all() if m.is_active}
        project_user_ids = set(
            ProjectMembership.objects.filter(
                project__organisation=obj,
                deleted_at__isnull=True,
            )
            .values_list("user_id", flat=True)
            .distinct()
        )
        return len(direct_user_ids | project_user_ids)

    def get_project_count(self, obj):
        """Return count of projects."""
        return len(obj.projects.all())

    def get_clubs_count(self, obj):
        """Return count of root projects (Clubs)."""
        return obj.projects.filter(parent_project=None).count()

    def get_teams_count(self, obj):
        """Return count of sub-projects (Teams)."""
        return obj.projects.exclude(parent_project=None).count()

    def get_total_players_count(self, obj):
        """Return count of unique users across all projects in the organisation."""
        return (
            ProjectMembership.objects.filter(project__organisation=obj)
            .values("user")
            .distinct()
            .count()
        )

    def get_seasons_count(self, obj):
        """Return count of seasons."""
        return Period.objects.filter(project__organisation=obj, parent_period=None).count()

    def get_competitions_count(self, obj):
        """Return count of competitions (child periods under seasons)."""
        return Period.objects.filter(
            project__organisation=obj,
            parent_period__isnull=False,
        ).count()

    def get_matches_count(self, obj):
        """Return count of matches."""
        return Activity.objects.filter(project__organisation=obj, activity_type="match").count()

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


class OrganisationPublicListSerializer(serializers.ModelSerializer):
    """Minimal, non-sensitive organisation list serializer.

    Intended for cross-organisation discovery (e.g. opponent selection) when a user
    has a permission like org.view_all but is not necessarily a member.
    """

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "slug",
            "is_active",
        ]
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
    project_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    sport = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "created_at",
            "updated_at",
            "creator",
            "member_count",
            "admin_count",
            "project_count",
            "user_role",
            "enable_theme_toggle",
            "sport",
            "metadata",
        ]
        read_only_fields = fields

    def get_sport(self, obj):
        """Return nested sport representation (category-level)."""
        if obj.sport:
            return {
                "id": str(obj.sport.id),
                "name": obj.sport.name,
                "slug": obj.sport.slug,
                "sport_icon": obj.sport.sport_icon,
            }
        return None

    def get_member_count(self, obj):
        """Return count of active members (direct org + project members)."""
        direct_user_ids = {m.user_id for m in obj.memberships.all() if m.is_active}
        project_user_ids = set(
            ProjectMembership.objects.filter(
                project__organisation=obj,
                deleted_at__isnull=True,
            )
            .values_list("user_id", flat=True)
            .distinct()
        )
        return len(direct_user_ids | project_user_ids)

    def get_admin_count(self, obj):
        """Return count of active admin members."""
        return len([m for m in obj.memberships.all() if m.role == "admin" and m.is_active])

    def get_project_count(self, obj):
        """Return count of active projects."""
        return len([p for p in obj.projects.all() if p.is_active])

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


class OrganisationCreateSerializer(serializers.ModelSerializer):
    """
    Write serializer for Organisation creation.

    Validates:
    - name: 3-100 chars, unique, alphanumeric + spaces/hyphens/underscores
    - description: optional
    - sport_id: optional integer id for sport category
    """

    sport_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "enable_theme_toggle",
            "sport_id",
            "metadata",
        ]
        read_only_fields = ["id", "slug"]

    def validate_name(self, value):
        """Validate name meets requirements."""
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters.")
        if len(value) > 100:
            raise serializers.ValidationError("Name must be at most 100 characters.")
        return value
