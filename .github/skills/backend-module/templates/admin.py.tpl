"""Django admin configuration for B{NUMBER}: {MODULE_TITLE}."""

from django.contrib import admin

from .models import {MODEL_NAME}


@admin.register({MODEL_NAME})
class {MODEL_NAME}Admin(admin.ModelAdmin):
    list_display = ["{DISPLAY_FIELD}", "organisation", "created_at"]
    list_filter = ["organisation", "created_at"]
    search_fields = ["{DISPLAY_FIELD}"]
    readonly_fields = ["id", "created_at", "updated_at", "created_by"]
    autocomplete_fields = ["organisation"]
    date_hierarchy = "created_at"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("organisation", "created_by")
