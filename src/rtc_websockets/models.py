import uuid

from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

User = get_user_model()


class WebSocketConnection(models.Model):
    AUTH_METHOD_CHOICES = [
        ("session", "Session Authentication"),
        ("jwt", "JWT Token Authentication"),
    ]

    connection_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the WebSocket connection",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="websocket_connections",
        help_text="User associated with this connection",
    )

    channel_name = models.CharField(
        max_length=255,
        unique=True,
        validators=[
            RegexValidator(
                regex=r"^[a-zA-Z0-9\.\-_]+$",
                message="Channel name must be alphanumeric with dots, hyphens, underscores",
            )
        ],
        help_text="Django Channels channel name for message routing",
    )

    authenticated_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when connection was authenticated"
    )

    last_heartbeat = models.DateTimeField(
        default=timezone.now, help_text="Last received heartbeat timestamp"
    )

    message_count = models.PositiveIntegerField(
        default=0, help_text="Number of messages sent through this connection"
    )

    auth_method = models.CharField(
        max_length=10,
        choices=AUTH_METHOD_CHOICES,
        default="session",
        help_text="Authentication method used for this connection",
    )

    client_info = models.JSONField(
        default=dict, blank=True, help_text="Browser/client metadata for debugging"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "realtime_websocket_connection"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["last_heartbeat"]),
            models.Index(fields=["auth_method"]),
        ]

    def __str__(self):
        return f"WebSocket {self.connection_id} - {self.user.username}"

    def is_stale(self, timeout_seconds=300):
        """Check if connection is stale based on last heartbeat"""
        return timezone.now() - self.last_heartbeat > timezone.timedelta(seconds=timeout_seconds)

    def increment_message_count(self):
        """Safely increment message count"""
        self.message_count = models.F("message_count") + 1
        self.save(update_fields=["message_count"])


class RealtimeMessage(models.Model):
    MESSAGE_TYPE_CHOICES = [
        ("notification", "Notification Message"),
        ("presence", "Presence Update"),
        ("activity", "Activity Event"),
    ]

    SCOPE_TYPE_CHOICES = [
        ("user", "User Specific"),
        ("organization", "Organization Wide"),
        ("project", "Project Specific"),
    ]

    message_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for message tracking",
    )

    message_type = models.CharField(
        max_length=20, choices=MESSAGE_TYPE_CHOICES, help_text="Type of real-time message"
    )

    scope_type = models.CharField(
        max_length=20, choices=SCOPE_TYPE_CHOICES, help_text="Broadcast scope level"
    )

    scope_id = models.PositiveIntegerField(
        help_text="ID of the scope (user_id, org_id, project_id)"
    )

    sender_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_realtime_messages",
        help_text="User who triggered this message",
    )

    content = models.JSONField(help_text="Message payload following structured envelope format")

    created_at = models.DateTimeField(auto_now_add=True, help_text="Message creation timestamp")

    delivered_at = models.DateTimeField(
        null=True, blank=True, help_text="When message was successfully delivered"
    )

    retry_count = models.PositiveSmallIntegerField(
        default=0, help_text="Number of delivery attempts"
    )

    class Meta:
        db_table = "realtime_message"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["scope_type", "scope_id", "-created_at"]),
            models.Index(fields=["message_type", "-created_at"]),
            models.Index(fields=["sender_user", "-created_at"]),
            models.Index(fields=["delivered_at"]),
        ]

    def __str__(self):
        return f"{self.message_type} message {self.message_id}"

    def mark_delivered(self):
        """Mark message as successfully delivered"""
        self.delivered_at = timezone.now()
        self.save(update_fields=["delivered_at"])

    def increment_retry(self):
        """Increment retry count for failed delivery"""
        if self.retry_count < 3:
            self.retry_count = models.F("retry_count") + 1
            self.save(update_fields=["retry_count"])
            return True
        return False

    def to_envelope_format(self):
        """Convert to structured envelope format for WebSocket transmission"""
        return {
            "meta": {
                "type": self.message_type,
                "id": str(self.message_id),
                "timestamp": self.created_at.isoformat(),
                "version": "1.0",
            },
            "payload": {"data": self.content},
            "auth": {
                "user_id": self.sender_user.id,
                "scope": f"{self.scope_type}:{self.scope_id}",
            },
        }


class PresenceStatus(models.Model):
    STATUS_CHOICES = [
        ("online", "Online"),
        ("away", "Away"),
        ("offline", "Offline"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="presence_statuses")

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="offline")

    last_seen = models.DateTimeField(default=timezone.now, help_text="Last activity timestamp")

    current_location = models.CharField(
        max_length=255, blank=True, null=True, help_text="Current page/project location"
    )

    organization_id = models.PositiveIntegerField(
        help_text="Organization scope for presence visibility"
    )

    project_id = models.PositiveIntegerField(
        null=True, blank=True, help_text="Optional project scope"
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "realtime_presence_status"
        unique_together = [["user", "organization_id", "project_id"]]
        indexes = [
            models.Index(fields=["organization_id", "status"]),
            models.Index(fields=["project_id", "status"]),
            models.Index(fields=["last_seen"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.status} in org {self.organization_id}"

    def update_status(self, new_status, location=None):
        """Update presence status with timestamp"""
        self.status = new_status
        self.last_seen = timezone.now()
        if location is not None:
            self.current_location = location
        self.save(update_fields=["status", "last_seen", "current_location", "updated_at"])


class ActivityEvent(models.Model):
    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    actor_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="activity_events",
        help_text="User who performed the action",
    )

    action_type = models.CharField(max_length=50, help_text="Type of action performed")

    resource_type = models.CharField(max_length=50, help_text="Type of resource affected")

    resource_id = models.PositiveIntegerField(help_text="ID of the affected resource")

    organization_id = models.PositiveIntegerField(help_text="Organization context")

    project_id = models.PositiveIntegerField(
        null=True, blank=True, help_text="Optional project context"
    )

    occurred_at = models.DateTimeField(default=timezone.now, help_text="When the activity occurred")

    metadata = models.JSONField(
        default=dict, blank=True, help_text="Additional activity-specific data"
    )

    class Meta:
        db_table = "realtime_activity_event"
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["organization_id", "-occurred_at"]),
            models.Index(fields=["project_id", "-occurred_at"]),
            models.Index(fields=["actor_user", "-occurred_at"]),
            models.Index(fields=["action_type", "-occurred_at"]),
        ]

    def __str__(self):
        return (
            f"{self.actor_user.username} {self.action_type} {self.resource_type} {self.resource_id}"
        )
