"""API module: Core utilities for Django REST Framework integration.

Exports pagination guardrails, cache headers mixin, and optimistic create support.
"""

from .guardrails import (
    FetchBudget,
    PaginationLimitExceeded,
    get_guardrail_config,
    log_budget_event,
)
from .mixins import (
    CacheHeadersMixin,
    OptimisticCreateMixin,
)
from .pagination import BaseAPIPagination

__all__ = [
    # Pagination
    "BaseAPIPagination",
    # Guardrails
    "FetchBudget",
    "PaginationLimitExceeded",
    "get_guardrail_config",
    "log_budget_event",
    # Mixins
    "CacheHeadersMixin",
    "OptimisticCreateMixin",
]
