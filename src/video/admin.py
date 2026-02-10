"""Django admin configuration for video processing models."""

from django.contrib import admin
from django.utils.html import format_html

from .models import PlatformExport, VideoJob, VideoOverlay, VideoPreset


@admin.register(VideoJob)
class VideoJobAdmin(admin.ModelAdmin):
    """Admin interface for VideoJob model."""

    list_display = [
        "id",
        "job_type",
        "status_badge",
        "progress_percent",
        "project",
        "created_by",
        "created_at",
    ]
    list_filter = [
        "status",
        "job_type",
        "created_at",
    ]
    search_fields = [
        "id",
        "project__name",
        "created_by__email",
        "error_message",
    ]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "started_at",
        "completed_at",
    ]
    fieldsets = (
        (
            "Basic Info",
            {
                "fields": (
                    "id",
                    "project",
                    "created_by",
                    "job_type",
                    "status",
                    "progress_percent",
                )
            },
        ),
        (
            "Files",
            {
                "fields": (
                    "input_file",
                    "output_file",
                    "preset",
                    "platform_export",
                )
            },
        ),
        (
            "Configuration",
            {"fields": ("config", "metadata", "workflow_instance")},
        ),
        (
            "Error Info",
            {"fields": ("error_message", "error_code", "retry_count")},
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "started_at",
                    "completed_at",
                )
            },
        ),
    )

    def status_badge(self, obj):
        """Display status with color badge."""
        colors = {
            "queued": "#6c757d",  # gray
            "processing": "#007bff",  # blue
            "completed": "#28a745",  # green
            "failed": "#dc3545",  # red
            "cancelled": "#ffc107",  # yellow
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"


@admin.register(VideoPreset)
class VideoPresetAdmin(admin.ModelAdmin):
    """Admin interface for VideoPreset model."""

    list_display = [
        "name",
        "output_format",
        "resolution",
        "is_system",
        "created_at",
    ]
    list_filter = [
        "output_format",
        "is_system",
        "created_at",
    ]
    search_fields = [
        "name",
        "description",
    ]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
    ]
    fieldsets = (
        (
            "Basic Info",
            {
                "fields": (
                    "id",
                    "name",
                    "description",
                    "output_format",
                    "is_system",
                )
            },
        ),
        (
            "Encoding Settings",
            {
                "fields": (
                    "video_codec",
                    "audio_codec",
                    "resolution",
                    "bitrate_video",
                    "bitrate_audio",
                    "framerate",
                    "crf",
                )
            },
        ),
        (
            "Advanced",
            {"fields": ("extra_params",)},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at")},
        ),
    )


@admin.register(PlatformExport)
class PlatformExportAdmin(admin.ModelAdmin):
    """Admin interface for PlatformExport model."""

    list_display = [
        "platform",
        "name",
        "aspect_ratio",
        "resolution",
        "recommended",
        "is_active",
    ]
    list_filter = [
        "platform",
        "recommended",
        "is_active",
        "crop_strategy",
    ]
    search_fields = [
        "name",
        "platform",
    ]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
    ]
    fieldsets = (
        (
            "Basic Info",
            {
                "fields": (
                    "id",
                    "platform",
                    "name",
                    "recommended",
                    "is_active",
                )
            },
        ),
        (
            "Video Specs",
            {
                "fields": (
                    "aspect_ratio",
                    "resolution",
                    "max_duration_seconds",
                    "max_file_size_mb",
                )
            },
        ),
        (
            "Encoding",
            {"fields": ("preset", "crop_strategy")},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at")},
        ),
    )


@admin.register(VideoOverlay)
class VideoOverlayAdmin(admin.ModelAdmin):
    """Admin interface for VideoOverlay model."""

    list_display = [
        "id",
        "job",
        "overlay_type",
        "position",
        "opacity",
        "z_index",
    ]
    list_filter = [
        "overlay_type",
        "position",
        "created_at",
    ]
    search_fields = [
        "job__id",
    ]
    readonly_fields = [
        "id",
        "created_at",
    ]
    fieldsets = (
        (
            "Basic Info",
            {
                "fields": (
                    "id",
                    "job",
                    "overlay_type",
                    "asset_file",
                )
            },
        ),
        (
            "Position",
            {
                "fields": (
                    "position",
                    "position_x",
                    "position_y",
                    "padding_percent",
                )
            },
        ),
        (
            "Display",
            {"fields": ("opacity", "z_index", "start_time", "end_time")},
        ),
        (
            "Content",
            {"fields": ("content",)},
        ),
        (
            "Timestamps",
            {"fields": ("created_at",)},
        ),
    )
