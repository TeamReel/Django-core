"""
Django admin configuration for organisations app.

Provides:
- OrganisationAdmin: Manage organisations with soft-delete restore
- MembershipAdmin: Manage memberships with role filtering
"""

from django.contrib import admin
from src.projects.admin import ProjectInline

from .models import Membership, Organisation


@admin.register(Organisation)
class OrganisationAdmin(admin.ModelAdmin):
    """
    Admin interface for Organisation model.

    Features:
    - List display with status indicators
    - Filtering by active status and creation date
    - Search by name and slug
    - Custom action to restore soft-deleted organisations
    - Inline display of projects
    """

    list_display = ["name", "slug", "creator", "is_active", "created_at", "deleted_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "slug"]
    readonly_fields = ["id", "slug", "created_at", "updated_at"]
    actions = ["restore_organisations"]
    inlines = [ProjectInline]

    def restore_organisations(self, request, queryset):
        """
        Restore soft-deleted organisations.

        Restores organisation and reactivates all memberships.
        """
        count = 0
        for org in queryset.filter(is_active=False):
            org.is_active = True
            org.deleted_at = None
            org.save()
            # Reactivate all memberships
            org.memberships.update(is_active=True)
            count += 1
        self.message_user(request, f"Restored {count} organisations")

    restore_organisations.short_description = "Restore soft-deleted organisations"


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    """
    Admin interface for Membership model.

    Features:
    - List display with user, org, and role
    - Filtering by role, active status, and join date
    - Search by username and organisation name
    """

    list_display = ["user", "organisation", "role", "is_active", "joined_at"]
    list_filter = ["role", "is_active", "joined_at"]
    search_fields = ["user__username", "organisation__name"]
