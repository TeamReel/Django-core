"""
Models for B32 Sport Configuration & Templates.

This module provides sport-specific configuration for team sizes, player positions,
outfit variants, and template validation rules. Supports multi-sport platforms.

Hierarchy:
- SportCategory (Organisation level): "Football", "Handball", "Basketball"
- Sport (Team level): "Football 11v11", "Futsal 5v5", "Football 7v7"

Example:
    KNVB (Organisation)
    └── sport_category: Football ⚽
        └── Ajax (Club)
            ├── Ajax 1 → sport: Football 11v11
            ├── Ajax Futsal → sport: Futsal 5v5
            └── Ajax U10 → sport: Football 7v7
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models


class Sport(models.Model):
    """
    Sport definition with optional parent for hierarchical structure.

    Two-level hierarchy:
    - Category (parent_sport=NULL): "Football", "Handball", "Basketball"
    - Variant (parent_sport=Category): "Football 11v11", "Futsal 5v5", "Football 7v7"

    Categories are assigned at Organisation level.
    Variants are assigned at Team level.
    """

    name = models.CharField(
        max_length=100,
        help_text="Human-readable sport name (e.g., 'Football' or 'Football 11v11')",
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text="URL-safe identifier (e.g., 'football' or 'football-11v11')",
    )
    parent_sport = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="variants",
        help_text="Parent sport category. NULL = this is a category, SET = this is a variant",
    )
    federation_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Federation info, e.g., {'code': 'KNVB', 'country': 'NL'}",
    )
    sport_icon = models.CharField(
        max_length=100,
        blank=True,
        help_text="Icon identifier or emoji, e.g., '⚽' or 'football'",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this sport is available for selection",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "sport_configuration"
        db_table = "sport_configuration_sport"
        ordering = ["name"]
        verbose_name = "Sport"
        verbose_name_plural = "Sports"
        indexes = [
            models.Index(fields=["parent_sport"], name="idx_sport_parent"),
        ]

    def __str__(self) -> str:
        """Return human-readable string representation."""
        return self.name

    @property
    def is_category(self) -> bool:
        """Return True if this is a sport category (no parent)."""
        return self.parent_sport is None

    @property
    def is_variant(self) -> bool:
        """Return True if this is a sport variant (has parent)."""
        return self.parent_sport is not None

    @property
    def category(self) -> "Sport":
        """Return the category (self if category, parent if variant)."""
        return self.parent_sport if self.parent_sport else self

    def get_all_variants(self) -> models.QuerySet["Sport"]:
        """Return all variants if this is a category, empty if variant."""
        if self.is_category:
            return self.variants.filter(is_active=True)
        return Sport.objects.none()


class SportConfiguration(models.Model):
    """
    Configuration rules for a specific sport variant.

    Defines team composition rules, player positions, formations, and outfit types.
    Has a 1:1 relationship with Sport (typically only variants have configurations).

    Categories may have a default configuration that variants can override.
    """

    sport = models.OneToOneField(
        Sport,
        on_delete=models.CASCADE,
        related_name="configuration",
        help_text="Sport (variant) this configuration applies to",
    )
    team_size_min = models.PositiveIntegerField(
        default=1,
        help_text="Minimum players in starting lineup",
    )
    team_size_max = models.PositiveIntegerField(
        default=11,
        help_text="Maximum players in starting lineup",
    )
    max_substitutes = models.PositiveIntegerField(
        default=7,
        help_text="Maximum substitute players",
    )
    positions = models.JSONField(
        default=list,
        help_text="Standard positions, e.g., ['GK', 'LB', 'CB', 'RB', 'CM', 'ST']",
    )
    formations = models.JSONField(
        default=dict,
        help_text="Formation templates, e.g., {'4-3-3': {'positions': [...], 'name': '4-3-3'}}",
    )
    outfit_types = models.JSONField(
        default=list,
        help_text="Required outfit types, e.g., ['home', 'away', 'goalkeeper', 'trainer']",
    )
    has_goalkeeper = models.BooleanField(
        default=True,
        help_text="Whether this sport has a designated goalkeeper",
    )
    # Variant-specific rules
    pitch_type = models.CharField(
        max_length=50,
        default="outdoor_large",
        help_text="Pitch type: outdoor_large, outdoor_small, indoor, court",
    )
    has_corner_kicks = models.BooleanField(
        default=True,
        help_text="Whether this variant has corner kicks (False for futsal)",
    )
    has_offside = models.BooleanField(
        default=True,
        help_text="Whether offside rule applies (False for some variants)",
    )
    match_duration_minutes = models.PositiveIntegerField(
        default=90,
        help_text="Standard match duration in minutes",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional sport-specific rules",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "sport_configuration"
        db_table = "sport_configuration_sportconfiguration"
        verbose_name = "Sport Configuration"
        verbose_name_plural = "Sport Configurations"

    def __str__(self) -> str:
        """Return human-readable string representation."""
        return f"Config: {self.sport.name}"

    def clean(self) -> None:
        """Validate model constraints."""
        super().clean()
        if self.team_size_min > self.team_size_max:
            raise ValidationError(
                {
                    "team_size_min": "Minimum team size cannot exceed maximum team size.",
                    "team_size_max": "Maximum team size cannot be less than minimum team size.",
                }
            )


class OutfitConfiguration(models.Model):
    """
    Outfit configuration for a project (club or team).

    Defines colors, sponsor placement, number fonts, and badge positioning.
    Can be defined at Club level with Team-level overrides.
    """

    class OutfitType(models.TextChoices):
        """Predefined outfit types for team sports."""

        HOME = "home", "Home"
        AWAY = "away", "Away"
        GOALKEEPER = "goalkeeper", "Goalkeeper"
        TRAINER = "trainer", "Trainer"
        THIRD_KIT = "third_kit", "Third Kit"

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="outfit_configurations",
        help_text="Project (club or team) this outfit belongs to",
    )
    outfit_type = models.CharField(
        max_length=20,
        choices=OutfitType.choices,
        help_text="Type of outfit (home, away, goalkeeper, etc.)",
    )
    colors = models.JSONField(
        default=dict,
        help_text="Color scheme: {'primary': '#FF0000', 'secondary': '#FFFFFF'}",
    )
    sponsor_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Sponsor positioning: {'chest': 'Sponsor A', 'sleeve': 'Sponsor B'}",
    )
    number_font = models.JSONField(
        default=dict,
        blank=True,
        help_text="Number styling: {'family': 'Arial', 'color': '#FFFFFF', 'outline': '#000000'}",
    )
    badge_position = models.CharField(
        max_length=20,
        default="left_chest",
        help_text="Badge placement: left_chest, center_chest, etc.",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional outfit metadata",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this outfit configuration is active",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "sport_configuration"
        db_table = "sport_configuration_outfitconfiguration"
        unique_together = ["project", "outfit_type"]
        ordering = ["project", "outfit_type"]
        verbose_name = "Outfit Configuration"
        verbose_name_plural = "Outfit Configurations"

    def __str__(self) -> str:
        """Return human-readable string representation."""
        return f"{self.project} - {self.get_outfit_type_display()}"
