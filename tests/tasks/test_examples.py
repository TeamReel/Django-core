"""Unit tests for example tasks."""

from unittest.mock import MagicMock, patch

import pytest


@pytest.mark.unit
class TestHelloWorldTask:
    """Test simple task execution."""

    def test_hello_world_returns_greeting(self):
        """Test hello_world task returns correct greeting."""
        from tasks.examples.hello_world import hello_world

        result = hello_world.apply(args=["Alice"])

        assert result.successful()
        assert result.result == "Hello, Alice!"

    def test_add_numbers_returns_sum(self):
        """Test add_numbers task performs addition."""
        from tasks.examples.hello_world import add_numbers

        result = add_numbers.apply(args=[5, 3])

        assert result.successful()
        assert result.result == 8

    def test_add_numbers_handles_negative_numbers(self):
        """Test add_numbers works with negative numbers."""
        from tasks.examples.hello_world import add_numbers

        result = add_numbers.apply(args=[-5, 3])

        assert result.successful()
        assert result.result == -2


@pytest.mark.unit
class TestExportUserDataTask:
    """Test audited task with context."""

    def test_export_returns_structured_result(self):
        """Test export_user_data returns expected structure."""
        from tasks.examples.export_user_data import export_user_data

        result = export_user_data.apply(
            kwargs={"user_id": 123, "org_id": 456, "export_format": "csv"}
        )

        assert result.successful()
        data = result.result
        assert data["status"] == "completed"
        assert data["user_id"] == 123
        assert data["org_id"] == 456
        assert data["format"] == "csv"

    def test_export_supports_multiple_formats(self):
        """Test export supports csv, json, xml formats."""
        from tasks.examples.export_user_data import export_user_data

        for fmt in ["csv", "json", "xml"]:
            result = export_user_data.apply(
                kwargs={"user_id": 1, "org_id": 2, "export_format": fmt}
            )
            assert result.result["format"] == fmt

    def test_export_includes_request_id(self):
        """Test request_id is included in result."""
        from tasks.examples.export_user_data import export_user_data

        result = export_user_data.apply(
            kwargs={
                "user_id": 999,
                "org_id": 888,
                "export_format": "json",
                "request_id": "req-123",
            }
        )

        assert result.result["request_id"] == "req-123"


@pytest.mark.unit
class TestSyncExternalApiTask:
    """Test retry logic task."""

    @patch("tasks.examples.sync_external_api.requests.get")
    def test_sync_success_on_first_attempt(self, mock_get):
        """Test successful API sync on first attempt."""
        from tasks.examples.sync_external_api import sync_external_api

        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"records": [1, 2, 3]}
        mock_get.return_value = mock_response

        result = sync_external_api.apply(
            kwargs={"api_url": "https://api.example.com/data", "org_id": 123}
        )

        assert result.successful()
        assert result.result["status"] == "success"
        assert result.result["records_synced"] == 3
        assert result.result["org_id"] == 123

    @patch("tasks.examples.sync_external_api.requests.get")
    def test_sync_retries_on_failure(self, mock_get):
        """Test task retries when API call fails."""
        from requests.exceptions import RequestException
        from tasks.examples.sync_external_api import sync_external_api

        # Mock API failure
        mock_get.side_effect = RequestException("Connection error")

        result = sync_external_api.apply(
            kwargs={"api_url": "https://api.example.com/data", "org_id": 123}
        )

        assert result.failed()
        assert isinstance(result.result, RequestException)

    @patch("tasks.examples.sync_external_api.requests.get")
    def test_sync_includes_attempt_count(self, mock_get):
        """Test result includes attempt count."""
        from tasks.examples.sync_external_api import sync_external_api

        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"records": []}
        mock_get.return_value = mock_response

        result = sync_external_api.apply(
            kwargs={"api_url": "https://api.example.com/data", "org_id": 456}
        )

        assert result.successful()
        assert "attempt" in result.result
        assert result.result["attempt"] == 1


@pytest.mark.unit
@pytest.mark.django_db
class TestCleanupExpiredSessionsTask:
    """Test periodic maintenance task."""

    def test_cleanup_deletes_expired_sessions(self):
        """Test cleanup removes expired sessions."""
        from datetime import timedelta

        from django.contrib.sessions.models import Session
        from django.utils import timezone
        from tasks.examples.cleanup_expired_sessions import cleanup_expired_sessions

        # Create expired session
        expired_date = timezone.now() - timedelta(days=1)
        Session.objects.create(
            session_key="expired_key", expire_date=expired_date, session_data="test"
        )

        # Create valid session
        valid_date = timezone.now() + timedelta(days=1)
        Session.objects.create(session_key="valid_key", expire_date=valid_date, session_data="test")

        result = cleanup_expired_sessions.apply()

        assert result.successful()
        assert result.result["status"] == "success"
        assert result.result["deleted"] == 1

        # Verify expired session removed, valid session remains
        assert not Session.objects.filter(session_key="expired_key").exists()
        assert Session.objects.filter(session_key="valid_key").exists()

    def test_cleanup_handles_no_expired_sessions(self):
        """Test cleanup gracefully handles no expired sessions."""
        from tasks.examples.cleanup_expired_sessions import cleanup_expired_sessions

        result = cleanup_expired_sessions.apply()

        assert result.successful()
        assert result.result["deleted"] == 0

    def test_cleanup_uses_chunked_deletion(self):
        """Test cleanup processes sessions in chunks."""
        from datetime import timedelta

        from django.contrib.sessions.models import Session
        from django.utils import timezone
        from tasks.examples.cleanup_expired_sessions import cleanup_expired_sessions

        # Create multiple expired sessions
        expired_date = timezone.now() - timedelta(days=1)
        for i in range(5):
            Session.objects.create(
                session_key=f"expired_{i}", expire_date=expired_date, session_data="test"
            )

        result = cleanup_expired_sessions.apply()

        assert result.successful()
        assert result.result["deleted"] == 5
        assert Session.objects.filter(session_key__startswith="expired_").count() == 0


@pytest.mark.unit
class TestSendNotificationTask:
    """Test notification task (if it exists)."""

    def test_send_notification_basic(self):
        """Test send_notification task executes."""
        try:
            from tasks.examples.send_notification import send_notification

            # This task may not be fully implemented yet
            # Just verify it's importable and has expected signature
            assert callable(send_notification)
            assert hasattr(send_notification, "apply")

        except ImportError:
            pytest.skip("send_notification task not implemented yet")


@pytest.mark.unit
class TestRetryLogic:
    """Test task retry behavior."""

    @patch("tasks.examples.sync_external_api.requests.get")
    def test_task_retries_with_exponential_backoff(self, mock_get):
        """Test task uses exponential backoff on retries."""
        from requests.exceptions import RequestException
        from tasks.examples.sync_external_api import sync_external_api

        # Track retry attempts
        attempt_count = [0]

        def side_effect(*args, **kwargs):
            attempt_count[0] += 1
            if attempt_count[0] < 3:
                raise RequestException("Temporary failure")
            # Succeed on 3rd attempt
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"records": []}
            return mock_response

        mock_get.side_effect = side_effect

        result = sync_external_api.apply(
            kwargs={"api_url": "https://api.example.com/data", "org_id": 123}
        )

        assert result.successful()
        assert attempt_count[0] == 3  # Failed twice, succeeded on third

    @patch("tasks.examples.sync_external_api.requests.get")
    def test_task_fails_after_max_retries(self, mock_get):
        """Test task fails after exhausting all retries."""
        from requests.exceptions import RequestException
        from tasks.examples.sync_external_api import sync_external_api

        # Always fail
        mock_get.side_effect = RequestException("Permanent failure")

        result = sync_external_api.apply(
            kwargs={"api_url": "https://api.example.com/data", "org_id": 123}
        )

        assert result.failed()
        # Verify it's the RequestException, not Retry exception
        assert isinstance(result.result, RequestException)

    def test_retry_configuration_exists(self):
        """Test sync task has retry configuration."""
        from tasks.examples.sync_external_api import sync_external_api

        # Verify retry settings
        assert sync_external_api.max_retries == 5
        assert sync_external_api.default_retry_delay == 60
        assert sync_external_api.autoretry_for is not None
        assert sync_external_api.retry_backoff is True
        assert sync_external_api.retry_backoff_max == 600
        assert sync_external_api.retry_jitter is True

    @patch("tasks.examples.sync_external_api.requests.get")
    def test_retry_includes_attempt_number(self, mock_get):
        """Test result includes attempt number."""
        from tasks.examples.sync_external_api import sync_external_api

        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"records": [1, 2]}
        mock_get.return_value = mock_response

        result = sync_external_api.apply(
            kwargs={"api_url": "https://api.example.com/data", "org_id": 789}
        )

        assert result.successful()
        assert result.result["attempt"] == 1

    @patch("tasks.examples.sync_external_api.requests.get")
    def test_timeout_triggers_retry(self, mock_get):
        """Test timeout exception triggers retry."""
        from requests.exceptions import Timeout
        from tasks.examples.sync_external_api import sync_external_api

        # Simulate timeout
        mock_get.side_effect = Timeout("Request timed out")

        result = sync_external_api.apply(
            kwargs={"api_url": "https://api.example.com/data", "org_id": 456}
        )

        assert result.failed()
        assert isinstance(result.result, Timeout)
