import logging
import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

logger = logging.getLogger(__name__)

# In-memory queue for failed messages
FAILED_MESSAGE_QUEUE = []


class NotificationService:
    """
    Service for sending real-time notifications via WebSockets.
    Handles message formatting (enveloping) and channel layer communication.
    """

    def __init__(self):
        self.channel_layer = get_channel_layer()

    def send_user_notification(self, user_id, message_type, payload):
        """
        Send a notification to a specific user.

        Args:
            user_id: ID of the target user
            message_type: Type of notification (e.g., 'notification.created')
            payload: Data content of the notification
        """
        group_name = f"user_{user_id}"
        envelope = self._create_envelope(message_type, payload, "user", user_id)
        self._send_to_group(group_name, envelope)

    def send_org_notification(self, org_id, message_type, payload):
        """
        Send a notification to all users in an organization.

        Args:
            org_id: ID of the target organization
            message_type: Type of notification
            payload: Data content
        """
        group_name = f"org_{org_id}"
        envelope = self._create_envelope(message_type, payload, "organization", org_id)
        self._send_to_group(group_name, envelope)

    def send_project_notification(self, project_id, message_type, payload):
        """
        Send a notification to all users in a project.

        Args:
            project_id: ID of the target project
            message_type: Type of notification
            payload: Data content
        """
        group_name = f"project_{project_id}"
        envelope = self._create_envelope(message_type, payload, "project", project_id)
        self._send_to_group(group_name, envelope)

    def _create_envelope(self, message_type, payload, scope, target_id):
        """
        Wrap message in standard envelope format.
        """
        return {
            "id": str(uuid.uuid4()),
            "type": message_type,
            "timestamp": timezone.now().isoformat(),
            "payload": payload,
            "meta": {"scope": scope, "target_id": str(target_id)},
        }

    def _send_to_group(self, group_name, envelope):
        """
        Send enveloped message to a channel group.
        """
        try:
            async_to_sync(self.channel_layer.group_send)(
                group_name, {"type": "notification_message", "message": envelope}
            )
            logger.debug(f"Sent {envelope['type']} to {group_name}")

        except Exception as e:
            logger.error(f"Failed to send notification to {group_name}: {e}")
            # Queue for retry
            FAILED_MESSAGE_QUEUE.append(
                {"group": group_name, "envelope": envelope, "timestamp": timezone.now()}
            )

    def retry_failed_messages(self):
        """
        Attempt to resend failed messages.
        """
        global FAILED_MESSAGE_QUEUE
        if not FAILED_MESSAGE_QUEUE:
            return

        # Copy and clear queue to handle new failures during retry
        current_queue = FAILED_MESSAGE_QUEUE[:]
        FAILED_MESSAGE_QUEUE = []

        for item in current_queue:
            self._send_to_group(item["group"], item["envelope"])
