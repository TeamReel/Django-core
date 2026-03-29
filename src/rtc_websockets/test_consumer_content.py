"""Tests for B64 ContentUpdateConsumer: subscribe, unsubscribe, permission checks.

Uses asyncio.get_event_loop().run_until_complete() to drive async consumer
methods since pytest-asyncio is not installed in the test environment.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from rtc_websockets.consumers import ContentUpdateConsumer


def _make_consumer(user=None):
    """Create a ContentUpdateConsumer with mocked scope and channel layer."""
    consumer = ContentUpdateConsumer()
    consumer.scope = {
        "user": user or MagicMock(id=1, is_authenticated=True),
        "client": ("127.0.0.1", 12345),
    }
    consumer.channel_name = "test.channel.123"
    consumer.channel_layer = AsyncMock()
    consumer.subscribed_groups = []
    consumer.user = consumer.scope["user"]
    consumer.connection_record = MagicMock()
    return consumer


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ── Subscribe Tests ─────────────────────────────────────────────────


class TestSubscribe:
    def test_invalid_channel_format(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        _run(consumer._handle_subscribe("no-colon"))
        msg = consumer.send_json.call_args[0][0]
        assert msg["type"] == "error"
        assert msg["code"] == 4002

    def test_unsupported_channel_type(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        _run(consumer._handle_subscribe("unknown:123"))
        msg = consumer.send_json.call_args[0][0]
        assert msg["type"] == "error"
        assert msg["code"] == 4002

    def test_project_access_denied(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer._check_project_access = AsyncMock(return_value=False)
        _run(consumer._handle_subscribe("project:999"))
        msg = consumer.send_json.call_args[0][0]
        assert msg["type"] == "error"
        assert msg["code"] == 4003

    def test_project_success(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer._check_project_access = AsyncMock(return_value=True)
        _run(consumer._handle_subscribe("project:123"))
        consumer.send_json.assert_called_once_with({"type": "subscribed", "channel": "project:123"})
        assert "project_123" in consumer.subscribed_groups
        consumer.channel_layer.group_add.assert_called_once_with("project_123", "test.channel.123")

    def test_content_success(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer._check_content_access = AsyncMock(return_value=True)
        _run(consumer._handle_subscribe("content:42"))
        consumer.send_json.assert_called_once_with({"type": "subscribed", "channel": "content:42"})
        assert "content_42" in consumer.subscribed_groups

    def test_content_access_denied(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer._check_content_access = AsyncMock(return_value=False)
        _run(consumer._handle_subscribe("content:42"))
        msg = consumer.send_json.call_args[0][0]
        assert msg["type"] == "error"
        assert msg["code"] == 4003

    def test_idempotent(self):
        """Subscribing twice to same channel should not duplicate."""
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer._check_project_access = AsyncMock(return_value=True)
        _run(consumer._handle_subscribe("project:123"))
        _run(consumer._handle_subscribe("project:123"))
        assert consumer.channel_layer.group_add.call_count == 1
        assert consumer.subscribed_groups.count("project_123") == 1

    def test_max_subscriptions(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer.subscribed_groups = [f"project_{i}" for i in range(20)]
        _run(consumer._handle_subscribe("project:999"))
        msg = consumer.send_json.call_args[0][0]
        assert msg["type"] == "error"
        assert "Max" in msg["message"]

    def test_empty_channel_id(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        _run(consumer._handle_subscribe("project:"))
        msg = consumer.send_json.call_args[0][0]
        assert msg["type"] == "error"
        assert msg["code"] == 4002


# ── Unsubscribe Tests ──────────────────────────────────────────────


class TestUnsubscribe:
    def test_success(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer.subscribed_groups = ["project_123"]
        _run(consumer._handle_unsubscribe("project:123"))
        consumer.send_json.assert_called_once_with(
            {"type": "unsubscribed", "channel": "project:123"}
        )
        assert "project_123" not in consumer.subscribed_groups
        consumer.channel_layer.group_discard.assert_called_once()

    def test_not_subscribed(self):
        """Unsubscribing from unknown channel succeeds silently."""
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        _run(consumer._handle_unsubscribe("project:999"))
        consumer.send_json.assert_called_once_with(
            {"type": "unsubscribed", "channel": "project:999"}
        )
        consumer.channel_layer.group_discard.assert_not_called()

    def test_invalid_format(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        _run(consumer._handle_unsubscribe("bad"))
        msg = consumer.send_json.call_args[0][0]
        assert msg["type"] == "error"


# ── Message Routing Tests ──────────────────────────────────────────


class TestMessageRouting:
    def test_ping(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        _run(consumer.handle_json({"type": "ping"}))
        consumer.send_json.assert_called_once_with({"type": "pong"})

    def test_unknown_action(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer.send_error = AsyncMock()
        _run(consumer.handle_json({"action": "explode"}))
        consumer.send_error.assert_called_once_with(4001, "Unknown action")

    def test_subscribe_routing(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer._handle_subscribe = AsyncMock()
        _run(consumer.handle_json({"action": "subscribe", "channel": "project:1"}))
        consumer._handle_subscribe.assert_called_once_with("project:1")

    def test_unsubscribe_routing(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        consumer._handle_unsubscribe = AsyncMock()
        _run(consumer.handle_json({"action": "unsubscribe", "channel": "project:1"}))
        consumer._handle_unsubscribe.assert_called_once_with("project:1")


# ── Event Handlers (server → client) ───────────────────────────────


class TestEventHandlers:
    def test_notification_message(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        event = {"message": {"event_type": "content.status_changed", "data": {"id": 1}}}
        _run(consumer.notification_message(event))
        consumer.send_json.assert_called_once_with(event["message"])

    def test_content_status_update_legacy(self):
        consumer = _make_consumer()
        consumer.send_json = AsyncMock()
        event = {
            "type": "content_status_update",
            "content_item_id": 42,
            "status": "completed",
            "progress_percent": 100,
            "error": None,
        }
        _run(consumer.content_status_update(event))
        msg = consumer.send_json.call_args[0][0]
        assert msg["event_type"] == "content.status_changed"
        assert msg["data"]["content_item_id"] == 42
        assert msg["data"]["status"] == "completed"


# ── Disconnect Tests ───────────────────────────────────────────────


class TestDisconnect:
    def test_leaves_all_groups(self):
        consumer = _make_consumer()
        consumer.subscribed_groups = ["project_1", "content_42"]
        consumer._delete_connection_record = AsyncMock()
        with patch.object(ContentUpdateConsumer.__bases__[0], "disconnect", new_callable=AsyncMock):
            _run(consumer.disconnect(1000))
        assert consumer.channel_layer.group_discard.call_count == 2


# ── Auth Guard Tests ───────────────────────────────────────────────


class TestAuthGuard:
    """Verify connect() does not proceed when user is unauthenticated."""

    def test_unauthenticated_user_no_setup(self):
        """Unauthenticated user should not get subscribed_groups or connection_record."""
        consumer = ContentUpdateConsumer()
        consumer.scope = {
            "user": MagicMock(is_authenticated=False),
            "client": ("127.0.0.1", 12345),
        }
        consumer.channel_name = "test.channel.anon"
        consumer.channel_layer = AsyncMock()

        with patch.object(ContentUpdateConsumer.__bases__[0], "connect", new_callable=AsyncMock):
            _run(consumer.connect())

        assert not hasattr(consumer, "subscribed_groups")
        assert not hasattr(consumer, "connection_record")

    def test_no_user_no_setup(self):
        """Missing user in scope should not proceed."""
        consumer = ContentUpdateConsumer()
        consumer.scope = {"client": ("127.0.0.1", 12345)}
        consumer.channel_name = "test.channel.none"
        consumer.channel_layer = AsyncMock()

        with patch.object(ContentUpdateConsumer.__bases__[0], "connect", new_callable=AsyncMock):
            _run(consumer.connect())

        assert not hasattr(consumer, "subscribed_groups")
