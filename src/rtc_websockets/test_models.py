from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from .models import ActivityEvent, PresenceStatus, RealtimeMessage, WebSocketConnection
from .services import NotificationService

User = get_user_model()


class WebSocketConnectionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", password="password"  # noqa: S106
        )

    def test_create_connection(self):
        connection = WebSocketConnection.objects.create(user=self.user, channel_name="test.channel")
        self.assertIsNotNone(connection.connection_id)
        self.assertEqual(connection.message_count, 0)
        self.assertFalse(connection.is_stale())

    def test_channel_name_validation(self):
        connection = WebSocketConnection(user=self.user, channel_name="invalid channel name!")
        with self.assertRaises(ValidationError):
            connection.full_clean()

    def test_increment_message_count(self):
        connection = WebSocketConnection.objects.create(user=self.user, channel_name="test.channel")
        connection.increment_message_count()
        connection.refresh_from_db()
        self.assertEqual(connection.message_count, 1)

    def test_is_stale(self):
        connection = WebSocketConnection.objects.create(user=self.user, channel_name="test.channel")
        # Manually set last_heartbeat to past
        connection.last_heartbeat = timezone.now() - timezone.timedelta(minutes=10)
        connection.save()
        self.assertTrue(connection.is_stale(timeout_seconds=300))


class RealtimeMessageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="sender@example.com", password="password"  # noqa: S106
        )

    def test_create_message(self):
        message = RealtimeMessage.objects.create(
            message_type="notification",
            scope_type="user",
            scope_id=self.user.id,
            sender_user=self.user,
            content={"text": "Hello"},
        )
        self.assertIsNotNone(message.message_id)
        self.assertIsNone(message.delivered_at)

    def test_envelope_format(self):
        message = RealtimeMessage.objects.create(
            message_type="notification",
            scope_type="user",
            scope_id=self.user.id,
            sender_user=self.user,
            content={"text": "Hello"},
        )
        envelope = message.to_envelope_format()
        self.assertEqual(envelope["meta"]["type"], "notification")
        self.assertEqual(envelope["payload"]["data"]["text"], "Hello")
        self.assertEqual(envelope["auth"]["user_id"], self.user.id)

    def test_mark_delivered(self):
        message = RealtimeMessage.objects.create(
            message_type="notification",
            scope_type="user",
            scope_id=self.user.id,
            sender_user=self.user,
            content={"text": "Hello"},
        )
        message.mark_delivered()
        self.assertIsNotNone(message.delivered_at)

    def test_retry_logic(self):
        message = RealtimeMessage.objects.create(
            message_type="notification",
            scope_type="user",
            scope_id=self.user.id,
            sender_user=self.user,
            content={"text": "Hello"},
        )
        # Retry 1
        self.assertTrue(message.increment_retry())
        message.refresh_from_db()
        self.assertEqual(message.retry_count, 1)

        # Retry 2
        self.assertTrue(message.increment_retry())
        message.refresh_from_db()

        # Retry 3
        self.assertTrue(message.increment_retry())
        message.refresh_from_db()

        # Retry 4 (should fail)
        self.assertFalse(message.increment_retry())
        message.refresh_from_db()
        self.assertEqual(message.retry_count, 3)


class PresenceStatusTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="presence@example.com", password="password"  # noqa: S106
        )

    def test_update_status(self):
        presence = PresenceStatus.objects.create(
            user=self.user, organization_id=1, status="offline"
        )
        presence.update_status("online", location="/dashboard")
        self.assertEqual(presence.status, "online")
        self.assertEqual(presence.current_location, "/dashboard")

    def test_unique_constraint(self):
        PresenceStatus.objects.create(user=self.user, organization_id=1, project_id=10)
        with self.assertRaises(IntegrityError):
            PresenceStatus.objects.create(user=self.user, organization_id=1, project_id=10)


class ActivityEventTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="actor@example.com", password="password"  # noqa: S106
        )

    def test_create_event(self):
        event = ActivityEvent.objects.create(
            actor_user=self.user,
            action_type="project.created",
            resource_type="project",
            resource_id=101,
            organization_id=1,
            metadata={"name": "New Project"},
        )
        self.assertIsNotNone(event.event_id)
        self.assertEqual(event.metadata["name"], "New Project")


class NotificationServiceTests(TestCase):
    def setUp(self):
        self.service = NotificationService()

    def test_create_envelope(self):
        envelope = self.service._create_envelope("test.type", {"foo": "bar"}, "user", "123")
        self.assertIn("id", envelope)
        self.assertEqual(envelope["type"], "test.type")
        self.assertEqual(envelope["payload"], {"foo": "bar"})
        self.assertEqual(envelope["meta"]["scope"], "user")
        self.assertEqual(envelope["meta"]["target_id"], "123")
        self.assertIn("timestamp", envelope)
