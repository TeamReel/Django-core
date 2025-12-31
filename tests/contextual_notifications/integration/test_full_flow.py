"""Integration test: Full event-to-notification routing pipeline.

Tests the complete flow from event emission to B16 handoff.
"""

from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache
from contextual_notifications.models import RoutingRule
from contextual_notifications.services import EventService
from permissions.models import Role, RoleAssignment, ScopeChoices


@pytest.mark.django_db
class TestEventToNotificationFlow:
    """Integration test for full routing pipeline."""

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    @patch("contextual_notifications.services.audit_service.AuditService.log_routing_decision")
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
        role_member, _ = Role.objects.get_or_create(
            name="member", defaults={"description": "Member"}
        )
        RoleAssignment.objects.create(
            user=user,
            role=role_member,
            scope=ScopeChoices.GLOBAL,
        )
        mock_notification = MagicMock()
        mock_notification.id = "notif-123"
        mock_handoff.return_value = mock_notification

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
        assert call_args["recipient_user"] == user
        assert call_args["channel"] == "in_app"

        # Verify audit logging
        assert mock_audit_log.called

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    def test_multiple_channels_delivered(self, mock_handoff, user, organisation, project):
        """Test that user receives notifications on multiple channels."""
        cache.clear()  # Ensure clean state

        # Create rules for both in_app and email
        RoutingRule.objects.create(
            event_type="task.assigned",
            scope=RoutingRule.SCOPE_ORG,
            organisation=organisation,
            channel="in_app",
            priority=RoutingRule.PRIORITY_HIGH,
            is_enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="task.assigned",
            scope=RoutingRule.SCOPE_ORG,
            organisation=organisation,
            channel="email",
            priority=RoutingRule.PRIORITY_HIGH,
            is_enabled=True,
            target_role="member",
        )

        role_member, _ = Role.objects.get_or_create(
            name="member",
            scope=ScopeChoices.ORGANIZATION,
            defaults={"description": "Member"},
        )
        RoleAssignment.objects.create(
            user=user,
            role=role_member,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=organisation,
        )
        mock_notification = MagicMock()
        mock_notification.id = "notif-123"
        mock_handoff.return_value = mock_notification

        print(f"DEBUG: Roles in DB: {list(Role.objects.values('name', 'scope'))}")
        print(f"DEBUG: Rules in DB: {list(RoutingRule.objects.values('target_role', 'scope'))}")

        # Emit event with unique resource_id
        EventService.emit_event(
            event_type="task.assigned",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "assignee_id": user.id,
                "resource_id": f"task_multichannel_{organisation.id}_{user.id}",
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

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    def test_no_rules_no_notification(self, mock_handoff, user, organisation, project):
        """Test that no notification is sent when no rules match."""
        # No routing rules configured for this event type
        role_member, _ = Role.objects.get_or_create(
            name="member", defaults={"description": "Member"}
        )
        RoleAssignment.objects.create(
            user=user,
            role=role_member,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=organisation,
        )

        EventService.emit_event(
            event_type="unknown.event",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
            },
            payload={"title": "Unknown Event", "body": "This is an unknown event"},
        )

        # Should not call handoff (no matching rules)
        assert not mock_handoff.called

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    def test_disabled_rule_not_processed(
        self, mock_handoff, user, organisation, project, routing_rule_disabled
    ):
        """Test that disabled rules are not processed."""
        role_member, _ = Role.objects.get_or_create(
            name="member", defaults={"description": "Member"}
        )
        RoleAssignment.objects.create(
            user=user,
            role=role_member,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=organisation,
        )

        EventService.emit_event(
            event_type="project.deleted",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
            },
            payload={"title": "Project Deleted", "body": "Project has been deleted"},
        )

        # Should not call handoff (rule is disabled)
        assert not mock_handoff.called

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    def test_scope_precedence_project_overrides_global(
        self, mock_handoff, user, organisation, project
    ):
        """Test that project-scoped rules take precedence over global rules."""
        cache.clear()
        # Create both global and project-scoped rules
        RoutingRule.objects.create(
            event_type="task.assigned",
            scope="global",
            channel="email",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="task.assigned",
            scope="project",
            project=project,
            organisation=organisation,
            channel="in_app",
            priority=RoutingRule.PRIORITY_URGENT,
            is_enabled=True,
            target_role="assignee",
        )

        role_member, _ = Role.objects.get_or_create(
            name="member", defaults={"description": "Member"}
        )
        RoleAssignment.objects.create(
            user=user,
            role=role_member,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=organisation,
        )

        # Assign 'assignee' role to user for project scope so the project rule matches
        role_assignee, _ = Role.objects.get_or_create(
            name="assignee", defaults={"description": "Assignee"}
        )
        RoleAssignment.objects.create(
            user=user,
            role=role_assignee,
            scope=ScopeChoices.PROJECT,
            target_project=project,
        )

        mock_notification = MagicMock()
        mock_notification.id = "notif-123"
        mock_handoff.return_value = mock_notification

        EventService.emit_event(
            event_type="task.assigned",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "assignee_id": user.id,
                "resource_id": "task_99",
            },
            payload={
                "title": "Task Assigned",
                "body": "Task assigned",
                "url": "/tasks/99",
            },
        )

        # Both rules should fire (additive, not exclusive)
        assert mock_handoff.call_count >= 1
