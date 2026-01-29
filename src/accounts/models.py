"""Database models for accounts module."""

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model with email-as-username authentication."""

    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(max_length=254, unique=True, db_index=True)
    password = models.CharField(max_length=128)  # Inherited but explicit
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=False)  # False until email verified
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    two_factor_enabled = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # No additional fields beyond email/password

    class Meta:
        db_table = "accounts_user"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["email_verified"]),
        ]

    def get_full_name(self) -> str:
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        """Return the user's short name."""
        return self.first_name if self.first_name else self.email

    @property
    def username(self) -> str:
        """Backwards-compatible username-like identifier.

        The core User model is email-as-username and does not persist a separate
        `username` field. Some legacy code/tests still reference `user.username`.
        """
        if not self.email:
            return ""
        return self.email.split("@", 1)[0]

    @property
    def is_superadmin(self) -> bool:
        """Check if user is a superadmin (platform administrator)."""
        return self.is_superuser

    @property
    def is_admin(self) -> bool:
        """Check if user is an admin (tenant administrator)."""
        return self.groups.filter(name="admin").exists()

    @property
    def is_regular_user(self) -> bool:
        """Check if user is a regular user (basic access only, not admin/superadmin)."""
        return (
            self.groups.filter(name="user").exists()
            and not self.is_admin
            and not self.is_superadmin
        )

    def __str__(self) -> str:
        """Return string representation of user."""
        return self.email


class UserActiveContext(models.Model):
    """Persist a user's active TeamReel navigation context.

    This is the user's explicit "currently active" federation/club/team/season/
    competition/match used to seed navigation defaults.
    """

    id = models.BigAutoField(primary_key=True)

    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="active_context",
    )

    organisation = models.ForeignKey(
        "organisations.Organisation",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    club = models.ForeignKey(
        "projects.Project",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    team = models.ForeignKey(
        "projects.Project",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    season = models.ForeignKey(
        "activities.Period",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    competition = models.ForeignKey(
        "activities.Period",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    match = models.ForeignKey(
        "activities.Activity",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    membership = models.ForeignKey(
        "projects.ProjectMembership",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_user_active_context"
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["organisation"]),
            models.Index(fields=["club"]),
            models.Index(fields=["team"]),
            models.Index(fields=["membership"]),
        ]

    def __str__(self) -> str:
        return f"ActiveContext(user={self.user_id})"
