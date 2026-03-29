"""Project Invitation Model."""

import secrets
import uuid

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .project_membership import ProjectMembership


class ProjectInvite(models.Model):
    """
    Invitation for an external user to join a project.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        ACCEPTED = "accepted", _("Accepted")
        CANCELLED = "cancelled", _("Cancelled")
        EXPIRED = "expired", _("Expired")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="invitations",
        help_text="Project the user is invited to",
    )

    email = models.EmailField(help_text="Email address of the invited user")

    role = models.CharField(
        max_length=20,
        choices=ProjectMembership.Role.choices,
        default=ProjectMembership.Role.VIEWER,
        help_text="Role to be assigned upon acceptance",
    )

    token = models.CharField(
        max_length=64,
        unique=True,
        editable=False,
        help_text="Secure token for invitation acceptance",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        help_text="Current status of the invitation",
    )

    invited_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_project_invitations",
        help_text="User who sent the invitation",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="Timestamp when invitation expires")
    accepted_at = models.DateTimeField(
        null=True, blank=True, help_text="Timestamp when invitation was accepted"
    )

    class Meta:
        app_label = "projects"
        db_table = "projects_invite"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "status"]),
            models.Index(fields=["token"]),
            models.Index(fields=["project", "status"]),
        ]

    def __str__(self) -> str:
        return f"Invite for {self.email} to {self.project} ({self.status})"

    def clean(self):
        """Validate invitation constraints."""
        super().clean()

        # Check if email is already a member
        from django.contrib.auth import get_user_model
        from django.core.exceptions import ValidationError

        User = get_user_model()
        try:
            user = User.objects.get(email=self.email)
            if ProjectMembership.objects.active().filter(project=self.project, user=user).exists():
                raise ValidationError(_("User with this email is already a member of the project."))
        except User.DoesNotExist:
            pass

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = self.generate_token()
        if not self.expires_at:
            # Default 7 days expiry
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)

    @staticmethod
    def generate_token() -> str:
        """Generate a secure URL-safe token."""
        return secrets.token_urlsafe(32)

    def is_expired(self) -> bool:
        """Check if invitation has expired."""
        return timezone.now() > self.expires_at

    def send_invitation_email(self):
        """Trigger Celery task to send invitation email."""
        from django.conf import settings
        from django.core.mail import send_mail
        from django.template.loader import render_to_string

        # Build accept URL
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        accept_url = f"{frontend_url}/accept-invitation/{self.token}"

        # Calculate expiry days
        time_until_expiry = self.expires_at - timezone.now()
        expiry_days = time_until_expiry.days

        # Prepare context
        context = {
            "project_name": self.project.name,
            "role": self.get_role_display(),
            "invited_by_name": self.invited_by.get_full_name() or self.invited_by.email,
            "accept_url": accept_url,
            "expires_at": self.expires_at,
            "expiry_days": expiry_days,
            "site_name": getattr(settings, "SITE_NAME", "Django Core-App"),
        }

        # Render templates
        html_message = render_to_string("projects/email/project_invitation.html", context)
        plain_message = render_to_string("projects/email/project_invitation.txt", context)

        # Send email
        send_mail(
            subject=f"You've been invited to {self.project.name}",
            message=plain_message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
            recipient_list=[self.email],
            html_message=html_message,
            fail_silently=False,
        )
