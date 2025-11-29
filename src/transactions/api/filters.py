"""Django-filter classes for transactions API."""

import django_filters

from src.transactions.models import SourceTypeChoices, Transaction, UsageEvent


class UsageEventFilter(django_filters.FilterSet):
    """Filter for UsageEvent queryset."""

    organization_id = django_filters.UUIDFilter(field_name="organization__id")
    project_id = django_filters.UUIDFilter(field_name="project__id")
    event_type = django_filters.CharFilter(field_name="event_type", lookup_expr="iexact")
    unbilled = django_filters.BooleanFilter(method="filter_unbilled")
    start_date = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    end_date = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        """Filter metadata."""

        model = UsageEvent
        fields = [
            "organization_id",
            "project_id",
            "event_type",
            "unbilled",
            "start_date",
            "end_date",
        ]

    def filter_unbilled(self, queryset, name, value):  # noqa: ARG002
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
    project_id = django_filters.UUIDFilter(field_name="project__id")
    source_type = django_filters.ChoiceFilter(
        field_name="source_type",
        choices=SourceTypeChoices.choices,
    )
    start_date = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    end_date = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        """Filter metadata."""

        model = Transaction
        fields = ["organization_id", "project_id", "source_type", "start_date", "end_date"]
