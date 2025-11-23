"""Custom managers for accounts models."""
from django.contrib.auth.models import BaseUserManager
from typing import Optional


class UserManager(BaseUserManager):
    """Custom manager for User model with email-as-username."""

    def create_user(self, email: str, password: Optional[str] = None, **extra_fields):
        """Create and save a regular user with email and password."""
        if not email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: Optional[str] = None, **extra_fields):
        """Create and save a superuser with email and password."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("email_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")

        return self.create_user(email, password, **extra_fields)
