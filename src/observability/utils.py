"""Utility functions for observability app."""

import signal
import threading
from contextlib import contextmanager
from typing import Generator


class TimeoutError(Exception):
    """Raised when a timeout expires."""
    pass


@contextmanager
def timeout(seconds: float) -> Generator[None, None, None]:
    """
    Context manager to enforce timeout on operations.
    
    Implements FR-005: 500ms timeout enforcement for health checks.
    Uses threading.Timer for cross-platform compatibility (signal.alarm is Unix-only).
    
    Args:
        seconds: Timeout duration in seconds (e.g., 0.5 for 500ms)
    
    Raises:
        TimeoutError: If operation exceeds timeout
    
    Example:
        >>> with timeout(0.5):
        ...     result = expensive_database_query()
    """
    def timeout_handler():
        raise TimeoutError(f"Operation exceeded {seconds}s timeout")
    
    # Create timer that will raise TimeoutError if it fires
    timer = threading.Timer(seconds, timeout_handler)
    
    try:
        timer.start()
        yield
    finally:
        timer.cancel()
