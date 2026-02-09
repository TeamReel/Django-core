"""Project permission override model."""
from django.core.exceptions import ValidationError
from django.db import models


class ProjectPermissionOverride(models.Model):
    """Customize transition permissions per project."""

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="workflow_permissions",
    )
    workflow = models.ForeignKey(
        "workflows.WorkflowTemplate",
        on_delete=models.CASCADE,
        related_name="permission_overrides",
    )
    action_name = models.CharField(max_length=100, db_index=True)
    required_roles = models.JSONField(
        default=list,
        help_text="Array of membership role names (e.g., ['admin', 'coach'])",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "project_permission_overrides"
        unique_together = [["project", "workflow", "action_name"]]
        indexes = [
            models.Index(fields=["project", "workflow"]),
        ]

    def __str__(self) -> str:
        """String representation."""
        return (
            f"{self.workflow.name}.{self.action_name} in {self.project.name}: "
            f"{self.required_roles}"
        )

    def __repr__(self) -> str:
        """Developer representation."""
        return (
            f"<ProjectPermissionOverride: workflow={self.workflow_id}, "
            f"action={self.action_name}>"
        )

    def clean(self):
        """Validate action exists in workflow and roles are valid."""
        # Validate action exists
        transition = self.workflow.get_transition(self.action_name)
        if not transition:
            raise ValidationError(f"Action '{self.action_name}' not found in workflow")

        # Validate roles
        if not isinstance(self.required_roles, list):
            raise ValidationError("required_roles must be an array")
