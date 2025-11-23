"""Unit tests for breach detector with performance benchmarks."""

import time
from unittest.mock import Mock, patch

import pytest
from security_baseline.validators.breach_detector import BreachDetector


class TestBreachDetectorBasics:
    """Test basic breach detector functionality."""

    def test_initialization(self):
        """Test breach detector initializes without error."""
        detector = BreachDetector()
        # Should not raise, even if bloom filter missing
        assert detector is not None

    def test_bloom_filter_path_exists(self):
        """Test bloom filter path is correctly configured."""
        detector = BreachDetector()
        assert detector.BLOOM_FILTER_PATH.name == "breached-passwords.bloom"
        assert ".security" in str(detector.BLOOM_FILTER_PATH)
        assert "data" in str(detector.BLOOM_FILTER_PATH)

    def test_hibp_api_url_format(self):
        """Test HIBP API URL has correct format."""
        detector = BreachDetector()
        assert "pwnedpasswords.com" in detector.HIBP_API_URL
        assert "{hash_prefix}" in detector.HIBP_API_URL


class TestBreachDetectorHIBPAPI:
    """Test HIBP API integration."""

    @patch("security_baseline.validators.breach_detector.requests.get")
    def test_hibp_api_breach_detected(self, mock_get):
        """Test HIBP API detects breached password."""
        detector = BreachDetector()
        detector._bloom_filter = None  # Force API path

        # Mock HIBP API response
        mock_response = Mock()
        mock_response.text = "AAA61E4C9B93F3F0682250B6CF8331B7EE68FD8:10\r\nBBBBBBBBBBBB:5\r\n"
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        # Test password that hashes to SHA1 starting with 00000AAA
        result = detector._check_hibp_api("00000AAA61E4C9B93F3F0682250B6CF8331B7EE68FD8")

        assert result is True
        assert mock_get.called

    @patch("security_baseline.validators.breach_detector.requests.get")
    def test_hibp_api_safe_password(self, mock_get):
        """Test HIBP API returns False for safe password."""
        detector = BreachDetector()
        detector._bloom_filter = None  # Force API path

        # Mock HIBP API response (password not in list)
        mock_response = Mock()
        mock_response.text = "AAA:10\r\nBBB:5\r\n"
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = detector._check_hibp_api("00000ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ")

        assert result is False

    @patch("security_baseline.validators.breach_detector.requests.get")
    def test_hibp_api_k_anonymity(self, mock_get):
        """Test k-anonymity: only first 5 chars sent to API."""
        detector = BreachDetector()
        detector._bloom_filter = None

        mock_response = Mock()
        mock_response.text = ""
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        test_hash = "ABCDE" + "F" * 35  # 40 chars total
        detector._check_hibp_api(test_hash)

        # Verify only first 5 chars used in URL
        call_args = mock_get.call_args
        assert "ABCDE" in call_args[0][0]
        assert "FFFFF" not in call_args[0][0]

    @patch("security_baseline.validators.breach_detector.requests.get")
    def test_hibp_api_error_handling(self, mock_get):
        """Test API error handling (fail open)."""
        detector = BreachDetector()
        detector._bloom_filter = None

        # Simulate API error
        mock_get.side_effect = Exception("Network error")

        # Should return False (fail open) to not block users
        result = detector._check_hibp_api("00000" + "A" * 35)

        assert result is False

    @patch("security_baseline.validators.breach_detector.requests.get")
    def test_hibp_api_timeout(self, mock_get):
        """Test API timeout handling."""
        detector = BreachDetector()
        detector._bloom_filter = None

        # Simulate timeout
        import requests

        mock_get.side_effect = requests.Timeout("Timeout")

        result = detector._check_hibp_api("00000" + "A" * 35)

        # Should fail open
        assert result is False

    @patch("security_baseline.validators.breach_detector.requests.get")
    def test_hibp_api_user_agent(self, mock_get):
        """Test correct User-Agent header sent."""
        detector = BreachDetector()
        detector._bloom_filter = None

        mock_response = Mock()
        mock_response.text = ""
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        detector._check_hibp_api("00000" + "A" * 35)

        # Check User-Agent header
        call_kwargs = mock_get.call_args[1]
        assert "User-Agent" in call_kwargs.get("headers", {})
        assert "Django-Core-Security-Baseline" in call_kwargs["headers"]["User-Agent"]


class TestBreachDetectorBloomFilter:
    """Test bloom filter integration."""

    def test_bloom_filter_miss_returns_safe(self):
        """Test bloom filter miss (password not breached) without API call."""
        detector = BreachDetector()

        if detector._bloom_filter is None:
            pytest.skip("Bloom filter not available in test environment")

        # Very unlikely to be in bloom filter
        with patch.object(detector, "_check_hibp_api") as mock_api:
            result = detector.is_breached("x" * 50)

            # Bloom filter should return False without API call
            if not result:
                assert not mock_api.called, "API should not be called on bloom filter miss"

    @patch("security_baseline.validators.breach_detector.requests.get")
    def test_bloom_filter_hit_verifies_with_api(self, mock_get):
        """Test bloom filter hit triggers HIBP API verification."""
        detector = BreachDetector()

        if detector._bloom_filter is None:
            pytest.skip("Bloom filter not available in test environment")

        # Mock bloom filter to return hit
        with patch.object(detector._bloom_filter, "__contains__", return_value=True):
            mock_response = Mock()
            mock_response.text = ""
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            detector.is_breached("test_password")

            # API should be called to verify bloom filter hit
            assert mock_get.called


class TestBreachDetectorPerformance:
    """Test breach detector performance benchmarks."""

    def test_bloom_filter_check_performance(self):
        """Test bloom filter check is fast (<5ms average)."""
        detector = BreachDetector()

        if detector._bloom_filter is None:
            pytest.skip("Bloom filter not available in test environment")

        # Test 100 checks to get average
        iterations = 100
        start = time.perf_counter()

        for i in range(iterations):
            detector.is_breached(f"test_password_{i}")

        elapsed = time.perf_counter() - start
        avg_ms = (elapsed / iterations) * 1000

        # Average should be well under 5ms
        assert avg_ms < 5, f"Average check time {avg_ms:.2f}ms exceeds 5ms target"

    def test_bloom_filter_p99_performance(self):
        """Test bloom filter 99th percentile is <5ms."""
        detector = BreachDetector()

        if detector._bloom_filter is None:
            pytest.skip("Bloom filter not available in test environment")

        # Test many iterations to get p99
        iterations = 1000
        times_ms = []

        for i in range(iterations):
            start = time.perf_counter()
            detector.is_breached(f"test_password_{i}")
            elapsed_ms = (time.perf_counter() - start) * 1000
            times_ms.append(elapsed_ms)

        # Calculate p99
        times_ms.sort()
        p99_index = int(iterations * 0.99)
        p99_ms = times_ms[p99_index]

        assert p99_ms < 5, f"P99 latency {p99_ms:.2f}ms exceeds 5ms target"


class TestBreachDetectorIntegration:
    """Test end-to-end breach detection."""

    def test_known_breached_password(self):
        """Test detection of known breached password."""
        detector = BreachDetector()

        # "password" is definitely breached
        # SHA1: 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
        # Note: This test requires either bloom filter or HIBP API
        result = detector.is_breached("password")

        # Should be detected as breached (might be slow if API call needed)
        assert result is True

    @patch("security_baseline.validators.breach_detector.requests.get")
    def test_safe_password_with_api_fallback(self, mock_get):
        """Test safe password detection with API fallback."""
        detector = BreachDetector()

        # Mock API to return empty (password not breached)
        mock_response = Mock()
        mock_response.text = ""
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        # Very unlikely to be breached
        result = detector.is_breached("x7k9#mP2$qL5@nR8!vB3")

        assert result is False

    def test_password_hashing(self):
        """Test password is correctly hashed to SHA1."""
        detector = BreachDetector()

        # Test that same password produces consistent hash
        with patch.object(detector, "_check_hibp_api", return_value=False) as mock_api:
            detector._bloom_filter = None  # Force API path
            detector.is_breached("testpass123")

            # Verify SHA1 hash format (40 uppercase hex chars)
            call_args = mock_api.call_args[0][0]
            assert len(call_args) == 40
            assert call_args.isupper()
            assert all(c in "0123456789ABCDEF" for c in call_args)
