"""Serializers for WorkflowInstance model."""
import json
from typing import Any, Dict

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from src.workflows.models import WorkflowInstance, WorkflowTemplate


class WorkflowInstanceSerializer(serializers.ModelSerializer):
    """
    Serializer for WorkflowInstance model.

    Validates:
    - Context size ≤ 64KB
    - Current state exists in workflow definition
    - Workflow template exists and is active

    Computed fields:
    - available_actions: List of action names available from current state
    """

    # Explicit FK field to include inactive workflows for validation
    workflow: serializers.PrimaryKeyRelatedField = serializers.PrimaryKeyRelatedField(
        queryset=WorkflowTemplate.all_objects.all()
    )

    workflow_name = serializers.CharField(source="workflow.name", read_only=True)
    workflow_version = serializers.CharField(source="workflow.version", read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, allow_null=True
    )
    content_type_name = serializers.SerializerMethodField()
    available_actions = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowInstance
        fields = [
            "id",
            "workflow",
            "workflow_name",
            "workflow_version",
            "workflow_snapshot",
            "project",
            "content_type",
            "content_type_name",
            "object_id",
            "current_state",
            "context",
            "version",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
            "available_actions",
        ]
        read_only_fields = [
            "id",
            "workflow_snapshot",
            "current_state",  # Set by WorkflowEngine
            "created_by",  # Set by request.user
            "version",
            "created_at",
            "updated_at",
            "workflow_name",
            "workflow_version",
            "created_by_username",
            "content_type_name",
            "available_actions",
        ]

    def validate_workflow(self, value: WorkflowTemplate) -> WorkflowTemplate:
        """Validate workflow exists and is active."""
        if not value.is_active:
            raise serializers.ValidationError(f"Workflow '{value.name}' is not active")
        return value

    def validate_context(self, value: dict) -> dict:
        """Validate context size ≤ 64KB."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Context must be a JSON object")

        context_bytes = len(json.dumps(value).encode("utf-8"))
        max_bytes = 65536  # 64KB

        if context_bytes > max_bytes:
            raise serializers.ValidationError(
                f"Context size {context_bytes} bytes exceeds {max_bytes} byte limit"
            )

        return value

    def validate_current_state(self, value: str) -> str:
        """Validate current_state is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Current state cannot be empty")
        return value

    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate current_state exists in workflow snapshot."""
        # On create, use workflow.definition; on update, use instance.workflow_snapshot
        if self.instance:
            workflow_snapshot = self.instance.workflow_snapshot
        else:
            workflow = data.get("workflow")
            if workflow:
                workflow_snapshot = workflow.definition
            else:
                # Will fail on create if workflow not provided
                return data

        current_state = data.get("current_state") or (
            self.instance.current_state if self.instance else None
        )

        if current_state:
            states = workflow_snapshot.get("states", [])
            state_names = {s.get("name") for s in states if isinstance(s, dict)}

            if current_state not in state_names:
                raise serializers.ValidationError(
                    {
                        "current_state": (
                            f"State '{current_state}' not in workflow definition. "
                            f"Available states: {sorted([s for s in state_names if s is not None])}"
                        )
                    }
                )

        return data

    def create(self, validated_data: dict) -> WorkflowInstance:
        """Create new WorkflowInstance with workflow snapshot."""
        workflow = validated_data.get("workflow")

        # Capture workflow snapshot at creation
        validated_data["workflow_snapshot"] = workflow.definition

        # Auto-set initial state if not provided (state is read-only)
        if "current_state" not in validated_data:
            initial_state = workflow.definition.get("initial_state")
            if initial_state:
                validated_data["current_state"] = initial_state
            elif workflow.definition.get("states"):
                # Fallback to first state if defined
                # states might be list of dicts or dict (spec flexible)
                states = workflow.definition.get("states")
                if isinstance(states, list) and len(states) > 0:
                    validated_data["current_state"] = states[0]["name"]

        instance = WorkflowInstance(**validated_data)
        try:
            instance.full_clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict or str(e)) from None
        instance.save()
        return instance

    def update(self, instance: WorkflowInstance, validated_data: dict) -> WorkflowInstance:
        """Update WorkflowInstance (fields like context, current_state)."""
        # Never update workflow_snapshot (immutable after creation)
        validated_data.pop("workflow", None)
        validated_data.pop("workflow_snapshot", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        try:
            instance.full_clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict or str(e)) from None
        instance.save()
        return instance

    def get_content_type_name(self, obj: WorkflowInstance) -> str | None:
        """Get the content type name (e.g., 'match', 'video')."""
        if obj.content_type:
            return obj.content_type.model
        return None

    def get_available_actions(self, obj: WorkflowInstance) -> list:
        """
        Get list of available action names from current state.

        Returns action names that have from_state == current_state.
        """
        transitions = obj.workflow_snapshot.get("transitions", [])
        available = [
            t.get("action")
            for t in transitions
            if isinstance(t, dict) and t.get("from_state") == obj.current_state
        ]
        return sorted(set(a for a in available if a))  # Deduplicate and sort
