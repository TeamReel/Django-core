"""Generate usage report for generation requests.

WP07 T060: Management Command for Operations

Provides summary statistics for generation requests over a time period.
Useful for tracking usage, costs, and success rates.

Usage:
    python manage.py usage_report
    python manage.py usage_report --days=30
    python manage.py usage_report --organisation-id=123
    python manage.py usage_report --format=json
"""

import json
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Avg, Count, Max, Min, Q, Sum
from django.utils import timezone

from src.generative.models import GenerationRequest, RequestStatus


class Command(BaseCommand):
    """Generate usage report for generation requests."""

    help = "Generate usage report for generation requests"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Number of days to include in report (default: 30)",
        )
        parser.add_argument(
            "--organisation-id",
            type=int,
            help="Filter by organisation ID",
        )
        parser.add_argument(
            "--format",
            type=str,
            choices=["text", "json"],
            default="text",
            help="Output format (default: text)",
        )

    def handle(self, *args, **options):
        """Execute usage report command."""
        days = options["days"]
        org_id = options["organisation_id"]
        output_format = options["format"]

        cutoff_date = timezone.now() - timedelta(days=days)

        # Build query
        queryset = GenerationRequest.objects.filter(created_at__gte=cutoff_date)

        if org_id:
            queryset = queryset.filter(template__organisation_id=org_id)

        # Calculate aggregates
        stats = queryset.aggregate(
            total_requests=Count("id"),
            completed=Count("id", filter=Q(status=RequestStatus.COMPLETED)),
            failed=Count("id", filter=Q(status=RequestStatus.FAILED)),
            pending=Count("id", filter=Q(status=RequestStatus.PENDING)),
            processing=Count("id", filter=Q(status=RequestStatus.PROCESSING)),
            cancelled=Count("id", filter=Q(status=RequestStatus.CANCELLED)),
            total_cost=Sum("actual_cost"),
            avg_cost=Avg("actual_cost"),
            min_cost=Min("actual_cost"),
            max_cost=Max("actual_cost"),
            avg_retries=Avg("retry_count"),
        )

        # Calculate success rate
        total = stats["total_requests"] or 0
        completed = stats["completed"] or 0
        failed = stats["failed"] or 0
        success_rate = (completed / total * 100) if total > 0 else 0
        failure_rate = (failed / total * 100) if total > 0 else 0

        # Format costs
        total_cost = float(stats["total_cost"] or 0)
        avg_cost = float(stats["avg_cost"] or 0)
        min_cost = float(stats["min_cost"] or 0)
        max_cost = float(stats["max_cost"] or 0)

        # Build report data
        report = {
            "period": f"Last {days} days",
            "start_date": cutoff_date.isoformat(),
            "end_date": timezone.now().isoformat(),
            "total_requests": total,
            "status_breakdown": {
                "completed": completed,
                "failed": failed,
                "pending": stats["pending"],
                "processing": stats["processing"],
                "cancelled": stats["cancelled"],
            },
            "success_rate": round(success_rate, 2),
            "failure_rate": round(failure_rate, 2),
            "costs": {
                "total": round(total_cost, 4),
                "average": round(avg_cost, 4),
                "min": round(min_cost, 4),
                "max": round(max_cost, 4),
            },
            "avg_retries": round(float(stats["avg_retries"] or 0), 2),
        }

        # Output based on format
        if output_format == "json":
            self.stdout.write(json.dumps(report, indent=2))
        else:
            # Text format
            self.stdout.write("=" * 60)
            self.stdout.write(self.style.NOTICE(f"USAGE REPORT: {report['period']}"))
            self.stdout.write("=" * 60)
            self.stdout.write(f"\nPeriod: {cutoff_date.date()} to {timezone.now().date()}")
            self.stdout.write(f"\nTotal Requests: {total}")
            self.stdout.write("\nStatus Breakdown:")
            self.stdout.write(f"  Completed:  {completed:>6} ({success_rate:>5.1f}%)")
            self.stdout.write(f"  Failed:     {failed:>6} ({failure_rate:>5.1f}%)")
            self.stdout.write(f"  Pending:    {stats['pending']:>6}")
            self.stdout.write(f"  Processing: {stats['processing']:>6}")
            self.stdout.write(f"  Cancelled:  {stats['cancelled']:>6}")
            self.stdout.write("\nCosts:")
            self.stdout.write(f"  Total:   ${total_cost:>10.2f}")
            self.stdout.write(f"  Average: ${avg_cost:>10.4f}")
            self.stdout.write(f"  Min:     ${min_cost:>10.4f}")
            self.stdout.write(f"  Max:     ${max_cost:>10.4f}")
            self.stdout.write(f"\nAverage Retries: {report['avg_retries']:.2f}")
            self.stdout.write("=" * 60)
