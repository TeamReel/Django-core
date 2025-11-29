"""Django models for Settings & Feature Flags system."""

import uuid

from django.conf import settings as django_settings
from django.db import models


class ScopeType(models.TextChoices):
    """Scope levels for settings and feature flags."""

    GLOBAL = "GLOBAL", "Global"
    ORGANISATION = "ORGANISATION", "Organisation"
    PROJECT = "PROJECT", "Project"
    USER = "USER", "User"


class SettingType(models.TextChoices):
    """Data types for setting values."""

    STRING = "STRING", "String"
    INTEGER = "INTEGER", "Integer"
    BOOLEAN = "BOOLEAN", "Boolean"
    JSON = "JSON", "JSON"


class FeatureFlag(models.Model):
    """Feature flag model with scope support."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=255, db_index=True)
    enabled = models.BooleanField(default=False)  # Deny-by-default
    description = models.TextField(blank=True)
    scope_type = models.CharField(max_length=20, choices=ScopeType.choices)
    user = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="feature_flags",
        help_text="User for USER-scoped flags (null for other scopes)",
    )
    organisation = models.ForeignKey(
        "organisations.Organisation",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="feature_flags",
    )
    project = models.ForeignKey(
        "projects.Project",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="feature_flags",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        db_table = "settings_feature_flag"
        verbose_name = "Feature Flag"
        verbose_name_plural = "Feature Flags"
        ordering = ["key"]
        constraints = [
            models.UniqueConstraint(
                fields=["key", "scope_type", "user", "organisation", "project"],
                name="unique_flag_scope_with_user",
            ),
        ]
        indexes = [
            models.Index(fields=["key", "scope_type", "user"], name="idx_flag_user_key"),
            models.Index(fields=["user", "key"], name="idx_flag_user_lookup"),
        ]

    def __str__(self):
        return f"{self.key} ({self.scope_type})"


class Setting(models.Model):
    """Configuration setting model with typed values."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=255, db_index=True)
    value = models.JSONField(default=dict)
    value_type = models.CharField(max_length=20, choices=SettingType.choices)
    default_value = models.JSONField()
    description = models.TextField(blank=True)
    scope_type = models.CharField(max_length=20, choices=ScopeType.choices)
    user = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="settings",
        help_text="User for USER-scoped settings (null for other scopes)",
    )
    organisation = models.ForeignKey(
        "organisations.Organisation",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    project = models.ForeignKey(
        "projects.Project",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        db_table = "settings_setting"
        verbose_name = "Setting"
        verbose_name_plural = "Settings"
        ordering = ["key"]
        constraints = [
            models.UniqueConstraint(
                fields=["key", "scope_type", "user", "organisation", "project"],
                name="unique_setting_scope_with_user",
            ),
        ]
        indexes = [
            models.Index(fields=["key", "scope_type", "user"], name="idx_setting_user_key"),
            models.Index(fields=["user", "key"], name="idx_setting_user_lookup"),
        ]

    def __str__(self):
        return f"{self.key} ({self.scope_type})"
