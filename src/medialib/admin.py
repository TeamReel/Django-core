"""
B35 Smart Asset Library - Django Admin Configuration
"""
from django.contrib import admin

from .models import Collection, CollectionMembership, MediaItem, MediaTag


@admin.register(MediaItem)
class MediaItemAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "mime_type", "state", "file_size_bytes", "created_at"]
    list_filter = ["state", "mime_type", "created_at"]
    search_fields = ["title", "description"]
    readonly_fields = ["id", "created_at", "updated_at", "extraction_metadata"]
    filter_horizontal = ["tags"]
    raw_id_fields = ["project", "file", "created_by", "activity", "generation_request"]

    fieldsets = (
        ("Basic Info", {"fields": ("id", "project", "file", "title", "description")}),
        (
            "File Metadata",
            {"fields": ("mime_type", "file_size_bytes", "width", "height", "duration_seconds")},
        ),
        ("Processing", {"fields": ("state", "extraction_metadata")}),
        ("Context", {"fields": ("created_by", "activity", "generation_request")}),
        ("Tags", {"fields": ("tags",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(MediaTag)
class MediaTagAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_system", "project", "created_at"]
    list_filter = ["is_system", "created_at"]
    search_fields = ["name", "slug"]
    readonly_fields = ["id", "slug", "created_at", "updated_at"]
    raw_id_fields = ["project"]


class CollectionMembershipInline(admin.TabularInline):
    model = CollectionMembership
    extra = 1
    raw_id_fields = ["media_item"]


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "item_count", "created_by", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["name", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["project", "created_by"]
    inlines = [CollectionMembershipInline]

    def item_count(self, obj):
        return obj.items.count()

    item_count.short_description = "Items"
