"""Django admin configuration for contextual_notifications models."""

from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest

from .models import (
    NotificationPreference,
    OrganisationNotificationPolicy,
    RoutingRule,
)


@admin.register(RoutingRule)
class RoutingRuleAdmin(admin.ModelAdmin):
    """Admin interface for RoutingRule model."""

    list_display = [
        "event_type",
        "scope",
        "organisation",
        "project",
        "target_role",
        "priority",
        "channel",
        "is_enabled",
        "created_at",
    ]
    list_filter = [
        "scope",
        "channel",
        "is_enabled",
        "priority",
        "organisation",
    ]
    search_fields = [
        "event_type",
        "target_role",
        "organisation__name",
        "project__name",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    date_hierarchy = "created_at"
    ordering = ["-priority", "event_type"]
    
    fieldsets = (
        (
            "Rule Configuration",
            {
                "fields": (
                    "event_type",
                    "scope",
                    "organisation",
                    "project",
                    "target_role",
                )
            },
        ),
        (
            "Notification Settings",
            {
                "fields": (
                    "priority",
                    "channel",
                    "is_enabled",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "created_by",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    actions = ["enable_selected_rules", "disable_selected_rules"]

    @admin.action(description="Enable selected routing rules")
    def enable_selected_rules(
        self, request: HttpRequest, queryset: QuerySet[RoutingRule]
    ) -> None:
        """Enable selected routing rules."""
        updated = queryset.update(is_enabled=True)
        self.message_user(request, f"Enabled {updated} routing rule(s).")

    @admin.action(description="Disable selected routing rules")
    def disable_selected_rules(
        self, request: HttpRequest, queryset: QuerySet[RoutingRule]
    ) -> None:
        """Disable selected routing rules."""
        updated = queryset.update(is_enabled=False)
        self.message_user(request, f"Disabled {updated} routing rule(s).")


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    """Admin interface for NotificationPreference model."""

    list_display = [
        "user",
        "event_type",
        "channel",
        "enabled",
        "updated_at",
    ]
    list_filter = [
        "channel",
        "enabled",
    ]
    search_fields = [
        "user__email",
        "user__username",
        "event_type",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    date_hierarchy = "updated_at"
    ordering = ["user", "event_type", "channel"]
    
    fieldsets = (
        (
            "Preference Configuration",
            {
                "fields": (
                    "user",
                    "event_type",
                    "channel",
                    "enabled",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(OrganisationNotificationPolicy)
class OrganisationNotificationPolicyAdmin(admin.ModelAdmin):
    """Admin interface for OrganisationNotificationPolicy model."""

    list_display = [
        "organisation",
        "quiet_hours_enabled",
        "quiet_hours_start",
        "quiet_hours_end",
        "quiet_hours_timezone",
        "quiet_hours_rate_limit",
    ]
    list_filter = [
        "quiet_hours_enabled",
        "policy_type",
    ]
    search_fields = [
        "organisation__name",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    date_hierarchy = "updated_at"
    ordering = ["organisation"]
    
    fieldsets = (
        (
            "Organisation",
            {
                "fields": (
                    "organisation",
                    "policy_type",
                )
            },
        ),
        (
            "Quiet Hours Configuration",
            {
                "fields": (
                    "quiet_hours_enabled",
                    "quiet_hours_start",
                    "quiet_hours_end",
                    "quiet_hours_timezone",
                    "quiet_hours_rate_limit",
                ),
                "description": (
                    "Configure quiet hours during which notifications are rate-limited. "
                    "Timezone must be a valid pytz timezone name (e.g., 'Europe/Amsterdam')."
                ),
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

