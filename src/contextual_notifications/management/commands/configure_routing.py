"""Management command to configure default routing rules."""

from contextual_notifications.models import RoutingRule
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.utils import OperationalError


class Command(BaseCommand):
    """
    Configure default routing rules for contextual notifications.

    Creates default routing rules for common event types if they don't exist.
    """

    help = "Configure default routing rules for contextual notifications"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without actually creating rules",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite existing rules with the same event_type and scope",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        dry_run = options["dry_run"]
        force = options["force"]

        # Define default routing rules
        default_rules = [
            {
                "event_type": "project.created",
                "scope": "global",
                "channel": "in_app",
                "priority": RoutingRule.PRIORITY_NORMAL,
                "is_enabled": True,
                "target_role": "member",
            },
            {
                "event_type": "project.updated",
                "scope": "global",
                "channel": "in_app",
                "priority": RoutingRule.PRIORITY_NORMAL,
                "is_enabled": True,
                "target_role": "member",
            },
            {
                "event_type": "project.deleted",
                "scope": "global",
                "channel": "in_app",
                "priority": RoutingRule.PRIORITY_NORMAL,
                "is_enabled": True,
                "target_role": "member",
            },
            {
                "event_type": "project.member_added",
                "scope": "global",
                "channel": "in_app",
                "priority": RoutingRule.PRIORITY_NORMAL,
                "is_enabled": True,
                "target_role": "member",
            },
            {
                "event_type": "org.member_invited",
                "scope": "global",
                "channel": "in_app",
                "priority": RoutingRule.PRIORITY_NORMAL,
                "is_enabled": True,
                "target_role": "member",
            },
            {
                "event_type": "task.assigned",
                "scope": "global",
                "channel": "in_app",
                "priority": RoutingRule.PRIORITY_HIGH,
                "is_enabled": True,
                "target_role": "assignee",
            },
            {
                "event_type": "task.completed",
                "scope": "global",
                "channel": "in_app",
                "priority": RoutingRule.PRIORITY_NORMAL,
                "is_enabled": True,
                "target_role": "creator",
            },
            {
                "event_type": "task.overdue",
                "scope": "global",
                "channel": "in_app",
                "priority": RoutingRule.PRIORITY_URGENT,
                "is_enabled": True,
                "target_role": "assignee",
            },
        ]

        if dry_run:
            self.stdout.write("DRY RUN MODE - No rules will be created\n")

        created_count = 0
        updated_count = 0
        skipped_count = 0

        try:
            with transaction.atomic():
                for rule_data in default_rules:
                    event_type = rule_data["event_type"]
                    scope = rule_data["scope"]

                    # Check if rule exists
                    existing_rule = RoutingRule.objects.filter(
                        event_type=event_type,
                        scope=scope,
                        organisation__isnull=True,
                        project__isnull=True,
                    ).first()

                    if existing_rule:
                        if force:
                            if dry_run:
                                self.stdout.write(
                                    f"  Would UPDATE: {event_type} ({scope}) - "
                                    f"channel={rule_data['channel']}, "
                                    f"priority={rule_data['priority']}, "
                                    f"target_role={rule_data['target_role']}"
                                )
                            else:
                                for key, value in rule_data.items():
                                    setattr(existing_rule, key, value)
                                existing_rule.save()
                                self.stdout.write(f"✓ Updated: {event_type} ({scope})")
                            updated_count += 1
                        else:
                            self.stdout.write(
                                f"⊗ Skipped: {event_type} ({scope}) - already exists (use --force to overwrite)"
                            )
                            skipped_count += 1
                    else:
                        if dry_run:
                            self.stdout.write(
                                f"  Would CREATE: {event_type} ({scope}) - "
                                f"channel={rule_data['channel']}, "
                                f"priority={rule_data['priority']}, "
                                f"target_role={rule_data['target_role']}"
                            )
                        else:
                            RoutingRule.objects.create(**rule_data)
                            self.stdout.write(f"✓ Created: {event_type} ({scope})")
                        created_count += 1
        except OperationalError as exc:
            self.stderr.write(
                "Database tables for contextual_notifications are missing. "
                "Run migrations first (e.g., `python manage.py migrate`)."
            )
            self.stderr.write(str(exc))
            return

        # Summary
        self.stdout.write("\n" + "=" * 50)
        if dry_run:
            self.stdout.write("DRY RUN SUMMARY:")
            self.stdout.write(f"  Would create: {created_count} rules")
            self.stdout.write(f"  Would update: {updated_count} rules")
            self.stdout.write(f"  Would skip: {skipped_count} rules")
            self.stdout.write("\nRun without --dry-run to apply these changes.")
        else:
            self.stdout.write("CONFIGURATION COMPLETE:")
            self.stdout.write(f"  Created: {created_count} rules")
            self.stdout.write(f"  Updated: {updated_count} rules")
            self.stdout.write(f"  Skipped: {skipped_count} rules")
