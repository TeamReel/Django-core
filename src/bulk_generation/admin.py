"""
B67: Bulk Content Generation — Django Admin Configuration
"""

from django.contrib import admin

from .models import BulkGenerationItem, BulkGenerationJob


class BulkGenerationItemInline(admin.TabularInline):
    """Inline view of items within a bulk job."""

    model = BulkGenerationItem
    extra = 0
    readonly_fields = [
        "id",
        "activity",
        "video_job",
        "status",
        "error_message",
        "created_at",
        "started_at",
        "completed_at",
    ]
    fields = readonly_fields


@admin.register(BulkGenerationJob)
class BulkGenerationJobAdmin(admin.ModelAdmin):
    """Admin interface for BulkGenerationJob."""

    list_display = [
        "id",
        "project",
        "content_type",
        "status",
        "total_items",
        "completed_items",
        "failed_items",
        "created_by",
        "created_at",
    ]
    list_filter = ["status", "content_type"]
    search_fields = ["id", "project__name"]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "started_at",
        "completed_at",
    ]
    inlines = [BulkGenerationItemInline]


@admin.register(BulkGenerationItem)
class BulkGenerationItemAdmin(admin.ModelAdmin):
    """Admin interface for BulkGenerationItem."""

    list_display = [
        "id",
        "bulk_job",
        "activity",
        "status",
        "video_job",
        "created_at",
    ]
    list_filter = ["status"]
    search_fields = ["id", "bulk_job__id"]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "started_at",
        "completed_at",
    ]
