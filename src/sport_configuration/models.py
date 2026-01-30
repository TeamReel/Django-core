"""
Models for B32 Sport Configuration & Templates.

This module provides sport-specific configuration for team sizes, player positions,
outfit variants, and template validation rules. Supports multi-sport platforms.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models


class Sport(models.Model):
    """
    Platform-wide sport/discipline definition.

    Master data for sport types like Football 11v11, Futsal, Handball, Basketball, etc.
    Each sport has associated configuration rules (team size, positions, formations).
    """

    name = models.CharField(
        max_length=100,
        help_text="Human-readable sport name (e.g., 'Football 11v11')",
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text="URL-safe identifier (e.g., 'football-11')",
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

    def __str__(self) -> str:
        """Return human-readable string representation."""
        return self.name


class SportConfiguration(models.Model):
    """
    Configuration rules for a specific sport.

    Defines team composition rules, player positions, formations, and outfit types.
    Has a 1:1 relationship with Sport.
    """

    sport = models.OneToOneField(
        Sport,
        on_delete=models.CASCADE,
        related_name="configuration",
        help_text="Sport this configuration applies to",
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
