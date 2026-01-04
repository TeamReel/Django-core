"""Circuit Breaker pattern for resilient Redis connections."""

from __future__ import annotations

import time
from enum import Enum
from typing import Callable, TypeVar

T = TypeVar("T")


class CircuitState(Enum):
    """States for the circuit breaker."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Circuit is broken, skip Redis
    HALF_OPEN = "half_open"  # Testing if Redis is back


class CircuitBreaker:
    """
    Local in-memory circuit breaker for Redis connections.

    Implements a state machine with three states:
    - CLOSED: Normal operation, calls go to Redis
    - OPEN: Redis is down, calls fallback to DB
    - HALF_OPEN: Testing if Redis is back

    Args:
        failure_threshold: Number of consecutive failures before opening circuit
        timeout: Seconds to wait before attempting reset (Half-Open state)
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        timeout: int = 30,
    ) -> None:
        """Initialize the circuit breaker."""
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time: float | None = None
        self._state = CircuitState.CLOSED

    @property
    def state(self) -> CircuitState:
        """Get the current state, transitioning to HALF_OPEN if timeout expired."""
        if self._state == CircuitState.OPEN and self.last_failure_time is not None:
            if time.time() - self.last_failure_time >= self.timeout:
                self._state = CircuitState.HALF_OPEN
        return self._state

    def is_open(self) -> bool:
        """Check if circuit is open (Redis unavailable)."""
        return self.state == CircuitState.OPEN

    def record_success(self) -> None:
        """Record a successful call, reset failure count and close circuit."""
        self.failure_count = 0
        self.last_failure_time = None
        self._state = CircuitState.CLOSED

    def record_failure(self) -> None:
        """Record a failed call, potentially opening the circuit."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self._state = CircuitState.OPEN

    def call(
        self,
        func: Callable[[], T],
        fallback: Callable[[], T],
    ) -> T:
        """
        Execute a function with circuit breaker protection.

        Args:
            func: Function to execute (should call Redis)
            fallback: Fallback function if circuit is open or func fails

        Returns:
            Result from func or fallback
        """
        # If circuit is OPEN, skip Redis entirely
        if self.state == CircuitState.OPEN:
            return fallback()

        # Try to execute the function
        try:
            result = func()
            self.record_success()
            return result
        except Exception:  # noqa: BLE001
            self.record_failure()
            return fallback()
