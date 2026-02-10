"""Transition history model."""
from django.conf import settings
from django.db import models


class TransitionHistory(models.Model):
    """Immutable audit trail of state transitions."""

    instance: models.ForeignKey = models.ForeignKey(
        "workflows.WorkflowInstance",
        on_delete=models.CASCADE,
        related_name="history",
    )
    from_state: models.CharField = models.CharField(max_length=100, db_index=True)
    to_state: models.CharField = models.CharField(max_length=100, db_index=True)
    action: models.CharField = models.CharField(max_length=100, db_index=True)
    actor: models.ForeignKey = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="transitions",
    )
    comment: models.TextField = models.TextField(blank=True)
    task_id: models.UUIDField = models.UUIDField(
        null=True, blank=True, db_index=True, help_text="Celery task ID for async hooks"
    )
    context_snapshot: models.JSONField = models.JSONField(
        default=dict, help_text="Copy of instance.context at transition time"
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "transition_history"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["instance", "-created_at"]),
            models.Index(fields=["from_state", "to_state"]),
            models.Index(fields=["-created_at"]),  # For partitioning
        ]

    def __str__(self) -> str:
        """String representation."""
        return f"{self.from_state} → {self.to_state} ({self.action})"

    def __repr__(self) -> str:
        """Developer representation."""
        return f"<TransitionHistory: {self.from_state}→{self.to_state} instance={self.instance_id}>"

    def save(self, *args, **kwargs):
        """Enforce immutability after creation."""
        if self.pk is not None:
            raise ValueError("TransitionHistory records cannot be modified after creation")
        super().save(*args, **kwargs)
