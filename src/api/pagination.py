from django.conf import settings
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .guardrails import (
    FetchBudget,
    PaginationLimitExceeded,
    get_guardrail_config,
    log_budget_event,
)


class BaseAPIPagination(PageNumberPagination):
    """
    Base pagination class for all list endpoints.

    Configuration:
    - Default: 20 items per page
    - Maximum: 100 items per page (prevents abuse)
    - Query params: ?page=2&page_size=50

    B40 Integration:
    - Enforces max_pages and max_items limits (when enabled)
    - Emits X-Fetch-Budget header on responses
    - Logs budget events for observability

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

    def paginate_queryset(self, queryset, request, view=None):
        """
        Override to check pagination limits BEFORE querying database.

        Implements B40 guardrails:
        - Check if page exceeds max_pages limit
        - Compute and store budget for header emission
        - Log if limit exceeded
        """
        # Store request for logging in get_paginated_response
        self._request = request

        # Get guardrail config (respects feature flags, settings, and per-endpoint overrides)
        config = get_guardrail_config(request)

        # Extract page number (without advancing to next page)
        try:
            page_number = self.get_page_number(request, self.page_size)
            page_number = int(page_number)
        except (TypeError, ValueError):
            page_number = 1

        # Check max_pages limit if guardrails enabled
        if config["enabled"] and page_number > config["max_pages"]:
            log_budget_event("exceeded", request, page_number, config)
            raise PaginationLimitExceeded(requested_page=page_number, max_pages=config["max_pages"])

        # Store budget for header emission in get_paginated_response()
        self._fetch_budget = FetchBudget(
            max_pages=config["max_pages"],
            max_items=config["max_items"],
            current_page=page_number,
            page_size=self.get_page_size(request) or self.page_size,
            is_limited=config["enabled"],
        )

        # Call parent to perform actual pagination
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data: list[dict]) -> Response:
        """
        Return paginated response with metadata and B40 budget info.

        Adds X-Fetch-Budget header to response.
        Logs warning if usage exceeds threshold.
        """
        # DRF does not mutate self.page_size when page_size_query_param is used.
        # Report the effective page size instead of the default.
        effective_page_size = (
            self.get_page_size(getattr(self, "request", None))
            or getattr(getattr(self, "page", None), "paginator", None).per_page
            or self.page_size
        )

        response = Response(
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

        # Add X-Fetch-Budget header if available (T006)
        if hasattr(self, "_fetch_budget") and self._fetch_budget:
            response["X-Fetch-Budget"] = self._fetch_budget.to_header_json()

            # Log warning if usage is high (T010)
            if self._fetch_budget.is_limited:
                threshold = getattr(settings, "FETCH_GUARDRAIL_WARNING_THRESHOLD", 0.8)
                if self._fetch_budget.usage_percent >= threshold * 100:
                    log_budget_event(
                        "warning",
                        self._request,
                        self._fetch_budget.current_page,
                        {
                            "max_pages": self._fetch_budget.max_pages,
                            "max_items": self._fetch_budget.max_items,
                        },
                    )

        return response
