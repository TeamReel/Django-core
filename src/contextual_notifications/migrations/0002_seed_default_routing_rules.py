"""Seed default routing rules."""

from django.db import migrations


def seed_default_routing_rules(apps, schema_editor):
    """Create default routing rules for common event types."""
    RoutingRule = apps.get_model("contextual_notifications", "RoutingRule")

    default_rules = [
        {
            "event_type": "project.created",
            "scope": "global",
            "channel": "in_app",
            "priority": "normal",
            "enabled": True,
            "target_role": "member",
        },
        {
            "event_type": "project.updated",
            "scope": "global",
            "channel": "in_app",
            "priority": "normal",
            "enabled": True,
            "target_role": "member",
        },
        {
            "event_type": "project.deleted",
            "scope": "global",
            "channel": "in_app",
            "priority": "normal",
            "enabled": True,
            "target_role": "member",
        },
        {
            "event_type": "project.member_added",
            "scope": "global",
            "channel": "in_app",
            "priority": "normal",
            "enabled": True,
            "target_role": "member",
        },
        {
            "event_type": "org.member_invited",
            "scope": "global",
            "channel": "in_app",
            "priority": "normal",
            "enabled": True,
            "target_role": "member",
        },
        {
            "event_type": "task.assigned",
            "scope": "global",
            "channel": "in_app",
            "priority": "high",
            "enabled": True,
            "target_role": "assignee",
        },
        {
            "event_type": "task.completed",
            "scope": "global",
            "channel": "in_app",
            "priority": "normal",
            "enabled": True,
            "target_role": "creator",
        },
        {
            "event_type": "task.overdue",
            "scope": "global",
            "channel": "in_app",
            "priority": "urgent",
            "enabled": True,
            "target_role": "assignee",
        },
    ]

    # Create rules using get_or_create to avoid duplicates
    for rule_data in default_rules:
        RoutingRule.objects.get_or_create(
            event_type=rule_data["event_type"],
            scope=rule_data["scope"],
            organisation=None,
            project=None,
            defaults={
                "channel": rule_data["channel"],
                "priority": rule_data["priority"],
                "enabled": rule_data["enabled"],
                "target_role": rule_data["target_role"],
            },
        )


def reverse_seed(apps, schema_editor):
    """Remove default routing rules."""
    RoutingRule = apps.get_model("contextual_notifications", "RoutingRule")

    event_types = [
        "project.created",
        "project.updated",
        "project.deleted",
        "project.member_added",
        "org.member_invited",
        "task.assigned",
        "task.completed",
        "task.overdue",
    ]

    RoutingRule.objects.filter(
        event_type__in=event_types,
        scope="global",
        organisation__isnull=True,
        project__isnull=True,
    ).delete()


class Migration(migrations.Migration):
    """Seed default routing rules data migration."""

    dependencies = [
        ("contextual_notifications", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_default_routing_rules, reverse_seed),
    ]
