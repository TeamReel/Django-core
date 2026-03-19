"""Trash admin configuration."""

from django.contrib import admin

from .models import TrashItem


@admin.register(TrashItem)
class TrashItemAdmin(admin.ModelAdmin):
    """Admin for browsing and managing trash items."""

    list_display = [
        "object_repr",
        "content_type",
        "organisation",
        "deleted_by",
        "deleted_at",
        "expires_at",
    ]
    list_filter = ["content_type", "organisation", "deleted_at"]
    search_fields = ["object_repr"]
    readonly_fields = [
        "id",
        "content_type",
        "object_id",
        "organisation",
        "deleted_at",
        "deleted_by",
        "expires_at",
        "object_repr",
        "original_data",
        "restore_path",
        "created_at",
    ]
    ordering = ["-deleted_at"]
    actions = ["restore_selected", "permanent_delete_selected"]

    def has_add_permission(self, request):
        return False  # Trash items are created by signals only

    @admin.action(description="Restore selected items")
    def restore_selected(self, request, queryset):
        restored = 0
        for item in queryset:
            obj = item.content_object
            if obj is not None and hasattr(obj, "restore"):
                obj.restore()
                restored += 1
        self.message_user(request, f"Restored {restored} item(s).")

    @admin.action(description="Permanently delete selected items")
    def permanent_delete_selected(self, request, queryset):
        deleted = 0
        for item in queryset:
            obj = item.content_object
            if obj is not None:
                if hasattr(obj, "permanent_delete"):
                    obj.permanent_delete()
                else:
                    obj.delete()
            item.delete()
            deleted += 1
        self.message_user(request, f"Permanently deleted {deleted} item(s).")
