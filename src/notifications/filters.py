"""Filters for notifications API."""

import django_filters
from django.db.models import Q
from notifications.models import Notification


class NotificationFilter(django_filters.FilterSet):
    """
    Filters for notification history queries.

    Supported filters:
    - status: exact match (pending, sent, failed, read)
    - type: notification type code (exact match)
    - channel: delivery channel (email, in_app, webhook)
    - recipient: exact or partial match
    - date_from: created_at >= date
    - date_to: created_at <= date
    - search: search across recipient and type code
    """

    status = django_filters.ChoiceFilter(
        field_name="status",
        choices=[
            ("pending", "Pending"),
            ("sent", "Sent"),
            ("failed", "Failed"),
        ],
    )
    type = django_filters.CharFilter(
        field_name="type__code",
        lookup_expr="iexact",
    )
    channel = django_filters.ChoiceFilter(
        field_name="channel",
        choices=[
            ("email", "Email"),
            ("in_app", "In-App"),
            ("webhook", "Webhook"),
        ],
    )
    recipient = django_filters.CharFilter(
        field_name="recipient",
        lookup_expr="icontains",
    )
    date_from = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="gte",
    )
    date_to = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="lte",
    )
    unread = django_filters.BooleanFilter(
        field_name="read_at",
        lookup_expr="isnull",
        label="Show only unread notifications",
    )
    read = django_filters.BooleanFilter(
        field_name="read_at",
        lookup_expr="isnull",
        exclude=True,
        label="Show only read notifications",
    )
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = Notification
        fields = [
            "status",
            "type",
            "channel",
            "recipient",
            "date_from",
            "date_to",
            "unread",
            "read",
        ]

    def filter_search(self, queryset, name, value):  # noqa: ARG002
        """
        Search across multiple fields.

        Searches:
        - recipient (case-insensitive contains)
        - type.code (case-insensitive contains)
        - type.name (case-insensitive contains)
        """
        return queryset.filter(
            Q(recipient__icontains=value)
            | Q(type__code__icontains=value)
            | Q(type__name__icontains=value)
        )
