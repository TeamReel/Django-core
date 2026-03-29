from rest_framework import serializers

from .models import CreditsBalance, ProjectCreditsBalance, UserCreditsBalance


class CreditsBalanceSerializer(serializers.ModelSerializer):
    """Serializer for organisation credits balance."""

    organisation_id = serializers.UUIDField(source="organisation.id", read_only=True)
    organisation_name = serializers.CharField(source="organisation.name", read_only=True)

    class Meta:
        model = CreditsBalance
        fields = [
            "id",
            "organisation_id",
            "organisation_name",
            "current_balance",
            "updated_at",
            "created_at",
        ]
        read_only_fields = ["id", "updated_at", "created_at"]


class ProjectCreditsBalanceSerializer(serializers.ModelSerializer):
    """Serializer for project/team credits balance."""

    project_id = serializers.IntegerField(source="project.id", read_only=True)
    project_slug = serializers.CharField(source="project.slug", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    organisation_id = serializers.UUIDField(source="project.organisation.id", read_only=True)
    organisation_name = serializers.CharField(source="project.organisation.name", read_only=True)

    class Meta:
        model = ProjectCreditsBalance
        fields = [
            "id",
            "project_id",
            "project_slug",
            "project_name",
            "organisation_id",
            "organisation_name",
            "current_balance",
            "updated_at",
            "created_at",
        ]
        read_only_fields = ["id", "updated_at", "created_at"]


class UserCreditsBalanceSerializer(serializers.ModelSerializer):
    """User-scoped credits balance within an organisation."""

    organisation_id = serializers.UUIDField(source="organisation.id", read_only=True)
    organisation_name = serializers.CharField(source="organisation.name", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = UserCreditsBalance
        fields = [
            "id",
            "organisation_id",
            "organisation_name",
            "user_id",
            "user_email",
            "current_balance",
            "updated_at",
            "created_at",
        ]
        read_only_fields = ["id", "updated_at", "created_at"]
