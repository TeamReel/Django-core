"""Tests for B64 tech-debt fixes:
- FAILED_MESSAGE_QUEUE cap (prevent memory leaks)
- JWT token_type validation (prevent access/refresh token reuse)
"""

from __future__ import annotations

import time
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
from django.test import override_settings
from rtc_websockets.services import (
    FAILED_MESSAGE_QUEUE,
    FAILED_MESSAGE_QUEUE_MAX_SIZE,
    NotificationService,
)

# ── FAILED_MESSAGE_QUEUE cap ───────────────────────────────────────


class TestFailedMessageQueueCap:
    def setup_method(self):
        FAILED_MESSAGE_QUEUE.clear()

    def teardown_method(self):
        FAILED_MESSAGE_QUEUE.clear()

    def test_queue_accepts_messages_below_cap(self):
        """Messages are queued when below the cap."""
        service = NotificationService()
        with patch.object(service, "channel_layer") as mock_layer:
            mock_layer.group_send = MagicMock(side_effect=Exception("connection lost"))

            with patch(
                "rtc_websockets.services.async_to_sync",
                return_value=MagicMock(side_effect=Exception("connection lost")),
            ):
                service._send_to_group("test_group", {"type": "test"})

        assert len(FAILED_MESSAGE_QUEUE) == 1

    def test_queue_drops_messages_at_cap(self):
        """Messages are dropped once the queue reaches the cap."""
        # Fill to max
        for i in range(FAILED_MESSAGE_QUEUE_MAX_SIZE):
            FAILED_MESSAGE_QUEUE.append({"group": f"g_{i}", "envelope": {}})

        assert len(FAILED_MESSAGE_QUEUE) == FAILED_MESSAGE_QUEUE_MAX_SIZE

        service = NotificationService()
        with patch(
            "rtc_websockets.services.async_to_sync",
            return_value=MagicMock(side_effect=Exception("connection lost")),
        ):
            service._send_to_group("overflow_group", {"type": "overflow"})

        # Queue should NOT grow beyond cap
        assert len(FAILED_MESSAGE_QUEUE) == FAILED_MESSAGE_QUEUE_MAX_SIZE

    def test_max_size_constant_is_1000(self):
        assert FAILED_MESSAGE_QUEUE_MAX_SIZE == 1000


# ── JWT token_type Validation ──────────────────────────────────────

SECRET = "test-secret-key"  # noqa: S105
JWT_SETTINGS = {"SIGNING_KEY": SECRET, "ALGORITHM": "HS256"}


def _make_scope():
    return {"type": "websocket", "query_string": b"", "headers": [], "user": None}


def _make_token(payload: dict) -> str:
    return jwt.encode(payload, SECRET, algorithm="HS256")


class TestJWTTokenTypeValidation:
    @override_settings(SIMPLE_JWT=JWT_SETTINGS, SECRET_KEY=SECRET)
    def test_valid_websocket_token_authenticates(self):
        """Token with token_type='websocket' should authenticate the user."""
        import asyncio

        from rtc_websockets.middleware import JWTAuthMiddleware

        token = _make_token(
            {"user_id": 42, "token_type": "websocket", "exp": int(time.time()) + 300}
        )
        scope = _make_scope()
        scope["query_string"] = f"token={token}".encode()

        app = AsyncMock()
        middleware = JWTAuthMiddleware(app)

        mock_user = MagicMock(id=42, is_authenticated=True)

        async def fake_get_user(uid):
            return mock_user

        with patch("rtc_websockets.middleware.get_user", side_effect=fake_get_user):
            asyncio.get_event_loop().run_until_complete(middleware(scope, AsyncMock(), AsyncMock()))

        assert scope["user"] is mock_user

    @override_settings(SIMPLE_JWT=JWT_SETTINGS, SECRET_KEY=SECRET)
    def test_access_token_rejected(self):
        """Token with token_type='access' should NOT authenticate."""
        import asyncio

        from rtc_websockets.middleware import JWTAuthMiddleware

        token = _make_token({"user_id": 42, "token_type": "access", "exp": int(time.time()) + 300})
        scope = _make_scope()
        scope["query_string"] = f"token={token}".encode()

        app = AsyncMock()
        middleware = JWTAuthMiddleware(app)

        async def fake_get_user(uid):
            raise AssertionError("get_user should not be called for access tokens")

        with patch("rtc_websockets.middleware.get_user", side_effect=fake_get_user):
            asyncio.get_event_loop().run_until_complete(middleware(scope, AsyncMock(), AsyncMock()))

        # user should remain None (not authenticated)
        assert scope.get("user") is None

    @override_settings(SIMPLE_JWT=JWT_SETTINGS, SECRET_KEY=SECRET)
    def test_missing_token_type_rejected(self):
        """Token without token_type should NOT authenticate."""
        import asyncio

        from rtc_websockets.middleware import JWTAuthMiddleware

        token = _make_token({"user_id": 42, "exp": int(time.time()) + 300})
        scope = _make_scope()
        scope["query_string"] = f"token={token}".encode()

        app = AsyncMock()
        middleware = JWTAuthMiddleware(app)

        async def fake_get_user(uid):
            raise AssertionError("get_user should not be called for tokens without type")

        with patch("rtc_websockets.middleware.get_user", side_effect=fake_get_user):
            asyncio.get_event_loop().run_until_complete(middleware(scope, AsyncMock(), AsyncMock()))

        assert scope.get("user") is None

    @override_settings(SIMPLE_JWT=JWT_SETTINGS, SECRET_KEY=SECRET)
    def test_refresh_token_rejected(self):
        """Token with token_type='refresh' should NOT authenticate."""
        import asyncio

        from rtc_websockets.middleware import JWTAuthMiddleware

        token = _make_token({"user_id": 42, "token_type": "refresh", "exp": int(time.time()) + 300})
        scope = _make_scope()
        scope["query_string"] = f"token={token}".encode()

        app = AsyncMock()
        middleware = JWTAuthMiddleware(app)

        async def fake_get_user(uid):
            raise AssertionError("get_user should not be called for refresh tokens")

        with patch("rtc_websockets.middleware.get_user", side_effect=fake_get_user):
            asyncio.get_event_loop().run_until_complete(middleware(scope, AsyncMock(), AsyncMock()))

        assert scope.get("user") is None


# ── WebSocket Token Endpoint ───────────────────────────────────────


class TestWebSocketTokenEndpoint:
    def test_token_includes_token_type(self):
        """get_websocket_token should include token_type='websocket' in payload."""
        from rtc_websockets.views import get_websocket_token

        request = MagicMock()
        request.user = MagicMock(id=1)

        with override_settings(SIMPLE_JWT=JWT_SETTINGS, SECRET_KEY=SECRET):
            response = get_websocket_token(request)

        import json

        data = json.loads(response.content)
        payload = jwt.decode(data["token"], SECRET, algorithms=["HS256"])
        assert payload["token_type"] == "websocket"
        assert payload["user_id"] == 1
