# ruff: noqa: S101, S106
import asyncio

import pytest
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation

from .consumers import NotificationConsumer
from .models import WebSocketConnection

User = get_user_model()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_notification_consumer_connection():
    from unittest.mock import AsyncMock, patch

    from channels.routing import URLRouter
    from django.urls import re_path

    user = await database_sync_to_async(User.objects.create_user)(
        email="async@example.com", password="password"
    )
    org = await database_sync_to_async(Organisation.objects.create)(name="Async Org", creator=user)
    await database_sync_to_async(Membership.objects.create)(
        user=user, organisation=org, role="member"
    )

    application = URLRouter(
        [
            re_path(r"ws/notifications/$", NotificationConsumer.as_asgi()),
        ]
    )

    # Mock join_user_groups to avoid InMemoryChannelLayer hang issues in test environment
    with patch(
        "rtc_websockets.consumers.NotificationConsumer.join_user_groups", new_callable=AsyncMock
    ) as _:
        communicator = WebsocketCommunicator(application, "/ws/notifications/")
        communicator.scope["user"] = user

        connected, _ = await communicator.connect()
        assert connected

        # Verify connection record
        exists = await database_sync_to_async(
            WebSocketConnection.objects.filter(user=user).exists
        )()
        assert exists

        await communicator.disconnect()

        # Verify cleanup with retry (disconnect handler is async)
        for _ in range(10):
            exists = await database_sync_to_async(
                WebSocketConnection.objects.filter(user=user).exists
            )()
            if not exists:
                break
            await asyncio.sleep(0.1)

        assert not exists


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_presence_connection():
    from channels.routing import URLRouter
    from django.urls import re_path

    from .consumers import PresenceConsumer
    from .models import PresenceStatus

    # Create user
    user = await database_sync_to_async(User.objects.create_user)(
        email="test_presence@example.com", password="password"
    )

    # Create org and membership
    org = await database_sync_to_async(Organisation.objects.create)(name="Test Org", creator=user)
    await database_sync_to_async(Membership.objects.create)(
        user=user, organisation=org, role="member"
    )

    # Setup application
    application = URLRouter(
        [
            re_path(r"ws/presence/(?P<org_id>[0-9a-f-]+)/$", PresenceConsumer.as_asgi()),
        ]
    )

    # Connect
    communicator = WebsocketCommunicator(application, f"/ws/presence/{org.id}/")
    communicator.scope["user"] = user
    connected, subprotocol = await communicator.connect()
    assert connected

    # Check PresenceStatus
    status = await database_sync_to_async(PresenceStatus.objects.get)(
        user=user, organization_id=org.id
    )
    assert status.status == "online"

    # Check WebSocketConnection
    conn = await database_sync_to_async(WebSocketConnection.objects.filter(user=user).exists)()
    assert conn

    # Disconnect
    await communicator.disconnect()

    # Check PresenceStatus offline
    status = await database_sync_to_async(PresenceStatus.objects.get)(
        user=user, organization_id=org.id
    )
    assert status.status == "offline"

    # Check WebSocketConnection deleted
    conn = await database_sync_to_async(WebSocketConnection.objects.filter(user=user).exists)()
    assert not conn


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_presence_updates():
    from channels.routing import URLRouter
    from django.urls import re_path

    from .consumers import PresenceConsumer
    from .models import PresenceStatus

    user = await database_sync_to_async(User.objects.create_user)(
        email="test_presence_update@example.com", password="password"
    )

    # Create org and membership
    org = await database_sync_to_async(Organisation.objects.create)(name="Test Org 2", creator=user)
    await database_sync_to_async(Membership.objects.create)(
        user=user, organisation=org, role="member"
    )

    # Setup application
    application = URLRouter(
        [
            re_path(r"ws/presence/(?P<org_id>[0-9a-f-]+)/$", PresenceConsumer.as_asgi()),
        ]
    )

    communicator = WebsocketCommunicator(application, f"/ws/presence/{org.id}/")
    communicator.scope["user"] = user
    await communicator.connect()

    # Send status update
    await communicator.send_json_to({"type": "status_update", "status": "away"})
    await asyncio.sleep(0.1)

    # Check status
    status = await database_sync_to_async(PresenceStatus.objects.get)(
        user=user, organization_id=org.id
    )
    assert status.status == "away"

    # Send location update
    await communicator.send_json_to({"type": "location_update", "location": "/dashboard"})
    await asyncio.sleep(0.1)

    # Check location
    status = await database_sync_to_async(PresenceStatus.objects.get)(
        user=user, organization_id=org.id
    )
    assert status.current_location == "/dashboard"

    await communicator.disconnect()
