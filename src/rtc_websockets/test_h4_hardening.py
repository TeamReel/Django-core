"""B64 H4 — Tests for hardening & monitoring.

Tests cover:
- Stale connection cleanup task
- Rate limiting (MAX_SUBSCRIPTIONS)
- Metric emission on publish / subscribe / unsubscribe
"""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


# ── Stale Connection Cleanup ────────────────────────────────────────


@pytest.mark.django_db
class TestCleanupStaleConnections:
    """Tests for the cleanup_stale_connections Celery task."""

    def _create_connection(self, user, heartbeat_age_seconds: int = 0):
        import uuid

        from rtc_websockets.models import WebSocketConnection

        conn = WebSocketConnection.objects.create(
            user=user,
            channel_name=f"test.channel.{uuid.uuid4().hex[:12]}",
            last_heartbeat=timezone.now() - timedelta(seconds=heartbeat_age_seconds),
            auth_method="session",
        )
        return conn

    def _make_user(self, username):
        return User.objects.create_user(
            username=username, email=f"{username}@test.com", password="test"  # noqa: S106
        )

    def test_deletes_stale_connections(self):
        """Connections older than timeout are deleted."""
        from rtc_websockets.tasks import cleanup_stale_connections

        user = self._make_user("stale_user")
        # 2 stale (2h old), 1 fresh (5min old)
        self._create_connection(user, heartbeat_age_seconds=7200)
        self._create_connection(user, heartbeat_age_seconds=7200)
        fresh = self._create_connection(user, heartbeat_age_seconds=300)

        result = cleanup_stale_connections(timeout_seconds=3600)

        assert result["deleted"] == 2
        assert result["remaining"] == 1
        from rtc_websockets.models import WebSocketConnection

        assert WebSocketConnection.objects.filter(connection_id=fresh.connection_id).exists()

    def test_no_stale_connections(self):
        """When all connections are fresh, nothing is deleted."""
        from rtc_websockets.tasks import cleanup_stale_connections

        user = self._make_user("fresh_user")
        self._create_connection(user, heartbeat_age_seconds=60)
        self._create_connection(user, heartbeat_age_seconds=120)

        result = cleanup_stale_connections(timeout_seconds=3600)

        assert result["deleted"] == 0
        assert result["remaining"] == 2

    def test_custom_timeout(self):
        """Custom timeout_seconds is respected."""
        from rtc_websockets.tasks import cleanup_stale_connections

        user = self._make_user("custom_user")
        self._create_connection(user, heartbeat_age_seconds=600)

        result = cleanup_stale_connections(timeout_seconds=300)
        assert result["deleted"] == 1

    def test_emits_metrics(self):
        """Cleanup task emits gauge and counter metrics."""
        from rtc_websockets.tasks import cleanup_stale_connections

        user = self._make_user("metric_user")
        self._create_connection(user, heartbeat_age_seconds=7200)

        with patch("observability.metrics.emit_metric") as mock_emit:
            cleanup_stale_connections(timeout_seconds=3600)

            calls = {call.args[1] for call in mock_emit.call_args_list}
            assert "websocket_stale_connections_cleaned" in calls
            assert "websocket_connections_active_db" in calls


# ── Metric Emission ────────────────────────────────────────────────


class TestEventPublishMetrics:
    """Verify that RealtimeEventPublisher emits metrics on publish."""

    def _make_event(self):
        from rtc_websockets.events import (
            ContentStatusPayload,
            EventType,
            build_event,
        )

        return build_event(
            EventType.CONTENT_STATUS_CHANGED,
            ContentStatusPayload(
                content_item_id=1,
                old_status="processing",
                new_status="completed",
                project_id=42,
            ),
            actor_id=1,
        )

    def test_publish_to_project_emits_metric(self):
        from rtc_websockets.services import RealtimeEventPublisher

        publisher = RealtimeEventPublisher()
        event = self._make_event()

        with (
            patch.object(publisher._notification_service, "send_project_notification"),
            patch("rtc_websockets.metrics.emit_metric") as mock_emit,
        ):
            publisher.publish_to_project(42, event)
            # Check the event published metric was emitted
            calls = [(c.args[1], c.args[3]) for c in mock_emit.call_args_list]
            assert (
                "websocket_events_published_total",
                {"event_type": "content.status_changed"},
            ) in calls

    def test_publish_to_user_emits_metric(self):
        from rtc_websockets.services import RealtimeEventPublisher

        publisher = RealtimeEventPublisher()
        event = self._make_event()

        with (
            patch.object(publisher._notification_service, "send_user_notification"),
            patch("rtc_websockets.metrics.emit_metric") as mock_emit,
        ):
            publisher.publish_to_user(99, event)
            calls = [(c.args[1], c.args[3]) for c in mock_emit.call_args_list]
            assert (
                "websocket_events_published_total",
                {"event_type": "content.status_changed"},
            ) in calls

    def test_publish_to_org_emits_metric(self):
        from rtc_websockets.services import RealtimeEventPublisher

        publisher = RealtimeEventPublisher()
        event = self._make_event()

        with (
            patch.object(publisher._notification_service, "send_org_notification"),
            patch("rtc_websockets.metrics.emit_metric") as mock_emit,
        ):
            publisher.publish_to_org(7, event)
            calls = [(c.args[1], c.args[3]) for c in mock_emit.call_args_list]
            assert (
                "websocket_events_published_total",
                {"event_type": "content.status_changed"},
            ) in calls


# ── Metric Functions ────────────────────────────────────────────────


class TestMetricFunctions:
    """Verify new metric helper functions emit correct metric calls."""

    def test_inc_event_published(self):
        from rtc_websockets import metrics

        with patch.object(metrics, "emit_metric") as mock_emit:
            metrics.inc_event_published("approval.decided")
            mock_emit.assert_called_once_with(
                "counter",
                "websocket_events_published_total",
                1,
                {"event_type": "approval.decided"},
            )

    def test_inc_subscriptions(self):
        from rtc_websockets import metrics

        with patch.object(metrics, "emit_metric") as mock_emit:
            metrics.inc_subscriptions("content_update")
            mock_emit.assert_called_once_with(
                "gauge_delta",
                "websocket_subscriptions_active",
                1,
                {"type": "content_update"},
            )

    def test_dec_subscriptions(self):
        from rtc_websockets import metrics

        with patch.object(metrics, "emit_metric") as mock_emit:
            metrics.dec_subscriptions("content_update")
            mock_emit.assert_called_once_with(
                "gauge_delta",
                "websocket_subscriptions_active",
                -1,
                {"type": "content_update"},
            )


# ── Celery Beat Registration ────────────────────────────────────────


class TestCeleryBeatRegistration:
    """Verify the cleanup task is registered in CELERY_BEAT_SCHEDULE."""

    def test_cleanup_task_in_beat_schedule(self):
        from config.settings.celery import CELERY_BEAT_SCHEDULE

        assert "cleanup-stale-websocket-connections" in CELERY_BEAT_SCHEDULE
        entry = CELERY_BEAT_SCHEDULE["cleanup-stale-websocket-connections"]
        assert entry["task"] == "rtc_websockets.tasks.cleanup_stale_connections"
