"""B14 Full-Text Search integration for B30 Activities & Period Hierarchy."""

from django.db.models import CharField
from django.db.models.functions import Cast
from search.registry import SearchIndex

from .models import Activity, Period


class PeriodIndex(SearchIndex):
    """Search index configuration for Period model."""

    model = Period

    def get_body_text(self, obj):
        """Returns the full text content to be indexed."""
        # Include project and organisation names to make seasons findable by club name
        parts = [
            obj.name,
            obj.description or "",
            obj.project.name if obj.project else "",
            obj.organisation.name,
        ]
        return " ".join(filter(None, parts))

    def get_title(self, obj):
        """Returns the title for the search result."""
        return obj.name

    def get_description(self, obj):
        """Returns the description for the search result."""
        date_range = f"{obj.start_date} to {obj.end_date}"
        if obj.project:
            return f"Period in {obj.project.name}: {date_range}"
        return f"Period in {obj.organisation.name}: {date_range}"

    def get_url(self, obj):
        """Returns the relative URL to the resource."""
        # Periods don't have a dedicated detail view yet, link to admin
        return f"/admin/activities/period/{obj.pk}/change/"

    def get_visible_ids(self, user):
        """
        Returns a list of Period IDs visible to the given user.
        Users can see periods in their organisations.
        """
        if user.is_superuser:
            return Period.objects.annotate(id_str=Cast("id", CharField())).values_list(
                "id_str", flat=True
            )

        # Users can see periods in organisations they're members of
        return (
            Period.objects.filter(
                organisation__memberships__user=user,
                organisation__memberships__is_active=True,
            )
            .distinct()
            .annotate(id_str=Cast("id", CharField()))
            .values_list("id_str", flat=True)
        )


class ActivityIndex(SearchIndex):
    """Search index configuration for Activity model."""

    model = Activity

    def get_body_text(self, obj):
        """Returns the full text content to be indexed."""
        # Include names of participants (teams) and context (competition/season)
        parts = [
            obj.title,
            obj.description or "",
            obj.location or "",
            obj.activity_type,
            obj.project.name if obj.project else "",
            obj.opponent_project.name if obj.opponent_project else "",
            obj.period.name if obj.period else "",
        ]
        return " ".join(filter(None, parts))

    def get_title(self, obj):
        """Returns the title for the search result."""
        return obj.title

    def get_description(self, obj):
        """Returns the description for the search result."""
        time_str = obj.start_time.strftime("%Y-%m-%d %H:%M")
        location_str = f" at {obj.location}" if obj.location else ""
        return f"{obj.activity_type} on {time_str}{location_str}"

    def get_url(self, obj):
        """Returns the relative URL to the resource."""
        # TeamReel: match activities have a dedicated frontend route.
        if getattr(obj, "activity_type", None) == "match":
            key = getattr(obj, "slug", None) or str(obj.pk)
            return f"/matches/{key}"

        # Other activity types don't have a dedicated detail view yet.
        return f"/admin/activities/activity/{obj.pk}/change/"

    def get_visible_ids(self, user):
        """
        Returns a list of Activity IDs visible to the given user.
        Users can see activities in their project periods.
        """
        if user.is_superuser:
            return Activity.objects.annotate(id_str=Cast("id", CharField())).values_list(
                "id_str", flat=True
            )

        # Users can see activities in periods/projects they have access to
        # This is simplified - a full implementation would check project permissions
        return (
            Activity.objects.filter(
                period__organisation__memberships__user=user,
                period__organisation__memberships__is_active=True,
            )
            .distinct()
            .annotate(id_str=Cast("id", CharField()))
            .values_list("id_str", flat=True)
        )
