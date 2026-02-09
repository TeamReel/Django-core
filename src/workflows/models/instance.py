"""Workflow instance model."""
import json

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models


class WorkflowInstance(models.Model):
    """Tracks object progress through workflow states."""

    workflow = models.ForeignKey(
        "workflows.WorkflowTemplate",
        on_delete=models.PROTECT,
        related_name="instances",
    )
    workflow_snapshot = models.JSONField(
        help_text="Immutable copy of workflow definition at creation"
    )
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="workflow_instances"
    )

    # Generic foreign key to any content object
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    current_state = models.CharField(max_length=100, db_index=True)
    context = models.JSONField(default=dict, help_text="Arbitrary workflow data (max 64KB)")
    version = models.IntegerField(default=0, help_text="Optimistic locking")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_workflows",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workflow_instances"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "current_state"]),
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["workflow", "-created_at"]),
        ]

    def __str__(self) -> str:
        """String representation."""
        return f"Workflow {self.workflow.name} for {self.content_object} ({self.current_state})"

    def __repr__(self) -> str:
        """Developer representation."""
        return f"<WorkflowInstance: workflow={self.workflow_id}, state={self.current_state}>"

    def clean(self):
        """Validate context size and state consistency."""
        self._validate_context_size()
        self._validate_current_state()

    def _validate_context_size(self):
        """Ensure context JSON is ≤ 64KB."""
        context_bytes = len(json.dumps(self.context).encode("utf-8"))
        if context_bytes > 65536:  # 64KB
            raise ValidationError(f"Context size {context_bytes} bytes exceeds 64KB limit")

    def _validate_current_state(self):
        """Ensure current_state exists in workflow_snapshot."""
        states = self.workflow_snapshot.get("states", [])
        state_names = {s["name"] for s in states}
        if self.current_state not in state_names:
            raise ValidationError(
                f"Current state '{self.current_state}' not in workflow definition"
            )
