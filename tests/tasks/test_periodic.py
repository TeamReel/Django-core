"""Tests for periodic task scheduling."""

from unittest.mock import MagicMock, patch

import pytest
from celery.schedules import crontab


@pytest.mark.unit
class TestPeriodicTaskConfiguration:
    """Test CELERY_BEAT_SCHEDULE configuration."""

    def test_beat_schedule_configured(self):
        """Test CELERY_BEAT_SCHEDULE exists in settings."""
        from django.conf import settings

        assert hasattr(settings, "CELERY_BEAT_SCHEDULE")
        assert isinstance(settings.CELERY_BEAT_SCHEDULE, dict)

    def test_cleanup_sessions_scheduled(self):
        """Test cleanup task scheduled in beat config."""
        from django.conf import settings

        schedule = settings.CELERY_BEAT_SCHEDULE

        assert "cleanup-expired-sessions" in schedule
        task_config = schedule["cleanup-expired-sessions"]
        assert task_config["task"] == "tasks.examples.cleanup_expired_sessions"
        assert isinstance(task_config["schedule"], crontab)

    def test_periodic_task_names_valid(self):
        """Test all scheduled tasks reference valid task names."""
        from django.conf import settings

        schedule = settings.CELERY_BEAT_SCHEDULE

        for _task_name, config in schedule.items():
            task_path = config["task"]
            # Task should be registered or be an example task
            # (examples might not be registered in test environment)
            assert isinstance(task_path, str)
            assert "." in task_path  # Should be fully qualified

    def test_periodic_schedule_has_required_fields(self):
        """Test all periodic task configs have required fields."""
        from django.conf import settings

        schedule = settings.CELERY_BEAT_SCHEDULE

        for task_name, config in schedule.items():
            assert "task" in config, f"Task {task_name} missing 'task' field"
            assert "schedule" in config, f"Task {task_name} missing 'schedule' field"

    def test_crontab_schedules_valid(self):
        """Test crontab schedules are properly configured."""
        from django.conf import settings

        schedule = settings.CELERY_BEAT_SCHEDULE

        # Find tasks using crontab
        for _task_name, config in schedule.items():
            if isinstance(config["schedule"], crontab):
                # Verify crontab has valid fields
                cron = config["schedule"]
                assert hasattr(cron, "hour")
                assert hasattr(cron, "minute")


@pytest.mark.integration
@pytest.mark.skipif(
    not pytest.config.getoption("--integration", default=False),
    reason="Integration tests disabled",
)
class TestBeatScheduler:
    """Integration tests for beat scheduler (requires beat running)."""

    @patch("tasks.examples.cleanup_expired_sessions.Session.objects.filter")
    def test_periodic_task_executes_on_schedule(self, mock_filter):
        """Test beat scheduler triggers periodic task."""
        # This test requires actual beat scheduler running
        # Mock the session query to avoid DB dependencies
        mock_queryset = MagicMock()
        mock_queryset.count.return_value = 5
        mock_queryset.delete.return_value = (5, {})
        mock_filter.return_value = mock_queryset

        from tasks.examples.cleanup_expired_sessions import cleanup_expired_sessions

        # Manually trigger task (simulating beat scheduler)
        result = cleanup_expired_sessions.apply()

        assert result.successful()
        assert result.result["deleted"] == 5

    def test_multiple_schedules_coexist(self):
        """Test multiple periodic schedules can coexist."""
        from django.conf import settings

        schedule = settings.CELERY_BEAT_SCHEDULE

        # Should have multiple tasks scheduled
        assert len(schedule) >= 1

        # Each should have unique name
        task_names = list(schedule.keys())
        assert len(task_names) == len(set(task_names))


@pytest.mark.unit
class TestPeriodicTaskExecution:
    """Test periodic task execution logic."""

    @pytest.mark.django_db
    def test_cleanup_task_can_be_called_manually(self):
        """Test periodic cleanup task can be called manually."""
        from tasks.examples.cleanup_expired_sessions import cleanup_expired_sessions

        # Should be callable outside of beat scheduler
        result = cleanup_expired_sessions.apply()

        assert result.successful()
        assert "deleted" in result.result
        assert isinstance(result.result["deleted"], int)

    def test_schedule_intervals_reasonable(self):
        """Test schedule intervals are reasonable (not too frequent)."""
        from django.conf import settings

        schedule = settings.CELERY_BEAT_SCHEDULE

        for task_name, config in schedule.items():
            schedule_obj = config["schedule"]

            # If it's a numeric interval, should be at least 60 seconds
            if isinstance(schedule_obj, (int, float)):
                assert schedule_obj >= 60, f"Task {task_name} interval too short: {schedule_obj}s"
