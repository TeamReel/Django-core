"""PlatformExport model for platform-specific video configurations."""

import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class Platform(models.TextChoices):
    """Social media platform choices."""

    INSTAGRAM = "instagram", _("Instagram")
    TIKTOK = "tiktok", _("TikTok")
    YOUTUBE = "youtube", _("YouTube")
    STORIES = "stories", _("Stories")


class CropStrategy(models.TextChoices):
    """Video cropping strategy choices."""

    CROP = "crop", _("Crop to fit")
    LETTERBOX = "letterbox", _("Add letterbox")
    FIT = "fit", _("Scale to fit")


class PlatformExport(models.Model):
    """Platform-specific video export configuration.

    Defines aspect ratio, resolution, and encoding settings optimized
    for specific social media platforms.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    platform = models.CharField(
        max_length=20,
        choices=Platform.choices,
        help_text=_("Target platform"),
    )
    name = models.CharField(
        max_length=100,
        help_text=_("Export configuration name (e.g., 'Feed Square', 'Reels')"),
    )
    aspect_ratio = models.CharField(
        max_length=10,
        help_text=_("Aspect ratio (e.g., '1:1', '9:16', '16:9')"),
    )
    max_duration_seconds = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("Maximum video duration in seconds"),
    )
    max_file_size_mb = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("Maximum file size in megabytes"),
    )
    resolution = models.CharField(
        max_length=20,
        help_text=_("Target resolution (e.g., '1080x1080', '1080x1920')"),
    )
    preset = models.ForeignKey(
        "VideoPreset",
        on_delete=models.PROTECT,
        related_name="platform_exports",
        help_text=_("Encoding preset to use"),
    )
    crop_strategy = models.CharField(
        max_length=20,
        choices=CropStrategy.choices,
        default=CropStrategy.CROP,
        help_text=_("How to handle aspect ratio conversion"),
    )
    recommended = models.BooleanField(
        default=False,
        help_text=_("Recommended export for this platform"),
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_("Available for use"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "video_platform_exports"
        ordering = ["platform", "name"]
        verbose_name = _("Platform Export")
        verbose_name_plural = _("Platform Exports")
        unique_together = [["platform", "name"]]

    def __str__(self) -> str:
        """String representation of the platform export."""
        return f"{self.get_platform_display()} - {self.name} ({self.aspect_ratio})"
