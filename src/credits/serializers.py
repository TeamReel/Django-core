from rest_framework import serializers

from .models import CreditsBalance


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
