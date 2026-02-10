"""VideoOverlay model for video composition overlays."""

import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class OverlayType(models.TextChoices):
    """Overlay type choices."""

    LOGO = "logo", _("Logo")
    WATERMARK = "watermark", _("Watermark")
    TEXT = "text", _("Text")
    INTRO = "intro", _("Intro")
    OUTRO = "outro", _("Outro")


class OverlayPosition(models.TextChoices):
    """Overlay position preset choices."""

    TOP_LEFT = "top_left", _("Top Left")
    TOP_CENTER = "top_center", _("Top Center")
    TOP_RIGHT = "top_right", _("Top Right")
    CENTER = "center", _("Center")
    BOTTOM_LEFT = "bottom_left", _("Bottom Left")
    BOTTOM_CENTER = "bottom_center", _("Bottom Center")
    BOTTOM_RIGHT = "bottom_right", _("Bottom Right")
    CUSTOM = "custom", _("Custom")


class VideoOverlay(models.Model):
    """Video overlay configuration for composition jobs.

    Defines logos, watermarks, text, or intro/outro sequences to be
    composited onto videos.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        "VideoJob",
        on_delete=models.CASCADE,
        related_name="overlays",
        help_text=_("Video job this overlay belongs to"),
    )
    overlay_type = models.CharField(
        max_length=20,
        choices=OverlayType.choices,
        help_text=_("Type of overlay"),
    )
    position = models.CharField(
        max_length=20,
        choices=OverlayPosition.choices,
        help_text=_("Position preset or custom"),
    )
    position_x = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("Custom X coordinate (pixels from left)"),
    )
    position_y = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("Custom Y coordinate (pixels from top)"),
    )
    padding_percent = models.IntegerField(
        default=5,
        help_text=_("Edge padding as percentage of video width"),
    )
    opacity = models.FloatField(
        default=1.0,
        help_text=_("Opacity (0.0-1.0)"),
    )
    start_time = models.FloatField(
        null=True,
        blank=True,
        help_text=_("Start time in seconds (null = from beginning)"),
    )
    end_time = models.FloatField(
        null=True,
        blank=True,
        help_text=_("End time in seconds (null = until end)"),
    )
    z_index = models.IntegerField(
        default=0,
        help_text=_("Layer order (higher values on top)"),
    )
    content = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Type-specific configuration as JSON"),
    )
    asset_file = models.ForeignKey(
        "files.FileAsset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="video_overlays",
        help_text=_("Asset file (logo, intro video, etc.)"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "video_overlays"
        ordering = ["z_index", "created_at"]
        verbose_name = _("Video Overlay")
        verbose_name_plural = _("Video Overlays")

    def __str__(self) -> str:
        """String representation of the overlay."""
        return f"{self.get_overlay_type_display()} at {self.get_position_display()}"
