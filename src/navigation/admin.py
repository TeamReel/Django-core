"""Admin interface for navigation models."""

from django.contrib import admin

from .models import UserFavorite, UserRecent


@admin.register(UserRecent)
class UserRecentAdmin(admin.ModelAdmin):
    """Admin interface for UserRecent."""

    list_display = (
        "user",
        "label",
        "path",
        "content_type",
        "last_seen_at",
    )
    list_filter = (
        "content_type",
        "last_seen_at",
    )
    search_fields = (
        "user__email",
        "label",
        "path",
    )
    readonly_fields = ("last_seen_at",)
    date_hierarchy = "last_seen_at"
    ordering = ("-last_seen_at",)


@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    """Admin interface for UserFavorite."""

    list_display = (
        "user",
        "label",
        "path",
        "content_type",
        "order",
        "created_at",
    )
    list_filter = (
        "content_type",
        "created_at",
    )
    search_fields = (
        "user__email",
        "label",
        "path",
    )
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"
    ordering = ("order", "-created_at")
