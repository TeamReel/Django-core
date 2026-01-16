"""Project-level functional role assignments.

This is intentionally separate from access roles (RBAC / ProjectMembership.role).

Use cases:
- A single user can have multiple functional roles on the same team (e.g. coach + player).
- Functional roles are team-level domain semantics and should not be sent as access roles.
"""

from __future__ import annotations

import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class ProjectFunctionalRoleAssignment(models.Model):
    """Assign a functional role to a user for a specific project (team)."""

    class FunctionalRole(models.TextChoices):
        COACH = "coach", _("Coach")
        PLAYER = "player", _("Player")
        KEEPER = "keeper", _("Keeper")
        ASSISTANT = "assistant", _("Assistant")
        VERZORGER = "verzorger", _("Verzorger")
        SUPPORTER = "supporter", _("Supporter")
        MANAGER = "manager", _("Manager")

    class AssignmentReason(models.TextChoices):
        MANUAL = "manual", _("Manual")
        IMPORTED = "imported", _("Imported")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="functional_role_assignments",
        help_text="Project/team this functional role applies to",
    )

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="project_functional_roles",
        help_text="User who holds this functional role",
    )

    role = models.CharField(
        max_length=32,
        choices=FunctionalRole.choices,
        help_text="Functional (domain) role on the team",
    )

    assignment_reason = models.CharField(
        max_length=20,
        choices=AssignmentReason.choices,
        default=AssignmentReason.MANUAL,
        help_text="How this assignment was created",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "projects"
        db_table = "projects_functional_role_assignment"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "user", "role"],
                name="unique_project_user_functional_role",
            )
        ]
        indexes = [
            models.Index(fields=["project", "role"], name="proj_funcrole_proj_role_idx"),
            models.Index(fields=["user"], name="proj_funcrole_user_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user} -> {self.project} ({self.role})"
