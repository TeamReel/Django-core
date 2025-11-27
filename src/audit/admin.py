"""
Audit admin interface.

Read-only Django admin for viewing audit events with search, filters, pagination,
timeline navigation, and CSV export.
"""

import csv
import json

from django.contrib import admin
from django.http import HttpResponse
from django.utils.html import format_html

from audit.models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    """
    Read-only admin interface for audit events.

    Design: Multi-layer enforcement of read-only access:
    - Permission overrides (has_add/change/delete_permission return False)
    - Readonly fields (all fields marked readonly)
    - Action removal (delete_selected removed, except export_as_csv)
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

    # Date hierarchy for timeline navigation (T023)
    date_hierarchy = "created_at"

    # Fieldsets for detail view organization (T024)
    fieldsets = [
        (
            "Event Information",
            {"fields": ["id", "created_at", "event_type"]},
        ),
        (
            "Context",
            {"fields": ["user", "organization", "project"]},
        ),
        (
            "Metadata",
            {
                "fields": ["metadata_display"],
                "description": "Event-specific details stored as JSON",
            },
        ),
    ]

    # Admin actions (T026)
    actions = ["export_as_csv"]

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

    # Remove bulk actions except export (T019)
    def get_actions(self, request):
        """Remove delete_selected action, keep export_as_csv."""
        actions = super().get_actions(request)
        if "delete_selected" in actions:
            del actions["delete_selected"]
        return actions

    # CSV Export Action (T026, T027)
    def export_as_csv(self, request, queryset):  # noqa: ARG002
        """
        Export selected audit events to CSV.

        Columns: ID, Created At, Event Type, User Email, Organization,
                 Project, Metadata (as JSON string)

        Handles edge cases:
        - Unicode characters (ensure_ascii=False)
        - Quotes and commas in metadata (json.dumps handles escaping)
        - Empty/null fields (blank strings for missing relations)
        - Large datasets (uses queryset.iterator() for streaming)
        """
        # Create response with CSV content type
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="audit_events.csv"'

        # Create CSV writer
        writer = csv.writer(response)

        # Write header row
        writer.writerow(
            [
                "ID",
                "Created At",
                "Event Type",
                "User Email",
                "Organization",
                "Project",
                "Metadata",
            ]
        )

        # Write data rows (use iterator() for large datasets)
        for event in queryset.select_related("user", "organization", "project").iterator():
            writer.writerow(
                [
                    event.id,
                    event.created_at.isoformat(),
                    event.event_type,
                    event.user.email if event.user else "",
                    event.organization.name if event.organization else "",
                    event.project.name if event.project else "",
                    json.dumps(event.metadata, ensure_ascii=False),  # Handles unicode/quotes/commas
                ]
            )

        return response

    export_as_csv.short_description = "Export selected events to CSV"

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
