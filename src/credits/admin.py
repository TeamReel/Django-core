from django.contrib import admin

from .models import CreditsBalance


@admin.register(CreditsBalance)
class CreditsBalanceAdmin(admin.ModelAdmin):
    list_display = ["organisation", "current_balance", "updated_at"]
    list_filter = ["updated_at", "created_at"]
    search_fields = ["organisation__name"]
    readonly_fields = ["created_at", "updated_at"]
