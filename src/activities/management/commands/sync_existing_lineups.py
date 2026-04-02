"""Sync existing activities with metadata.lineup → Participation records.

Iterates Activities that have metadata.lineup but no or outdated Participations.
Uses LineupSyncService to create proper Participation records.

Usage:
    python manage.py sync_existing_lineups
    python manage.py sync_existing_lineups --dry-run
    python manage.py sync_existing_lineups --project-id 42
"""

import logging

from django.core.management.base import BaseCommand
from django.db.models import Q

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Sync existing metadata.lineup data to Participation records"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be synced without writing to DB",
        )
        parser.add_argument(
            "--project-id",
            type=int,
            help="Only sync activities for a specific project",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        project_id = options.get("project_id")

        from activities.models import Activity
        from activities.services.lineup_sync import LineupSyncService

        # Find activities with lineup metadata
        qs = Activity.objects.filter(
            metadata__lineup__isnull=False,
        ).exclude(
            metadata__lineup={},
        ).select_related("project", "formation")

        if project_id:
            qs = qs.filter(project_id=project_id)

        # Further filter: must have at least goalkeeper or player in lineup
        activities = []
        for activity in qs.iterator():
            lineup = (activity.metadata or {}).get("lineup", {})
            gk = lineup.get("goalkeeper", [])
            players = lineup.get("player", [])
            if gk or players:
                activities.append(activity)

        self.stdout.write(f"Found {len(activities)} activities with lineup data")

        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] Would sync:"))
            for activity in activities:
                lineup = activity.metadata.get("lineup", {})
                formation = lineup.get("formation", "?")
                gk_count = len(lineup.get("goalkeeper", []))
                player_count = len(lineup.get("player", []))
                bench_count = len(lineup.get("bench", {}))
                self.stdout.write(
                    f"  {activity.title} ({activity.start_time.date()}) "
                    f"— {formation}: {gk_count} GK + {player_count} players + {bench_count} bench"
                )
            return

        synced = 0
        errors = 0

        for activity in activities:
            try:
                service = LineupSyncService(activity)
                count = service.sync()
                synced += 1
                self.stdout.write(
                    f"  Synced {count} participations for: {activity.title}"
                )
            except Exception:
                errors += 1
                logger.exception("Failed to sync activity %s", activity.pk)
                self.stdout.write(
                    self.style.ERROR(
                        f"  FAILED: {activity.title} ({activity.pk})"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone: {synced} synced, {errors} errors"
            )
        )
