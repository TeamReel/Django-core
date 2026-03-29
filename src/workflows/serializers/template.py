"""Serializers for WorkflowTemplate model."""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from src.workflows.models import WorkflowTemplate


class WorkflowTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for WorkflowTemplate model.

    Validates:
    - Definition has exactly 1 initial state
    - All transition references are valid
    - JSON structure is well-formed
    """

    class Meta:
        model = WorkflowTemplate
        fields = [
            "id",
            "name",
            "description",
            "version",
            "definition",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value: str) -> str:
        """Validate name is unique and non-empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty")

        # Check uniqueness (except on update)
        if self.instance is None:  # Create
            if WorkflowTemplate.all_objects.filter(name=value).exists():
                raise serializers.ValidationError("Template with this name already exists")
        else:  # Update
            if (
                WorkflowTemplate.all_objects.filter(name=value)
                .exclude(pk=self.instance.pk)
                .exists()
            ):
                raise serializers.ValidationError("Template with this name already exists")

        return value

    def validate_version(self, value: str) -> str:
        """Validate version format (semantic versioning)."""
        if not value or not value.strip():
            raise serializers.ValidationError("Version cannot be empty")

        # Basic semantic version check: X.Y.Z
        parts = value.split(".")
        if len(parts) != 3:
            raise serializers.ValidationError(
                "Version must be in semantic versioning format (e.g., 1.0.0)"
            )

        try:
            for part in parts:
                int(part)
        except ValueError:
            raise serializers.ValidationError("Version parts must be integers (e.g., 1.0.0)") from None

        return value

    def validate_definition(self, value: dict) -> dict:
        """Validate workflow definition structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Definition must be a JSON object")

        # Check required keys
        if "states" not in value:
            raise serializers.ValidationError("Definition must have 'states' key")
        if "transitions" not in value:
            raise serializers.ValidationError("Definition must have 'transitions' key")

        states = value.get("states", [])
        transitions = value.get("transitions", [])

        # Validate states
        if not isinstance(states, list) or len(states) == 0:
            raise serializers.ValidationError("Definition must have at least 1 state")

        state_names = set()
        initial_count = 0

        for i, state in enumerate(states):
            if not isinstance(state, dict):
                raise serializers.ValidationError(f"State {i} must be a JSON object")

            if "name" not in state:
                raise serializers.ValidationError(f"State {i} must have 'name' field")

            state_name = state.get("name")
            if not isinstance(state_name, str) or not state_name.strip():
                raise serializers.ValidationError(f"State {i} name must be a non-empty string")

            if state_name in state_names:
                raise serializers.ValidationError(f"Duplicate state name: '{state_name}'")

            state_names.add(state_name)

            # Check initial state marker
            if state.get("is_initial", False):
                initial_count += 1

        # Validate exactly 1 initial state
        if initial_count != 1:
            raise serializers.ValidationError(
                f"Definition must have exactly 1 initial state, found {initial_count}"
            )

        # Validate transitions
        if not isinstance(transitions, list):
            raise serializers.ValidationError("Definition 'transitions' must be a list")

        for i, transition in enumerate(transitions):
            if not isinstance(transition, dict):
                raise serializers.ValidationError(f"Transition {i} must be a JSON object")

            if "from_state" not in transition:
                raise serializers.ValidationError(f"Transition {i} must have 'from_state'")
            if "to_state" not in transition:
                raise serializers.ValidationError(f"Transition {i} must have 'to_state'")
            if "action" not in transition:
                raise serializers.ValidationError(f"Transition {i} must have 'action'")

            from_state = transition.get("from_state")
            to_state = transition.get("to_state")
            action = transition.get("action")

            if from_state not in state_names:
                raise serializers.ValidationError(
                    f"Transition {i}: from_state '{from_state}' not in defined states"
                )
            if to_state not in state_names:
                raise serializers.ValidationError(
                    f"Transition {i}: to_state '{to_state}' not in defined states"
                )
            if not isinstance(action, str) or not action.strip():
                raise serializers.ValidationError(
                    f"Transition {i}: action must be a non-empty string"
                )

        return value

    def create(self, validated_data: dict) -> WorkflowTemplate:
        """Create a new WorkflowTemplate with validation."""
        instance = WorkflowTemplate(**validated_data)
        try:
            instance.full_clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict or str(e)) from None
        instance.save()
        return instance

    def update(self, instance: WorkflowTemplate, validated_data: dict) -> WorkflowTemplate:
        """Update WorkflowTemplate with validation."""
        for field, value in validated_data.items():
            setattr(instance, field, value)

        try:
            instance.full_clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict or str(e)) from None
        instance.save()
        return instance
