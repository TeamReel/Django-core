"""
B62: Activity Feed Admin

Register ActivityLog and FeedPosition for the Django admin interface.
ActivityLog is read-only (immutable events).
"""

from django.contrib import admin

from .models import ActivityLog, FeedPosition


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    """Admin view for activity feed events — read-only."""

    list_display = [
        "verb",
        "actor",
        "organisation",
        "project",
        "target_content_type",
        "created_at",
    ]
    list_filter = ["verb", "organisation", "created_at"]
    search_fields = [
        "actor__email",
        "verb",
        "organisation__name",
    ]
    readonly_fields = [
        "id",
        "actor",
        "verb",
        "target_content_type",
        "target_object_id",
        "organisation",
        "project",
        "extra_data",
        "created_at",
    ]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        """Events are created via signals/API, not manually."""
        return False

    def has_change_permission(self, request, obj=None):
        """Events are immutable."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Events should not be deleted manually."""
        return False


@admin.register(FeedPosition)
class FeedPositionAdmin(admin.ModelAdmin):
    """Admin view for feed read positions."""

    list_display = ["user", "organisation", "last_read_at", "updated_at"]
    list_filter = ["organisation"]
    search_fields = ["user__email", "organisation__name"]
    readonly_fields = ["id", "updated_at"]
