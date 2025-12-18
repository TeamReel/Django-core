# ruff: noqa: S101, S106
import pytest
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.core.cache import cache

from .consumers import BaseConsumer
from .ratelimit import AsyncRateLimiter

User = get_user_model()


@pytest.mark.asyncio
class TestAsyncRateLimiter:
    async def test_check_limit_allow(self, settings):
        settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
        limiter = AsyncRateLimiter(limit=5, window=60)
        cache.clear()

        allowed, remaining = await limiter.check_limit("test_key")
        assert allowed is True
        assert remaining == 4

    async def test_check_limit_exceeded(self, settings):
        settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
        limiter = AsyncRateLimiter(limit=1, window=60)
        cache.clear()

        # First request
        allowed, remaining = await limiter.check_limit("test_key_2")
        assert allowed is True

        # Second request (should fail)
        allowed, remaining = await limiter.check_limit("test_key_2")
        assert allowed is False
        assert remaining == 0


@pytest.mark.asyncio
@pytest.mark.django_db
class TestConsumerRateLimit:
    async def test_rate_limit_enforcement(self, settings):
        # Configure settings for rate limiting
        settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
        settings.WEBSOCKET_RATELIMIT_LIMIT = 1
        settings.WEBSOCKET_RATELIMIT_WINDOW = 60

        cache.clear()

        # Create user
        user = await database_sync_to_async(User.objects.create_user)(
            email="test@example.com", password="password"  # noqa: S106
        )

        communicator = WebsocketCommunicator(BaseConsumer.as_asgi(), "/ws/test/")
        communicator.scope["user"] = user

        connected, _ = await communicator.connect()
        assert connected

        # Send a message - Should be OK (1st request)
        await communicator.send_json_to({"type": "ping"})

        # Expect pong
        response = await communicator.receive_json_from()
        assert response.get("type") == "pong"

        # Send another message - Should be Rate Limited (2nd request)
        await communicator.send_json_to({"type": "ping"})

        # Expect error message
        response = await communicator.receive_json_from()

        # If the first ping didn't generate a response, this response might be for the first ping?
        # No, if the first ping was allowed, the consumer processes it.
        # If the consumer is BaseConsumer, does it handle "ping"?
        # Let's check BaseConsumer implementation.

        assert response["type"] == "error"
        assert response["code"] == 4029
        assert "Rate limit exceeded" in response["message"]

        await communicator.disconnect()
