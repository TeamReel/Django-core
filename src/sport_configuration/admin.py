"""Django admin configuration for Sport Configuration models."""

from django.contrib import admin

from .models import OutfitConfiguration, Sport, SportConfiguration


@admin.register(Sport)
class SportAdmin(admin.ModelAdmin):
    """Admin interface for Sport model."""

    list_display = ["name", "slug", "sport_icon", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["name"]

    fieldsets = (
        (None, {"fields": ("name", "slug", "sport_icon", "is_active")}),
        ("Federation", {"fields": ("federation_metadata",), "classes": ("collapse",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(SportConfiguration)
class SportConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for SportConfiguration model."""

    list_display = [
        "sport",
        "team_size_min",
        "team_size_max",
        "max_substitutes",
        "has_goalkeeper",
    ]
    list_select_related = ["sport"]
    search_fields = ["sport__name", "sport__slug"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (None, {"fields": ("sport",)}),
        (
            "Team Composition",
            {"fields": ("team_size_min", "team_size_max", "max_substitutes", "has_goalkeeper")},
        ),
        (
            "Positions & Formations",
            {"fields": ("positions", "formations", "outfit_types")},
        ),
        ("Additional", {"fields": ("metadata",), "classes": ("collapse",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(OutfitConfiguration)
class OutfitConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for OutfitConfiguration model."""

    list_display = ["project", "outfit_type", "badge_position", "is_active"]
    list_filter = ["outfit_type", "is_active"]
    list_select_related = ["project"]
    search_fields = ["project__name", "project__slug"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["project"]

    fieldsets = (
        (None, {"fields": ("project", "outfit_type", "is_active")}),
        ("Colors & Styling", {"fields": ("colors", "number_font", "badge_position")}),
        ("Sponsors", {"fields": ("sponsor_config",), "classes": ("collapse",)}),
        ("Additional", {"fields": ("metadata",), "classes": ("collapse",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )
