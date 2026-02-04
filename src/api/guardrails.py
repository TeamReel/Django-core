"""
B40 Frontend Performance Guardrails

Pagination guardrails to prevent frontend over-fetching.
Provides:
- FetchBudget: Runtime object tracking pagination budget per request
- PaginationLimitExceeded: Custom exception for limit violations
- get_guardrail_config(): Configuration resolver (settings + feature flags + overrides)
- log_budget_event(): Structured logging for observability
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from django.conf import settings
from rest_framework.exceptions import APIException

if TYPE_CHECKING:
    from django.http import HttpRequest

logger = logging.getLogger(__name__)


# =============================================================================
# T004: FetchBudget Dataclass
# =============================================================================


@dataclass
class FetchBudget:
    """Tracks pagination budget for a single request."""

    max_pages: int
    max_items: int
    current_page: int
    page_size: int
    is_limited: bool

    @property
    def usage_percent(self) -> float:
        """Calculate budget usage as percentage (0-100)."""
        if not self.is_limited or self.max_pages == 0:
            return 0.0
        return (self.current_page / self.max_pages) * 100

    def to_header_dict(self) -> dict[str, int | bool]:
        """Format for X-Fetch-Budget header."""
        return {
            "max_pages": self.max_pages,
            "max_items": self.max_items,
            "current_page": self.current_page,
            "is_limited": self.is_limited,
        }

    def to_header_json(self) -> str:
        """JSON string for HTTP header."""
        return json.dumps(self.to_header_dict())


# =============================================================================
# T007: PaginationLimitExceeded Exception
# =============================================================================


class PaginationLimitExceeded(APIException):
    """Raised when pagination limit is exceeded."""

    status_code = 400
    default_detail = "Pagination limit exceeded"
    default_code = "pagination_limit_exceeded"

    def __init__(self, requested_page: int, max_pages: int, limit_type: str = "max_pages"):
        """Initialize exception with structured error response.

        Args:
            requested_page: The page number that was requested
            max_pages: The maximum allowed page number
            limit_type: Type of limit ('max_pages' or 'max_items')
        """
        detail = {
            "status": "error",
            "error": {
                "code": "pagination_limit_exceeded",
                "message": f"Page {requested_page} exceeds maximum allowed pages ({max_pages})",
                "details": {
                    "requested_page": requested_page,
                    "max_pages": max_pages,
                    "limit_type": limit_type,
                },
            },
        }
        super().__init__(detail=detail)


# =============================================================================
# T008/T009: Feature Flag & Override Resolution
# =============================================================================


def _find_endpoint_override(path: str, overrides: dict) -> dict:
    """Find matching override, preferring exact match over prefix.

    Args:
        path: Request path (e.g. '/api/v1/activities/')
        overrides: Dict of path patterns to override configs

    Returns:
        Override dict with 'max_pages' and/or 'max_items' keys, or {}
    """
    # Exact match first
    if path in overrides:
        return overrides[path]

    # Prefix match (longest prefix wins)
    matching = [(k, v) for k, v in overrides.items() if path.startswith(k)]
    if matching:
        matching.sort(key=lambda x: len(x[0]), reverse=True)
        return matching[0][1]

    return {}


def get_guardrail_config(request: HttpRequest) -> dict[str, int | bool]:
    """Get guardrail configuration, respecting feature flags and per-endpoint overrides.

    Priority (highest to lowest):
    1. Per-endpoint override
    2. Feature flag
    3. Django setting
    4. Built-in default

    Args:
        request: Django HTTP request

    Returns:
        Dict with keys:
        - 'enabled': bool - Master switch
        - 'max_pages': int - Maximum page number allowed
        - 'max_items': int - Maximum total items allowed
    """
    try:
        from settings.api import get_flag
    except ImportError:
        # Fallback if B10 not available
        get_flag = None

    # Check master switch (feature flag > setting)
    if get_flag:
        enabled = get_flag(
            "frontend_fetch_guardrails_enabled",
            default=getattr(settings, "FETCH_GUARDRAIL_ENABLED", True),
        )
    else:
        enabled = getattr(settings, "FETCH_GUARDRAIL_ENABLED", True)

    # Get limits (feature flag > per-endpoint override > default setting)
    if get_flag:
        default_max_pages = get_flag(
            "frontend_fetch_max_pages_default",
            default=getattr(settings, "FETCH_GUARDRAIL_MAX_PAGES", 5),
        )
        default_max_items = get_flag(
            "frontend_fetch_max_items_default",
            default=getattr(settings, "FETCH_GUARDRAIL_MAX_ITEMS", 500),
        )
    else:
        default_max_pages = getattr(settings, "FETCH_GUARDRAIL_MAX_PAGES", 5)
        default_max_items = getattr(settings, "FETCH_GUARDRAIL_MAX_ITEMS", 500)

    # Check for per-endpoint override
    overrides = getattr(settings, "FETCH_GUARDRAIL_OVERRIDES", {})
    endpoint_config = _find_endpoint_override(request.path, overrides)

    return {
        "enabled": enabled,
        "max_pages": endpoint_config.get("max_pages", default_max_pages),
        "max_items": endpoint_config.get("max_items", default_max_items),
    }


# =============================================================================
# T010: Observability Logging
# =============================================================================


def log_budget_event(
    event_type: str, request: HttpRequest, requested_page: int, config: dict
) -> None:
    """Log a guardrail event for observability.

    Args:
        event_type: Type of event ('exceeded', 'warning')
        request: Django HTTP request
        requested_page: The page number involved in the event
        config: Guardrail config dict
    """
    try:
        from settings.api import get_flag
    except ImportError:
        get_flag = None

    # Check if observability is enabled
    if get_flag:
        enabled = get_flag(
            "frontend_fetch_observability_enabled",
            default=getattr(settings, "FETCH_GUARDRAIL_OBSERVABILITY_ENABLED", True),
        )
    else:
        enabled = getattr(settings, "FETCH_GUARDRAIL_OBSERVABILITY_ENABLED", True)

    if not enabled:
        return

    # Build log context
    user_id = None
    org_id = None
    if hasattr(request, "user") and request.user:
        user_id = getattr(request.user, "id", None)
        org_id = getattr(request.user, "organisation_id", None)

    extra = {
        "event": f"fetch_budget_{event_type}",
        "endpoint": request.path,
        "limit_type": "max_pages",
        "requested": requested_page,
        "limit": config.get("max_pages", 5),
        "user_id": user_id,
        "org_id": org_id,
    }

    if event_type == "exceeded":
        logger.warning(
            "fetch_budget_exceeded",
            extra=extra,
            stacklevel=2,
        )
    elif event_type == "warning":
        extra["usage_percent"] = (requested_page / config.get("max_pages", 5)) * 100
        logger.info(
            "fetch_budget_warning",
            extra=extra,
            stacklevel=2,
        )
