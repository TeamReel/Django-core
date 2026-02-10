"""VideoJob model for video processing requests."""

import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class JobType(models.TextChoices):
    """Video job type choices."""

    TRANSCODE = "transcode", _("Transcode")
    THUMBNAIL = "thumbnail", _("Thumbnail")
    COMPOSE = "compose", _("Compose")


class JobStatus(models.TextChoices):
    """Video job status choices."""

    QUEUED = "queued", _("Queued")
    PROCESSING = "processing", _("Processing")
    COMPLETED = "completed", _("Completed")
    FAILED = "failed", _("Failed")
    CANCELLED = "cancelled", _("Cancelled")


class VideoJob(models.Model):
    """Video processing job.

    Represents a video processing request (transcode, thumbnail, or compose)
    with status tracking, progress updates, and result storage.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="video_jobs",
        help_text=_("Project this job belongs to"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="video_jobs",
        help_text=_("User who created this job"),
    )
    job_type = models.CharField(
        max_length=20,
        choices=JobType.choices,
        help_text=_("Type of video processing job"),
    )
    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.QUEUED,
        help_text=_("Current job status"),
        db_index=True,
    )
    progress_percent = models.IntegerField(
        default=0,
        help_text=_("Processing progress (0-100)"),
    )
    source_file = models.ForeignKey(
        "files.FileAsset",
        on_delete=models.PROTECT,
        related_name="video_jobs_as_source",
        help_text=_("Input video file"),
    )
    output_file = models.ForeignKey(
        "files.FileAsset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="video_jobs_as_output",
        help_text=_("Output video file"),
    )
    preset = models.ForeignKey(
        "VideoPreset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
        help_text=_("Encoding preset to use"),
    )
    platform_export = models.ForeignKey(
        "PlatformExport",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
        help_text=_("Platform-specific export configuration"),
    )
    workflow_instance = models.ForeignKey(
        "workflows.workflowinstance",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="video_jobs",
        help_text=_("Approval workflow instance"),
    )
    config = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Job-specific configuration as JSON"),
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Output metadata (duration, resolution, etc.)"),
    )
    error_message = models.TextField(
        blank=True,
        help_text=_("Error details if job failed"),
    )
    error_code = models.CharField(
        max_length=50,
        blank=True,
        help_text=_("Error code for categorization"),
    )
    retry_count = models.IntegerField(
        default=0,
        help_text=_("Number of retry attempts"),
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When processing started"),
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When processing completed"),
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "video_jobs"
        ordering = ["-created_at"]
        verbose_name = _("Video Job")
        verbose_name_plural = _("Video Jobs")
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["created_by", "created_at"]),
            models.Index(fields=["job_type", "status"]),
        ]

    def __str__(self) -> str:
        """String representation of the job."""
        return f"{self.get_job_type_display()} - {self.status} ({self.id})"

    @property
    def publishable(self) -> bool:
        """Check if video can be published.

        Video can be published if:
        1. Job completed successfully
        2. No workflow OR workflow approved
        """
        if self.status != JobStatus.COMPLETED:
            return False

        if self.workflow_instance:
            # Check if workflow is in approved state
            return (
                hasattr(self.workflow_instance, "current_state")
                and self.workflow_instance.current_state
                and self.workflow_instance.current_state.name == "approved"
            )

        return True
