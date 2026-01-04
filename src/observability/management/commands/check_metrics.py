"""
Management command to check and display current SystemMetric data.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from observability.models import SystemMetric


class Command(BaseCommand):
    help = "Check SystemMetric database records"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n=== SystemMetric Database Check ===\n"))

        # Total count
        total_count = SystemMetric.objects.count()
        self.stdout.write(f"Total records: {total_count}")

        if total_count == 0:
            self.stdout.write(self.style.WARNING("\n⚠️  No metrics found in database!"))
            self.stdout.write("The collect_system_metrics task may not have run yet.")
            return

        # Count by metric type
        self.stdout.write("\n📊 Metrics by type:")
        for metric_type in ["cache_hits", "cache_misses", "memory_used", "total_keys"]:
            count = SystemMetric.objects.filter(metric_type=metric_type).count()
            self.stdout.write(f"  - {metric_type}: {count}")

        # Most recent records
        self.stdout.write("\n🕐 Most recent metrics:")
        recent = SystemMetric.objects.order_by("-timestamp")[:10]
        for metric in recent:
            self.stdout.write(
                f"  {metric.timestamp.strftime('%Y-%m-%d %H:%M:%S')} | "
                f"{metric.metric_type:15s} | {metric.value:>10.0f}"
            )

        # Date range
        oldest = SystemMetric.objects.order_by("timestamp").first()
        newest = SystemMetric.objects.order_by("-timestamp").first()
        self.stdout.write("\n📅 Date range:")
        if oldest:
            self.stdout.write(f"  Oldest: {oldest.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        if newest:
            self.stdout.write(f"  Newest: {newest.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")

        # Last 7 days check (matches API query)
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_count = SystemMetric.objects.filter(timestamp__gte=seven_days_ago).count()
        self.stdout.write(f"\n📈 Records in last 7 days: {recent_count}")

        if recent_count == 0:
            self.stdout.write(
                self.style.WARNING(
                    "\n⚠️  No metrics in last 7 days - historical graph will be empty!"
                )
            )

        self.stdout.write(self.style.SUCCESS("\n✅ Check complete\n"))
