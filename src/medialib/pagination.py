from rest_framework.pagination import CursorPagination


class MediaItemCursorPagination(CursorPagination):
    """
    Cursor-based pagination for MediaItems to ensure stable performance
    with large datasets and infinite scrolling UIs.
    """

    page_size = 24  # Divisible by 2, 3, 4, 6 for grid layouts
    ordering = "-created_at"
    page_size_query_param = "page_size"
    max_page_size = 100
