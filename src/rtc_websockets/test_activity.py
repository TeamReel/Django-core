# ruff: noqa: S101, S106
import pytest
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from projects.models import Project

from .consumers import ActivityConsumer

User = get_user_model()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_activity_consumer_connection():
    from channels.routing import URLRouter
    from django.urls import re_path

    user = await database_sync_to_async(User.objects.create_user)(
        email="activity_test@example.com", password="password"
    )
    org = await database_sync_to_async(Organisation.objects.create)(
        name="Activity Org", creator=user
    )
    project = await database_sync_to_async(Project.objects.create)(
        name="Activity Project", organisation=org, creator=user
    )

    await database_sync_to_async(Membership.objects.create)(
        user=user, organisation=org, role="member"
    )

    application = URLRouter(
        [
            re_path(r"ws/activity/(?P<project_id>\d+)/$", ActivityConsumer.as_asgi()),
        ]
    )

    communicator = WebsocketCommunicator(application, f"/ws/activity/{project.id}/")
    communicator.scope["user"] = user

    connected, _ = await communicator.connect()
    assert connected
    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_activity_consumer_no_access():
    from channels.routing import URLRouter
    from django.urls import re_path

    user = await database_sync_to_async(User.objects.create_user)(
        email="no_access@example.com", password="password"
    )

    other_user = await database_sync_to_async(User.objects.create_user)(
        email="other@example.com", password="password"
    )
    other_org = await database_sync_to_async(Organisation.objects.create)(
        name="Other Org 2", creator=other_user
    )
    project = await database_sync_to_async(Project.objects.create)(
        name="Secret Project", organisation=other_org, creator=other_user
    )

    application = URLRouter(
        [
            re_path(r"ws/activity/(?P<project_id>\d+)/$", ActivityConsumer.as_asgi()),
        ]
    )

    communicator = WebsocketCommunicator(application, f"/ws/activity/{project.id}/")
    communicator.scope["user"] = user

    connected, _ = await communicator.connect()
    assert not connected


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_activity_service_broadcast(settings):
    from channels.routing import URLRouter
    from django.urls import re_path

    from .services import ActivityService

    # Force InMemoryChannelLayer
    settings.CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }

    user = await database_sync_to_async(User.objects.create_user)(
        email="broadcaster@example.com", password="password"
    )

    service = ActivityService()

    # Setup
    org = await database_sync_to_async(Organisation.objects.create)(
        name="Broadcast Org", creator=user
    )
    project = await database_sync_to_async(Project.objects.create)(
        name="Broadcast Project", organisation=org, creator=user
    )
    await database_sync_to_async(Membership.objects.create)(
        user=user, organisation=org, role="member"
    )

    application = URLRouter(
        [
            re_path(r"ws/activity/(?P<project_id>\d+)/$", ActivityConsumer.as_asgi()),
        ]
    )

    communicator = WebsocketCommunicator(application, f"/ws/activity/{project.id}/")
    communicator.scope["user"] = user
    connected, _ = await communicator.connect()
    assert connected

    # Broadcast
    await database_sync_to_async(service.broadcast_activity)(
        project_id=project.id,
        action_type="create",
        resource_type="task",
        resource_id=99,
        actor_user=user,
        metadata={"foo": "bar"},
    )

    # Receive
    response = await communicator.receive_json_from()
    assert response["type"] == "activity.event"
    assert response["action"] == "create"
    assert response["resource"]["id"] == 99

    await communicator.disconnect()
