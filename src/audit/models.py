"""
Audit event models.

Provides immutable audit trail for system-wide activity tracking.
"""

from django.conf import settings
from django.db import models


class AuditEvent(models.Model):
    """
    Immutable audit event record for system-wide activity tracking.

    Each event captures WHO did WHAT, WHEN, and WHERE (organizational context).
    Metadata contains event-specific details as JSON.
    """

    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    event_type = models.CharField(max_length=100, db_index=True)

    # Context: WHO
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
        db_index=True,
    )

    # Context: WHERE (organizational hierarchy)
    organization = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
        db_index=True,
    )

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
        db_index=True,
    )

    # Event-specific details (max 10KB, validated in API)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "audit_events"
        ordering = ["-created_at"]
        verbose_name = "Audit Event"
        verbose_name_plural = "Audit Events"
        indexes = [
            models.Index(fields=["-created_at"], name="audit_created_desc"),
            models.Index(fields=["event_type"], name="audit_event_type"),
            models.Index(fields=["user"], name="audit_user"),
            models.Index(fields=["organization"], name="audit_org"),
            models.Index(fields=["project"], name="audit_project"),
        ]

    def __str__(self) -> str:
        user_display = self.user.email if self.user else "anonymous"
        return f"{self.event_type} by {user_display} at {self.created_at}"
