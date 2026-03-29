"""Django-filter classes for transactions API."""

import django_filters
from transactions.models import SourceTypeChoices, Transaction, UsageEvent


class UsageEventFilter(django_filters.FilterSet):
    """Filter for UsageEvent queryset."""

    organization_id = django_filters.UUIDFilter(field_name="organization__id")
    # Project uses integer PK
    project_id = django_filters.NumberFilter(field_name="project__id")
    event_type = django_filters.CharFilter(field_name="event_type", lookup_expr="iexact")
    user__email__icontains = django_filters.CharFilter(
        field_name="user__email", lookup_expr="icontains"
    )
    unbilled = django_filters.BooleanFilter(method="filter_unbilled")
    start_date = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    end_date = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")
    timestamp__gte = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    timestamp__lte = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        """Filter metadata."""

        model = UsageEvent
        fields = [
            "organization_id",
            "project_id",
            "event_type",
            "user__email__icontains",
            "unbilled",
            "start_date",
            "end_date",
            "timestamp__gte",
            "timestamp__lte",
        ]

    def filter_unbilled(self, queryset, _name, value):
        """Filter for usage events not linked to transactions."""
        if value:
            # Return events with no associated transactions
            return queryset.filter(transactions__isnull=True)
        else:
            # Return events with at least one transaction
            return queryset.filter(transactions__isnull=False)


class TransactionFilter(django_filters.FilterSet):
    """Filter for Transaction queryset."""

    organization_id = django_filters.UUIDFilter(field_name="organization__id")
    # Project uses integer PK
    project_id = django_filters.NumberFilter(field_name="project__id")
    project_id__in = django_filters.CharFilter(method="filter_project_id_in")
    charged_user_id = django_filters.NumberFilter(field_name="charged_user__id")

    # TeamReel hierarchy filters (stored on usage_event.metadata)
    # See: seed_teamreel_contentgen_demo usage_metadata keys.
    season_id = django_filters.UUIDFilter(method="filter_season_id")
    period_id = django_filters.UUIDFilter(method="filter_period_id")
    activity_id = django_filters.UUIDFilter(method="filter_activity_id")
    source_type = django_filters.ChoiceFilter(
        field_name="source_type",
        choices=SourceTypeChoices.choices,
    )
    start_date = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    end_date = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        """Filter metadata."""

        model = Transaction
        fields = [
            "organization_id",
            "project_id",
            "project_id__in",
            "charged_user_id",
            "season_id",
            "period_id",
            "activity_id",
            "source_type",
            "start_date",
            "end_date",
        ]

    def filter_project_id_in(self, queryset, _name, value):
        """Filter by a comma-separated list of project ids.

        Matches the existing pattern used elsewhere in the demo (e.g. periods).
        Example: ?project_id__in=1,2,3
        """
        if not value:
            return queryset
        raw_parts = [p.strip() for p in str(value).split(",") if p and p.strip()]
        ids: list[int] = []
        for part in raw_parts:
            try:
                ids.append(int(part))
            except ValueError:
                continue
        if not ids:
            return queryset
        return queryset.filter(project__id__in=ids)

    def filter_season_id(self, queryset, _name, value):
        if not value:
            return queryset
        return queryset.filter(usage_event__metadata__season_id=str(value))

    def filter_period_id(self, queryset, _name, value):
        if not value:
            return queryset
        return queryset.filter(usage_event__metadata__period_id=str(value))

    def filter_activity_id(self, queryset, _name, value):
        if not value:
            return queryset
        return queryset.filter(usage_event__metadata__activity_id=str(value))
