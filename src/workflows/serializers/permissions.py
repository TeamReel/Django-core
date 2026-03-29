"""Serializers for ProjectPermissionOverride model."""
from rest_framework import serializers

from src.workflows.models import ProjectPermissionOverride


class ProjectPermissionOverrideSerializer(serializers.ModelSerializer):
    """
    Serializer for ProjectPermissionOverride model.

    Validates:
    - Action exists in workflow transitions
    - Required roles are valid membership roles
    """

    workflow_name = serializers.CharField(source="workflow.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = ProjectPermissionOverride
        fields = [
            "id",
            "project",
            "project_name",
            "workflow",
            "workflow_name",
            "action_name",
            "required_roles",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workflow_name", "project_name", "created_at", "updated_at"]

    def validate_action_name(self, value: str) -> str:
        """Validate action name is non-empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Action name cannot be empty")
        return value

    def validate_required_roles(self, value: list) -> list:
        """Validate required_roles is a list of non-empty strings."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Required roles must be a list")

        if len(value) == 0:
            raise serializers.ValidationError("At least one role must be specified")

        for i, role in enumerate(value):
            if not isinstance(role, str) or not role.strip():
                raise serializers.ValidationError(f"Role {i} must be a non-empty string")

        return [role.strip() for role in value]

    def validate(self, data: dict) -> dict:
        """Validate action exists in workflow and roles are reasonable."""
        workflow = data.get("workflow") or (self.instance.workflow if self.instance else None)
        action_name = data.get("action_name") or (
            self.instance.action_name if self.instance else None
        )

        if workflow and action_name:
            # Check action exists in workflow transitions
            transitions = workflow.definition.get("transitions", [])
            action_names = {
                t.get("action") for t in transitions if isinstance(t, dict) and t.get("action")
            }

            if action_name not in action_names:
                raise serializers.ValidationError(
                    {
                        "action_name": (
                            f"Action '{action_name}' not found in "
                            f"workflow '{workflow.name}'. "
                            f"Available actions: "
                            f"{sorted([a for a in action_names if a is not None])}"
                        )
                    }
                )

        return data
