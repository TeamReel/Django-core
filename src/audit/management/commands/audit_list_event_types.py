"""Management command to list all registered audit event types."""

from typing import Dict, List

from audit.registry import EventTypeMetadata, list_event_types
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """List all registered audit event types."""

    help = "List all registered audit event types"

    def handle(self, *args, **options):
        """Execute the command."""
        event_types = list_event_types()

        if not event_types:
            self.stdout.write(self.style.WARNING("No event types registered"))
            return

        # Print header
        self.stdout.write(self.style.SUCCESS(f"\nRegistered Event Types ({len(event_types)}):"))
        self.stdout.write("-" * 80)

        # Group by category
        by_category: Dict[str, List[EventTypeMetadata]] = {}
        for et in event_types:
            by_category.setdefault(et.category, []).append(et)

        # Print by category
        for category in sorted(by_category.keys()):
            self.stdout.write(f"\n{category.upper()}:")
            for et in sorted(by_category[category], key=lambda x: x.name):
                required = (
                    f" (requires: {', '.join(et.required_metadata_keys)})"
                    if et.required_metadata_keys
                    else ""
                )
                self.stdout.write(f"  {et.name:<30} {et.description}{required}")

        self.stdout.write("\n")
