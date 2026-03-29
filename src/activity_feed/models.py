"""
B62: Activity Feed Models

Provides:
- ActivityLog: Immutable event record for the organisation-wide feed.
- FeedPosition: Tracks per-user read position for unread-count calculation.
"""

import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class VerbChoices(models.TextChoices):
    """Registry of known activity verbs."""

    CONTENT_CREATED = "content.created", "Content Created"
    CONTENT_APPROVED = "content.approved", "Content Approved"
    CONTENT_REJECTED = "content.rejected", "Content Rejected"
    MEMBER_ADDED = "member.added", "Member Added"
    MEMBER_CONFIRMED = "member.confirmed", "Member Confirmed"
    MATCH_CREATED = "match.created", "Match Created"
    MATCH_LINEUP_SET = "match.lineup_set", "Lineup Set"
    SEASON_STARTED = "season.started", "Season Started"
    LINEUP_PUBLISHED = "lineup.published", "Lineup Published"


class ActivityLog(models.Model):
    """
    Immutable event record for the organisation-wide activity feed.

    Captures WHO did WHAT to WHICH object, with optional project scope.
    Events are logged via Django signals, the ``@log_activity`` decorator,
    or direct Celery task calls.

    Feed queries use cursor-based pagination ordered by ``created_at DESC``
    with a composite index on ``(organisation, created_at DESC)``.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # WHO — the user who performed the action
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
        help_text="User who triggered the event.",
    )

    # WHAT — the verb describing the action
    verb = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Machine-readable event type, e.g. 'content.created'.",
    )

    # TARGET — the object the action was performed on (GenericFK)
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_log_targets",
    )
    target_object_id = models.CharField(max_length=255, null=True, blank=True)
    target = GenericForeignKey("target_content_type", "target_object_id")

    # CONTEXT — organisational scope
    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="activity_logs",
        help_text="Organisation this event belongs to.",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
        help_text="Optional project scope for filtering.",
    )

    # METADATA — flexible extra context
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Context-specific information, e.g."
            " {'old_status': 'draft', 'new_status': 'approved'}."
        ),
    )

    # TIMESTAMP — immutable creation time
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        app_label = "activity_feed"
        db_table = "activity_feed_activitylog"
        ordering = ["-created_at"]
        verbose_name = "Activity Log"
        verbose_name_plural = "Activity Logs"
        indexes = [
            # Primary feed query: all events for an org, newest first
            models.Index(
                fields=["organisation", "-created_at"],
                name="actfeed_org_created_desc",
            ),
            # Project-scoped feed
            models.Index(
                fields=["organisation", "project", "-created_at"],
                name="actfeed_org_proj_created",
            ),
            # Filter by verb within an org
            models.Index(
                fields=["organisation", "verb", "-created_at"],
                name="actfeed_org_verb_created",
            ),
            # GenericFK lookup
            models.Index(
                fields=["target_content_type", "target_object_id"],
                name="actfeed_target_gfk",
            ),
        ]

    def __str__(self) -> str:
        actor_display = self.actor.email if self.actor else "system"
        return f"[{self.verb}] by {actor_display} at {self.created_at}"


class FeedPosition(models.Model):
    """
    Tracks the last-read position per user per organisation.

    Used to calculate unread event counts efficiently:
    ``ActivityLog.objects.filter(organisation=org, created_at__gt=position.last_read_at).count()``
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_positions",
    )
    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="feed_positions",
    )
    last_read_at = models.DateTimeField(
        help_text="Timestamp of the newest event the user has seen.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "activity_feed"
        db_table = "activity_feed_feedposition"
        verbose_name = "Feed Position"
        verbose_name_plural = "Feed Positions"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organisation"],
                name="unique_feed_position_per_user_org",
            ),
        ]

    def __str__(self) -> str:
        return f"FeedPosition({self.user}, {self.organisation}, {self.last_read_at})"
