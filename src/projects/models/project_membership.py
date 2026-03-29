"""Project Membership Model."""

import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from src.common.managers import AllObjectsManager, SoftDeleteManager
from src.common.mixins import SoftDeleteMixin


class ProjectMembershipManager(SoftDeleteManager):
    """Manager for ProjectMembership.

    Inherits from SoftDeleteManager: default queryset excludes deleted items.
    """

    def active(self):
        """Return only active memberships (alias — manager already filters)."""
        return self.all()


class ProjectMembership(SoftDeleteMixin, models.Model):
    """
    Explicit membership of a user in a project.

    Overrides organisation-level permissions.
    """

    class Role(models.TextChoices):
        VIEWER = "viewer", _("Viewer")
        EDITOR = "editor", _("Editor")
        ADMIN = "admin", _("Admin")

    class AssignmentReason(models.TextChoices):
        MANUAL = "manual", _("Manually Added")
        INVITATION = "invitation", _("Accepted Invitation")
        PROMOTION = "promotion", _("Promoted")
        ORG_DEFAULT = "org_default", _("Organisation Default")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="memberships",
        help_text="Project this membership belongs to",
    )

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="project_memberships",
        help_text="User who holds this membership",
    )

    # TeamReel: Link membership to specific period/season
    period = models.ForeignKey(
        "activities.Period",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="project_memberships",
        help_text="Optional period/season scope (e.g., player in 2024/2025 season)",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
        help_text="Access level for this user in this project",
    )

    assignment_reason = models.CharField(
        max_length=20,
        choices=AssignmentReason.choices,
        default=AssignmentReason.MANUAL,
        help_text="How this membership was created",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional membership data (position, shirt_number, etc.)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProjectMembershipManager()
    all_objects = AllObjectsManager()

    class Meta:
        app_label = "projects"
        db_table = "projects_membership"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "user", "period"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_project_membership_per_period",
                nulls_distinct=False,
            )
        ]
        indexes = [
            models.Index(fields=["project", "deleted_at"]),
            models.Index(fields=["user", "deleted_at"]),
            models.Index(fields=["project", "role", "deleted_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} in {self.project} ({self.role})"

    def clean(self):
        """Validate membership constraints."""
        super().clean()

        # Check for last admin protection during demotion or soft-deletion
        if self.pk:
            try:
                original = ProjectMembership.objects.get(pk=self.pk)
                is_demotion = original.role == self.Role.ADMIN and self.role != self.Role.ADMIN
                is_deletion = original.deleted_at is None and self.deleted_at is not None

                if is_demotion or is_deletion:
                    # Check if there are other active admins
                    other_admins = (
                        ProjectMembership.objects.active()
                        .filter(project=self.project, role=self.Role.ADMIN)
                        .exclude(pk=self.pk)
                        .exists()
                    )

                    if not other_admins:
                        # We strictly prevent leaving the project without an explicit admin
                        # unless it's being handled by a service that assigns a new one.
                        # But model validation should be strict.
                        from django.core.exceptions import ValidationError

                        raise ValidationError(_("Cannot remove or demote the last project admin."))
            except ProjectMembership.DoesNotExist:
                pass
