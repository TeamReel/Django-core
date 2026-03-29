"""
B31 Content Templates & Generation - Data Models

This module defines the core data models for content template management,
content generation tracking, and approval workflow.

Models:
- ContentTemplate: Reusable templates for AI content generation
- ContentItem: Generated content instances with status tracking
- ContentApproval: Approval workflow records

Reference: kitty-specs/040-content-templates-generation/data-model.md
"""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from src.common.managers import AllObjectsManager, SoftDeleteManager
from src.common.mixins import SoftDeleteMixin

User = get_user_model()


# ========== Enums ==========


class TemplateType(models.TextChoices):
    """Content template categories - defines WHEN content is generated"""

    PRE_MATCH = "pre_match", "Pre-Match"
    DURING_MATCH = "during_match", "During Match"
    POST_MATCH = "post_match", "Post-Match"
    SEASON = "season", "Season"
    MEMBER = "member", "Member"
    CUSTOM = "custom", "Custom"


class TemplateSubtype(models.TextChoices):
    """Specific template types within each category - defines WHAT is generated"""

    # Pre-Match templates
    FLYER = "flyer", "Match Flyer"
    LINEUP = "lineup", "Lineup Announcement"
    LINEUP_FLYER = "lineup_flyer", "Lineup Flyer"
    WALKON = "walkon", "Walk-on Video"
    ANTHEM = "anthem", "Anthem Video"
    # During-Match templates
    GOAL = "goal", "Goal Celebration"
    SCORE_UPDATE = "score_update", "Score Update"
    # Post-Match templates
    END_SCORE = "end_score", "Final Score"
    MATCH_SUMMARY = "match_summary", "Match Summary"
    HIGHLIGHTS = "highlights", "Highlights Reel"
    # Season templates
    TRANSFORMATION = "transformation", "Then vs Now"
    SEASON_RECAP = "season_recap", "Season Recap"
    # Member templates (no sport required)
    PROFILE_PHOTO = "profile_photo", "Profile Photo"
    LEGACY_PHOTO = "legacy_photo", "Legacy Photo"
    CLOSEUP = "closeup", "Close-up"
    MEMBER_INTRO = "member_intro", "Short Intro"
    MEMBER_GOAL_CELEBRATION = "member_goal_celebration", "Goal Celebration"
    MEMBER_IN_TENUE = "member_in_tenue", "In Tenue"
    MEMBER_LEGACY_CLOSEUP = "member_legacy_closeup", "Legacy Closeup"
    MEMBER_LEGACY_IN_TENUE = "member_legacy_in_tenue", "Legacy In Tenue"
    MEMBER_ACTION_PHOTO = "member_action_photo", "Action Photo"
    # Custom templates (no sport required)
    CUSTOM_LOGO = "custom_logo", "Logo"
    CUSTOM_TENUE = "custom_tenue", "Tenue"
    CUSTOM_TENUE_LOGO = "custom_tenue_logo", "Tenue + Logo"
    CUSTOM_TENUE_LOGO_SPONSOR = "custom_tenue_logo_sponsor", "Tenue + Logo + Sponsor"


class ContentStatus(models.TextChoices):
    """Content item generation and approval statuses"""

    QUEUED = "queued", "Queued"
    GENERATING = "generating", "Generating"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    REVISION_REQUESTED = "revision_requested", "Revision Requested"


class ApprovalStatus(models.TextChoices):
    """Content approval decision statuses"""

    PENDING = "pending", "Pending Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    REVISION_REQUESTED = "revision_requested", "Revision Requested"


# ========== Custom Managers ==========


class ContentItemManager(SoftDeleteManager):
    """Custom manager for ContentItem with soft-delete support.

    Inherits from SoftDeleteManager: default queryset excludes deleted items.
    """

    def active(self):
        """Exclude soft-deleted items (alias — manager already filters)."""
        return self.all()

    def for_project(self, project_id):
        """Project-scoped active items."""
        return self.filter(project_id=project_id)


# ========== Models ==========


class ContentTemplate(models.Model):
    """Reusable template definition for AI content generation"""

    name = models.CharField(
        max_length=200, help_text="Template display name (e.g., 'Line-up Video')"
    )
    description = models.TextField(
        null=True, blank=True, help_text="Template purpose and usage notes"
    )
    template_type = models.CharField(
        max_length=50,
        choices=TemplateType.choices,
        db_index=True,
        help_text="Template category (when)",
    )
    template_subtype = models.CharField(
        max_length=50,
        choices=TemplateSubtype.choices,
        null=True,
        blank=True,
        db_index=True,
        help_text="Specific template type (what)",
    )
    sport_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        db_index=True,
        help_text="Sport identifier (links to B32, e.g., 'football')",
    )
    ai_workflow_id = models.CharField(
        max_length=200, help_text="External AI system workflow/pipeline identifier"
    )
    template_settings = models.JSONField(
        default=dict, help_text="AI-specific configuration (schema varies by workflow)"
    )
    timeout_minutes = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(1440)],
        help_text="Generation timeout in minutes (NULL uses system default of 30)",
    )
    is_active = models.BooleanField(
        default=True, db_index=True, help_text="Template availability flag"
    )
    credits_required = models.PositiveIntegerField(
        default=1,
        help_text="Number of credits required to generate content with this template",
    )

    # Foreign Keys
    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="content_templates",
        help_text="Owning organization. NULL = global template (superadmin only)",
    )
    project = models.ForeignKey(
        "projects.Project",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="content_templates",
        help_text="Optional project scope (NULL = org-wide)",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="created_templates",
        help_text="Template creator. NULL for system-seeded templates.",
    )
    sport = models.ForeignKey(
        "sport_configuration.Sport",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="content_templates",
        help_text="Filter templates by sport. Null = universal template.",
    )
    formation = models.ForeignKey(
        "sport_configuration.Formation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="content_templates",
        help_text=(
            "Formation this template is designed for"
            " (e.g., 4-3-3). Only for lineup templates."
        ),
    )
    style_variant = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Visual style variant name (e.g., 'Modern', 'Classic', 'Neon')",
    )
    input_requirements = models.JSONField(
        default=dict,
        blank=True,
        help_text="""Input requirements for content generation. Schema:
        {
            "players": {
                "use_formation": true,  // Use positions from linked Formation
                "min_count": 11,
                "max_count": 11,
                "positions": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "ST", "RW"]
            },
            "staff": [
                {"role": "coach", "required": true, "count": 1},
                {"role": "assistant", "required": false, "count": 1}
            ],
            "assets": [
                {"type": "team_logo", "required": true},
                {"type": "opponent_logo", "required": false},
                {"type": "sponsor_logo", "required": false}
            ],
            "match_data": {
                "required": ["date", "opponent", "venue"],
                "optional": ["kickoff_time", "competition"]
            }
        }""",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "content_generation_contenttemplate"
        verbose_name = "Content Template"
        verbose_name_plural = "Content Templates"
        indexes = [
            models.Index(fields=["is_active", "sport_type"], name="idx_template_active_sport"),
            models.Index(fields=["organisation", "is_active"], name="idx_template_org_active"),
            models.Index(fields=["name"], name="idx_template_name"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["organisation", "name"], name="unique_template_name_per_org"
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.template_type})"


class ContentItem(SoftDeleteMixin, models.Model):
    """Generated content instance with status tracking"""

    # Foreign Keys
    template = models.ForeignKey(
        ContentTemplate,
        on_delete=models.PROTECT,
        related_name="contentitem_set",
        help_text="Source template",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="content_items",
        help_text="Project scope",
    )
    activity = models.ForeignKey(
        "activities.Activity",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="content_items",
        help_text="Optional linked activity (match/event via B30)",
    )
    output_file = models.ForeignKey(
        "files.FileAsset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="content_items",
        help_text="Generated file (via B22)",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_content_items",
        help_text="Content creator",
    )

    # Status and Data
    status = models.CharField(
        max_length=30,
        choices=ContentStatus.choices,
        default=ContentStatus.QUEUED,
        db_index=True,
        help_text="Generation status",
    )
    input_data = models.JSONField(default=dict, help_text="User-provided generation inputs")
    error_message = models.TextField(
        null=True, blank=True, help_text="Failure details (populated when status='failed')"
    )
    metadata = models.JSONField(
        default=dict, help_text="Additional tracking data (duration, retries, etc.)"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ContentItemManager()
    all_objects = AllObjectsManager()

    class Meta:
        db_table = "content_generation_contentitem"
        verbose_name = "Content Item"
        verbose_name_plural = "Content Items"
        indexes = [
            models.Index(
                fields=["project", "status", "deleted_at"], name="idx_item_project_status"
            ),
            models.Index(fields=["template", "activity", "status"], name="idx_item_duplicate"),
            models.Index(fields=["status", "created_at"], name="idx_item_status_created"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Content #{self.id} - {self.template.name} ({self.status})"

    def get_organisation(self):
        """Return the organisation this content item belongs to."""
        return self.project.organisation if self.project else None

    def get_trash_metadata(self) -> dict:
        """Return metadata for the TrashItem display."""
        return {
            "object_repr": f"{self.template.name} ({self.status})",
            "original_data": {
                "template_name": self.template.name if self.template else None,
                "status": self.status,
                "project_id": str(self.project_id) if self.project_id else None,
                "activity_id": str(self.activity_id) if self.activity_id else None,
            },
        }

    def clean(self):
        """Validate state transitions and field requirements"""
        super().clean()

        # Validation: output_file required when status='completed'
        if self.status == ContentStatus.COMPLETED and not self.output_file:
            raise ValidationError(
                {"output_file": "Output file is required when status is completed"}
            )

        # Validation: error_message required when status='failed'
        if self.status == ContentStatus.FAILED and not self.error_message:
            raise ValidationError(
                {"error_message": "Error message is required when status is failed"}
            )

    @property
    def is_in_progress(self):
        """Check if generation is currently running"""
        return self.status in [ContentStatus.QUEUED, ContentStatus.GENERATING]


class ContentApproval(models.Model):
    """Review and approval workflow tracking"""

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name="contentapproval_set",
        help_text="Related content item",
    )
    reviewer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="content_approvals",
        help_text="Approving/rejecting user",
    )
    status = models.CharField(
        max_length=30, choices=ApprovalStatus.choices, db_index=True, help_text="Approval decision"
    )
    feedback_text = models.TextField(null=True, blank=True, help_text="Reviewer comments/notes")
    reviewed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "content_generation_contentapproval"
        verbose_name = "Content Approval"
        verbose_name_plural = "Content Approvals"
        indexes = [
            models.Index(fields=["content_item", "reviewed_at"], name="idx_approval_item"),
            models.Index(fields=["status", "reviewed_at"], name="idx_approval_status"),
        ]
        ordering = ["-reviewed_at"]

    def __str__(self):
        return f"Approval for Content #{self.content_item_id} - {self.status}"

    def clean(self):
        """Validate feedback requirements"""
        super().clean()

        # Validation: feedback required for rejected/revision_requested
        if self.status in [ApprovalStatus.REJECTED, ApprovalStatus.REVISION_REQUESTED]:
            if not self.feedback_text or not self.feedback_text.strip():
                raise ValidationError(
                    {"feedback_text": f"Feedback is required for {self.get_status_display()}"}
                )
