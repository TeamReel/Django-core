"""Pagination configuration for notifications API."""

from rest_framework.pagination import PageNumberPagination


class NotificationPagination(PageNumberPagination):
    """
    Pagination for notification list views.

    Configuration:
    - Default page size: 50
    - Maximum page size: 100
    - Client can request page_size via query parameter
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100
