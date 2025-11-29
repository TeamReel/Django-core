"""Django admin configuration for transactions app."""

from django.contrib import admin

from .models import BalancePolicy, Transaction, UsageEvent


@admin.register(UsageEvent)
class UsageEventAdmin(admin.ModelAdmin):
    """Admin interface for UsageEvent model."""

    list_display = [
        "id",
        "event_type",
        "organization",
        "project",
        "timestamp",
        "user",
    ]
    list_filter = ["event_type", "timestamp", "organization"]
    search_fields = ["id", "idempotency_key", "organization__name"]
    readonly_fields = ["id", "timestamp", "created_at"]
    date_hierarchy = "timestamp"
    ordering = ["-timestamp"]

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion - immutable records."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing - immutable records."""
        return False


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """Admin interface for Transaction model."""

    list_display = [
        "id",
        "amount",
        "organization",
        "project",
        "source_type",
        "timestamp",
        "created_by",
    ]
    list_filter = ["source_type", "timestamp", "organization"]
    search_fields = [
        "id",
        "idempotency_key",
        "organization__name",
        "external_reference_id",
    ]
    readonly_fields = ["id", "timestamp", "created_at"]
    date_hierarchy = "timestamp"
    ordering = ["-timestamp"]

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion - immutable records."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing - immutable records."""
        return False


@admin.register(BalancePolicy)
class BalancePolicyAdmin(admin.ModelAdmin):
    """Admin interface for BalancePolicy model."""

    list_display = [
        "id",
        "organization",
        "project",
        "allow_negative",
        "enforcement_mode",
        "updated_at",
    ]
    list_filter = ["allow_negative", "enforcement_mode", "updated_at"]
    search_fields = ["organization__name", "project__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
