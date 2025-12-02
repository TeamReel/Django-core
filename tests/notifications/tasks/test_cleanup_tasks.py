"""Unit tests for cleanup tasks."""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone
from notifications.models import Notification
from notifications.tasks.cleanup_tasks import (
    archive_old_notifications,
    cleanup_old_notifications,
)


@pytest.mark.django_db
class TestCleanupOldNotifications:
    """Test cleanup task functionality."""

    def test_cleanup_deletes_old_notifications(
        self, notification_type_factory, notification_factory
    ):
        """Test cleanup deletes notifications older than retention period."""
        # Create old notification (100 days old)
        old_date = timezone.now() - timedelta(days=100)
        notification_type = notification_type_factory()
        old_notification = notification_factory(type=notification_type, channel="email")
        # Use update() to bypass auto_now_add=True
        Notification.objects.filter(id=old_notification.id).update(created_at=old_date)

        # Create recent notification (10 days old)
        recent_date = timezone.now() - timedelta(days=10)
        recent_notification = notification_factory(type=notification_type, channel="email")
        Notification.objects.filter(id=recent_notification.id).update(created_at=recent_date)

        # Run cleanup (90 day retention)
        deleted_count = cleanup_old_notifications(retention_days=90, dry_run=False)

        # Verify only old notification was deleted
        assert deleted_count == 1
        assert not Notification.objects.filter(id=old_notification.id).exists()
        assert Notification.objects.filter(id=recent_notification.id).exists()

    def test_cleanup_respects_retention_days(self, notification_type_factory, notification_factory):
        """Test cleanup respects custom retention period."""
        # Create notifications at different ages
        thirty_days_old = timezone.now() - timedelta(days=30)
        sixty_days_old = timezone.now() - timedelta(days=60)
        notification_type = notification_type_factory()

        notif_30 = notification_factory(type=notification_type, channel="email")
        Notification.objects.filter(id=notif_30.id).update(created_at=thirty_days_old)

        notif_60 = notification_factory(type=notification_type, channel="email")
        Notification.objects.filter(id=notif_60.id).update(created_at=sixty_days_old)

        # Run cleanup with 45 day retention
        deleted_count = cleanup_old_notifications(retention_days=45, dry_run=False)

        # Only 60-day-old notification should be deleted
        assert deleted_count == 1
        assert Notification.objects.count() == 1

    def test_cleanup_dry_run(self, notification_type_factory, notification_factory):
        """Test dry run doesn't delete notifications."""
        old_date = timezone.now() - timedelta(days=100)
        notification_type = notification_type_factory()
        notification = notification_factory(type=notification_type, channel="email")
        Notification.objects.filter(id=notification.id).update(created_at=old_date)

        # Run cleanup in dry run mode
        count = cleanup_old_notifications(retention_days=90, dry_run=True)

        # Should report count but not delete
        assert count == 1
        assert Notification.objects.filter(id=notification.id).exists()

    def test_cleanup_with_no_old_notifications(self):
        """Test cleanup with no notifications to delete."""
        # No old notifications exist
        deleted_count = cleanup_old_notifications(retention_days=90, dry_run=False)

        assert deleted_count == 0

    def test_cleanup_multiple_notifications(self, notification_type_factory, notification_factory):
        """Test cleanup handles multiple old notifications."""
        old_date = timezone.now() - timedelta(days=100)
        notification_type = notification_type_factory()

        # Create 5 old notifications
        notification_ids = []
        for _ in range(5):
            notif = notification_factory(type=notification_type, channel="email")
            notification_ids.append(notif.id)

        # Update all to old date
        Notification.objects.filter(id__in=notification_ids).update(created_at=old_date)

        # Run cleanup
        deleted_count = cleanup_old_notifications(retention_days=90, dry_run=False)

        assert deleted_count == 5
        assert Notification.objects.count() == 0

    @patch("notifications.tasks.cleanup_tasks.logger")
    def test_cleanup_logs_success(
        self, mock_logger, notification_type_factory, notification_factory
    ):
        """Test cleanup logs successful deletion."""
        old_date = timezone.now() - timedelta(days=100)
        notification_type = notification_type_factory()
        notif = notification_factory(type=notification_type, channel="email")
        Notification.objects.filter(id=notif.id).update(created_at=old_date)

        cleanup_old_notifications(retention_days=90, dry_run=False)

        # Verify logging was called
        mock_logger.info.assert_called()
        log_message = mock_logger.info.call_args[0][0]
        assert "Deleted" in log_message
        assert "notifications" in log_message

    @patch("notifications.tasks.cleanup_tasks.logger")
    def test_cleanup_logs_dry_run(
        self, mock_logger, notification_type_factory, notification_factory
    ):
        """Test dry run logs correctly."""
        old_date = timezone.now() - timedelta(days=100)
        notification_type = notification_type_factory()
        notif = notification_factory(type=notification_type, channel="email")
        Notification.objects.filter(id=notif.id).update(created_at=old_date)

        cleanup_old_notifications(retention_days=90, dry_run=True)

        # Verify dry run logging
        mock_logger.info.assert_called()
        log_message = mock_logger.info.call_args[0][0]
        assert "Dry run" in log_message
        assert "Would delete" in log_message

    @patch("notifications.tasks.cleanup_tasks.Notification.objects.filter")
    @patch("notifications.tasks.cleanup_tasks.logger")
    def test_cleanup_logs_errors(self, mock_logger, mock_filter):
        """Test cleanup logs errors."""
        # Simulate deletion error
        mock_queryset = mock_filter.return_value
        mock_queryset.count.return_value = 1
        mock_queryset.delete.side_effect = RuntimeError("Database error")

        # Run cleanup and expect exception
        with pytest.raises(RuntimeError, match="Database error"):
            cleanup_old_notifications(retention_days=90, dry_run=False)

        # Verify error logging
        mock_logger.error.assert_called()
        log_message = mock_logger.error.call_args[0][0]
        assert "Error during cleanup" in log_message


@pytest.mark.django_db
class TestArchiveOldNotifications:
    """Test archival task functionality."""

    @patch("notifications.tasks.cleanup_tasks.logger")
    def test_archive_placeholder_logs(
        self, mock_logger, notification_type_factory, notification_factory
    ):
        """Test archival placeholder logs notification count."""
        old_date = timezone.now() - timedelta(days=100)
        notification_type = notification_type_factory()
        notif = notification_factory(type=notification_type, channel="email")
        Notification.objects.filter(id=notif.id).update(created_at=old_date)

        count = archive_old_notifications(retention_days=90, archive_path="s3://bucket/archive")

        # Should count notifications
        assert count == 1

        # Verify logging
        mock_logger.info.assert_called()
        log_message = mock_logger.info.call_args[0][0]
        assert "Archival placeholder" in log_message
        assert "Would archive" in log_message

    def test_archive_placeholder_returns_count(
        self, notification_type_factory, notification_factory
    ):
        """Test archival returns correct count."""
        old_date = timezone.now() - timedelta(days=100)
        notification_type = notification_type_factory()

        # Create 3 old notifications
        notification_ids = []
        for _ in range(3):
            notif = notification_factory(type=notification_type, channel="email")
            notification_ids.append(notif.id)

        # Update all to old date
        Notification.objects.filter(id__in=notification_ids).update(created_at=old_date)

        count = archive_old_notifications(retention_days=90)

        assert count == 3
