"""Tests for RoutingRule model."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
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
            priority="normal",
            enabled=True,
            target_role="member",
        )

        assert rule.event_type == "project.created"
        assert rule.scope == "global"
        assert rule.organisation is None
        assert rule.project is None
        assert rule.enabled is True

    def test_create_org_rule(self, organisation):
        """Test creating an organisation-scoped rule."""
        rule = RoutingRule.objects.create(
            event_type="task.assigned",
            scope="org",
            organisation=organisation,
            channel="email",
            priority="high",
            enabled=True,
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
            channel="in_app",
            priority="urgent",
            enabled=True,
            target_role="assignee",
        )

        assert rule.scope == "project"
        assert rule.project == project
        assert rule.organisation is None

    def test_str_representation(self):
        """Test string representation of routing rule."""
        rule = RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        expected = "project.updated → in_app (global, normal)"
        assert str(rule) == expected

    def test_priority_choices(self):
        """Test that priority field accepts valid choices."""
        priorities = ["low", "normal", "high", "urgent"]

        for priority in priorities:
            rule = RoutingRule.objects.create(
                event_type="test.event",
                scope="global",
                channel="in_app",
                priority=priority,
                enabled=True,
                target_role="member",
            )
            assert rule.priority == priority

    def test_channel_choices(self):
        """Test that channel field accepts valid choices."""
        channels = ["in_app", "email", "sms", "push", "webhook"]

        for channel in channels:
            rule = RoutingRule.objects.create(
                event_type="test.event",
                scope="global",
                channel=channel,
                priority="normal",
                enabled=True,
                target_role="member",
            )
            assert rule.channel == channel

    def test_scope_choices(self):
        """Test that scope field accepts valid choices."""
        rule_global = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )
        assert rule_global.scope == "global"

    def test_enabled_default(self):
        """Test that enabled defaults to True."""
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority="normal",
            target_role="member",
        )
        assert rule.enabled is True

    def test_created_at_auto_set(self):
        """Test that created_at is automatically set."""
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )
        assert rule.created_at is not None

    def test_updated_at_auto_set(self):
        """Test that updated_at is automatically set."""
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )
        assert rule.updated_at is not None

    def test_query_by_event_type(self):
        """Test querying rules by event type."""
        RoutingRule.objects.create(
            event_type="project.created",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
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
            priority="normal",
            enabled=True,
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
            priority="normal",
            enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="test.disabled",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=False,
            target_role="member",
        )

        enabled_rules = RoutingRule.objects.filter(enabled=True)
        assert enabled_rules.filter(event_type="test.enabled").exists()
        assert not enabled_rules.filter(event_type="test.disabled").exists()

    def test_description_optional(self):
        """Test that description is optional."""
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )
        assert rule.description == ""

    def test_description_stored(self):
        """Test that description is stored correctly."""
        description = "This is a test rule for project updates"
        rule = RoutingRule.objects.create(
            event_type="test.event",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
            description=description,
        )
        assert rule.description == description
