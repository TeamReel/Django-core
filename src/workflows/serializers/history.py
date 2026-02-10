"""Serializers for TransitionHistory model."""
from rest_framework import serializers

from src.workflows.models import TransitionHistory


class TransitionHistorySerializer(serializers.ModelSerializer):
    """
    Read-only serializer for TransitionHistory model.

    Provides audit trail of state transitions with actor information.
    """

    actor_username = serializers.CharField(source="actor.username", read_only=True, allow_null=True)
    actor_full_name = serializers.SerializerMethodField()

    class Meta:
        model = TransitionHistory
        fields = [
            "id",
            "instance",
            "from_state",
            "to_state",
            "action",
            "actor",
            "actor_username",
            "actor_full_name",
            "comment",
            "task_id",
            "context_snapshot",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "instance",
            "from_state",
            "to_state",
            "action",
            "actor",
            "actor_username",
            "actor_full_name",
            "comment",
            "task_id",
            "context_snapshot",
            "created_at",
        ]

    def get_actor_full_name(self, obj: TransitionHistory) -> str | None:
        """Get the actor's full name."""
        if obj.actor:
            full_name = obj.actor.get_full_name()
            return full_name if full_name else obj.actor.username
        return None
