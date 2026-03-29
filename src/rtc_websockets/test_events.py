"""Tests for B64 Real-time Events: schema, publisher, and integration points."""

from __future__ import annotations

from dataclasses import asdict
from unittest.mock import patch

from rtc_websockets.events import (
    ActivityCreatedPayload,
    ApprovalDecidedPayload,
    ApprovalRequestedPayload,
    ContentApprovalPayload,
    ContentStatusPayload,
    EventType,
    GenerationStatusPayload,
    RealtimeEvent,
    VideoCompletedPayload,
    VideoProgressPayload,
    build_event,
)
from rtc_websockets.services import RealtimeEventPublisher

# ── Event Schema Tests ──────────────────────────────────────────────


class TestRealtimeEvent:
    def test_to_dict_contains_all_fields(self):
        event = RealtimeEvent(
            event_type=EventType.CONTENT_STATUS_CHANGED,
            data={"content_item_id": 1},
            timestamp="2025-01-01T00:00:00+00:00",
            actor_id=42,
        )
        d = event.to_dict()
        assert d["event_type"] == "content.status_changed"
        assert d["data"] == {"content_item_id": 1}
        assert d["actor_id"] == 42
        assert "event_id" in d
        assert "timestamp" in d

    def test_event_id_unique(self):
        e1 = RealtimeEvent(event_type="test", data={}, timestamp="2025-01-01T00:00:00+00:00")
        e2 = RealtimeEvent(event_type="test", data={}, timestamp="2025-01-01T00:00:00+00:00")
        assert e1.event_id != e2.event_id

    def test_actor_id_nullable(self):
        event = RealtimeEvent(event_type="test", data={}, timestamp="2025-01-01T00:00:00+00:00")
        assert event.actor_id is None


class TestBuildEvent:
    def test_build_content_status_event(self):
        payload = ContentStatusPayload(
            content_item_id=1,
            old_status="queued",
            new_status="generating",
            project_id=10,
            template_name="Lineup",
        )
        event = build_event(EventType.CONTENT_STATUS_CHANGED, payload, actor_id=5)
        assert event.event_type == "content.status_changed"
        assert event.data["content_item_id"] == 1
        assert event.data["old_status"] == "queued"
        assert event.data["new_status"] == "generating"
        assert event.actor_id == 5
        assert event.timestamp  # not empty

    def test_build_video_progress_event(self):
        payload = VideoProgressPayload(
            job_id="abc-123",
            progress_percent=50,
            job_type="transcode",
            project_id=10,
        )
        event = build_event(EventType.VIDEO_PROGRESS, payload)
        assert event.data["progress_percent"] == 50
        assert event.actor_id is None

    def test_build_video_completed_event(self):
        payload = VideoCompletedPayload(
            job_id="abc-123",
            status="completed",
            job_type="transcode",
            project_id=10,
            output_file_id="file-456",
            duration_seconds=12.5,
        )
        event = build_event(EventType.VIDEO_COMPLETED, payload)
        assert event.data["status"] == "completed"
        assert event.data["output_file_id"] == "file-456"

    def test_build_generation_status_event(self):
        payload = GenerationStatusPayload(
            request_id=99,
            status="processing",
            project_id=10,
        )
        event = build_event(EventType.GENERATION_STATUS_CHANGED, payload)
        assert event.data["request_id"] == 99

    def test_build_activity_created_event(self):
        payload = ActivityCreatedPayload(
            activity_id="act-1",
            action_type="created",
            resource_type="content",
            resource_id="42",
            project_id=10,
            actor_name="Jan",
        )
        event = build_event(EventType.ACTIVITY_CREATED, payload, actor_id=3)
        assert event.data["actor_name"] == "Jan"

    def test_build_approval_requested_event(self):
        payload = ApprovalRequestedPayload(
            content_item_id=1,
            project_id=10,
            requester_name="Piet",
        )
        event = build_event(EventType.APPROVAL_REQUESTED, payload)
        assert event.data["requester_name"] == "Piet"

    def test_build_approval_decided_event(self):
        payload = ApprovalDecidedPayload(
            content_item_id=1,
            project_id=10,
            decision="approved",
            reviewer_name="Marie",
            comment="Looks good!",
        )
        event = build_event(EventType.APPROVAL_DECIDED, payload)
        assert event.data["decision"] == "approved"


class TestPayloadSerialization:
    """Ensure all payloads serialize cleanly to dicts."""

    def test_content_status_payload(self):
        p = ContentStatusPayload(
            content_item_id=1,
            old_status="queued",
            new_status="completed",
            project_id=10,
            error_message="oops",
        )
        d = asdict(p)
        assert d["content_item_id"] == 1
        assert d["error_message"] == "oops"
        assert d["thumbnail_url"] is None  # default

    def test_content_approval_payload(self):
        p = ContentApprovalPayload(
            content_item_id=1,
            decision="rejected",
            reviewer_name="Admin",
            project_id=10,
        )
        d = asdict(p)
        assert d["comment"] == ""  # default


# ── Publisher Tests ─────────────────────────────────────────────────


class TestRealtimeEventPublisher:
    @patch("rtc_websockets.services.NotificationService")
    def test_publish_to_user(self, MockNotifService):
        mock_service = MockNotifService.return_value
        publisher = RealtimeEventPublisher()

        event = build_event(
            EventType.CONTENT_STATUS_CHANGED,
            ContentStatusPayload(
                content_item_id=1,
                old_status="queued",
                new_status="generating",
                project_id=10,
            ),
            actor_id=5,
        )
        publisher.publish_to_user(user_id=42, event=event)

        mock_service.send_user_notification.assert_called_once()
        call_args = mock_service.send_user_notification.call_args
        assert call_args.kwargs["user_id"] == 42
        assert call_args.kwargs["message_type"] == "content.status_changed"

    @patch("rtc_websockets.services.NotificationService")
    def test_publish_to_org(self, MockNotifService):
        mock_service = MockNotifService.return_value
        publisher = RealtimeEventPublisher()

        event = build_event(
            EventType.VIDEO_COMPLETED,
            VideoCompletedPayload(
                job_id="j1",
                status="completed",
                job_type="transcode",
                project_id=10,
            ),
        )
        publisher.publish_to_org(org_id=7, event=event)
        mock_service.send_org_notification.assert_called_once()

    @patch("rtc_websockets.services.NotificationService")
    def test_publish_to_project(self, MockNotifService):
        mock_service = MockNotifService.return_value
        publisher = RealtimeEventPublisher()

        event = build_event(
            EventType.GENERATION_STATUS_CHANGED,
            GenerationStatusPayload(request_id=1, status="completed", project_id=10),
        )
        publisher.publish_to_project(project_id=10, event=event)

        mock_service.send_project_notification.assert_called_once()
        call_args = mock_service.send_project_notification.call_args
        assert call_args.kwargs["project_id"] == 10


# ── EventType Registry Tests ────────────────────────────────────────


class TestEventTypeRegistry:
    """Verify all event type constants follow naming convention."""

    def test_all_types_use_dotted_notation(self):
        types = [
            EventType.CONTENT_STATUS_CHANGED,
            EventType.CONTENT_APPROVED,
            EventType.CONTENT_REJECTED,
            EventType.VIDEO_PROGRESS,
            EventType.VIDEO_COMPLETED,
            EventType.GENERATION_STATUS_CHANGED,
            EventType.ACTIVITY_CREATED,
            EventType.APPROVAL_REQUESTED,
            EventType.APPROVAL_DECIDED,
        ]
        for t in types:
            assert "." in t, f"Event type {t} should use dotted notation"

    def test_no_duplicate_event_types(self):
        types = [
            EventType.CONTENT_STATUS_CHANGED,
            EventType.CONTENT_APPROVED,
            EventType.CONTENT_REJECTED,
            EventType.VIDEO_PROGRESS,
            EventType.VIDEO_COMPLETED,
            EventType.GENERATION_STATUS_CHANGED,
            EventType.ACTIVITY_CREATED,
            EventType.APPROVAL_REQUESTED,
            EventType.APPROVAL_DECIDED,
        ]
        assert len(types) == len(set(types)), "Duplicate event types found"
