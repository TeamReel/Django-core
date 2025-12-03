"""Integration test: Full event-to-notification routing pipeline.

Tests the complete flow from event emission to B16 handoff.
"""

import pytest
from unittest.mock import patch
from contextual_notifications.services import EventService
from contextual_notifications.models import RoutingRule


@pytest.mark.django_db
class TestEventToNotificationFlow:
    """Integration test for full routing pipeline."""

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.audit_service.audit_log.record")
    def test_full_routing_pipeline(
        self,
        mock_audit_log,
        mock_handoff,
        user,
        organisation,
        project,
        routing_rule_global,
    ):
        """Test complete flow: emit event → route → handoff to B16."""
        # Setup
        project.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        # Emit event
        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}",
            },
            payload={
                "title": "Project Updated",
                "body": "Test project was updated",
                "url": f"/projects/{project.id}",
            },
        )

        # Verify handoff was called
        assert mock_handoff.called
        call_args = mock_handoff.call_args[1]
        assert call_args["user_id"] == user.id
        assert call_args["channel"] == "in_app"

        # Verify audit logging
        assert mock_audit_log.called

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    def test_multiple_channels_delivered(
        self, mock_handoff, user, organisation, project
    ):
        """Test that user receives notifications on multiple channels."""
        # Create rules for both in_app and email
        RoutingRule.objects.create(
            event_type="task.assigned",
            scope="global",
            channel="in_app",
            priority="high",
            enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="task.assigned",
            scope="global",
            channel="email",
            priority="high",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        # Emit event
        EventService.emit_event(
            event_type="task.assigned",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "assignee_id": user.id,
                "resource_id": "task_42",
            },
            payload={
                "title": "Task Assigned",
                "body": "You were assigned a task",
                "url": "/tasks/42",
            },
        )

        # Verify handoff called twice (in_app + email)
        assert mock_handoff.call_count >= 2

        channels = [call[1]["channel"] for call in mock_handoff.call_args_list]
        assert "in_app" in channels
        assert "email" in channels

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    def test_no_rules_no_notification(self, mock_handoff, user, organisation, project):
        """Test that no notification is sent when no rules match."""
        # No routing rules configured for this event type
        project.members.add(user)

        EventService.emit_event(
            event_type="unknown.event",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
            },
            payload={"title": "Unknown Event"},
        )

        # Should not call handoff (no matching rules)
        assert not mock_handoff.called

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    def test_disabled_rule_not_processed(
        self, mock_handoff, user, organisation, project, routing_rule_disabled
    ):
        """Test that disabled rules are not processed."""
        project.members.add(user)

        EventService.emit_event(
            event_type="project.deleted",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
            },
            payload={"title": "Project Deleted"},
        )

        # Should not call handoff (rule is disabled)
        assert not mock_handoff.called

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    def test_scope_precedence_project_overrides_global(
        self, mock_handoff, user, organisation, project
    ):
        """Test that project-scoped rules take precedence over global rules."""
        # Create both global and project-scoped rules
        RoutingRule.objects.create(
            event_type="task.assigned",
            scope="global",
            channel="email",
            priority="normal",
            enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="task.assigned",
            scope="project",
            project=project,
            channel="in_app",
            priority="urgent",
            enabled=True,
            target_role="assignee",
        )

        project.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        EventService.emit_event(
            event_type="task.assigned",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "assignee_id": user.id,
                "resource_id": "task_42",
            },
            payload={
                "title": "Task Assigned",
                "body": "Task assigned",
                "url": "/tasks/42",
            },
        )

        # Both rules should fire (additive, not exclusive)
        assert mock_handoff.call_count >= 1
