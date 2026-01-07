"""
Organisation and Membership models.

This module defines:
- Organisation: Core entity representing an organisational unit
- Membership: Many-to-many relationship between users and organisations with roles
"""

import uuid

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from .managers import OrganisationManager

User = get_user_model()


class Organisation(models.Model):
    """
    Represents an independent organisational unit for multi-tenancy.

    Business Rules:
    - Names must be globally unique
    - Slug auto-generated from name
    - Soft-delete via is_active=False
    - 30-day retention before hard delete
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(
        max_length=100,
        unique=True,
        validators=[
            RegexValidator(
                regex=r"^[a-zA-Z0-9\s\-_]+$",
                message="Name can only contain letters, numbers, spaces, hyphens, and underscores.",
            )
        ],
        help_text="Organisation display name (3-100 characters)",
    )

    slug = models.SlugField(max_length=100, unique=True, blank=True)

    description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    creator = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_organisations",
        help_text="User who created this organisation",
    )

    is_active = models.BooleanField(default=True, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # Feature flags
    enable_theme_toggle = models.BooleanField(
        default=True,
        help_text="Allow users in this organisation to toggle between light and dark themes",
    )

    # Master data storage
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Flexible master data storage (e.g., federation, country, league rules)",
    )

    objects = OrganisationManager()

    class Meta:
        app_label = "organisations"
        ordering = ["name"]
        verbose_name = "Organisation"
        verbose_name_plural = "Organisations"

    def __str__(self):
        return self.name

    def delete(self, using=None, keep_parents=False, hard=False):
        """
        Override delete to implement soft-delete by default.

        Soft-delete sets is_active=False and deleted_at=now(), preserving
        the record for audit trail and 30-day retention period.
        Cascades soft-delete to all memberships.

        Args:
            hard: If True, permanently delete from database
        """
        if hard:
            return super().delete(using=using, keep_parents=keep_parents)

        self.is_active = False
        self.deleted_at = timezone.now()

        # Rename to allow reuse of name/slug
        # Append timestamp to ensure uniqueness of deleted records
        timestamp = int(self.deleted_at.timestamp())
        suffix = f"_del_{timestamp}"

        # Truncate to ensure we don't exceed max_length (100)
        # suffix length is approx 15 chars.
        if len(self.name) > 80:
            self.name = self.name[:80]
        self.name = f"{self.name}{suffix}"

        if self.slug:
            if len(self.slug) > 80:
                self.slug = self.slug[:80]
            self.slug = f"{self.slug}{suffix}"

        self.save(update_fields=["is_active", "deleted_at", "name", "slug"])
        # Cascade soft-delete to memberships
        self.memberships.update(is_active=False)

    def hard_delete(self, using=None, keep_parents=False):
        """
        Permanently delete this organisation from the database.

        Use with caution - this cannot be undone. Intended for superadmin
        operations or cleanup of organisations beyond 30-day retention period.
        """
        return super().delete(using=using, keep_parents=keep_parents)

    def save(self, *args, **kwargs):
        """
        Override save to auto-generate slug from name if not provided.

        Handles uniqueness conflicts by appending a counter (-1, -2, etc.)
        to ensure slug is always unique.
        """
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            # Check for existing slugs, excluding current instance if updating
            while Organisation.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def clean(self):
        """
        Validate Organisation model fields and business logic.

        Raises:
            ValidationError: If validation fails
        """
        super().clean()

        # Name must be at least 3 characters
        if len(self.name) < 3:
            raise ValidationError({"name": "Organisation name must be at least 3 characters."})

        # Cannot have deleted_at set if is_active is True
        if self.is_active and self.deleted_at is not None:
            raise ValidationError(
                "Active organisations cannot have deleted_at set. "
                "Set is_active=False to soft-delete this organisation."
            )

    def get_admin_count(self):
        """
        Get count of active admin members for this organisation.

        Returns:
            int: Number of active admin memberships
        """
        return self.memberships.filter(role="admin", is_active=True).count()


class Membership(models.Model):
    """
    Many-to-many relationship between Users and Organisations with role.

    Business Rules:
    - One membership per (user, organisation) pair
    - Roles: admin (full control) or member (read-only)
    - Must have at least one admin per organisation
    """

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("member", "Member"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="organisation_memberships"
    )

    organisation = models.ForeignKey(
        "Organisation",  # String reference for forward declaration
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")

    joined_at = models.DateTimeField(auto_now_add=True, db_index=True)

    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invited_memberships",
    )

    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        app_label = "organisations"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organisation"], name="unique_user_organisation"
            )
        ]
        indexes = [
            models.Index(fields=["organisation", "role"]),
            models.Index(fields=["user", "is_active"]),
        ]
        ordering = ["-joined_at"]
        verbose_name = "Membership"
        verbose_name_plural = "Memberships"

    def __str__(self):
        return f"{self.user.email} - {self.organisation.name} ({self.role})"
