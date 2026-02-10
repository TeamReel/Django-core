"""VideoPreset model for encoding configurations."""

import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class OutputFormat(models.TextChoices):
    """Video output format choices."""

    MP4 = "mp4", _("MP4")
    WEBM = "webm", _("WebM")
    HLS = "hls", _("HLS")


class VideoPreset(models.Model):
    """Reusable video encoding preset configuration.

    Defines encoding settings like format, resolution, bitrate, and codec
    for common video processing scenarios.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text=_("Unique preset name (e.g., '1080p_standard')"),
    )
    description = models.TextField(
        blank=True,
        help_text=_("Human-readable description of this preset"),
    )
    output_format = models.CharField(
        max_length=10,
        choices=OutputFormat.choices,
        help_text=_("Output video format"),
    )
    video_codec = models.CharField(
        max_length=50,
        blank=True,
        help_text=_("FFmpeg video codec (e.g., 'libx264', 'libvpx-vp9')"),
    )
    audio_codec = models.CharField(
        max_length=50,
        blank=True,
        help_text=_("FFmpeg audio codec (e.g., 'aac', 'libopus')"),
    )
    resolution = models.CharField(
        max_length=20,
        blank=True,
        help_text=_("Target resolution (e.g., '1920x1080', '1280x720')"),
    )
    bitrate_video = models.CharField(
        max_length=20,
        blank=True,
        help_text=_("Video bitrate (e.g., '5M', '2M')"),
    )
    bitrate_audio = models.CharField(
        max_length=20,
        blank=True,
        help_text=_("Audio bitrate (e.g., '128k', '192k')"),
    )
    framerate = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("Target framerate (e.g., 30, 60)"),
    )
    crf = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("Constant Rate Factor quality (0-51, lower is better)"),
    )
    extra_params = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Additional FFmpeg parameters as JSON"),
    )
    is_system = models.BooleanField(
        default=False,
        help_text=_("System preset (read-only, cannot be modified)"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "video_presets"
        ordering = ["name"]
        verbose_name = _("Video Preset")
        verbose_name_plural = _("Video Presets")

    def __str__(self) -> str:
        """String representation of the preset."""
        return f"{self.name} ({self.output_format})"
