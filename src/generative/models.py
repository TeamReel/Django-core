"""Database models for B34 Generative Pipelines.

This module defines the core entities for AI content generation:
- GenerationTemplate: Reusable content generation blueprints with versioning
- GenerationRequest: Job lifecycle tracking with retry and cost management
- GenerationOutput: Result storage with file/text content and retention

Architecture follows Constitution Principle II (Single responsibility per model)
and Principle VI (Compound indexes for query optimization).
"""

from __future__ import annotations

import re
from datetime import timedelta
from decimal import Decimal
from typing import Any

import jsonschema
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

User = get_user_model()


# ==============================================================================
# Constants and Choices
# ==============================================================================


class ProviderChoices(models.TextChoices):
    """Supported AI provider identifiers."""

    OPENAI = "openai", "OpenAI"
    LANGGRAPH = "langgraph", "LangGraph"
    GEMINI = "gemini", "Google Gemini"
    GEMINI_IMAGE = "gemini_image", "Google Gemini (Image)"


class RequestStatus(models.TextChoices):
    """Generation request lifecycle statuses."""

    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class ErrorCategory(models.TextChoices):
    """Error classification for retry logic."""

    TRANSIENT = "transient", "Transient"  # Retry eligible
    PERMANENT = "permanent", "Permanent"  # No retry
    UNKNOWN = "unknown", "Unknown"  # Conservative retry


class OutputType(models.TextChoices):
    """Generated content types."""

    IMAGE = "image", "Image"
    VIDEO = "video", "Video"
    TEXT = "text", "Text"
    JSON = "json", "JSON"


class TemplateType(models.TextChoices):
    """Template context types - determines where template is available."""

    MEMBER = "member", "Member"
    SEASON = "season", "Season"
    PRE_MATCH = "pre_match", "Pre-Match"
    DURING_MATCH = "during_match", "During Match"
    POST_MATCH = "post_match", "Post-Match"
    CUSTOM = "custom", "Custom"


class TemplateSubtype(models.TextChoices):
    """Template subtypes - specific content formats within each type."""

    # Member subtypes
    PROFILE_PHOTO = "profile_photo", "Profile Photo"
    LEGACY_PHOTO = "legacy_photo", "Legacy Photo"
    IN_TENUE = "in_tenue", "In Tenue"
    CLOSEUP = "closeup", "Close-up"
    SHORT_INTRO = "short_intro", "Short Intro"
    CELEBRATION = "celebration", "Celebration"
    LEGACY_IN_TENUE = "legacy_in_tenue", "Legacy in Tenue"

    # Season subtypes
    TRANSFORMATION = "transformation", "Then vs Now"
    SEASON_RECAP = "season_recap", "Season Recap"

    # Pre-Match subtypes
    FLYER = "flyer", "Match Flyer"
    LINEUP = "lineup", "Lineup Video"
    LINEUP_FLYER = "lineup_flyer", "Lineup Flyer"
    WALKON = "walkon", "Walk-on Video"
    ANTHEM = "anthem", "Anthem Video"

    # During-Match subtypes
    GOAL = "goal", "Goal Celebration"
    SCORE_UPDATE = "score_update", "Score Update"

    # Post-Match subtypes
    END_SCORE = "end_score", "Final Score"
    MATCH_SUMMARY = "match_summary", "Match Summary"
    HIGHLIGHTS = "highlights", "Highlights Reel"

    # Custom subtypes
    CUSTOM_LOGO = "custom_logo", "Logo"
    CUSTOM_TENUE = "custom_tenue", "Tenue"
    CUSTOM_TENUE_LOGO = "custom_tenue_logo", "Tenue + Logo"
    CUSTOM_TENUE_LOGO_SPONSOR = "custom_tenue_logo_sponsor", "Tenue + Logo + Sponsor"


# Semantic version regex: 1.0.0, 2.1.3, etc.
SEMVER_REGEX = re.compile(r"^\d+\.\d+\.\d+$")


# ==============================================================================
# GenerationTemplate Model
# ==============================================================================


class GenerationTemplate(models.Model):
    """Reusable content generation template with versioning.

    Templates define input requirements (JSON Schema), pipeline configuration,
    and output retention policy. Versioning is implemented via parent_template
    FK for immutable version chains.

    Attributes:
        organisation: Ownership scope (tenant), NULL for global/default templates
        name: Human-readable template name
        slug: URL-safe identifier (unique per org)
        version: Semantic version string (e.g., "1.0.0")
        parent_template: Link to previous version (immutable chain)
        is_latest: Flag for current active version
        input_schema: JSON Schema for input validation
        pipeline_config: Provider config (provider, model, estimated_cost, etc.)
        prompt_text: Actual prompt template with {placeholder} variables
        parameters_schema: Parameter definitions (label, type, options, default)
        preprocessing_config: Preprocessing pipeline config per input type
        retention_days: Days until output deletion (NULL=forever)
    """

    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="generation_templates",
        help_text="Organisation that owns this template (NULL = global/default template)",
    )

    name = models.CharField(
        max_length=200,
        help_text="Human-readable template name",
    )

    slug = models.SlugField(
        max_length=100,
        help_text="URL-safe identifier (unique per org)",
    )

    version = models.CharField(
        max_length=20,
        default="1.0.0",
        help_text="Semantic version (e.g., 1.0.0)",
    )

    parent_template = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="child_versions",
        help_text="Previous version (for version chain)",
    )

    is_latest = models.BooleanField(
        default=True,
        help_text="Current active version flag",
    )

    description = models.TextField(
        blank=True,
        help_text="Template purpose and usage notes",
    )

    template_type = models.CharField(
        max_length=20,
        choices=TemplateType.choices,
        default=TemplateType.CUSTOM,
        db_index=True,
        help_text="Context where template is available (member, season, match phase)",
    )

    template_subtype = models.CharField(
        max_length=30,
        choices=TemplateSubtype.choices,
        blank=True,
        db_index=True,
        help_text="Specific content format within the type",
    )

    input_schema = models.JSONField(
        help_text="JSON Schema (Draft 7) for input validation",
    )

    pipeline_config = models.JSONField(
        help_text="Pipeline config: provider, model, estimated_cost, graph_id, etc.",
    )

    retention_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Days until output deletion (NULL=forever)",
    )

    prompt_text = models.TextField(
        blank=True,
        default="",
        help_text="Actual prompt template with {placeholder} variables",
    )

    parameters_schema = models.JSONField(
        default=dict,
        blank=True,
        help_text="Parameter definitions: {key: {label, type, options, default}}",
    )

    preprocessing_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Preprocessing pipeline config per input type",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Soft delete flag",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_generation_templates",
        help_text="User who created this template",
    )

    class Meta:
        db_table = "generative_template"
        unique_together = [("organisation", "slug", "version")]
        indexes = [
            models.Index(
                fields=["organisation", "is_active", "is_latest"],
                name="generative_tpl_org_active_idx",
            ),
            models.Index(
                fields=["slug", "version"],
                name="generative_tpl_slug_ver_idx",
            ),
            models.Index(
                fields=["created_at"],
                name="generative_tpl_created_idx",
            ),
        ]
        ordering = ["-created_at"]
        verbose_name = "Generation Template"
        verbose_name_plural = "Generation Templates"

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"

    def clean(self) -> None:
        """Validate JSON Schema format and pipeline config."""
        errors: dict[str, list[str]] = {}

        # Validate semantic version format
        if self.version and not SEMVER_REGEX.match(self.version):
            errors["version"] = [
                f"Invalid version format: '{self.version}'. Use semantic versioning (e.g., 1.0.0)"
            ]

        # Validate input_schema is valid JSON Schema Draft 7
        if self.input_schema:
            try:
                jsonschema.Draft7Validator.check_schema(self.input_schema)
            except jsonschema.SchemaError as e:
                errors["input_schema"] = [f"Invalid JSON Schema: {e.message}"]

        # Validate pipeline_config has required keys per provider
        if self.pipeline_config:
            provider = self.pipeline_config.get("provider")
            if provider not in [c.value for c in ProviderChoices]:
                valid = ", ".join([c.value for c in ProviderChoices])
                errors["pipeline_config"] = [
                    f"Invalid provider: '{provider}'. Must be one of: {valid}"
                ]
            elif provider == ProviderChoices.OPENAI and "model" not in self.pipeline_config:
                errors["pipeline_config"] = ["OpenAI provider requires 'model' in pipeline_config"]
            elif provider == ProviderChoices.LANGGRAPH and "graph_id" not in self.pipeline_config:
                errors["pipeline_config"] = [
                    "LangGraph provider requires 'graph_id' in pipeline_config"
                ]

        # Validate retention_days is positive if set
        if self.retention_days is not None and self.retention_days <= 0:
            errors["retention_days"] = ["retention_days must be positive"]

        # Validate parameters_schema structure
        if self.parameters_schema:
            for key, param_def in self.parameters_schema.items():
                if not isinstance(param_def, dict):
                    errors.setdefault("parameters_schema", []).append(
                        f"Parameter '{key}' must be a dict"
                    )
                elif "label" not in param_def or "type" not in param_def:
                    errors.setdefault("parameters_schema", []).append(
                        f"Parameter '{key}' must have 'label' and 'type'"
                    )

        # Warn-level: check prompt_text placeholders match parameters_schema keys
        # (logged but not blocking — some placeholders like {kit_analysis} are runtime-injected)

        if errors:
            raise ValidationError(errors)

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Run validation before save."""
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def provider(self) -> str | None:
        """Get the provider from pipeline_config."""
        return self.pipeline_config.get("provider") if self.pipeline_config else None

    @property
    def estimated_cost(self) -> Decimal:
        """Get estimated cost from pipeline_config."""
        if self.pipeline_config and "estimated_cost" in self.pipeline_config:
            return Decimal(str(self.pipeline_config["estimated_cost"]))
        return Decimal("0")


# ==============================================================================
# GenerationRequest Model
# ==============================================================================


class GenerationRequest(models.Model):
    """Job submission with lifecycle tracking.

    Tracks individual generation requests from submission through completion
    or failure, including retry attempts and cost accounting.

    Attributes:
        template: The template version used (immutable reference)
        template_version: Denormalized version for quick access
        requester: User who submitted the request
        project: Optional project context for scoping
        status: Lifecycle status (pending/processing/completed/failed/cancelled)
        input_data: User-provided inputs (validated against template schema)
        retry_count: Number of retry attempts
        error_category: Classification for retry logic
        estimated_cost: Reserved credits amount
        actual_cost: Final API cost (settled on completion)
        transaction_id: B11 credit transaction reference
    """

    template = models.ForeignKey(
        GenerationTemplate,
        on_delete=models.PROTECT,  # Prevent deletion of templates with requests
        related_name="requests",
        help_text="Template version used for generation",
    )

    template_version = models.CharField(
        max_length=20,
        editable=False,
        help_text="Denormalized template version for quick access",
    )

    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="generation_requests",
        help_text="User who submitted this request",
    )

    project = models.ForeignKey(
        "projects.Project",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="generation_requests",
        help_text="Optional project context for scoping",
    )

    status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING,
        db_index=True,
        help_text="Current lifecycle status",
    )

    input_data = models.JSONField(
        help_text="User-provided inputs (validated against template.input_schema)",
    )

    retry_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of retry attempts",
    )

    error_category = models.CharField(
        max_length=20,
        choices=ErrorCategory.choices,
        null=True,
        blank=True,
        help_text="Error classification for retry logic",
    )

    error_message = models.TextField(
        blank=True,
        default="",
        help_text="Detailed error description",
    )

    estimated_cost = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("0"),
        help_text="Reserved credits amount",
    )

    actual_cost = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Final API cost (settled on completion)",
    )

    # B11 Credit Transaction reference (not a FK to avoid circular dependency)
    transaction_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="B11 credit transaction reference",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Retry history, provider details, token usage, etc.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When processing started",
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When processing completed (success or failure)",
    )

    class Meta:
        db_table = "generative_request"
        indexes = [
            models.Index(
                fields=["requester", "status"],
                name="gen_req_user_status_idx",
            ),
            models.Index(
                fields=["project", "created_at"],
                name="gen_req_proj_created_idx",
            ),
            models.Index(
                fields=["template", "status"],
                name="gen_req_tpl_status_idx",
            ),
            models.Index(
                fields=["status", "created_at"],
                name="gen_req_status_created_idx",
            ),
        ]
        ordering = ["-created_at"]
        verbose_name = "Generation Request"
        verbose_name_plural = "Generation Requests"

    def __str__(self) -> str:
        return f"Request {self.id} - {self.status}"

    def clean(self) -> None:
        """Validate input_data against template schema."""
        errors: dict[str, list[str]] = {}

        # Validate input_data against template.input_schema
        if self.template_id and self.input_data:
            try:
                jsonschema.validate(
                    instance=self.input_data,
                    schema=self.template.input_schema,
                )
            except jsonschema.ValidationError as e:
                errors["input_data"] = [f"Input validation failed: {e.message}"]

        if errors:
            raise ValidationError(errors)

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Denormalize template version on create and validate."""
        # Denormalize template version on first save
        if not self.template_version and self.template_id:
            self.template_version = self.template.version

        # Don't run full_clean on every save to allow status transitions
        # Validation is done explicitly by serializers
        super().save(*args, **kwargs)

    def start_processing(self) -> None:
        """Transition to processing status."""
        if self.status != RequestStatus.PENDING:
            raise ValidationError(f"Cannot start processing from status '{self.status}'")
        self.status = RequestStatus.PROCESSING
        self.started_at = timezone.now()
        self.save(update_fields=["status", "started_at"])

    def mark_completed(self, actual_cost: Decimal) -> None:
        """Transition to completed status."""
        if self.status != RequestStatus.PROCESSING:
            raise ValidationError(f"Cannot complete from status '{self.status}'")
        self.status = RequestStatus.COMPLETED
        self.actual_cost = actual_cost
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "actual_cost", "completed_at"])

    def mark_failed(
        self,
        error_message: str,
        error_category: str = ErrorCategory.UNKNOWN,
    ) -> None:
        """Transition to failed status."""
        if self.status not in [RequestStatus.PENDING, RequestStatus.PROCESSING]:
            raise ValidationError(f"Cannot fail from status '{self.status}'")
        self.status = RequestStatus.FAILED
        self.error_message = error_message
        self.error_category = error_category
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "error_message", "error_category", "completed_at"])

    def mark_cancelled(self) -> None:
        """Transition to cancelled status."""
        if self.status not in [RequestStatus.PENDING, RequestStatus.PROCESSING]:
            raise ValidationError(f"Cannot cancel from status '{self.status}'")
        self.status = RequestStatus.CANCELLED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])

    def increment_retry(self) -> None:
        """Increment retry count and log attempt in metadata."""
        self.retry_count += 1

        # Add retry history to metadata
        if "retry_history" not in self.metadata:
            self.metadata["retry_history"] = []

        self.metadata["retry_history"].append(
            {
                "attempt": self.retry_count,
                "timestamp": timezone.now().isoformat(),
                "error_category": self.error_category,
                "error_message": self.error_message[:200] if self.error_message else None,
            }
        )

        # Reset status for retry
        self.status = RequestStatus.PENDING
        self.error_message = ""
        self.error_category = None

        self.save(
            update_fields=["retry_count", "metadata", "status", "error_message", "error_category"]
        )


# ==============================================================================
# GenerationOutput Model
# ==============================================================================


class GenerationOutput(models.Model):
    """Generated content result with file/text storage and retention.

    Stores the output of a completed generation request, either as a file
    reference (B35 integration) or inline text content.

    Attributes:
        request: Parent generation request (OneToOne)
        output_type: Content type (image/video/text/json)
        file_id: B35 FileStorageRecord reference (for media outputs)
        text_content: Inline text/JSON content
        metadata: Provider-specific data (token usage, resolution, etc.)
        expires_at: Computed expiration from template.retention_days
    """

    request = models.OneToOneField(
        GenerationRequest,
        on_delete=models.CASCADE,
        related_name="output",
        primary_key=True,
        help_text="Parent generation request",
    )

    output_type = models.CharField(
        max_length=20,
        choices=OutputType.choices,
        help_text="Type of generated content",
    )

    # B22 FileAsset UUID reference (not a FK to avoid circular dependency)
    file_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="B22 FileAsset UUID reference (for media outputs)",
    )

    text_content = models.TextField(
        blank=True,
        default="",
        help_text="Inline text/JSON content",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Provider-specific metadata (token usage, resolution, etc.)",
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Computed: created_at + template.retention_days",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "generative_output"
        indexes = [
            models.Index(
                fields=["expires_at"],
                name="generative_out_expires_idx",
            ),
        ]
        verbose_name = "Generation Output"
        verbose_name_plural = "Generation Outputs"

    def __str__(self) -> str:
        return f"Output for Request {self.request_id}"

    def clean(self) -> None:
        """Validate that either file_id or text_content exists."""
        errors: dict[str, list[str]] = {}

        # Ensure either file_id OR text_content exists
        if not self.file_id and not self.text_content:
            errors["__all__"] = ["Output must have either file_id or text_content"]

        # Validate output_type matches content
        if self.output_type in [OutputType.IMAGE, OutputType.VIDEO]:
            if not self.file_id:
                errors["file_id"] = [f"output_type '{self.output_type}' requires file_id"]
        elif self.output_type in [OutputType.TEXT, OutputType.JSON]:
            if not self.text_content:
                errors["text_content"] = [f"output_type '{self.output_type}' requires text_content"]

        if errors:
            raise ValidationError(errors)

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Compute expires_at from template retention_days."""
        # Compute expires_at if not already set
        if not self.expires_at and self.request_id:
            retention_days = self.request.template.retention_days
            if retention_days:
                # Use current time if created_at not yet set
                base_time = self.created_at if self.created_at else timezone.now()
                self.expires_at = base_time + timedelta(days=retention_days)

        # Validate before save
        self.full_clean()
        super().save(*args, **kwargs)


# ==============================================================================
# GenerationJob — Lightweight AI job tracker for the Workflow Queue UI
# ==============================================================================


class GenerationJob(models.Model):
    """Tracks every AI generation job dispatched via generate_asset_view.

    This model is the single source of truth for the "AI Queue" tab in the
    Approvals / Workflow page. It mirrors the Redis cache job status so that:
      - Jobs survive Redis eviction (30-min TTL)
      - Jobs can be listed/filtered across users and projects
      - Frontend can poll a proper REST endpoint instead of task-id polling
      - Status-change notifications can be derived from polling diffs

    Lifecycle:  queued → waiting → processing → completed | failed | cancelled
    """

    class Status(models.TextChoices):
        QUEUED = "queued", "In wachtrij"
        WAITING = "waiting", "Wachten"
        PROCESSING = "processing", "Wordt verwerkt"
        RETRYING = "retrying", "Opnieuw proberen"
        COMPLETED = "completed", "Voltooid"
        FAILED = "failed", "Mislukt"
        CANCELLED = "cancelled", "Geannuleerd"

    class ApprovalStatus(models.TextChoices):
        PENDING_REVIEW = "pending_review", "Te beoordelen"
        APPROVED = "approved", "Goedgekeurd"
        REJECTED = "rejected", "Afgewezen"

    # Unique identifier that matches the Redis cache task_id
    task_id = models.UUIDField(unique=True, db_index=True, help_text="Matches Redis cache task key")

    # Template / content context
    template_id = models.CharField(
        max_length=100, db_index=True, help_text="e.g. fullbody_in_tenue"
    )
    label = models.CharField(max_length=255, blank=True, help_text="Human-readable job description")
    output_type = models.CharField(max_length=20, default="image", help_text="image | video")
    output_asset_type = models.CharField(
        max_length=100, blank=True, help_text="e.g. kit, closeup, intro"
    )

    # Scoping
    project_id = models.CharField(
        max_length=100, null=True, blank=True, db_index=True, help_text="Project slug or UUID"
    )
    membership_id = models.CharField(
        max_length=100, null=True, blank=True, db_index=True, help_text="ProjectMembership UUID"
    )
    created_by_id = models.IntegerField(
        null=True, blank=True, db_index=True, help_text="User.id who triggered the job"
    )

    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )
    progress = models.PositiveSmallIntegerField(default=0, help_text="0-100 percentage")
    error_message = models.TextField(blank=True, default="")

    # Review / approval
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        null=True,
        blank=True,
        db_index=True,
        help_text="Set to pending_review when completed; approved/rejected after human review",
    )
    reviewed_by_id = models.IntegerField(
        null=True, blank=True, help_text="User.id who reviewed this job"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Persisted output URL (first variant) for review UI after Redis TTL expires
    output_url = models.TextField(
        blank=True,
        default="",
        help_text="URL of the primary generated output (image/video), persisted for review UI",
    )

    # All output variants — list of dicts with storage_path, file_asset_id, mime_type, etc.
    # Storage paths are permanent; presigned URLs are re-generated on each request.
    output_variants = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "All generated output variants. Each entry: "
            "{variant_index, storage_path, file_asset_id, mime_type, filename, approved}"
        ),
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "generative_job"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_by_id", "status"], name="gen_job_user_status_idx"),
            models.Index(fields=["project_id", "created_at"], name="gen_job_proj_created_idx"),
            models.Index(fields=["status", "created_at"], name="gen_job_status_created_idx"),
        ]
        verbose_name = "Generation Job"
        verbose_name_plural = "Generation Jobs"

    def __str__(self) -> str:
        return f"Job {self.task_id} [{self.status}] — {self.label or self.template_id}"

    @property
    def is_active(self) -> bool:
        return self.status in (self.Status.QUEUED, self.Status.WAITING, self.Status.PROCESSING)

    def mark_processing(self, progress: int = 10) -> None:
        """Transition to processing."""
        self.status = self.Status.PROCESSING
        self.progress = progress
        self.save(update_fields=["status", "progress", "updated_at"])

    def mark_completed(self, output_url: str = "", output_variants: list | None = None) -> None:
        """Transition to completed, ready for human review."""
        self.status = self.Status.COMPLETED
        self.progress = 100
        self.completed_at = timezone.now()
        self.approval_status = self.ApprovalStatus.PENDING_REVIEW
        if output_url:
            self.output_url = output_url
        if output_variants is not None:
            self.output_variants = output_variants
        self.save(
            update_fields=[
                "status",
                "progress",
                "completed_at",
                "approval_status",
                "output_url",
                "output_variants",
                "updated_at",
            ]
        )

    def mark_failed(self, error: str = "") -> None:
        """Transition to failed."""
        self.status = self.Status.FAILED
        self.error_message = error[:2000]
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "error_message", "completed_at", "updated_at"])

    def mark_stale(self, reason: str = "Stale job detected — worker likely restarted") -> None:
        """Mark a stuck job as failed due to staleness.

        Called by the periodic ``recover_stale_generation_jobs`` task or the
        ``reset_stuck_jobs`` management command when a job has been in an
        active state (queued/waiting/processing) for longer than the
        configured threshold.
        """
        self.status = self.Status.FAILED
        self.error_message = reason[:2000]
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
