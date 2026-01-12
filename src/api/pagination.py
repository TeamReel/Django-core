from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class BaseAPIPagination(PageNumberPagination):
    """
    Base pagination class for all list endpoints.

    Configuration:
    - Default: 20 items per page
    - Maximum: 100 items per page (prevents abuse)
    - Query params: ?page=2&page_size=50

    Response format:
    {
        "status": "success",
        "data": [...],
        "meta": {
            "pagination": {
                "count": 42,
                "next": "http://api/v1/users/?page=3",
                "previous": "http://api/v1/users/?page=1",
                "page_size": 20
            }
        }
    }
    """

    page_size = 20  # Default from FR-014
    page_size_query_param = "page_size"  # Allow client override
    max_page_size = 100  # Maximum from FR-014

    def get_paginated_response(self, data: list[dict]) -> Response:
        """
        Return paginated response with metadata.
        Envelope wrapping handled by EnvelopeJSONRenderer (WP03).
        """
        # DRF does not mutate self.page_size when page_size_query_param is used.
        # Report the effective page size instead of the default.
        effective_page_size = (
            self.get_page_size(getattr(self, "request", None))
            or getattr(getattr(self, "page", None), "paginator", None).per_page
            or self.page_size
        )

        return Response(
            {
                "data": data,
                "meta": {
                    "pagination": {
                        "count": self.page.paginator.count,
                        "next": self.get_next_link(),
                        "previous": self.get_previous_link(),
                        "page_size": effective_page_size,
                    }
                },
            }
        )
