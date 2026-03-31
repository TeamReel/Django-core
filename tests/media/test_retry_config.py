"""Tests for retry configuration module."""
from __future__ import annotations

from unittest.mock import patch

import pytest

from src.media.validation.retry_config import (
    GEMINI_RETRY,
    TRANSIENT_EXCEPTIONS,
    create_retry_decorator,
    log_retry_attempt,
)

# ---------------------------------------------------------------------------
# TestCreateRetryDecorator
# ---------------------------------------------------------------------------


class TestCreateRetryDecorator:
    """Tests for the factory that produces retry decorators."""

    def test_succeeds_first_try(self) -> None:
        """No retry needed when first call succeeds."""
        call_count = 0

        @GEMINI_RETRY
        def always_succeeds() -> str:
            nonlocal call_count
            call_count += 1
            return "ok"

        assert always_succeeds() == "ok"
        assert call_count == 1

    def test_retries_on_connection_error(self) -> None:
        """Retries on ConnectionError and eventually succeeds."""
        call_count = 0

        @GEMINI_RETRY
        def flaky() -> str:
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("reset")
            return "ok"

        assert flaky() == "ok"
        assert call_count == 3

    def test_retries_on_timeout_error(self) -> None:
        """Retries on TimeoutError."""
        call_count = 0

        @GEMINI_RETRY
        def slow() -> str:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise TimeoutError("timed out")
            return "ok"

        assert slow() == "ok"
        assert call_count == 2

    def test_gives_up_after_max_attempts(self) -> None:
        """Stops after 3 attempts and re-raises."""
        call_count = 0

        @GEMINI_RETRY
        def always_fails() -> None:
            nonlocal call_count
            call_count += 1
            raise ConnectionError("gone")

        with pytest.raises(ConnectionError, match="gone"):
            always_fails()

        assert call_count == 3

    def test_does_not_retry_non_transient(self) -> None:
        """Non-transient errors propagate immediately."""
        call_count = 0

        @GEMINI_RETRY
        def bad_input() -> None:
            nonlocal call_count
            call_count += 1
            raise ValueError("invalid")

        with pytest.raises(ValueError, match="invalid"):
            bad_input()

        assert call_count == 1

    def test_custom_max_attempts(self) -> None:
        """Custom decorator respects max_attempts."""
        custom = create_retry_decorator(
            max_attempts=2,
            exceptions=(ValueError,),
        )
        call_count = 0

        @custom
        def fails() -> None:
            nonlocal call_count
            call_count += 1
            raise ValueError("test")

        with pytest.raises(ValueError):
            fails()

        assert call_count == 2

    def test_custom_exceptions(self) -> None:
        """Custom decorator only retries specified exceptions."""
        custom = create_retry_decorator(
            max_attempts=3,
            exceptions=(TypeError,),
        )
        call_count = 0

        @custom
        def wrong_error() -> None:
            nonlocal call_count
            call_count += 1
            raise ValueError("not retried")

        with pytest.raises(ValueError):
            wrong_error()

        assert call_count == 1  # No retry


# ---------------------------------------------------------------------------
# TestTransientExceptions
# ---------------------------------------------------------------------------


class TestTransientExceptions:
    """Verify the exception tuple contents."""

    def test_includes_builtin_errors(self) -> None:
        assert ConnectionError in TRANSIENT_EXCEPTIONS
        assert TimeoutError in TRANSIENT_EXCEPTIONS

    def test_google_errors_if_available(self) -> None:
        """Google API exceptions included when google.api_core is installed."""
        try:
            from google.api_core.exceptions import (
                DeadlineExceeded,
                ResourceExhausted,
                ServiceUnavailable,
            )

            assert ResourceExhausted in TRANSIENT_EXCEPTIONS
            assert ServiceUnavailable in TRANSIENT_EXCEPTIONS
            assert DeadlineExceeded in TRANSIENT_EXCEPTIONS
        except ImportError:
            pytest.skip("google.api_core not installed")


# ---------------------------------------------------------------------------
# TestGeminiRetryWithGoogleExceptions
# ---------------------------------------------------------------------------


class TestGeminiRetryWithGoogleExceptions:
    """Integration tests using real Google API exception types."""

    @pytest.fixture(autouse=True)
    def _skip_without_google(self) -> None:
        try:
            from google.api_core.exceptions import ResourceExhausted  # noqa: F401
        except ImportError:
            pytest.skip("google.api_core not installed")

    def test_retries_on_rate_limit(self) -> None:
        from google.api_core.exceptions import ResourceExhausted

        call_count = 0

        @GEMINI_RETRY
        def rate_limited() -> str:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ResourceExhausted("429")
            return "ok"

        assert rate_limited() == "ok"
        assert call_count == 2

    def test_retries_on_service_unavailable(self) -> None:
        from google.api_core.exceptions import ServiceUnavailable

        call_count = 0

        @GEMINI_RETRY
        def unavailable() -> str:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ServiceUnavailable("503")
            return "ok"

        assert unavailable() == "ok"
        assert call_count == 2


# ---------------------------------------------------------------------------
# TestLogRetryAttempt
# ---------------------------------------------------------------------------


class TestLogRetryAttempt:
    """Tests for the retry logging callback."""

    def test_logs_warning(self) -> None:
        """log_retry_attempt emits a warning log."""
        from unittest.mock import MagicMock

        state = MagicMock()
        state.outcome.exception.return_value = ConnectionError("test")
        state.attempt_number = 2
        state.next_action.sleep = 2.0

        with patch("src.media.validation.retry_config.logger") as mock_logger:
            log_retry_attempt(state)
            mock_logger.warning.assert_called_once()
            args = mock_logger.warning.call_args
            assert "retry" in args[0][0].lower()
            assert args[0][1] == 2  # attempt number


# ---------------------------------------------------------------------------
# TestRetryTiming
# ---------------------------------------------------------------------------


class TestRetryTiming:
    """Verify exponential backoff behaviour."""

    def test_backoff_increases(self) -> None:
        """Wait times increase exponentially: ~1s, ~2s, ~4s."""
        from tenacity import wait_exponential

        wait = wait_exponential(multiplier=1, min=1, max=8)

        # attempt_number is 1-indexed; wait is computed *before* next attempt
        w1 = wait(retry_state=self._make_state(attempt=1))
        w2 = wait(retry_state=self._make_state(attempt=2))
        w3 = wait(retry_state=self._make_state(attempt=3))

        assert w1 <= w2 <= w3
        assert w1 >= 1
        assert w3 <= 8

    @staticmethod
    def _make_state(attempt: int):
        from unittest.mock import MagicMock

        state = MagicMock()
        state.attempt_number = attempt
        return state
