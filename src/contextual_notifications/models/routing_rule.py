"""RoutingRule model for contextual notification routing."""

from typing import TYPE_CHECKING

from django.db import models
from django.db.models import CheckConstraint, Index, Q, UniqueConstraint

if TYPE_CHECKING:
    from organisations.models import Organisation
    from projects.models import Project
    from accounts.models import User

from .managers import RoutingRuleManager


class RoutingRule(models.Model):
    """
    Defines which events trigger notifications for which users via which channels.

    Routing rules can be scoped to global, organisation, or project level.
    Rules are evaluated in priority order: project rules override org rules override global rules.
    """

    SCOPE_GLOBAL = "global"
    SCOPE_ORG = "org"
    SCOPE_PROJECT = "project"
    SCOPE_CHOICES = [
        (SCOPE_GLOBAL, "Global"),
        (SCOPE_ORG, "Organisation"),
        (SCOPE_PROJECT, "Project"),
    ]

    CHANNEL_IN_APP = "in_app"
    CHANNEL_EMAIL = "email"
    CHANNEL_PUSH = "push"
    CHANNEL_CHOICES = [
        (CHANNEL_IN_APP, "In-App"),
        (CHANNEL_EMAIL, "Email"),
        (CHANNEL_PUSH, "Push"),
    ]

    PRIORITY_LOW = 0
    PRIORITY_NORMAL = 1
    PRIORITY_HIGH = 2
    PRIORITY_URGENT = 3
    PRIORITY_CHOICES = [
        (PRIORITY_LOW, "Low"),
        (PRIORITY_NORMAL, "Normal"),
        (PRIORITY_HIGH, "High"),
        (PRIORITY_URGENT, "Urgent"),
    ]

    id = models.BigAutoField(primary_key=True)
    event_type = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Event type pattern (e.g., 'project.updated', 'task.assigned')",
    )
    scope = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        help_text="Rule application scope",
    )
    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_index=True,
        related_name="notification_routing_rules",
        help_text="Organisation (NULL for global rules)",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notification_routing_rules",
        help_text="Project (NULL for org/global rules)",
    )
    target_role = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Target role (e.g., 'org_admin', 'project_member')",
    )
    priority = models.IntegerField(
        choices=PRIORITY_CHOICES,
        default=PRIORITY_NORMAL,
        help_text="Event priority for notification",
    )
    channel = models.CharField(
        max_length=20,
        choices=CHANNEL_CHOICES,
        help_text="Delivery channel",
    )
    is_enabled = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this rule is active",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_routing_rules",
        help_text="User who created this rule",
    )

    # Custom manager
    objects = RoutingRuleManager()

    class Meta:
        db_table = "contextual_notifications_routingrule"
        verbose_name = "Routing Rule"
        verbose_name_plural = "Routing Rules"
        ordering = ["-priority", "event_type"]
        
        indexes = [
            Index(fields=["event_type", "organisation"]),
            Index(fields=["event_type", "scope"]),
        ]
        
        constraints = [
            # Scope consistency checks
            CheckConstraint(
                check=(
                    Q(scope="global", organisation__isnull=True, project__isnull=True)
                    | Q(scope="org", organisation__isnull=False, project__isnull=True)
                    | Q(scope="project", organisation__isnull=False, project__isnull=False)
                ),
                name="routing_rule_scope_consistency",
            ),
            # Unique constraint: no duplicate rules
            UniqueConstraint(
                fields=["event_type", "scope", "organisation", "project", "target_role", "channel"],
                name="routing_rule_unique_constraint",
            ),
        ]

    def __str__(self) -> str:
        """Return string representation of routing rule."""
        return f"{self.event_type} ({self.scope}) -> {self.channel}"
