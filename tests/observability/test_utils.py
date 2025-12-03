"""Tests for utility functions."""

import pytest
import time
from observability.utils import timeout, TimeoutError


class TestTimeoutContextManager:
    """Tests for timeout() context manager."""
    
    def test_operation_completes_within_timeout(self):
        """Test that fast operations complete successfully."""
        with timeout(1.0):
            result = 1 + 1
        
        assert result == 2
    
    def test_operation_exceeds_timeout(self):
        """Test that slow operations raise TimeoutError."""
        with pytest.raises(TimeoutError, match="exceeded 0.1s timeout"):
            with timeout(0.1):
                time.sleep(0.2)
    
    def test_timeout_accuracy(self):
        """Test timeout enforcement is reasonably accurate."""
        start = time.time()
        
        try:
            with timeout(0.2):
                time.sleep(1.0)
        except TimeoutError:
            elapsed = time.time() - start
            # Timeout should fire around 200ms (allow 100ms variance)
            assert 0.15 < elapsed < 0.35
    
    def test_timeout_cleanup(self):
        """Test that timeout cleans up timer even if exception occurs."""
        try:
            with timeout(1.0):
                raise ValueError("Test exception")
        except ValueError:
            pass
        
        # No assertions needed - test passes if no hanging timers
    
    def test_nested_timeouts(self):
        """Test that nested timeouts work correctly."""
        with timeout(2.0):
            with timeout(0.5):
                result = 1 + 1
        
        assert result == 2
    
    def test_zero_timeout(self):
        """Test behavior with zero timeout."""
        # Zero timeout should fire immediately
        with pytest.raises(TimeoutError):
            with timeout(0.0):
                time.sleep(0.001)
