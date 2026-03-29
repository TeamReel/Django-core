from __future__ import annotations

from activities.models import Activity
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Backfill missing Activity.slug values (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--activity-type",
            default="match",
            help="Only backfill activities of this type (default: match). Use '*' for all.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Optional limit of rows to update (0 = no limit).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change, but do not write to DB.",
        )

    def handle(self, *args, **options):
        activity_type = str(options["activity_type"] or "match").strip().lower()
        limit = int(options["limit"] or 0)
        dry_run = bool(options["dry_run"])

        qs = Activity.objects.filter(slug__isnull=True) | Activity.objects.filter(slug="")
        qs = qs.order_by("created_at")

        if activity_type != "*":
            qs = qs.filter(activity_type=activity_type)

        if limit > 0:
            qs = qs[:limit]

        total = qs.count() if limit <= 0 else len(list(qs))
        self.stdout.write(
            f"Found {total} activities missing slug (type={activity_type}, dry_run={dry_run})."
        )

        updated = 0
        with transaction.atomic():
            for activity in qs.iterator() if limit <= 0 else qs:
                new_slug = activity._generate_unique_slug()
                if dry_run:
                    self.stdout.write(f"{activity.id} -> {new_slug}")
                    continue

                # Use a queryset update to avoid triggering model save signals
                # (e.g. search indexing via transaction.on_commit), so this command
                # can be run safely from a local machine against Railway DB.
                Activity.objects.filter(pk=activity.pk).update(slug=new_slug)
                updated += 1

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-run complete; no rows updated."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated {updated} activities."))
