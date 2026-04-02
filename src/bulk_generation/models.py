"""
B67: Bulk Content Generation — Data Models

Models for managing bulk content generation jobs that create multiple
content items (videos, flyers, lineups) across activities in a single batch.

Models:
- BulkGenerationJob: Top-level batch job container
- BulkGenerationItem: Individual item within a bulk job

Reference: docs/roadmap/backlog/01-content-pipeline/todo/03-BE-bulk-content-generation/
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from src.common.managers import AllObjectsManager, SoftDeleteManager
from src.common.mixins import SoftDeleteMixin


class JobStatus(models.TextChoices):
    """Status choices for BulkGenerationJob."""

    QUEUED = "queued", "Queued"
    PROCESSING = "processing", "Processing"
    COMPLETED = "completed", "Completed"
    PARTIALLY_COMPLETED = "partially_completed", "Partially Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class ItemStatus(models.TextChoices):
    """Status choices for BulkGenerationItem."""

    PENDING = "pending", "Pending"
    GENERATING = "generating", "Generating"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class BulkContentType(models.TextChoices):
    """Content types supported for bulk generation."""

    LINEUP = "lineup", "Lineup Video"
    LINEUP_FLYER = "lineup_flyer", "Lineup Flyer"
    MATCH_INTRO = "match_intro", "Match Intro"
    GOAL_CELEBRATION = "goal_celebration", "Goal Celebration"
    THEN_VS_NOW = "then_vs_now", "Then vs Now"
    MATCH_FLYER = "match_flyer", "Match Flyer"


class BulkGenerationJob(SoftDeleteMixin, models.Model):
    """
    Top-level container for a bulk content generation batch.

    A bulk job groups multiple individual generation items (one per activity)
    into a single batch that is processed in parallel with org-level
    concurrency limits.

    Org-scoped via project.organisation.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="bulk_generation_jobs",
        help_text="Project (team) this bulk job belongs to",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bulk_generation_jobs",
        help_text="User who initiated the bulk generation",
    )
    status = models.CharField(
        max_length=25,
        choices=JobStatus.choices,
        default=JobStatus.QUEUED,
        db_index=True,
        help_text="Current status of the bulk job",
    )
    content_type = models.CharField(
        max_length=30,
        choices=BulkContentType.choices,
        help_text="Type of content being generated",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional config: template_id, style_variant, etc.",
    )

    # Stats (denormalized for fast reads)
    total_items = models.PositiveIntegerField(
        default=0,
        help_text="Total number of items in this batch",
    )
    completed_items = models.PositiveIntegerField(
        default=0,
        help_text="Number of successfully completed items",
    )
    failed_items = models.PositiveIntegerField(
        default=0,
        help_text="Number of failed items",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(
        null=True, blank=True, help_text="When processing started"
    )
    completed_at = models.DateTimeField(
        null=True, blank=True, help_text="When all items finished"
    )

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "-created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"BulkJob {self.id!s:.8} — {self.content_type} ({self.status})"

    @property
    def organisation(self):
        """Org-scoping via project."""
        return self.project.organisation

    @property
    def progress_percent(self) -> int:
        """Completion percentage (0-100)."""
        if self.total_items == 0:
            return 0
        done = self.completed_items + self.failed_items
        return min(int(done / self.total_items * 100), 100)

    def start_processing(self) -> None:
        """Mark job as processing."""
        self.status = JobStatus.PROCESSING
        self.started_at = timezone.now()
        self.save(update_fields=["status", "started_at", "updated_at"])

    def refresh_stats(self) -> None:
        """Recalculate stats from items and update status accordingly."""
        items = self.items.all()
        self.completed_items = items.filter(status=ItemStatus.COMPLETED).count()
        self.failed_items = items.filter(status=ItemStatus.FAILED).count()

        done = self.completed_items + self.failed_items
        if done >= self.total_items and self.total_items > 0:
            if self.failed_items == 0:
                self.status = JobStatus.COMPLETED
            elif self.completed_items == 0:
                self.status = JobStatus.FAILED
            else:
                self.status = JobStatus.PARTIALLY_COMPLETED
            self.completed_at = timezone.now()

        self.save(
            update_fields=[
                "completed_items",
                "failed_items",
                "status",
                "completed_at",
                "updated_at",
            ]
        )

    def cancel(self) -> None:
        """Cancel the job and all pending items."""
        self.status = JobStatus.CANCELLED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at", "updated_at"])
        self.items.filter(status=ItemStatus.PENDING).update(status=ItemStatus.CANCELLED)


class BulkGenerationItem(models.Model):
    """
    Individual content generation item within a bulk job.

    Each item maps to a single activity (match) and tracks
    the creation and status of its associated VideoJob.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bulk_job = models.ForeignKey(
        BulkGenerationJob,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Parent bulk generation job",
    )
    activity = models.ForeignKey(
        "activities.Activity",
        on_delete=models.CASCADE,
        related_name="bulk_generation_items",
        help_text="Activity (match) this item generates content for",
    )
    video_job = models.ForeignKey(
        "video.VideoJob",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bulk_generation_items",
        help_text="Created VideoJob (once dispatched)",
    )
    status = models.CharField(
        max_length=20,
        choices=ItemStatus.choices,
        default=ItemStatus.PENDING,
        db_index=True,
        help_text="Current status of this item",
    )
    error_message = models.TextField(
        blank=True,
        default="",
        help_text="Error details if generation failed",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Per-item config overrides",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["bulk_job", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["bulk_job", "activity"],
                name="unique_activity_per_bulk_job",
            ),
        ]

    def __str__(self) -> str:
        return f"BulkItem {self.id!s:.8} — {self.status}"

    def mark_generating(self) -> None:
        """Mark item as actively generating."""
        self.status = ItemStatus.GENERATING
        self.started_at = timezone.now()
        self.save(update_fields=["status", "started_at", "updated_at"])

    def mark_completed(self) -> None:
        """Mark item as successfully completed."""
        self.status = ItemStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at", "updated_at"])

    def mark_failed(self, error: str) -> None:
        """Mark item as failed with error message."""
        self.status = ItemStatus.FAILED
        self.error_message = error[:2000]  # Truncate to prevent oversized rows
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
