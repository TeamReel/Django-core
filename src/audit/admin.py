"""
Audit admin interface.

Read-only Django admin for viewing audit events with search, filters, and pagination.
"""

import json

from django.contrib import admin
from django.utils.html import format_html

from audit.models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    """
    Read-only admin interface for audit events.

    Design: Multi-layer enforcement of read-only access:
    - Permission overrides (has_add/change/delete_permission return False)
    - Readonly fields (all fields marked readonly)
    - Action removal (delete_selected removed)
    """

    # Display configuration (T016)
    list_display = [
        "created_at",
        "event_type",
        "user_display",
        "organization_display",
        "project_display",
    ]

    # Make all fields read-only (T016)
    readonly_fields = [
        "id",
        "created_at",
        "event_type",
        "user",
        "organization",
        "project",
        "metadata_display",
    ]

    # Filters (T017)
    list_filter = [
        "event_type",
        ("user", admin.RelatedOnlyFieldListFilter),
        ("organization", admin.RelatedOnlyFieldListFilter),
        ("project", admin.RelatedOnlyFieldListFilter),
        ("created_at", admin.DateFieldListFilter),
    ]

    # Pagination (T018)
    list_per_page = 100

    # Search (T018)
    search_fields = [
        "event_type",
        "user__email",
        "metadata",  # JSONField full-text search (uses GIN index)
    ]

    # Permission overrides (T019)
    def has_add_permission(self, request):  # noqa: ARG002
        """No one can add audit events via admin (not even superusers)."""
        return False

    def has_change_permission(self, request, obj=None):  # noqa: ARG002
        """No one can modify audit events via admin."""
        return False

    def has_delete_permission(self, request, obj=None):  # noqa: ARG002
        """No one can delete audit events via admin."""
        return False

    def has_view_permission(self, request, obj=None):  # noqa: ARG002
        """Allow viewing audit events (read-only)."""
        return request.user.is_staff

    # Query optimization (T020)
    def get_queryset(self, request):
        """
        Optimize queryset with select_related to avoid N+1 queries.

        Without this: 1 + (100 × 3) = 301 queries for 100 events
        With this: 1 query with JOINs
        """
        queryset = super().get_queryset(request)
        return queryset.select_related("user", "organization", "project")

    # Remove bulk actions (T019)
    def get_actions(self, request):
        """Remove delete_selected action."""
        actions = super().get_actions(request)
        if "delete_selected" in actions:
            del actions["delete_selected"]
        return actions

    # Custom display methods (T016)
    def user_display(self, obj):
        """Display user email or 'Anonymous'."""
        if obj.user:
            return obj.user.email
        return format_html("<em>Anonymous</em>")

    user_display.short_description = "User"

    def organization_display(self, obj):
        """Display organization name or '-'."""
        return obj.organization.name if obj.organization else "-"

    organization_display.short_description = "Organization"

    def project_display(self, obj):
        """Display project name or '-'."""
        return obj.project.name if obj.project else "-"

    project_display.short_description = "Project"

    def metadata_display(self, obj):
        """Display metadata as formatted JSON."""
        return format_html("<pre>{}</pre>", json.dumps(obj.metadata, indent=2, ensure_ascii=False))

    metadata_display.short_description = "Metadata"
