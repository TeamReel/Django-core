"""DRF serializers for contextual notifications routing models."""

from rest_framework import serializers

from ..models import (
    NotificationPreference,
    OrganisationNotificationPolicy,
    RoutingRule,
)


class RoutingRuleSerializer(serializers.ModelSerializer):
    """Serializer for RoutingRule model."""

    organisation_name = serializers.CharField(
        source="organisation.name", read_only=True
    )
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = RoutingRule
        fields = [
            "id",
            "event_type",
            "scope",
            "organisation",
            "organisation_name",
            "project",
            "project_name",
            "target_role",
            "channel",
            "priority",
            "enabled",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for NotificationPreference model."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = NotificationPreference
        fields = [
            "id",
            "user",
            "user_email",
            "user_full_name",
            "event_type",
            "channel",
            "enabled",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class OrganisationNotificationPolicySerializer(serializers.ModelSerializer):
    """Serializer for OrganisationNotificationPolicy model."""

    organisation_name = serializers.CharField(
        source="organisation.name", read_only=True
    )

    class Meta:
        model = OrganisationNotificationPolicy
        fields = [
            "id",
            "organisation",
            "organisation_name",
            "policy_type",
            "quiet_hours_enabled",
            "quiet_hours_start",
            "quiet_hours_end",
            "quiet_hours_timezone",
            "quiet_hours_rate_limit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RoutingDecisionLogSerializer(serializers.Serializer):
    """Serializer for routing decision audit logs from B09 AuditEvent."""

    id = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    event_type = serializers.CharField(read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True, allow_null=True)
    user_email = serializers.EmailField(
        source="user.email", read_only=True, allow_null=True
    )
    organization_id = serializers.IntegerField(
        source="organization.id", read_only=True, allow_null=True
    )
    organization_name = serializers.CharField(
        source="organization.name", read_only=True, allow_null=True
    )
    project_id = serializers.IntegerField(
        source="project.id", read_only=True, allow_null=True
    )
    project_name = serializers.CharField(
        source="project.name", read_only=True, allow_null=True
    )
    metadata = serializers.JSONField(read_only=True)

    class Meta:
        fields = [
            "id",
            "created_at",
            "event_type",
            "user_id",
            "user_email",
            "organization_id",
            "organization_name",
            "project_id",
            "project_name",
            "metadata",
        ]
