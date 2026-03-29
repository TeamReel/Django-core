from unittest.mock import MagicMock, patch

# ruff: noqa: S101, S106
import pytest
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from projects.models import Project
from rtc_websockets.consumers import ActivityConsumer
from rtc_websockets.services import ActivityService

User = get_user_model()


@pytest.mark.asyncio
@pytest.mark.django_db
async def test_activity_consumer_metrics(settings):
    # Force InMemoryChannelLayer
    settings.CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }
    with patch("rtc_websockets.metrics.emit_metric") as mock_emit:
        # Setup
        user = await User.objects.acreate(
            email="test_metrics@example.com", password="password"
        )  # noqa: S106
        org = await Organisation.objects.acreate(
            name="Test Org Metrics", slug="test-org-metrics", creator=user
        )
        project = await Project.objects.acreate(
            name="Test Project Metrics", organisation=org, creator=user
        )
        await Membership.objects.acreate(user=user, organisation=org, role="admin")

        # Connect
        communicator = WebsocketCommunicator(
            ActivityConsumer.as_asgi(), f"/ws/activity/{project.id}/"
        )
        communicator.scope["user"] = user
        communicator.scope["url_route"] = {"kwargs": {"project_id": str(project.id)}}

        connected, _ = await communicator.connect()
        assert connected

        # Verify connection metrics
        # inc_websocket_connections("activity") calls:
        # emit_metric("counter", "websocket_connections_total", 1, {"type": "activity"})
        # emit_metric("gauge_delta", "websocket_connections_active", 1, {"type": "activity"})

        # Check calls
        found_total = False
        found_active = False
        for call in mock_emit.call_args_list:
            args = call[0]
            if (
                args[0] == "counter"
                and args[1] == "websocket_connections_total"
                and args[2] == 1
                and args[3].get("type") == "activity"
            ):
                found_total = True
            if (
                args[0] == "gauge_delta"
                and args[1] == "websocket_connections_active"
                and args[2] == 1
                and args[3].get("type") == "activity"
            ):
                found_active = True

        assert found_total, "websocket_connections_total metric not found"
        assert found_active, "websocket_connections_active metric not found"

        mock_emit.reset_mock()

        # Disconnect
        await communicator.disconnect()

        # Verify disconnection metrics
        # dec_websocket_connections("activity") calls:
        # emit_metric("gauge_delta", "websocket_connections_active", -1, {"type": "activity"})

        found_active_dec = False
        for call in mock_emit.call_args_list:
            args = call[0]
            if (
                args[0] == "gauge_delta"
                and args[1] == "websocket_connections_active"
                and args[2] == -1
                and args[3].get("type") == "activity"
            ):
                found_active_dec = True

        assert found_active_dec, "websocket_connections_active decrement metric not found"


@pytest.mark.django_db
def test_activity_service_metrics():
    with patch("rtc_websockets.metrics.emit_metric") as mock_emit:
        user = User.objects.create(
            email="sender_metrics@example.com", password="password"
        )  # noqa: S106
        service = ActivityService()

        # Mock channel_layer to avoid actual sending
        service.channel_layer = MagicMock()

        # Make group_send an async mock so async_to_sync can handle it
        async def async_mock(*args, **kwargs):
            return None

        service.channel_layer.group_send = async_mock

        service.broadcast_activity(
            project_id="123",
            action_type="test.action",
            resource_type="task",
            resource_id="456",
            actor_user=user,
        )

        # Verify message sent metric
        # inc_websocket_messages_sent("activity") calls:
        # emit_metric("counter", "websocket_messages_sent_total", 1, {"type": "activity"})

        found_sent = False
        for call in mock_emit.call_args_list:
            args = call[0]
            if (
                args[0] == "counter"
                and args[1] == "websocket_messages_sent_total"
                and args[2] == 1
                and args[3].get("type") == "activity"
            ):
                found_sent = True

        assert found_sent, "websocket_messages_sent_total metric not found"
