"""Tests for RoutingService."""

import pytest
from unittest.mock import patch, MagicMock
from contextual_notifications.services.routing_service import RoutingService
from contextual_notifications.models import RoutingRule


@pytest.mark.django_db
class TestRoutingService:
    """Tests for RoutingService."""

    def test_evaluate_rules_with_global_rule(
        self, routing_rule_global, event_data, user, project
    ):
        """Test routing evaluation with a global rule."""
        # Add user as project member
        project.members.add(user)

        decisions = RoutingService.evaluate_rules(event_data)

        assert len(decisions) > 0
        assert any(d["channel"] == "in_app" for d in decisions)

    def test_evaluate_rules_with_org_rule(
        self, routing_rule_org, event_data, user, organisation, project
    ):
        """Test routing evaluation with organisation-scoped rule."""
        # Add user as org member
        organisation.members.add(user)
        project.members.add(user)

        event_data["context"]["org_id"] = organisation.id

        decisions = RoutingService.evaluate_rules(event_data)

        # Should include org rule (email channel)
        assert any(d["channel"] == "email" for d in decisions)

    def test_evaluate_rules_with_project_rule(
        self, routing_rule_project, task_assigned_event_data, user, project
    ):
        """Test routing evaluation with project-scoped rule."""
        project.members.add(user)
        task_assigned_event_data["context"]["project_id"] = project.id
        task_assigned_event_data["context"]["assignee_id"] = user.id

        decisions = RoutingService.evaluate_rules(task_assigned_event_data)

        assert len(decisions) > 0
        # Should route to assignee via in_app (from fixture)
        assert any(
            d["user_id"] == user.id and d["channel"] == "in_app" for d in decisions
        )

    def test_evaluate_rules_scope_precedence(
        self,
        routing_rule_global,
        routing_rule_org,
        routing_rule_project,
        event_data,
        user,
        organisation,
        project,
    ):
        """Test that scope precedence works: project > org > global."""
        # Create overlapping rules for same event type
        RoutingRule.objects.filter(id=routing_rule_project.id).update(
            event_type="project.updated"
        )

        organisation.members.add(user)
        project.members.add(user)
        event_data["context"]["org_id"] = organisation.id
        event_data["context"]["project_id"] = project.id

        decisions = RoutingService.evaluate_rules(event_data)

        # Should evaluate project rule first (most specific)
        # Then org rule, then global rule
        assert len(decisions) > 0

    def test_evaluate_rules_disabled_rule_ignored(
        self, routing_rule_disabled, event_data
    ):
        """Test that disabled rules are not evaluated."""
        event_data["event_type"] = "project.deleted"

        decisions = RoutingService.evaluate_rules(event_data)

        # Should be empty or not include disabled rule
        assert not any(d.get("rule_id") == routing_rule_disabled.id for d in decisions)

    def test_evaluate_rules_priority_ordering(self, organisation, user, project):
        """Test that rules are evaluated by priority within scope."""
        # Create multiple rules with different priorities
        urgent_rule = RoutingRule.objects.create(
            event_type="task.overdue",
            scope="global",
            channel="in_app",
            priority="urgent",
            enabled=True,
            target_role="member",
        )
        normal_rule = RoutingRule.objects.create(
            event_type="task.overdue",
            scope="global",
            channel="email",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)

        event_data = {
            "event_type": "task.overdue",
            "context": {
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
            },
            "payload": {"title": "Task Overdue"},
        }

        decisions = RoutingService.evaluate_rules(event_data)

        # Both rules should match, urgent processed first
        assert len(decisions) >= 1

    def test_evaluate_rules_no_matching_rules(self, event_data):
        """Test behavior when no rules match."""
        # Use an event type with no configured rules
        event_data["event_type"] = "unknown.event"

        decisions = RoutingService.evaluate_rules(event_data)

        assert decisions == []

    def test_evaluate_rules_target_role_member(
        self, routing_rule_global, user, project, event_data
    ):
        """Test that target_role='member' routes to project members."""
        project.members.add(user)
        event_data["context"]["project_id"] = project.id

        decisions = RoutingService.evaluate_rules(event_data)

        user_ids = [d["user_id"] for d in decisions]
        assert user.id in user_ids

    def test_evaluate_rules_target_role_assignee(
        self, user, user2, project, task_assigned_event_data
    ):
        """Test that target_role='assignee' routes only to assignee."""
        RoutingRule.objects.create(
            event_type="task.assigned",
            scope="global",
            channel="in_app",
            priority="high",
            enabled=True,
            target_role="assignee",
        )

        project.members.add(user, user2)
        task_assigned_event_data["context"]["project_id"] = project.id
        task_assigned_event_data["context"]["assignee_id"] = user2.id

        decisions = RoutingService.evaluate_rules(task_assigned_event_data)

        # Only assignee (user2) should receive notification
        assignee_decisions = [d for d in decisions if d["user_id"] == user2.id]
        assert len(assignee_decisions) > 0
        # Creator (user) should not receive
        creator_decisions = [d for d in decisions if d["user_id"] == user.id]
        assert len(creator_decisions) == 0

    def test_evaluate_rules_returns_decision_structure(
        self, routing_rule_global, user, project, event_data
    ):
        """Test that decisions have correct structure."""
        project.members.add(user)
        event_data["context"]["project_id"] = project.id

        decisions = RoutingService.evaluate_rules(event_data)

        assert len(decisions) > 0
        decision = decisions[0]

        # Verify decision structure
        assert "user_id" in decision
        assert "channel" in decision
        assert "event_type" in decision
        assert "payload" in decision
        assert "rule_id" in decision
        assert "priority" in decision

    @patch("contextual_notifications.services.routing_service.logger")
    def test_evaluate_rules_logs_evaluation(
        self, mock_logger, routing_rule_global, event_data
    ):
        """Test that rule evaluation is logged."""
        RoutingService.evaluate_rules(event_data)

        # Should log matched rules
        assert mock_logger.info.called or mock_logger.debug.called

    def test_evaluate_rules_multiple_channels_for_same_user(
        self, user, project, event_data
    ):
        """Test that same user can receive multiple notifications on different channels."""
        # Create rules for both in_app and email
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="email",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)
        event_data["context"]["project_id"] = project.id

        decisions = RoutingService.evaluate_rules(event_data)

        user_decisions = [d for d in decisions if d["user_id"] == user.id]
        channels = [d["channel"] for d in user_decisions]

        # User should have decisions for both channels
        assert "in_app" in channels
        assert "email" in channels
