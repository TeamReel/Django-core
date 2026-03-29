"""Django admin configuration for B34 Generative Pipelines."""

from django.contrib import admin
from django.utils.html import format_html

from src.generative.models import (
    GenerationJob,
    GenerationOutput,
    GenerationRequest,
    GenerationTemplate,
    RequestStatus,
)


@admin.register(GenerationJob)
class GenerationJobAdmin(admin.ModelAdmin):
    """Admin for AI generation job queue."""

    list_display = [
        "task_id",
        "template_id",
        "status",
        "output_type",
        "project_id",
        "membership_id",
        "created_by_id",
        "progress",
        "created_at",
        "completed_at",
    ]
    list_filter = ["status", "output_type"]
    search_fields = ["task_id", "template_id", "label", "project_id", "membership_id"]
    readonly_fields = ["task_id", "created_at", "updated_at", "completed_at"]
    ordering = ["-created_at"]


@admin.register(GenerationTemplate)
class GenerationTemplateAdmin(admin.ModelAdmin):
    """Admin interface for GenerationTemplate model."""

    list_display = [
        "name",
        "slug",
        "version",
        "organisation",
        "provider_display",
        "is_latest",
        "is_active",
        "retention_days",
        "created_at",
    ]
    list_filter = [
        "is_active",
        "is_latest",
        "organisation",
        ("pipeline_config", admin.EmptyFieldListFilter),
    ]
    search_fields = ["name", "slug", "description"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"

    fieldsets = (
        (
            "Basic Info",
            {
                "fields": ("organisation", "name", "slug", "version", "description"),
            },
        ),
        (
            "Versioning",
            {
                "fields": ("parent_template", "is_latest", "is_active"),
            },
        ),
        (
            "Configuration",
            {
                "fields": ("input_schema", "pipeline_config", "retention_days"),
                "classes": ("wide",),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("created_by", "created_at", "updated_at"),
            },
        ),
    )

    actions = ["activate_templates", "deactivate_templates"]

    def provider_display(self, obj: GenerationTemplate) -> str:
        """Display provider from pipeline_config."""
        provider = obj.provider or "Unknown"
        return provider.upper()

    provider_display.short_description = "Provider"
    provider_display.admin_order_field = "pipeline_config"

    @admin.action(description="Activate selected templates")
    def activate_templates(self, request, queryset):
        """Bulk activate templates."""
        count = queryset.update(is_active=True)
        self.message_user(request, f"Activated {count} template(s).")

    @admin.action(description="Deactivate selected templates")
    def deactivate_templates(self, request, queryset):
        """Bulk deactivate templates."""
        count = queryset.update(is_active=False)
        self.message_user(request, f"Deactivated {count} template(s).")


@admin.register(GenerationRequest)
class GenerationRequestAdmin(admin.ModelAdmin):
    """Admin interface for GenerationRequest model."""

    list_display = [
        "id",
        "template",
        "requester",
        "status_colored",
        "retry_count",
        "estimated_cost",
        "actual_cost",
        "created_at",
        "completed_at",
    ]
    list_filter = [
        "status",
        "error_category",
        "template",
        ("project", admin.RelatedOnlyFieldListFilter),
    ]
    search_fields = ["id", "requester__email", "template__name"]
    readonly_fields = [
        "template_version",
        "created_at",
        "started_at",
        "completed_at",
    ]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    raw_id_fields = ["template", "requester", "project"]

    fieldsets = (
        (
            "Request Info",
            {
                "fields": (
                    "template",
                    "template_version",
                    "requester",
                    "project",
                    "input_data",
                ),
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "status",
                    "retry_count",
                    "error_category",
                    "error_message",
                ),
            },
        ),
        (
            "Cost",
            {
                "fields": ("estimated_cost", "actual_cost", "transaction_id"),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "started_at", "completed_at"),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("metadata",),
                "classes": ("collapse",),
            },
        ),
    )

    actions = ["retry_failed_requests", "cancel_requests"]

    def status_colored(self, obj: GenerationRequest) -> str:
        """Display status with color coding."""
        colors = {
            RequestStatus.PENDING: "#6c757d",  # Gray
            RequestStatus.PROCESSING: "#007bff",  # Blue
            RequestStatus.COMPLETED: "#28a745",  # Green
            RequestStatus.FAILED: "#dc3545",  # Red
            RequestStatus.CANCELLED: "#ffc107",  # Yellow
        }
        color = colors.get(obj.status, "#000000")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_colored.short_description = "Status"
    status_colored.admin_order_field = "status"

    @admin.action(description="Cancel selected requests")
    def cancel_requests(self, request, queryset):
        """Bulk cancel requests (only pending/processing)."""
        cancelable = queryset.filter(status__in=[RequestStatus.PENDING, RequestStatus.PROCESSING])
        count = cancelable.count()

        for req in cancelable:
            req.mark_cancelled()

        self.message_user(request, f"Cancelled {count} request(s).")

    @admin.action(description="Retry failed requests (create new requests)")
    def retry_failed_requests(self, request, queryset):
        """Create new requests with same input_data for failed requests."""
        failed_requests = queryset.filter(status=RequestStatus.FAILED)
        count = 0

        for failed_request in failed_requests:
            GenerationRequest.objects.create(
                template=failed_request.template,
                requester=failed_request.requester,
                project=failed_request.project,
                input_data=failed_request.input_data,
                estimated_cost=failed_request.estimated_cost,
                metadata={"retry_of": failed_request.id},
            )
            count += 1

        self.message_user(
            request,
            f"Created {count} new request(s) from failed requests.",
        )


@admin.register(GenerationOutput)
class GenerationOutputAdmin(admin.ModelAdmin):
    """Admin interface for GenerationOutput model."""

    list_display = [
        "request",
        "output_type",
        "has_file",
        "has_text",
        "expires_at",
        "created_at",
    ]
    list_filter = ["output_type"]
    search_fields = ["request__id"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["request"]
    ordering = ["-created_at"]

    fieldsets = (
        (
            "Output Info",
            {
                "fields": ("request", "output_type"),
            },
        ),
        (
            "Content",
            {
                "fields": ("file_id", "text_content"),
                "classes": ("wide",),
            },
        ),
        (
            "Retention",
            {
                "fields": ("expires_at", "created_at"),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("metadata",),
                "classes": ("collapse",),
            },
        ),
    )

    def has_file(self, obj: GenerationOutput) -> bool:
        """Display whether output has file content."""
        return obj.file_id is not None

    has_file.boolean = True
    has_file.short_description = "Has File"

    def has_text(self, obj: GenerationOutput) -> bool:
        """Display whether output has text content."""
        return bool(obj.text_content)

    has_text.boolean = True
    has_text.short_description = "Has Text"
