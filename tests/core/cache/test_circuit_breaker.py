"""Tests for the CircuitBreaker class."""

from __future__ import annotations

import time
from unittest.mock import Mock

from core.cache.circuit_breaker import CircuitBreaker, CircuitState


class TestCircuitBreaker:
    """Test suite for CircuitBreaker state machine."""

    def test_initial_state_is_closed(self) -> None:
        """Circuit breaker should start in CLOSED state."""
        cb = CircuitBreaker(failure_threshold=3, timeout=5)
        assert cb.state == CircuitState.CLOSED
        assert not cb.is_open()

    def test_successful_call_keeps_circuit_closed(self) -> None:
        """Successful calls should keep circuit closed."""
        cb = CircuitBreaker(failure_threshold=3, timeout=5)
        func = Mock(return_value="success")
        fallback = Mock(return_value="fallback")

        result = cb.call(func, fallback)

        assert result == "success"
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0
        func.assert_called_once()
        fallback.assert_not_called()

    def test_circuit_opens_after_threshold_failures(self) -> None:
        """Circuit should open after reaching failure threshold."""
        cb = CircuitBreaker(failure_threshold=3, timeout=5)
        func = Mock(side_effect=Exception("Redis down"))
        fallback = Mock(return_value="fallback")

        # First 2 failures - circuit stays closed
        cb.call(func, fallback)
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 1

        cb.call(func, fallback)
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 2

        # Third failure - circuit opens
        cb.call(func, fallback)
        assert cb.state == CircuitState.OPEN
        assert cb.failure_count == 3

    def test_open_circuit_skips_function_call(self) -> None:
        """When circuit is open, function should not be called."""
        cb = CircuitBreaker(failure_threshold=2, timeout=5)
        func = Mock(side_effect=Exception("Redis down"))
        fallback = Mock(return_value="fallback")

        # Open the circuit
        cb.call(func, fallback)
        cb.call(func, fallback)
        assert cb.state == CircuitState.OPEN

        # Reset mocks
        func.reset_mock()
        fallback.reset_mock()

        # Next call should skip func entirely
        result = cb.call(func, fallback)
        assert result == "fallback"
        func.assert_not_called()
        fallback.assert_called_once()

    def test_circuit_transitions_to_half_open_after_timeout(self) -> None:
        """Circuit should transition to HALF_OPEN after timeout expires."""
        cb = CircuitBreaker(failure_threshold=2, timeout=1)  # 1 second timeout
        func = Mock(side_effect=Exception("Redis down"))
        fallback = Mock(return_value="fallback")

        # Open the circuit
        cb.call(func, fallback)
        cb.call(func, fallback)
        assert cb.state == CircuitState.OPEN

        # Wait for timeout
        time.sleep(1.1)

        # Check state transitions to HALF_OPEN
        assert cb.state == CircuitState.HALF_OPEN

    def test_successful_call_in_half_open_closes_circuit(self) -> None:
        """Successful call in HALF_OPEN state should close the circuit."""
        cb = CircuitBreaker(failure_threshold=2, timeout=1)
        func = Mock(side_effect=Exception("Redis down"))
        fallback = Mock(return_value="fallback")

        # Open the circuit
        cb.call(func, fallback)
        cb.call(func, fallback)
        assert cb.state == CircuitState.OPEN

        # Wait for timeout
        time.sleep(1.1)
        assert cb.state == CircuitState.HALF_OPEN

        # Successful call should close circuit
        func.side_effect = None
        func.return_value = "success"
        result = cb.call(func, fallback)

        assert result == "success"
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0

    def test_failed_call_in_half_open_reopens_circuit(self) -> None:
        """Failed call in HALF_OPEN state should reopen the circuit."""
        cb = CircuitBreaker(failure_threshold=2, timeout=1)
        func = Mock(side_effect=Exception("Redis down"))
        fallback = Mock(return_value="fallback")

        # Open the circuit
        cb.call(func, fallback)
        cb.call(func, fallback)
        assert cb.state == CircuitState.OPEN

        # Wait for timeout
        time.sleep(1.1)
        assert cb.state == CircuitState.HALF_OPEN

        # Failed call should reopen circuit
        result = cb.call(func, fallback)

        assert result == "fallback"
        assert cb.state == CircuitState.OPEN
        assert cb.failure_count == 3

    def test_record_success_resets_failure_count(self) -> None:
        """Recording success should reset failure count."""
        cb = CircuitBreaker(failure_threshold=3, timeout=5)
        func = Mock(side_effect=Exception("Redis down"))
        fallback = Mock(return_value="fallback")

        # Record 2 failures
        cb.call(func, fallback)
        cb.call(func, fallback)
        assert cb.failure_count == 2

        # Record success
        cb.record_success()
        assert cb.failure_count == 0
        assert cb.state == CircuitState.CLOSED

    def test_fallback_called_on_exception(self) -> None:
        """Fallback should be called when function raises exception."""
        cb = CircuitBreaker(failure_threshold=3, timeout=5)
        func = Mock(side_effect=ValueError("Test error"))
        fallback = Mock(return_value="fallback_result")

        result = cb.call(func, fallback)

        assert result == "fallback_result"
        func.assert_called_once()
        fallback.assert_called_once()
        assert cb.failure_count == 1
