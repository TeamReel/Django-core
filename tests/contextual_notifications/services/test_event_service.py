"""Tests for EventService."""

import pytest
from unittest.mock import patch, MagicMock
from contextual_notifications.services.event_service import EventService
from contextual_notifications.exceptions import EventValidationError


@pytest.mark.django_db
class TestEventService:
    """Tests for EventService."""

    def test_validate_and_normalize_valid_event(self, event_data):
        """Test validation of a valid event."""
        result = EventService.validate_and_normalize(event_data)

        assert result["event_type"] == "project.updated"
        assert result["context"]["org_id"] == 1
        assert result["payload"]["title"] == "Project Updated"

    def test_validate_missing_event_type(self):
        """Test validation fails when event_type is missing."""
        invalid_event = {
            "context": {"org_id": 1},
            "payload": {"title": "Test"},
        }

        with pytest.raises(EventValidationError, match="event_type"):
            EventService.validate_and_normalize(invalid_event)

    def test_validate_missing_context(self):
        """Test validation fails when context is missing."""
        invalid_event = {
            "event_type": "test.event",
            "payload": {"title": "Test"},
        }

        with pytest.raises(EventValidationError, match="context"):
            EventService.validate_and_normalize(invalid_event)

    def test_validate_missing_payload(self):
        """Test validation fails when payload is missing."""
        invalid_event = {
            "event_type": "test.event",
            "context": {"org_id": 1},
        }

        with pytest.raises(EventValidationError, match="payload"):
            EventService.validate_and_normalize(invalid_event)

    def test_validate_invalid_event_type_format(self):
        """Test validation fails for invalid event_type format."""
        invalid_event = {
            "event_type": "INVALID EVENT",  # Should be lowercase with dots
            "context": {"org_id": 1},
            "payload": {"title": "Test"},
        }

        with pytest.raises(EventValidationError, match="event_type"):
            EventService.validate_and_normalize(invalid_event)

    def test_validate_missing_org_id_in_context(self):
        """Test validation fails when org_id is missing from context."""
        invalid_event = {
            "event_type": "project.updated",
            "context": {"user_id": 1},  # Missing org_id
            "payload": {"title": "Test"},
        }

        with pytest.raises(EventValidationError, match="org_id"):
            EventService.validate_and_normalize(invalid_event)

    @patch("contextual_notifications.services.event_service.route_notification.delay")
    def test_emit_event_queues_celery_task(self, mock_route_task, event_data):
        """Test that emit_event queues a Celery task."""
        EventService.emit_event(
            event_type=event_data["event_type"],
            context=event_data["context"],
            payload=event_data["payload"],
        )

        mock_route_task.assert_called_once()
        call_args = mock_route_task.call_args[0][0]
        assert call_args["event_type"] == "project.updated"
        assert call_args["context"]["org_id"] == 1

    @patch("contextual_notifications.services.event_service.route_notification.delay")
    def test_emit_event_with_invalid_data_does_not_queue(self, mock_route_task):
        """Test that invalid events are not queued."""
        with pytest.raises(EventValidationError):
            EventService.emit_event(
                event_type="",  # Invalid
                context={"org_id": 1},
                payload={"title": "Test"},
            )

        mock_route_task.assert_not_called()

    @patch("contextual_notifications.services.event_service.logger")
    @patch("contextual_notifications.services.event_service.route_notification.delay")
    def test_emit_event_logs_emission(self, mock_route_task, mock_logger, event_data):
        """Test that event emission is logged."""
        EventService.emit_event(
            event_type=event_data["event_type"],
            context=event_data["context"],
            payload=event_data["payload"],
        )

        mock_logger.info.assert_called()
        log_message = mock_logger.info.call_args[0][0]
        assert "project.updated" in log_message

    def test_normalize_adds_resource_id_if_missing(self):
        """Test that normalization adds resource_id if not provided."""
        event = {
            "event_type": "project.updated",
            "context": {
                "org_id": 1,
                "project_id": 42,
            },
            "payload": {"title": "Test"},
        }

        result = EventService.validate_and_normalize(event)

        # Should generate resource_id from project_id
        assert "resource_id" in result["context"]
        assert "project_42" in result["context"]["resource_id"]

    def test_normalize_preserves_existing_resource_id(self):
        """Test that normalization preserves existing resource_id."""
        event = {
            "event_type": "project.updated",
            "context": {
                "org_id": 1,
                "project_id": 42,
                "resource_id": "custom_id_123",
            },
            "payload": {"title": "Test"},
        }

        result = EventService.validate_and_normalize(event)

        assert result["context"]["resource_id"] == "custom_id_123"

    def test_validate_event_type_pattern(self):
        """Test that event_type must match pattern (lowercase, dots, underscores)."""
        valid_types = [
            "project.created",
            "task.assigned",
            "org.member_invited",
            "workflow.step.completed",
        ]

        for event_type in valid_types:
            event = {
                "event_type": event_type,
                "context": {"org_id": 1},
                "payload": {"title": "Test"},
            }
            result = EventService.validate_and_normalize(event)
            assert result["event_type"] == event_type

    def test_validate_rejects_uppercase_event_type(self):
        """Test that uppercase event types are rejected."""
        event = {
            "event_type": "Project.Created",  # Uppercase
            "context": {"org_id": 1},
            "payload": {"title": "Test"},
        }

        with pytest.raises(EventValidationError):
            EventService.validate_and_normalize(event)
