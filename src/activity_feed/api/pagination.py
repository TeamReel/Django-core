"""
B62: Activity Feed — Cursor-based Pagination

Uses DRF CursorPagination ordered by -created_at for consistent,
performant feed queries that work with infinite scrolling UIs.
"""

from rest_framework.pagination import CursorPagination


class ActivityFeedCursorPagination(CursorPagination):
    """
    Cursor-based pagination for the activity feed.

    Advantages over offset pagination:
    - Consistent results when new events are inserted.
    - No skipping or duplication during page navigation.
    - Stable performance regardless of page depth.
    """

    page_size = 20
    ordering = "-created_at"
    page_size_query_param = "page_size"
    max_page_size = 100
    cursor_query_param = "cursor"
