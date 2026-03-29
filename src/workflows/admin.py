"""Django admin configuration for workflows app."""
import json

from django.contrib import admin
from django.utils.html import format_html

from src.workflows.models import (
    ProjectPermissionOverride,
    TransitionHistory,
    WorkflowInstance,
    WorkflowTemplate,
)

# =============================================================================
# Inline Admin Classes
# =============================================================================


class TransitionHistoryInline(admin.TabularInline):
    """Inline display of transition history for workflow instances."""

    model = TransitionHistory
    extra = 0
    can_delete = False
    readonly_fields = (
        "action",
        "from_state",
        "to_state",
        "actor",
        "comment",
        "created_at",
        "task_id",
    )
    fields = readonly_fields

    def has_add_permission(self, request, obj=None):
        """Prevent adding history records via admin (immutable audit log)."""
        return False


# =============================================================================
# Model Admin Classes
# =============================================================================


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    """Admin interface for WorkflowTemplate model."""

    list_display = (
        "name",
        "version",
        "is_active",
        "created_at",
        "updated_at",
    )
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "version", "description")
    readonly_fields = ("created_at", "updated_at", "formatted_definition")
    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "name",
                    "version",
                    "description",
                    "is_active",
                )
            },
        ),
        (
            "Workflow Definition",
            {
                "fields": ("definition", "formatted_definition"),
                "description": "JSON definition of states and transitions",
            },
        ),
        (
            "Metadata",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    actions = ["deactivate_templates", "activate_templates"]
    ordering = ("-created_at",)

    def formatted_definition(self, obj):
        """Display workflow definition as formatted JSON."""
        if obj.definition:
            formatted = json.dumps(obj.definition, indent=2)
            return format_html("<pre>{}</pre>", formatted)
        return "-"

    formatted_definition.short_description = "Definition (Formatted)"

    @admin.action(description="Deactivate selected templates")
    def deactivate_templates(self, request, queryset):
        """Deactivate multiple workflow templates."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} template(s) deactivated successfully.")

    @admin.action(description="Activate selected templates")
    def activate_templates(self, request, queryset):
        """Activate multiple workflow templates."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} template(s) activated successfully.")


@admin.register(WorkflowInstance)
class WorkflowInstanceAdmin(admin.ModelAdmin):
    """Admin interface for WorkflowInstance model."""

    list_display = (
        "id",
        "workflow_link",
        "project_link",
        "current_state",
        "content_link",
        "created_by",
        "created_at",
    )
    list_filter = ("project", "workflow", "current_state", "created_at")
    search_fields = (
        "workflow__name",
        "project__name",
        "current_state",
        "created_by__email",
    )
    readonly_fields = (
        "workflow_snapshot",
        "formatted_snapshot",
        "formatted_context",
        "version",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            "Core Information",
            {
                "fields": (
                    "workflow",
                    "project",
                    "current_state",
                    "created_by",
                )
            },
        ),
        (
            "Content Object",
            {
                "fields": ("content_type", "object_id"),
                "description": "GenericForeignKey to attached content",
            },
        ),
        (
            "Workflow State",
            {
                "fields": ("context", "formatted_context", "version"),
                "description": "Runtime context and version for optimistic locking",
            },
        ),
        (
            "Workflow Snapshot",
            {
                "fields": ("workflow_snapshot", "formatted_snapshot"),
                "classes": ("collapse",),
                "description": "Immutable snapshot of workflow definition at creation time",
            },
        ),
        (
            "Metadata",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    inlines = [TransitionHistoryInline]
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    def workflow_link(self, obj):
        """Display workflow as admin link."""
        if obj.workflow:
            url = f"/admin/workflows/workflowtemplate/{obj.workflow.id}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.workflow.name)
        return "-"

    workflow_link.short_description = "Workflow"

    def project_link(self, obj):
        """Display project as admin link."""
        if obj.project:
            url = f"/admin/projects/project/{obj.project.id}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.project.name)
        return "-"

    project_link.short_description = "Project"

    def content_link(self, obj):
        """Display content object type and ID."""
        if obj.content_type and obj.object_id:
            return f"{obj.content_type.model} #{obj.object_id}"
        return "-"

    content_link.short_description = "Content Object"

    def formatted_snapshot(self, obj):
        """Display workflow snapshot as formatted JSON."""
        if obj.workflow_snapshot:
            formatted = json.dumps(obj.workflow_snapshot, indent=2)
            return format_html("<pre>{}</pre>", formatted)
        return "-"

    formatted_snapshot.short_description = "Snapshot (Formatted)"

    def formatted_context(self, obj):
        """Display instance context as formatted JSON."""
        if obj.context:
            formatted = json.dumps(obj.context, indent=2)
            return format_html("<pre>{}</pre>", formatted)
        return "-"

    formatted_context.short_description = "Context (Formatted)"


@admin.register(TransitionHistory)
class TransitionHistoryAdmin(admin.ModelAdmin):
    """Admin interface for TransitionHistory model (read-only audit log)."""

    list_display = (
        "id",
        "instance_link",
        "action",
        "state_transition",
        "actor",
        "created_at",
    )
    list_filter = ("action", "created_at", "actor")
    search_fields = (
        "instance__workflow__name",
        "action",
        "from_state",
        "to_state",
        "actor__email",
        "comment",
    )
    readonly_fields = (
        "instance",
        "action",
        "from_state",
        "to_state",
        "actor",
        "comment",
        "task_id",
        "created_at",
        "formatted_metadata",
    )
    fieldsets = (
        (
            "Transition Details",
            {
                "fields": (
                    "instance",
                    "action",
                    "from_state",
                    "to_state",
                )
            },
        ),
        (
            "Actor & Timestamp",
            {
                "fields": (
                    "actor",
                    "created_at",
                )
            },
        ),
        (
            "Additional Context",
            {
                "fields": ("comment", "task_id", "metadata", "formatted_metadata"),
                "classes": ("collapse",),
            },
        ),
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        """Prevent adding history records via admin (immutable audit log)."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deleting history records (immutable audit log)."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent modifying history records (immutable audit log)."""
        return False

    def instance_link(self, obj):
        """Display workflow instance as admin link."""
        if obj.instance:
            url = f"/admin/workflows/workflowinstance/{obj.instance.id}/change/"
            return format_html('<a href="{}">Instance #{}</a>', url, obj.instance.id)
        return "-"

    instance_link.short_description = "Workflow Instance"

    def state_transition(self, obj):
        """Display state transition in readable format."""
        return f"{obj.from_state} → {obj.to_state}"

    state_transition.short_description = "State Transition"

    def formatted_metadata(self, obj):
        """Display metadata as formatted JSON."""
        if obj.metadata:
            formatted = json.dumps(obj.metadata, indent=2)
            return format_html("<pre>{}</pre>", formatted)
        return "-"

    formatted_metadata.short_description = "Metadata (Formatted)"


@admin.register(ProjectPermissionOverride)
class ProjectPermissionOverrideAdmin(admin.ModelAdmin):
    """Admin interface for ProjectPermissionOverride model."""

    list_display = (
        "id",
        "project_link",
        "workflow_link",
        "action_name",
        "display_roles",
        "created_at",
    )
    list_filter = ("project", "workflow", "created_at")
    search_fields = (
        "project__name",
        "workflow__name",
        "action_name",
    )
    readonly_fields = ("created_at",)
    fieldsets = (
        (
            "Override Configuration",
            {
                "fields": (
                    "project",
                    "workflow",
                    "action_name",
                    "required_roles",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": ("created_at",),
                "classes": ("collapse",),
            },
        ),
    )
    ordering = ("-created_at",)

    def project_link(self, obj):
        """Display project as admin link."""
        if obj.project:
            url = f"/admin/projects/project/{obj.project.id}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.project.name)
        return "-"

    project_link.short_description = "Project"

    def workflow_link(self, obj):
        """Display workflow as admin link."""
        if obj.workflow:
            url = f"/admin/workflows/workflowtemplate/{obj.workflow.id}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.workflow.name)
        return "-"

    workflow_link.short_description = "Workflow"

    def display_roles(self, obj):
        """Display required roles as comma-separated list."""
        if obj.required_roles:
            return ", ".join(obj.required_roles)
        return "-"

    display_roles.short_description = "Required Roles"
