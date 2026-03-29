"""
Management command to seed usage events for demo validation.

This creates usage events for existing organizations, designed for manual testing
of the Usage Events page UI.
"""

import logging
import random
import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from organisations.models import Membership, Organisation
from transactions.models import UsageEvent

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Seed usage events for demo validation."""

    help = "Create usage events for existing organizations"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--orgs",
            nargs="+",
            help=(
                "Specific organization slugs to seed "
                "(e.g., eredivisie bundesliga). If omitted, seeds all."
            ),
        )
        parser.add_argument(
            "--count",
            type=int,
            default=50,
            help="Number of events to create per organization (default: 50)",
        )
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Number of days of history to generate (default: 30)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """Execute the seed command."""
        target_org_slugs = options.get("orgs")
        count = options.get("count")
        days = options.get("days")

        # Get organizations to seed
        if target_org_slugs:
            orgs = Organisation.objects.filter(slug__in=target_org_slugs)
        else:
            orgs = Organisation.objects.all()

        if not orgs.exists():
            self.stdout.write(self.style.ERROR("No organizations found to seed."))
            return

        event_types = [
            "api_request",
            "video_processed",
            "storage_gb_hour",
            "ai_token_usage",
            "transcription_minute",
        ]

        total_created = 0

        self.stdout.write(f"Seeding {count} usage events for {orgs.count()} organizations...")

        for org in orgs:
            # Get a valid user for this org (creator or any member)
            # We try to find a member first
            memberships = Membership.objects.filter(organisation=org)
            if memberships.exists():
                user = memberships.first().user
            else:
                # Fallback to creator if no memberships (shouldn't happen in valid orgs)
                user = org.creator

            if not user:
                self.stdout.write(self.style.WARNING(f"Skipping {org.name}: No valid user found."))
                continue

            events_to_create = []
            now = timezone.now()

            for _ in range(count):
                # Random time in the last X days
                random_days = random.randint(0, days)
                random_seconds = random.randint(0, 86400)
                timestamp = now - timedelta(days=random_days, seconds=random_seconds)

                event_type = random.choice(event_types)

                # Generate some realistic metadata based on type
                metadata = {}
                if event_type == "api_request":
                    metadata = {"endpoint": "/api/v1/projects", "method": "GET", "status": 200}
                elif event_type == "video_processed":
                    metadata = {
                        "file_size_mb": random.randint(10, 500),
                        "duration_sec": random.randint(30, 600),
                    }
                elif event_type == "ai_token_usage":
                    metadata = {"model": "gpt-4", "tokens": random.randint(100, 2000)}

                events_to_create.append(
                    UsageEvent(
                        event_type=event_type,
                        user=user,
                        organization=org,
                        project=None,  # Optional, leaving null for simplicity
                        metadata=metadata,
                        timestamp=timestamp,
                        idempotency_key=str(uuid.uuid4()),
                    )
                )

            UsageEvent.objects.bulk_create(events_to_create)
            total_created += len(events_to_create)
            self.stdout.write(f"  - Created {len(events_to_create)} events for {org.name}")

        self.stdout.write(self.style.SUCCESS(f"Successfully created {total_created} usage events."))
