"""Retry configurations for AI providers using tenacity."""
from __future__ import annotations

import logging
from typing import Any, Callable, TypeVar

from tenacity import (
    RetryCallState,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    stop_after_delay,
    wait_exponential,
)

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])

# Default configuration
DEFAULT_MAX_ATTEMPTS = 3
DEFAULT_MAX_DELAY_SECONDS = 30
DEFAULT_MULTIPLIER = 1
DEFAULT_MIN_WAIT = 1
DEFAULT_MAX_WAIT = 8

# Build transient exception tuple dynamically — google.api_core may not
# be installed in every environment (dev, CI).
_TRANSIENT: list[type[BaseException]] = [
    ConnectionError,
    TimeoutError,
]

try:
    from google.api_core.exceptions import (
        DeadlineExceeded,
        ResourceExhausted,
        ServiceUnavailable,
    )

    _TRANSIENT.extend([ResourceExhausted, ServiceUnavailable, DeadlineExceeded])
except ImportError:  # pragma: no cover
    pass

try:
    import requests

    _TRANSIENT.extend([requests.ConnectionError, requests.Timeout])
except ImportError:  # pragma: no cover
    pass

TRANSIENT_EXCEPTIONS: tuple[type[BaseException], ...] = tuple(_TRANSIENT)


def log_retry_attempt(retry_state: RetryCallState) -> None:
    """Log retry attempts with useful context."""
    exception = retry_state.outcome.exception() if retry_state.outcome else None
    attempt = retry_state.attempt_number
    wait_time = retry_state.next_action.sleep if retry_state.next_action else 0

    logger.warning(
        "Gemini API retry attempt=%d exception=%s message=%s wait=%.1fs",
        attempt,
        type(exception).__name__ if exception else "unknown",
        str(exception)[:200] if exception else "",
        wait_time,
    )


def create_retry_decorator(
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    max_delay: int = DEFAULT_MAX_DELAY_SECONDS,
    exceptions: tuple[type[BaseException], ...] = TRANSIENT_EXCEPTIONS,
) -> Callable[[F], F]:
    """Create a retry decorator with custom configuration.

    Args:
        max_attempts: Maximum retry attempts (default 3).
        max_delay: Maximum total delay in seconds (default 30).
        exceptions: Tuple of exception types to retry on.

    Returns:
        Configured tenacity retry decorator.
    """
    return retry(  # type: ignore[return-value]
        stop=(stop_after_attempt(max_attempts) | stop_after_delay(max_delay)),
        wait=wait_exponential(
            multiplier=DEFAULT_MULTIPLIER,
            min=DEFAULT_MIN_WAIT,
            max=DEFAULT_MAX_WAIT,
        ),
        retry=retry_if_exception_type(exceptions),
        before_sleep=log_retry_attempt,
        reraise=True,
    )


# Pre-configured decorator for Gemini API calls
GEMINI_RETRY = create_retry_decorator(
    max_attempts=3,
    max_delay=30,
    exceptions=TRANSIENT_EXCEPTIONS,
)
