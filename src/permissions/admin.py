"""
Django Admin configuration for permissions models.

Provides intuitive admin interface for managing roles, permissions, and role assignments
with proper filtering, search, and M2M widgets.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import Permission, Role, RoleAssignment


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Admin interface for Role model."""

    list_display = ["name", "scope", "permission_count", "created_at"]
    list_filter = ["scope", "created_at"]
    search_fields = ["name", "description"]
    filter_horizontal = ["permissions"]  # Better UX for M2M
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["scope", "name"]

    fieldsets = (
        ("Basic Information", {"fields": ("id", "name", "scope", "description")}),
        (
            "Permissions",
            {
                "fields": ("permissions",),
                "description": "Select permissions granted by this role",
            },
        ),
        ("Audit", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def permission_count(self, obj):
        """Display count of permissions in list view."""
        count = obj.permissions.count()
        return format_html("<strong>{}</strong>", count)

    permission_count.short_description = "Permissions"

    def save_model(self, request, obj, form, change):
        """Override to trigger cache invalidation."""
        super().save_model(request, obj, form, change)
        if change:
            # Trigger cache invalidation for all users with this role
            from .cache import invalidate_role_cache

            invalidate_role_cache(obj.id)


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    """Admin interface for Permission model."""

    list_display = [
        "permission",
        "resource_type",
        "is_sensitive",
        "is_sensitive_badge",
        "created_at",
    ]
    list_filter = ["resource_type", "is_sensitive", "created_at"]
    search_fields = ["permission", "description"]
    readonly_fields = ["id", "created_at"]
    list_editable = ["is_sensitive"]  # Quick edit in list view
    ordering = ["resource_type", "permission"]

    fieldsets = (
        ("Permission Details", {"fields": ("id", "permission", "resource_type", "description")}),
        (
            "Audit Configuration",
            {
                "fields": ("is_sensitive",),
                "description": "Mark sensitive to trigger audit logging",
            },
        ),
        ("Timestamps", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    def is_sensitive_badge(self, obj):
        """Display colored badge for sensitive permissions."""
        if obj.is_sensitive:
            return format_html('<span style="color: red; font-weight: bold;">🔒 SENSITIVE</span>')
        return format_html('<span style="color: green;">✓ Standard</span>')

    is_sensitive_badge.short_description = "Sensitivity"


@admin.register(RoleAssignment)
class RoleAssignmentAdmin(admin.ModelAdmin):
    """Admin interface for RoleAssignment model."""

    list_display = ["user_display", "role", "scope", "target_display", "assigned_by", "assigned_at"]
    list_filter = ["scope", "role", ("assigned_at", admin.DateFieldListFilter)]
    search_fields = ["user__email", "role__name"]
    readonly_fields = ["id", "assigned_by", "assigned_at"]
    autocomplete_fields = ["user", "role", "target_organization", "target_project"]
    ordering = ["-assigned_at"]
    date_hierarchy = "assigned_at"

    fieldsets = (
        ("Assignment Details", {"fields": ("id", "user", "role", "scope")}),
        (
            "Target",
            {
                "fields": ("target_organization", "target_project"),
                "description": "Set target based on scope",
            },
        ),
        ("Audit", {"fields": ("assigned_by", "assigned_at"), "classes": ("collapse",)}),
    )

    def user_display(self, obj):
        """Display user email in list view."""
        return obj.user.email

    user_display.short_description = "User"
    user_display.admin_order_field = "user__email"

    def target_display(self, obj):
        """Display assignment target in list view."""
        if obj.scope == "global":
            return "—"
        elif obj.target_organization:
            return f"Org: {obj.target_organization.name}"
        elif obj.target_project:
            return f"Project: {obj.target_project.name}"
        return "—"

    target_display.short_description = "Target"

    def save_model(self, request, obj, form, change):
        """Set assigned_by to current user if creating."""
        if not change:
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)
