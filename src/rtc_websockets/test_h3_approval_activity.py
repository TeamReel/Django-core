"""B64 H3 — Tests for approval & activity event publishing."""

from unittest.mock import MagicMock, patch

from rtc_websockets.events import (
    ActivityCreatedPayload,
    ApprovalDecidedPayload,
    ApprovalRequestedPayload,
    EventType,
    build_event,
)


class TestApprovalRequestedEvent:
    """Tests for approval.requested event construction."""

    def test_build_approval_requested(self):
        payload = ApprovalRequestedPayload(
            content_item_id=42,
            project_id=10,
            requester_name="Jan",
            template_name="Match Flyer",
        )
        event = build_event(EventType.APPROVAL_REQUESTED, payload, actor_id=5)

        assert event.event_type == "approval.requested"
        assert event.data["content_item_id"] == 42
        assert event.data["project_id"] == 10
        assert event.data["requester_name"] == "Jan"
        assert event.data["template_name"] == "Match Flyer"
        assert event.actor_id == 5

    def test_approval_requested_serialization(self):
        payload = ApprovalRequestedPayload(
            content_item_id=1,
            project_id=2,
            requester_name="",
        )
        event = build_event(EventType.APPROVAL_REQUESTED, payload)
        d = event.to_dict()
        assert d["event_type"] == "approval.requested"
        assert isinstance(d["data"], dict)
        assert d["data"]["template_name"] == ""


class TestApprovalDecidedEvent:
    """Tests for approval.decided event construction."""

    def test_build_approved(self):
        payload = ApprovalDecidedPayload(
            content_item_id=42,
            project_id=10,
            decision="approved",
            reviewer_name="Coach",
        )
        event = build_event(EventType.APPROVAL_DECIDED, payload, actor_id=7)

        assert event.event_type == "approval.decided"
        assert event.data["decision"] == "approved"
        assert event.data["reviewer_name"] == "Coach"
        assert event.actor_id == 7

    def test_build_rejected_with_comment(self):
        payload = ApprovalDecidedPayload(
            content_item_id=42,
            project_id=10,
            decision="rejected",
            reviewer_name="Admin",
            comment="Logo niet goed",
        )
        event = build_event(EventType.APPROVAL_DECIDED, payload)

        assert event.data["decision"] == "rejected"
        assert event.data["comment"] == "Logo niet goed"

    def test_build_revision_requested(self):
        payload = ApprovalDecidedPayload(
            content_item_id=42,
            project_id=10,
            decision="revision_requested",
            reviewer_name="Editor",
            comment="Pas kleuren aan",
        )
        event = build_event(EventType.APPROVAL_DECIDED, payload)
        assert event.data["decision"] == "revision_requested"


class TestActivityCreatedEvent:
    """Tests for activity.created event construction."""

    def test_build_activity_event(self):
        payload = ActivityCreatedPayload(
            activity_id="abc-123",
            action_type="content.approved",
            resource_type="ContentItem",
            resource_id="42",
            project_id=10,
            actor_name="Jan Jansen",
        )
        event = build_event(EventType.ACTIVITY_CREATED, payload, actor_id=3)

        assert event.event_type == "activity.created"
        assert event.data["activity_id"] == "abc-123"
        assert event.data["action_type"] == "content.approved"
        assert event.data["project_id"] == 10
        assert event.actor_id == 3

    def test_activity_event_without_actor_name(self):
        payload = ActivityCreatedPayload(
            activity_id="def-456",
            action_type="member.joined",
            resource_type="Membership",
            resource_id="99",
            project_id=5,
        )
        event = build_event(EventType.ACTIVITY_CREATED, payload)
        assert event.data["actor_name"] == ""
        assert event.actor_id is None


class TestApprovalEventPublishing:
    """Tests that RealtimeEventPublisher correctly publishes approval events."""

    @patch("rtc_websockets.services.NotificationService")
    def test_publish_approval_to_project(self, MockNotifService):
        from rtc_websockets.services import RealtimeEventPublisher

        mock_svc = MockNotifService.return_value
        publisher = RealtimeEventPublisher()

        payload = ApprovalDecidedPayload(
            content_item_id=42,
            project_id=10,
            decision="approved",
            reviewer_name="Coach",
        )
        event = build_event(EventType.APPROVAL_DECIDED, payload, actor_id=7)
        publisher.publish_to_project(10, event)

        mock_svc.send_project_notification.assert_called_once()
        call_args = mock_svc.send_project_notification.call_args
        assert call_args[1]["project_id"] == 10 or call_args[0][0] == 10
        sent_payload = call_args[1].get("payload") or call_args[0][2]
        assert sent_payload["event_type"] == "approval.decided"

    @patch("rtc_websockets.services.NotificationService")
    def test_publish_activity_created_to_project(self, MockNotifService):
        from rtc_websockets.services import RealtimeEventPublisher

        mock_svc = MockNotifService.return_value
        publisher = RealtimeEventPublisher()

        payload = ActivityCreatedPayload(
            activity_id="test-id",
            action_type="content.created",
            resource_type="ContentItem",
            resource_id="1",
            project_id=5,
        )
        event = build_event(EventType.ACTIVITY_CREATED, payload)
        publisher.publish_to_project(5, event)

        mock_svc.send_project_notification.assert_called_once()


class TestBroadcastContentStatusApprovalRequested:
    """Tests that broadcast_content_status publishes approval.requested on completion."""

    @patch("rtc_websockets.services.NotificationService")
    @patch("rtc_websockets.services.get_channel_layer")
    def test_completed_status_publishes_approval_requested(self, mock_get_layer, MockNotifService):
        mock_layer = MagicMock()
        mock_get_layer.return_value = mock_layer
        mock_svc = MockNotifService.return_value

        # Re-import to pick up our mock; guard against INSTALLED_APPS issue
        try:
            from content_generation.tasks import broadcast_content_status
        except RuntimeError:
            import pytest

            pytest.skip("content_generation not in INSTALLED_APPS")

        broadcast_content_status(
            content_item_id=42,
            status="completed",
            progress_percent=100,
            old_status="generating",
            project_id=10,
            template_name="Match Flyer",
            actor_id=3,
        )

        # Should have been called twice: once for content.status_changed,
        # once for approval.requested
        assert mock_svc.send_project_notification.call_count == 2
        call_types = [c[0][1] for c in mock_svc.send_project_notification.call_args_list]
        assert "content.status_changed" in call_types
        assert "approval.requested" in call_types

    @patch("rtc_websockets.services.NotificationService")
    @patch("rtc_websockets.services.get_channel_layer")
    def test_non_completed_status_no_approval_requested(self, mock_get_layer, MockNotifService):
        mock_layer = MagicMock()
        mock_get_layer.return_value = mock_layer
        mock_svc = MockNotifService.return_value

        try:
            from content_generation.tasks import broadcast_content_status
        except RuntimeError:
            import pytest

            pytest.skip("content_generation not in INSTALLED_APPS")

        broadcast_content_status(
            content_item_id=42,
            status="generating",
            progress_percent=50,
            old_status="queued",
            project_id=10,
            template_name="Match Flyer",
        )

        # Only called once: content.status_changed (no approval.requested)
        assert mock_svc.send_project_notification.call_count == 1
        call_type = mock_svc.send_project_notification.call_args[0][1]
        assert call_type == "content.status_changed"
