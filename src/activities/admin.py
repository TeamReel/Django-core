"""Django admin configuration for B30 Activities & Period Hierarchy."""

from django.contrib import admin

from .models import Activity, Participation, Period


class ChildPeriodInline(admin.TabularInline):
    """Inline admin for child periods."""

    model = Period
    fk_name = "parent_period"
    extra = 0
    fields = ["name", "start_date", "end_date"]
    show_change_link = True


@admin.register(Period)
class PeriodAdmin(admin.ModelAdmin):
    """Admin interface for Period model."""

    list_display = [
        "name",
        "organisation",
        "project",
        "parent_period",
        "start_date",
        "end_date",
        "children_count",
    ]
    list_filter = ["organisation", "project", "start_date"]
    search_fields = ["name", "description"]
    date_hierarchy = "start_date"
    inlines = [ChildPeriodInline]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    autocomplete_fields = ["organisation", "project", "parent_period"]

    def children_count(self, obj):
        """Return count of direct child periods."""
        return obj.children.count()

    children_count.short_description = "Children"


class ParticipationInline(admin.TabularInline):
    """Inline admin for activity participants."""

    model = Participation
    fk_name = "activity"
    extra = 0
    fields = ["member", "role", "status", "notes"]
    autocomplete_fields = ["member"]


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    """Admin interface for Activity model."""

    list_display = [
        "title",
        "project",
        "period",
        "activity_type",
        "start_time",
        "location",
    ]
    list_filter = ["project", "activity_type", "start_time"]
    search_fields = ["title", "description", "location"]
    date_hierarchy = "start_time"
    inlines = [ParticipationInline]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    autocomplete_fields = ["project", "period"]


@admin.register(Participation)
class ParticipationAdmin(admin.ModelAdmin):
    """Admin interface for Participation model."""

    list_display = ["member", "activity", "period", "role", "status", "created_at"]
    list_filter = ["role", "status", "created_at"]
    search_fields = ["member__user__username", "member__user__email", "notes"]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    autocomplete_fields = ["member", "activity", "period"]

    def get_queryset(self, request):
        """Optimize queryset with select_related to avoid N+1 queries."""
        qs = super().get_queryset(request)
        return qs.select_related("member", "activity", "period")
