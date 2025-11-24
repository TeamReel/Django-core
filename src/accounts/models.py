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
    def is_superadmin(self) -> bool:
        """Check if user is a superadmin (platform administrator)."""
        return self.is_superuser

    @property
    def is_admin(self) -> bool:
        """Check if user is an admin (tenant administrator)."""
        return self.groups.filter(name="admin").exists()

    @property
    def is_regular_user(self) -> bool:
        """Check if user is a regular user (basic access)."""
        return (
            self.groups.filter(name="user").exists()
            and not self.is_admin
            and not self.is_superadmin
        )

    def __str__(self) -> str:
        """Return string representation of user."""
        return self.email
