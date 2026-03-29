"""Project Membership Promotion Model."""

import uuid

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .project_membership import ProjectMembership


class ProjectMembershipPromotion(models.Model):
    """
    Request to promote a member to a higher role (e.g. Editor -> Admin).
    Requires acceptance by the target user.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        ACCEPTED = "accepted", _("Accepted")
        DECLINED = "declined", _("Declined")
        EXPIRED = "expired", _("Expired")
        CANCELLED = "cancelled", _("Cancelled")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="promotions",
        help_text="Project where promotion is requested",
    )

    target_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="project_promotions_received",
        help_text="User being promoted",
    )

    requested_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="project_promotions_initiated",
        help_text="Admin who initiated the promotion",
    )

    from_role = models.CharField(
        max_length=20,
        choices=ProjectMembership.Role.choices,
        help_text="Current role of the user",
    )

    to_role = models.CharField(
        max_length=20,
        choices=ProjectMembership.Role.choices,
        help_text="Proposed new role",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        help_text="Current status of the promotion request",
    )

    is_suspicious = models.BooleanField(
        default=False,
        help_text="Flagged if promotion happens shortly after joining",
    )

    suspicious_reason = models.TextField(
        null=True,
        blank=True,
        help_text="Reason why this promotion was flagged as suspicious",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="Timestamp when request expires")
    resolved_at = models.DateTimeField(
        null=True, blank=True, help_text="Timestamp when request was resolved"
    )

    class Meta:
        app_label = "projects"
        db_table = "projects_promotion"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target_user", "status"]),
            models.Index(fields=["project", "status"]),
        ]

    def __str__(self) -> str:
        return f"Promotion for {self.target_user} to {self.to_role} in {self.project}"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Default 3 days expiry for promotions
            self.expires_at = timezone.now() + timezone.timedelta(days=3)
        super().save(*args, **kwargs)

    def is_expired(self) -> bool:
        """Check if the promotion request has expired."""
        return timezone.now() > self.expires_at

    def check_suspicious(self) -> bool:
        """
        Check if promotion is suspicious (e.g. <24h after joining).
        Returns True if suspicious, and updates self.is_suspicious.
        """
        # Logic to check membership duration
        try:
            membership = ProjectMembership.objects.get(project=self.project, user=self.target_user)
            time_since_join = timezone.now() - membership.created_at
            if time_since_join < timezone.timedelta(hours=24):
                self.is_suspicious = True
                self.suspicious_reason = "Promoted within 24 hours of joining."
                return True
        except ProjectMembership.DoesNotExist:
            pass
        return False

    def accept(self):
        """Accept promotion and update membership."""
        if self.status != self.Status.PENDING:
            return

        self.status = self.Status.ACCEPTED
        self.resolved_at = timezone.now()
        self.save()

        # Update membership
        ProjectMembership.objects.update_or_create(
            project=self.project,
            user=self.target_user,
            defaults={
                "role": self.to_role,
                "assignment_reason": ProjectMembership.AssignmentReason.PROMOTION,
            },
        )
        # Cache invalidation will be handled by signals on ProjectMembership save

    def decline(self):
        """Decline promotion."""
        if self.status != self.Status.PENDING:
            return

        self.status = self.Status.DECLINED
        self.resolved_at = timezone.now()
        self.save()
