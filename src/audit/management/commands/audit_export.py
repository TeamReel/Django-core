"""Management command to export audit events to CSV."""

import csv
import json
from datetime import timedelta

from audit.models import AuditEvent
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    """Export audit events to CSV."""

    help = "Export audit events to CSV"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument("--output", type=str, required=True, help="Output CSV file path")
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Export events from last N days (default: 30)",
        )
        parser.add_argument(
            "--event-types",
            type=str,
            help="Comma-separated list of event types to export (default: all)",
        )
        parser.add_argument("--user-id", type=int, help="Filter by user ID")

    def handle(self, *args, **options):
        """Execute the command."""
        output_path = options["output"]
        days = options["days"]
        event_types_filter = options.get("event_types")
        user_id_filter = options.get("user_id")

        # Build queryset
        cutoff_date = timezone.now() - timedelta(days=days)
        queryset = AuditEvent.objects.filter(created_at__gte=cutoff_date)

        if event_types_filter:
            event_types = [et.strip() for et in event_types_filter.split(",")]
            queryset = queryset.filter(event_type__in=event_types)

        if user_id_filter:
            queryset = queryset.filter(user_id=user_id_filter)

        # Optimize with select_related
        queryset = queryset.select_related("user", "organization", "project")

        # Export to CSV
        try:
            with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
                writer = csv.writer(csvfile)

                # Header
                writer.writerow(
                    [
                        "ID",
                        "Created At",
                        "Event Type",
                        "User Email",
                        "Organization",
                        "Project",
                        "Metadata",
                    ]
                )

                # Data rows
                count = 0
                for event in queryset.iterator(chunk_size=1000):
                    writer.writerow(
                        [
                            event.id,
                            event.created_at.isoformat(),
                            event.event_type,
                            event.user.email if event.user else "",
                            event.organization.name if event.organization else "",
                            event.project.name if event.project else "",
                            json.dumps(event.metadata, ensure_ascii=False),
                        ]
                    )
                    count += 1

                    if count % 1000 == 0:
                        self.stdout.write(f"Exported {count} events...")

            self.stdout.write(
                self.style.SUCCESS(f"Successfully exported {count} events to {output_path}")
            )

        except IOError as e:
            raise CommandError(f"Failed to write to {output_path}: {e}") from e
