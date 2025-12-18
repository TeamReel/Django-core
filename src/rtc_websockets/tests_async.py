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
    user = await database_sync_to_async(User.objects.create_user)(
        email="async@example.com", password="password"
    )
    org = await database_sync_to_async(Organisation.objects.create)(name="Async Org", creator=user)
    await database_sync_to_async(Membership.objects.create)(
        user=user, organisation=org, role="member"
    )

    communicator = WebsocketCommunicator(NotificationConsumer.as_asgi(), "/ws/notifications/")
    communicator.scope["user"] = user

    connected, _ = await communicator.connect()
    assert connected

    # Verify connection record
    exists = await database_sync_to_async(WebSocketConnection.objects.filter(user=user).exists)()
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
