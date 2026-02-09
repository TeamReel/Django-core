"""Workflow template model."""
from django.core.exceptions import ValidationError
from django.db import models

from src.workflows.managers import ActiveWorkflowManager, AllWorkflowManager


class WorkflowTemplate(models.Model):
    """Admin-defined workflow with states and transitions."""

    name = models.CharField(max_length=200, unique=True, db_index=True)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=50)
    definition = models.JSONField(help_text="Workflow structure: states, transitions, hooks")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Managers
    objects = ActiveWorkflowManager()  # Default: active only
    all_objects = AllWorkflowManager()  # All including inactive

    class Meta:
        db_table = "workflow_templates"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_active", "-created_at"]),
        ]

    def __str__(self) -> str:
        """String representation."""
        return f"{self.name} v{self.version}"

    def __repr__(self) -> str:
        """Developer representation."""
        return f"<WorkflowTemplate: {self.name} (active={self.is_active})>"

    def clean(self):
        """Validate workflow definition."""
        self._validate_definition()

    def _validate_definition(self):
        """Ensure definition has exactly one initial state and valid transitions."""
        if not isinstance(self.definition, dict):
            raise ValidationError("Definition must be a JSON object")

        states = self.definition.get("states", [])
        transitions = self.definition.get("transitions", [])

        # Check exactly one initial state
        initial_count = sum(1 for s in states if s.get("is_initial", False))
        if initial_count != 1:
            raise ValidationError(f"Must have exactly 1 initial state, found {initial_count}")

        # Validate transition references
        state_names = {s["name"] for s in states}
        for t in transitions:
            if t["from_state"] not in state_names:
                raise ValidationError(f"Transition from_state '{t['from_state']}' not in states")
            if t["to_state"] not in state_names:
                raise ValidationError(f"Transition to_state '{t['to_state']}' not in states")

    def get_initial_state(self) -> str:
        """Return the name of the initial state."""
        states = self.definition.get("states", [])
        for state in states:
            if state.get("is_initial", False):
                return state["name"]
        raise ValueError("No initial state found")

    def get_transition(self, action: str) -> dict | None:
        """Get transition definition by action name."""
        transitions = self.definition.get("transitions", [])
        for t in transitions:
            if t["action"] == action:
                return t
        return None
