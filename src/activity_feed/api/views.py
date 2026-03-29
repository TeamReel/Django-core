"""
B62: Activity Feed — Views

Provides:
- ActivityFeedViewSet: Read-only feed with cursor pagination, filtering, and aggregation.
- Custom actions: ``unread_count`` and ``mark_read``.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from activity_feed.models import ActivityLog, FeedPosition
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .pagination import ActivityFeedCursorPagination
from .permissions import ActivityFeedPermission
from .serializers import (
    ActivityLogGroupSerializer,
    ActivityLogSerializer,
    MarkReadSerializer,
    UnreadCountSerializer,
)

logger = logging.getLogger(__name__)

# Aggregation window: events of the same verb within this window are grouped
AGGREGATION_WINDOW = timedelta(minutes=5)


def _resolve_organisation(request):
    """
    Resolve the organisation from request context.

    Checks (in order):
    1. ``organisation_id`` query parameter
    2. ``X-Organization-ID`` header
    3. User's first active membership (fallback)

    Returns the Organisation instance or None.
    """
    from organisations.models import Membership, Organisation

    org_id = (
        request.query_params.get("organisation_id")
        or request.query_params.get("org_id")
        or request.headers.get("X-Organization-ID")
    )

    if org_id:
        try:
            # Validate user is member of this org
            if request.user.is_staff or request.user.is_superuser:
                return Organisation.objects.filter(id=org_id).first()

            membership = (
                Membership.objects.filter(
                    user=request.user,
                    organisation_id=org_id,
                    is_active=True,
                )
                .select_related("organisation")
                .first()
            )

            return membership.organisation if membership else None
        except Exception:
            return None

    # Fallback: first active membership
    membership = (
        Membership.objects.filter(
            user=request.user,
            is_active=True,
        )
        .select_related("organisation")
        .first()
    )

    return membership.organisation if membership else None


class ActivityFeedViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    Read-only feed of organisation-wide activity events.

    Endpoints:
    - GET /api/v1/activity-feed/           — Paginated feed (cursor-based)
    - GET /api/v1/activity-feed/?project=<id>  — Feed filtered by project
    - GET /api/v1/activity-feed/?verb=content.created  — Feed filtered by verb
    - GET /api/v1/activity-feed/?grouped=true  — Aggregated feed (5-min windows)
    - GET /api/v1/activity-feed/unread-count/  — Unread event count
    - POST /api/v1/activity-feed/mark-read/    — Mark feed as read
    """

    serializer_class = ActivityLogSerializer
    pagination_class = ActivityFeedCursorPagination
    permission_classes = [ActivityFeedPermission]

    def get_queryset(self):
        """
        Return activity logs scoped to the user's organisation.

        Organisation resolved from query param, header, or membership.

        Supports query params:
        - ``organisation_id``: UUID — scope to this org
        - ``project``: UUID — filter by project
        - ``verb``: str — filter by verb type
        - ``actor``: UUID — filter by actor
        """
        org = _resolve_organisation(self.request)

        if org is None:
            return ActivityLog.objects.none()

        qs = ActivityLog.objects.filter(
            organisation=org,
        ).select_related(
            "actor",
            "organisation",
            "project",
            "target_content_type",
        )

        # Optional filters
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)

        verb = self.request.query_params.get("verb")
        if verb:
            qs = qs.filter(verb=verb)

        actor_id = self.request.query_params.get("actor")
        if actor_id:
            qs = qs.filter(actor_id=actor_id)

        return qs

    def list(self, request, *args, **kwargs):
        """
        Return paginated feed, optionally with on-read aggregation.

        Pass ``?grouped=true`` to get events grouped by verb within 5-min windows.
        """
        if request.query_params.get("grouped", "").lower() == "true":
            return self._grouped_list(request)
        return super().list(request, *args, **kwargs)

    def _grouped_list(self, request):
        """
        On-read aggregation: group events by verb within AGGREGATION_WINDOW.

        This is computed at read-time (no pre-aggregation needed).
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Paginate first, then group the page
        page = self.paginate_queryset(queryset)
        if page is None:
            page = list(queryset[: self.pagination_class.page_size])

        groups = self._aggregate_events(page)
        serializer = ActivityLogGroupSerializer(groups, many=True)
        return self.get_paginated_response(serializer.data)

    @staticmethod
    def _aggregate_events(events: list[ActivityLog]) -> list[dict]:
        """
        Group events by verb within 5-minute windows.

        Returns a list of group dicts compatible with ActivityLogGroupSerializer.
        """
        if not events:
            return []

        groups: list[dict] = []
        current_group: dict | None = None

        for event in events:
            if (
                current_group is not None
                and current_group["verb"] == event.verb
                and (current_group["first_at"] - event.created_at) <= AGGREGATION_WINDOW
            ):
                current_group["events"].append(event)
                current_group["count"] += 1
                current_group["last_at"] = event.created_at
            else:
                if current_group is not None:
                    groups.append(current_group)
                current_group = {
                    "verb": event.verb,
                    "count": 1,
                    "events": [event],
                    "first_at": event.created_at,
                    "last_at": event.created_at,
                }

        if current_group is not None:
            groups.append(current_group)

        return groups

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """
        Return the number of unread events for the current user.

        Unread = events created after the user's last FeedPosition.last_read_at.
        """
        org = _resolve_organisation(request)

        if org is None:
            return Response(
                {"unread_count": 0, "last_read_at": None},
                status=status.HTTP_200_OK,
            )

        position = FeedPosition.objects.filter(user=request.user, organisation=org).first()

        last_read_at = position.last_read_at if position else None

        qs = ActivityLog.objects.filter(organisation=org)
        if last_read_at:
            qs = qs.filter(created_at__gt=last_read_at)

        count = qs.count()

        serializer = UnreadCountSerializer({"unread_count": count, "last_read_at": last_read_at})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        """
        Mark the feed as read up to a given timestamp (default: now).

        Creates or updates the user's FeedPosition for their current org.
        """
        org = _resolve_organisation(request)

        if org is None:
            return Response(
                {"detail": "No active organisation. Pass organisation_id or X-Organization-ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = MarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        last_read_at = serializer.validated_data.get("last_read_at") or timezone.now()

        position, created = FeedPosition.objects.update_or_create(
            user=request.user,
            organisation=org,
            defaults={"last_read_at": last_read_at},
        )

        return Response(
            {
                "last_read_at": position.last_read_at,
                "created": created,
            },
            status=status.HTTP_200_OK,
        )
