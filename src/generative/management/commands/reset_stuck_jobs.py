"""Reset GenerationJob records stuck in active states.

Detects jobs that have been in queued/waiting/processing for longer than
a configurable threshold and marks them as failed. This handles the scenario
where a Celery worker restarts (or crashes) mid-task and the DB record is
never updated to a terminal state.

Usage:
    python manage.py reset_stuck_jobs                # dry-run by default
    python manage.py reset_stuck_jobs --execute      # actually update records
    python manage.py reset_stuck_jobs --minutes=15   # custom threshold (default 30)
    python manage.py reset_stuck_jobs --project-id=abc --execute
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from generative.models import GenerationJob

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Reset GenerationJob records stuck in queued/waiting/processing state"

    def add_arguments(self, parser):
        parser.add_argument(
            "--minutes",
            type=int,
            default=30,
            help=(
                "Minutes threshold — jobs active longer"
                " than this are considered stuck (default: 30)"
            ),
        )
        parser.add_argument(
            "--project-id",
            type=str,
            help="Only reset jobs for this project (optional)",
        )
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Actually update records. Without this flag, runs in dry-run mode.",
        )

    def handle(self, *args, **options):
        minutes = options["minutes"]
        project_id = options.get("project_id")
        execute = options.get("execute", False)

        threshold = timezone.now() - timedelta(minutes=minutes)
        active_statuses = [
            GenerationJob.Status.QUEUED,
            GenerationJob.Status.WAITING,
            GenerationJob.Status.PROCESSING,
        ]

        qs = GenerationJob.objects.filter(
            status__in=active_statuses,
            updated_at__lt=threshold,
        )
        if project_id:
            qs = qs.filter(project_id=project_id)

        stuck_jobs = list(qs.order_by("created_at"))

        if not stuck_jobs:
            self.stdout.write(self.style.SUCCESS("No stuck jobs found."))
            return

        self.stdout.write(f"Found {len(stuck_jobs)} stuck job(s) (threshold: {minutes} min):\n")

        for job in stuck_jobs:
            age = timezone.now() - job.updated_at
            age_min = int(age.total_seconds() / 60)
            self.stdout.write(
                f"  [{job.task_id}] status={job.status}, progress={job.progress}, "
                f"label={job.label!r}, updated {age_min} min ago"
            )

            if execute:
                reason = (
                    f"Stale job detected by reset_stuck_jobs command — "
                    f"stuck in '{job.status}' for {age_min} min (threshold: {minutes} min)"
                )
                job.mark_stale(reason=reason)
                logger.info("Reset stuck GenerationJob %s: %s", job.task_id, reason)

        action = "Reset" if execute else "Would reset (dry-run)"
        self.stdout.write(self.style.SUCCESS(f"\n{action} {len(stuck_jobs)} job(s)."))
