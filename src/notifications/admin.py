"""Django admin configuration for notifications app."""

from django.contrib import admin
from notifications.models import (
    DeliveryAttempt,
    Notification,
    NotificationType,
    RetryPolicy,
)


@admin.register(RetryPolicy)
class RetryPolicyAdmin(admin.ModelAdmin):
    """Admin interface for RetryPolicy management."""

    list_display = (
        "name",
        "max_attempts",
        "retry_window_hours",
        "backoff_strategy",
        "backoff_multiplier",
        "initial_delay_minutes",
        "created_at",
    )
    list_filter = ("backoff_strategy",)
    search_fields = ("name",)
    readonly_fields = ("created_at",)
    ordering = ("name",)

    fieldsets = (
        (
            "Basic Configuration",
            {
                "fields": ("name", "max_attempts", "retry_window_seconds"),
            },
        ),
        (
            "Backoff Strategy",
            {
                "fields": (
                    "backoff_strategy",
                    "backoff_multiplier",
                    "initial_delay_seconds",
                ),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("created_at",),
            },
        ),
    )

    @admin.display(description="Retry Window (hours)")
    def retry_window_hours(self, obj):
        """Display retry window in hours for readability."""
        return f"{obj.retry_window_seconds / 3600:.1f}h"

    @admin.display(description="Initial Delay (minutes)")
    def initial_delay_minutes(self, obj):
        """Display initial delay in minutes for readability."""
        return f"{obj.initial_delay_seconds / 60:.1f}m"


@admin.register(NotificationType)
class NotificationTypeAdmin(admin.ModelAdmin):
    """Admin interface for NotificationType management."""

    list_display = (
        "code",
        "name",
        "retry_policy",
        "default_channel",
        "is_active",
        "created_at",
    )
    list_filter = ("default_channel", "is_active", "retry_policy")
    search_fields = ("code", "name")
    readonly_fields = ("created_at",)
    ordering = ("code",)

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": ("code", "name", "description", "default_channel"),
            },
        ),
        (
            "Configuration",
            {
                "fields": ("retry_policy", "is_active"),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("created_at",),
            },
        ),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for Notification viewing (read-only for safety)."""

    list_display = (
        "id",
        "type",
        "recipient",
        "channel",
        "status",
        "created_at",
        "updated_at",
    )
    list_filter = ("status", "channel", "type", "created_at")
    search_fields = ("recipient", "id")
    readonly_fields = (
        "id",
        "type",
        "channel",
        "recipient",
        "recipient_user",
        "status",
        "payload",
        "metadata",
        "created_at",
        "updated_at",
        "read_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        """Prevent creating notifications via admin (use API instead)."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deleting notifications via admin (audit trail)."""
        return False


@admin.register(DeliveryAttempt)
class DeliveryAttemptAdmin(admin.ModelAdmin):
    """Admin interface for DeliveryAttempt viewing (read-only)."""

    list_display = (
        "notification",
        "attempt_number",
        "outcome",
        "attempted_at",
        "duration_ms",
    )
    list_filter = ("outcome", "attempted_at")
    search_fields = ("notification__id", "error_message")
    readonly_fields = (
        "notification",
        "attempt_number",
        "attempted_at",
        "outcome",
        "error_message",
        "duration_ms",
    )
    ordering = ("-attempted_at",)
    date_hierarchy = "attempted_at"

    def has_add_permission(self, request):
        """Prevent creating attempts via admin (created by tasks)."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deleting attempts via admin (audit trail)."""
        return False
