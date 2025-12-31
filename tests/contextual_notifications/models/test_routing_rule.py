"""Tests for RoutingRule model."""

import pytest
from contextual_notifications.models import RoutingRule


@pytest.mark.django_db
class TestRoutingRuleModel:
    """Tests for RoutingRule model."""

    def test_create_global_rule(self):
        """Test creating a global routing rule."""
        rule = RoutingRule.objects.create(
            event_type="project.created",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )

        assert rule.event_type == "project.created"
        assert rule.scope == "global"
        assert rule.organisation is None
        assert rule.project is None
        assert rule.is_enabled is True

    def test_create_org_rule(self, organisation):
        """Test creating an organisation-scoped rule."""
        rule = RoutingRule.objects.create(
            event_type="task.assigned",
            scope="org",
            organisation=organisation,
            channel="email",
            priority=RoutingRule.PRIORITY_HIGH,
            is_enabled=True,
            target_role="assignee",
        )

        assert rule.scope == "org"
        assert rule.organisation == organisation
        assert rule.project is None

    def test_create_project_rule(self, project):
        """Test creating a project-scoped rule."""
        rule = RoutingRule.objects.create(
            event_type="task.overdue",
            scope="project",
            project=project,
            organisation=project.organisation,
            channel="in_app",
            priority=RoutingRule.PRIORITY_URGENT,
            is_enabled=True,
            target_role="assignee",
        )

        assert rule.scope == "project"
        assert rule.project == project
        assert rule.organisation == project.organisation

    def test_str_representation(self):
        """Test string representation of routing rule."""
        rule = RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )

        expected = "project.updated (global) -> in_app"
        assert str(rule) == expected

    def test_priority_choices(self):
        """Test that priority field accepts valid choices."""
        priorities = [
            RoutingRule.PRIORITY_LOW,
            RoutingRule.PRIORITY_NORMAL,
            RoutingRule.PRIORITY_HIGH,
            RoutingRule.PRIORITY_URGENT,
        ]

        for priority in priorities:
            rule = RoutingRule.objects.create(
                event_type="test.event",
                scope="global",
                channel="in_app",
                priority=priority,
                is_enabled=True,
                target_role="member",
            )
            assert rule.priority == priority

    def test_channel_choices(self):
        """Test that channel field accepts valid choices."""
        channels = ["in_app", "email", "push"]

        for channel in channels:
            rule = RoutingRule.objects.create(
                event_type="test.event",
                scope="global",
                channel=channel,
                priority=RoutingRule.PRIORITY_NORMAL,
                is_enabled=True,
                target_role="member",
            )
            assert rule.channel == channel

    def test_scope_choices(self):
        """Test that scope field accepts valid choices."""
        rule_global = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )
        assert rule_global.scope == "global"

    def test_enabled_default(self):
        """Test that is_enabled defaults to True."""
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            target_role="member",
        )
        assert rule.is_enabled is True

    def test_created_at_auto_set(self):
        """Test that created_at is automatically set."""
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )
        assert rule.created_at is not None

    def test_updated_at_auto_set(self):
        """Test that updated_at is automatically set."""
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )
        assert rule.updated_at is not None

    def test_query_by_event_type(self):
        """Test querying rules by event type."""
        # Clear any existing rules to ensure isolation
        RoutingRule.objects.all().delete()

        RoutingRule.objects.create(
            event_type="project.created",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )

        rules = RoutingRule.objects.filter(event_type="project.created")
        assert rules.count() == 1
        assert rules.first().event_type == "project.created"

    def test_query_by_scope(self):
        """Test querying rules by scope."""
        RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )

        rules = RoutingRule.objects.filter(scope="global")
        assert rules.count() >= 1

    def test_query_enabled_rules(self):
        """Test querying only enabled rules."""
        RoutingRule.objects.create(
            event_type="test.enabled",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="test.disabled",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=False,
            target_role="member",
        )

        enabled_rules = RoutingRule.objects.filter(is_enabled=True)
        assert enabled_rules.filter(event_type="test.enabled").exists()
        assert not enabled_rules.filter(event_type="test.disabled").exists()

    def test_description_optional(self):
        """Test that rule can be created without optional fields."""
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )
        assert rule.event_type == "test.event"

    def test_description_stored(self):
        """Test that target_role is stored correctly."""
        target_role = "project_admin"
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role=target_role,
        )
        assert rule.target_role == target_role
