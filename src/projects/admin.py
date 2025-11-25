"""Django admin configuration for Projects & Workspaces."""

from django.contrib import admin
from django.utils.html import format_html

from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """
    Django admin configuration for Project model.

    Provides search, filtering, and bulk actions for managing projects.
    """

    list_display = [
        "name",
        "organisation",
        "slug",
        "creator",
        "is_active_display",
        "created_at",
    ]

    list_filter = [
        "is_active",
        "created_at",
        "organisation",
    ]

    search_fields = [
        "name",
        "slug",
        "description",
        "organisation__name",
        "creator__email",
        "creator__first_name",
        "creator__last_name",
    ]

    readonly_fields = [
        "id",
        "slug",
        "created_at",
        "updated_at",
        "archived_at",
        "creator",
    ]

    fieldsets = (
        ("Basic Information", {"fields": ("name", "slug", "description", "organisation")}),
        ("Ownership", {"fields": ("creator",)}),
        ("Status", {"fields": ("is_active", "archived_at")}),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
        (
            "System",
            {
                "fields": ("id",),
                "classes": ("collapse",),
            },
        ),
    )

    actions = ["archive_projects", "restore_projects"]

    def is_active_display(self, obj):
        """Display active status with color indicator."""
        if obj.is_active:
            return format_html('<span style="color: green;">●</span> Active')
        return format_html('<span style="color: red;">●</span> Archived')

    is_active_display.short_description = "Status"

    @admin.action(description="Archive selected projects")
    def archive_projects(self, request, queryset):
        """Bulk action to archive projects."""
        active_projects = queryset.filter(is_active=True)
        count = active_projects.count()

        for project in active_projects:
            project.archive()

        self.message_user(request, f"Successfully archived {count} project(s).")

    @admin.action(description="Restore selected projects")
    def restore_projects(self, request, queryset):
        """Bulk action to restore archived projects."""
        archived_projects = queryset.filter(is_active=False)
        count = archived_projects.count()

        for project in archived_projects:
            project.restore()

        self.message_user(request, f"Successfully restored {count} project(s).")

    def get_queryset(self, request):
        """Include all projects (active and archived) in admin."""
        return Project.all_objects.select_related("organisation", "creator")


class ProjectInline(admin.TabularInline):
    """
    Inline admin for displaying projects within OrganisationAdmin.

    Shows projects belonging to an organisation in a tabular format.
    """

    model = Project
    extra = 0
    can_delete = False

    fields = [
        "name",
        "slug",
        "is_active",
        "created_at",
    ]

    readonly_fields = [
        "name",
        "slug",
        "is_active",
        "created_at",
    ]

    def has_add_permission(self, request, obj=None):
        """Prevent adding projects through inline."""
        return False
