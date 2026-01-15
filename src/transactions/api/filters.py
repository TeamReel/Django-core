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
    # Project uses integer PK
    project_id = django_filters.NumberFilter(field_name="project__id")
    charged_user_id = django_filters.NumberFilter(field_name="charged_user__id")
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
            "charged_user_id",
            "source_type",
            "start_date",
            "end_date",
        ]
