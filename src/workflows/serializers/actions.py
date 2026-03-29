"""Serializers for transition execution and action responses."""
import json
from typing import Any, Dict

from rest_framework import serializers

from src.workflows.models import WorkflowInstance


class TransitionExecuteSerializer(serializers.Serializer):
    """
    Input serializer for workflow transition execution.

    Validates:
    - Action exists in available transitions from current state
    - Context updates (if provided) are valid JSON objects
    - Context size won't exceed 64KB after updates
    """

    action = serializers.CharField(
        max_length=100, help_text="Action name to execute (must exist in available_actions)"
    )
    comment = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text="Optional comment for the transition",
    )
    context_updates = serializers.JSONField(
        required=False, allow_null=True, help_text="Updates to merge into instance context"
    )

    def validate_action(self, value: str) -> str:
        """Validate action is non-empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Action cannot be empty")
        return value.strip()

    def validate_context_updates(self, value: dict) -> dict:
        """Validate context_updates is a dict if provided."""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("Context updates must be a JSON object")
        return value

    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate action exists in available transitions."""
        # Note: This validation requires the instance context to be available
        # The view layer should pass instance in context for full validation
        action = data.get("action")

        # If instance is available in context, validate action availability
        if "instance" in self.context:
            instance = self.context["instance"]
            available_actions = self._get_available_actions(instance)

            if action not in available_actions:
                raise serializers.ValidationError(
                    {
                        "action": (
                            f"Action '{action}' not available from "
                            f"state '{instance.current_state}'. "
                            f"Available actions: {sorted(available_actions)}"
                        )
                    }
                )

            # Validate that context_updates won't exceed size limit
            context_updates = data.get("context_updates", {})
            if context_updates:
                merged_context = {**instance.context, **context_updates}
                context_bytes = len(json.dumps(merged_context).encode("utf-8"))
                max_bytes = 65536  # 64KB

                if context_bytes > max_bytes:
                    raise serializers.ValidationError(
                        {
                            "context_updates": (
                                f"Context size {context_bytes} bytes would exceed "
                                f"{max_bytes} byte limit after update"
                            )
                        }
                    )

        return data

    def _get_available_actions(self, instance: WorkflowInstance) -> list:
        """Get available action names from current state."""
        transitions = instance.workflow_snapshot.get("transitions", [])
        available = [
            t.get("action")
            for t in transitions
            if isinstance(t, dict) and t.get("from_state") == instance.current_state
        ]
        return sorted(set(a for a in available if a))


class AvailableActionsSerializer(serializers.Serializer):
    """
    Response serializer for available actions from current state.

    Provides list of action names and their details.
    """

    action = serializers.CharField(help_text="Action name")
    to_state = serializers.CharField(help_text="Destination state")
    requires_comment = serializers.BooleanField(
        default=False, help_text="Whether comment is required for this action"
    )
    metadata = serializers.JSONField(
        required=False, allow_null=True, help_text="Additional metadata for the action"
    )
