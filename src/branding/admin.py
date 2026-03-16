"""
Django admin configuration for B33 Brand Identity Manager.

Provides admin interfaces for:
- BrandProfile: Brand management with inline tokens and assets
- DesignToken: Design token management (also available as inline)
- BrandAsset: Brand asset management (also available as inline)
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import AppBackground, BrandAsset, BrandProfile, DesignToken


class DesignTokenInline(admin.TabularInline):
    """Inline admin for design tokens within BrandProfile."""

    model = DesignToken
    extra = 3
    fields = ["key", "value", "type", "description"]
    show_change_link = True


class BrandAssetInline(admin.TabularInline):
    """Inline admin for brand assets within BrandProfile."""

    model = BrandAsset
    extra = 1
    fields = ["asset_type", "file", "alt_text", "is_active"]
    readonly_fields = ["created_at"]
    show_change_link = True


@admin.register(BrandProfile)
class BrandProfileAdmin(admin.ModelAdmin):
    """Admin interface for BrandProfile with nested tokens and assets."""

    list_display = [
        "name",
        "organisation",
        "project",
        "is_active",
        "token_count",
        "asset_count",
        "updated_at",
    ]
    list_filter = ["is_active", "created_at", "updated_at"]
    search_fields = ["name", "organisation__name", "project__name"]
    readonly_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]

    inlines = [DesignTokenInline, BrandAssetInline]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "is_active")},
        ),
        (
            "Scope",
            {
                "fields": ("organisation", "project"),
                "description": "Specify EITHER organisation OR project, not both.",
            },
        ),
        (
            "Audit",
            {
                "fields": ("id", "created_at", "created_by", "updated_at", "updated_by"),
                "classes": ("collapse",),
            },
        ),
    )

    def token_count(self, obj):
        """Display count of design tokens."""
        count = obj.design_tokens.count()
        return format_html('<span style="font-weight: bold;">{}</span>', count)

    token_count.short_description = "Tokens"

    def asset_count(self, obj):
        """Display count of brand assets."""
        count = obj.brand_assets.count()
        return format_html('<span style="font-weight: bold;">{}</span>', count)

    asset_count.short_description = "Assets"

    def save_model(self, request, obj, form, change):
        """Set audit fields on save."""
        if not change:  # Creating new
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(DesignToken)
class DesignTokenAdmin(admin.ModelAdmin):
    """Admin interface for DesignToken."""

    list_display = ["key", "value_preview", "type", "profile", "updated_at"]
    list_filter = ["type", "created_at", "updated_at"]
    search_fields = ["key", "value", "profile__name"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        (
            None,
            {"fields": ("profile", "key", "value", "type", "description")},
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def value_preview(self, obj):
        """Display truncated value for readability."""
        if len(obj.value) > 50:
            return format_html(
                '<span title="{}">{}&hellip;</span>',
                obj.value,
                obj.value[:50],
            )
        return obj.value

    value_preview.short_description = "Value"


@admin.register(BrandAsset)
class BrandAssetAdmin(admin.ModelAdmin):
    """Admin interface for BrandAsset."""

    list_display = [
        "profile",
        "asset_type",
        "file_name",
        "is_active",
        "file_preview",
        "updated_at",
    ]
    list_filter = ["asset_type", "is_active", "created_at", "updated_at"]
    search_fields = ["profile__name", "alt_text"]
    readonly_fields = ["id", "created_at", "updated_at", "file_url_display"]

    fieldsets = (
        (
            None,
            {"fields": ("profile", "file", "asset_type", "alt_text", "is_active")},
        ),
        (
            "File Info",
            {"fields": ("file_url_display",), "classes": ("collapse",)},
        ),
        (
            "Metadata",
            {
                "fields": ("id", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def file_name(self, obj):
        """Display file name."""
        if obj.file:
            return obj.file.name.split("/")[-1]
        return "-"

    file_name.short_description = "File"

    def file_preview(self, obj):
        """Display small preview for image assets."""
        url = obj.get_url()
        if url and obj.asset_type in ["logo", "icon", "image"]:
            return format_html(
                '<img src="{}" style="max-height: 30px; max-width: 100px;" />',
                url,
            )
        return "-"

    file_preview.short_description = "Preview"

    def file_url_display(self, obj):
        """Display clickable file URL."""
        url = obj.get_url()
        if url:
            return format_html('<a href="{}" target="_blank">{}</a>', url, url)
        return "-"

    file_url_display.short_description = "File URL"


@admin.register(AppBackground)
class AppBackgroundAdmin(admin.ModelAdmin):
    """Admin interface for global sport-linked backgrounds (superadmin only)."""

    list_display = ["label", "sport", "file", "sort_order", "is_active", "created_at"]
    list_filter = ["sport", "is_active"]
    search_fields = ["label", "sport__name"]
    readonly_fields = ["id", "created_at", "updated_at", "created_by"]
    ordering = ["sort_order", "label"]

    fieldsets = (
        (
            None,
            {"fields": ("label", "sport", "file", "sort_order", "is_active")},
        ),
        (
            "Audit",
            {
                "fields": ("id", "created_at", "updated_at", "created_by"),
                "classes": ("collapse",),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
