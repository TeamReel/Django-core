"""
B31 Content Templates & Generation - Django Admin Configuration

Admin interface for ContentTemplate, ContentItem, and ContentApproval models.
"""

from django.contrib import admin

from .models import ContentApproval, ContentItem, ContentTemplate


@admin.register(ContentTemplate)
class ContentTemplateAdmin(admin.ModelAdmin):
    """Admin interface for ContentTemplate model"""

    list_display = [
        "name",
        "template_type",
        "template_subtype",
        "sport",
        "is_active",
        "organisation",
        "created_at",
    ]
    list_filter = ["template_type", "template_subtype", "sport", "is_active", "organisation"]
    search_fields = ["name", "description", "ai_workflow_id"]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    fieldsets = (
        (
            "Basic Info",
            {
                "fields": (
                    "name",
                    "description",
                    "template_type",
                    "template_subtype",
                    "is_active",
                )
            },
        ),
        (
            "Sport & Style",
            {
                "fields": ("sport", "formation", "style_variant"),
                "description": "Sport filtering and visual style options",
            },
        ),
        (
            "Generation Config",
            {
                "fields": (
                    "ai_workflow_id",
                    "template_settings",
                    "input_requirements",
                    "timeout_minutes",
                    "credits_required",
                )
            },
        ),
        ("Relationships", {"fields": ("organisation", "project", "created_by")}),
        (
            "Legacy Fields",
            {"fields": ("sport_type",), "classes": ("collapse",), "description": "Deprecated"},
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ContentItem)
class ContentItemAdmin(admin.ModelAdmin):
    """Admin interface for ContentItem model"""

    list_display = ["id", "template", "status", "project", "created_by", "created_at", "deleted_at"]
    list_filter = ["status", "template", "project", "deleted_at"]
    search_fields = ["id", "template__name", "error_message"]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    date_hierarchy = "created_at"

    fieldsets = (
        ("Content Info", {"fields": ("template", "project", "activity", "status")}),
        ("Data", {"fields": ("input_data", "output_file", "error_message", "metadata")}),
        ("Soft Delete", {"fields": ("deleted_at",)}),
        ("Audit", {"fields": ("created_by", "created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ContentApproval)
class ContentApprovalAdmin(admin.ModelAdmin):
    """Admin interface for ContentApproval model"""

    list_display = ["id", "content_item", "reviewer", "status", "reviewed_at"]
    list_filter = ["status", "reviewed_at"]
    search_fields = ["content_item__id", "reviewer__username", "feedback_text"]
    readonly_fields = ["reviewed_at", "reviewer"]
    date_hierarchy = "reviewed_at"

    fieldsets = (
        ("Approval Info", {"fields": ("content_item", "status", "feedback_text")}),
        ("Audit", {"fields": ("reviewer", "reviewed_at"), "classes": ("collapse",)}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.reviewer = request.user
        super().save_model(request, obj, form, change)
