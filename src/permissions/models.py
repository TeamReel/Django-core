"""Database models for hierarchical access control system"""

import logging
import re
import uuid
from typing import TYPE_CHECKING

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

# Audit system integration (graceful degradation if not installed)
try:
    from audit.api import audit_log

    AUDIT_AVAILABLE = True
except ImportError:
    AUDIT_AVAILABLE = False

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from django.db.models.manager import RelatedManager


class ScopeChoices(models.TextChoices):
    """Scope levels for role assignments"""

    GLOBAL = "global", _("Global")
    ORGANIZATION = "organization", _("Organization")
    PROJECT = "project", _("Project")


class Permission(models.Model):
    """
    Represents a specific capability on a resource type.

    Permission strings follow format: {resource_type}.{action}
    Examples: projects.create, projects.delete, org.invite_users
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text=_("Unique identifier for this permission"),
    )

    permission = models.CharField(
        max_length=100,
        unique=True,
        help_text=_("Permission string (format: resource.action, e.g., 'projects.delete')"),
    )

    resource_type = models.CharField(
        max_length=50, help_text=_("Resource category (e.g., 'project', 'organisation', 'account')")
    )

    description = models.TextField(
        blank=True, help_text=_("Human-readable explanation of what this permission allows")
    )

    is_sensitive = models.BooleanField(
        default=False,
        help_text=_("Whether this permission triggers audit logging (e.g., delete, invite)"),
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "permissions_permission"
        indexes = [
            models.Index(fields=["permission"], name="perm_string_idx"),
            models.Index(fields=["resource_type"], name="perm_resource_idx"),
            models.Index(fields=["is_sensitive"], name="perm_sensitive_idx"),
        ]
        verbose_name = _("Permission")
        verbose_name_plural = _("Permissions")
        ordering = ["resource_type", "permission"]

    def __str__(self) -> str:
        return self.permission

    def clean(self) -> None:
        """Validate permission string format: {resource}.{action}"""
        super().clean()
        if not re.match(r"^[a-z_]+\.[a-z_]+$", self.permission):
            raise ValidationError(
                {
                    "permission": _(
                        "Permission must match format 'resource.action' "
                        "(lowercase letters and underscores only)"
                    )
                }
            )

    if TYPE_CHECKING:
        roles: "RelatedManager[Role]"


class Role(models.Model):
    """
    Represents a named collection of permissions assignable at different scope levels.

    Examples:
    - Global Admin (scope=global): Full system access
    - Organization Admin (scope=organization): Full access to specific organization
    - Project Member (scope=project): Contributor access to specific project
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text=_("Unique identifier for this role"),
    )

    name = models.CharField(
        max_length=100, help_text=_("Display name for this role (e.g., 'Organization Admin')")
    )

    description = models.TextField(
        blank=True, help_text=_("Human-readable explanation of role purpose and permissions")
    )

    scope = models.CharField(
        max_length=20,
        choices=ScopeChoices.choices,
        help_text=_("Scope level where this role can be assigned"),
    )

    permissions = models.ManyToManyField(
        Permission,
        related_name="roles",
        blank=True,
        help_text=_("Permissions granted by this role"),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Custom manager
    objects = models.Manager()  # Default manager

    class Meta:
        db_table = "permissions_role"
        unique_together = [("name", "scope")]
        indexes = [
            models.Index(fields=["name", "scope"], name="role_name_scope_idx"),
            models.Index(fields=["scope"], name="role_scope_idx"),
        ]
        verbose_name = _("Role")
        verbose_name_plural = _("Roles")
        ordering = ["scope", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_scope_display()})"

    if TYPE_CHECKING:
        permissions: "RelatedManager[Permission]"
        assignments: "RelatedManager[RoleAssignment]"


class RoleAssignment(models.Model):
    """
    Links users to roles at specific scope levels.

    Scope determines which target fields are required:
    - global: No target fields (user has role system-wide)
    - organization: target_organization required, target_project must be NULL
    - project: target_project required, target_organization derived from project.organisation

    Unique constraint enforces one role per user per scope level.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text=_("Unique identifier for this role assignment"),
    )

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="role_assignments",
        help_text=_("User receiving this role"),
    )

    role = models.ForeignKey(
        Role,
        on_delete=models.RESTRICT,
        related_name="assignments",
        help_text=_("Role being assigned to user"),
    )

    scope = models.CharField(
        max_length=20,
        choices=ScopeChoices.choices,
        help_text=_("Scope level of this assignment (global/organization/project)"),
    )

    target_organization = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="role_assignments",
        help_text=_("Target organization (required if scope=organization)"),
    )

    target_project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="role_assignments",
        help_text=_("Target project (required if scope=project)"),
    )

    assigned_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="role_assignments_made",
        help_text=_("User who created this assignment (audit trail)"),
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True, help_text=_("When this assignment was created")
    )

    # Custom manager
    objects = models.Manager()  # Default manager

    class Meta:
        db_table = "permissions_roleassignment"
        unique_together = [("user", "scope", "target_organization", "target_project")]
        indexes = [
            models.Index(fields=["user"], name="roleassign_user_idx"),
            models.Index(fields=["scope", "target_organization"], name="roleassign_scope_org_idx"),
            models.Index(fields=["scope", "target_project"], name="roleassign_scope_proj_idx"),
            models.Index(fields=["assigned_at"], name="roleassign_date_idx"),
        ]
        verbose_name = _("Role Assignment")
        verbose_name_plural = _("Role Assignments")
        ordering = ["-assigned_at"]

    def __str__(self) -> str:
        if self.scope == ScopeChoices.GLOBAL:
            return f"{self.user} -> {self.role} (Global)"
        elif self.scope == ScopeChoices.ORGANIZATION:
            return f"{self.user} -> {self.role} @ {self.target_organization}"
        else:  # PROJECT
            return f"{self.user} -> {self.role} @ {self.target_project}"

    def save(self, *args, **kwargs):
        """
        Save role assignment and log audit event.

        Logs role.assigned event only for new assignments (not updates).
        """
        # For UUIDField primary keys, check _state.adding instead of pk
        is_new = self._state.adding

        # Save to database
        super().save(*args, **kwargs)

        # Log audit event for new assignments only
        if is_new and AUDIT_AVAILABLE:
            try:
                audit_log.record(
                    "role.assigned",
                    user=self.assigned_by if self.assigned_by else None,
                    organization=self.target_organization,
                    project=self.target_project,
                    metadata={
                        "role_name": self.role.name,
                        "role_id": str(self.role.id),
                        "target_user_id": str(self.user.id),
                        "target_user_email": self.user.email,
                        "scope": self.scope,
                    },
                )
            except Exception as e:
                # Graceful degradation: audit failure doesn't break role assignment
                logger.warning("Failed to log role assignment to audit system: %s", e)

    def delete(self, *args, **kwargs):
        """
        Delete role assignment and log audit event.

        Accepts optional revoked_by kwarg to track who performed the revocation.
        Accepts optional reason kwarg to document why the role was revoked.
        """
        # Capture data before deletion
        role_name = self.role.name
        role_id = str(self.role.id)
        user_id = str(self.user.id)
        user_email = self.user.email
        organization = self.target_organization
        project = self.target_project
        revoked_by = kwargs.pop("revoked_by", None)  # Custom kwarg for context
        reason = kwargs.pop("reason", "Not specified")  # Custom kwarg for reason

        # Delete from database
        super().delete(*args, **kwargs)

        # Log audit event
        if AUDIT_AVAILABLE:
            try:
                audit_log.record(
                    "role.revoked",
                    user=revoked_by,
                    organization=organization,
                    project=project,
                    metadata={
                        "role_name": role_name,
                        "role_id": role_id,
                        "target_user_id": user_id,
                        "target_user_email": user_email,
                        "reason": reason,
                    },
                )
            except Exception as e:
                # Graceful degradation
                logger.warning("Failed to log role revocation to audit system: %s", e)

    def clean(self) -> None:
        """Validate scope and target consistency"""
        super().clean()

        # Check role.scope matches assignment scope
        if self.role_id and self.role.scope != self.scope:
            raise ValidationError(
                {
                    "role": _(
                        f"Role scope ({self.role.scope}) must match assignment scope ({self.scope})"
                    )
                }
            )

        # Validate target fields based on scope
        if self.scope == ScopeChoices.GLOBAL:
            if self.target_organization or self.target_project:
                raise ValidationError(
                    {
                        "scope": _(
                            "Global scope assignments must not have "
                            "target_organization or target_project"
                        )
                    }
                )
        elif self.scope == ScopeChoices.ORGANIZATION:
            if not self.target_organization:
                raise ValidationError(
                    {"target_organization": _("Organization scope requires target_organization")}
                )
            if self.target_project:
                raise ValidationError(
                    {"target_project": _("Organization scope must not have target_project")}
                )
        elif self.scope == ScopeChoices.PROJECT:
            if not self.target_project:
                raise ValidationError(
                    {"target_project": _("Project scope requires target_project")}
                )


# Wire up custom managers
# Import at end to avoid circular dependency
from .managers import RoleAssignmentManager, RoleManager  # noqa: E402

Role.objects = RoleManager()
Role.objects.model = Role

RoleAssignment.objects = RoleAssignmentManager()
RoleAssignment.objects.model = RoleAssignment
