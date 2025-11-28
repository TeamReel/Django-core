"""Django admin customizations for settings management."""

from django.contrib import admin
from django.utils.html import format_html

from .models import FeatureFlag, Setting


@admin.register(FeatureFlag)
class FeatureFlagAdmin(admin.ModelAdmin):
    """Admin interface for FeatureFlag model."""

    list_display = [
        'key',
        'enabled_badge',
        'scope_type',
        'organisation',
        'project',
        'updated_at',
        'updated_by'
    ]
    list_filter = ['scope_type', 'enabled', 'updated_at', 'organisation']
    search_fields = ['key', 'description']
    list_select_related = ['organisation', 'project', 'created_by', 'updated_by']
    readonly_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    ordering = ['-updated_at']
    list_per_page = 25
    date_hierarchy = 'updated_at'
    actions = ['enable_flags', 'disable_flags']

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'key', 'description', 'enabled')
        }),
        ('Scope Configuration', {
            'fields': ('scope_type', 'organisation', 'project'),
            'description': 'Define where this feature flag applies'
        }),
        ('Audit Information', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def enabled_badge(self, obj):
        """Display enabled status with visual indicator."""
        if obj.enabled:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Enabled</span>'
            )
        return format_html(
            '<span style="color: red; font-weight: bold;">✗ Disabled</span>'
        )
    enabled_badge.short_description = 'Status'
    enabled_badge.admin_order_field = 'enabled'

    def enable_flags(self, request, queryset):
        """Bulk action to enable selected feature flags."""
        updated_count = 0
        for flag in queryset:
            flag.enabled = True
            flag.updated_by = request.user
            flag.save()
            updated_count += 1
        
        self.message_user(
            request, 
            f'{updated_count} feature flag(s) enabled successfully.'
        )
    enable_flags.short_description = "Enable selected feature flags"

    def disable_flags(self, request, queryset):
        """Bulk action to disable selected feature flags."""
        updated_count = 0
        for flag in queryset:
            flag.enabled = False
            flag.updated_by = request.user
            flag.save()
            updated_count += 1
            
        self.message_user(
            request, 
            f'{updated_count} feature flag(s) disabled successfully.'
        )
    disable_flags.short_description = "Disable selected feature flags"

    def save_model(self, request, obj, form, change):
        """Capture current user in created_by/updated_by fields."""
        if not change:  # Creating new object
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Setting)
class SettingAdmin(admin.ModelAdmin):
    """Admin interface for Setting model."""

    list_display = [
        'key',
        'value_type',
        'scope_type', 
        'organisation',
        'project',
        'updated_at',
        'updated_by'
    ]
    list_filter = ['value_type', 'scope_type', 'updated_at', 'organisation']
    search_fields = ['key', 'description']
    list_select_related = ['organisation', 'project', 'created_by', 'updated_by']
    readonly_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    ordering = ['-updated_at']
    list_per_page = 25
    date_hierarchy = 'updated_at'

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'key', 'description', 'value', 'default_value')
        }),
        ('Type Configuration', {
            'fields': ('value_type',),
            'description': 'Data type for this setting value'
        }),
        ('Scope Configuration', {
            'fields': ('scope_type', 'organisation', 'project'),
            'description': 'Define where this setting applies'
        }),
        ('Audit Information', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """Capture current user in created_by/updated_by fields."""
        if not change:  # Creating new object
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
