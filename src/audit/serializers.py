from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AuditEvent

User = get_user_model()


class AuditUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "name"]


class AuditEventSerializer(serializers.ModelSerializer):
    user = AuditUserSerializer(read_only=True)
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)
    organisation_id = serializers.IntegerField(source="organization_id", read_only=True)
    project_id = serializers.IntegerField(source="project_id", read_only=True)

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "event_type",
            "timestamp",
            "user",
            "organisation_id",
            "project_id",
            "metadata",
        ]
