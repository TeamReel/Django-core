"""
Management command to seed historical SystemMetric data for demo purposes.
Creates realistic cache performance data for the last 7 days.
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from observability.models import SystemMetric


class Command(BaseCommand):
    help = "Seed historical SystemMetric data for cache performance graphs (demo/testing)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=7,
            help="Number of days of historical data to generate (default: 7)",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=10,
            help="Interval between data points in minutes (default: 10)",
        )

    def handle(self, *args, **options):
        days = options["days"]
        interval_minutes = options["interval"]

        self.stdout.write(self.style.SUCCESS(f"\n🌱 Seeding {days} days of cache metrics...\n"))

        # Generate realistic cache patterns
        now = timezone.now()
        start_time = now - timedelta(days=days)

        # Calculate total number of data points
        total_minutes = days * 24 * 60
        num_points = total_minutes // interval_minutes

        # Track existing timestamps to avoid duplicates
        existing_timestamps = set(
            SystemMetric.objects.filter(
                timestamp__gte=start_time, metric_type="cache_hits"
            ).values_list("timestamp", flat=True)
        )

        created_count = 0
        skipped_count = 0

        # Generate data points
        for i in range(num_points):
            # Calculate timestamp (moving backwards from now)
            timestamp = now - timedelta(minutes=(num_points - i) * interval_minutes)

            # Skip if data already exists for this timestamp
            if timestamp in existing_timestamps:
                skipped_count += 1
                continue

            # Simulate realistic cache patterns:
            # - Higher hit ratio during business hours
            # - Gradual memory growth
            # - More activity on weekdays

            hour = timestamp.hour
            weekday = timestamp.weekday()  # 0=Monday, 6=Sunday

            # Base values
            base_hits = 1000
            base_misses = 100

            # Business hours boost (9am-5pm)
            if 9 <= hour <= 17:
                hour_multiplier = 1.5
            else:
                hour_multiplier = 0.7

            # Weekday vs weekend
            if weekday < 5:  # Monday-Friday
                day_multiplier = 1.2
            else:
                day_multiplier = 0.6

            # Add some randomness
            random_factor = random.uniform(0.8, 1.2)

            # Calculate metrics
            hits = int(base_hits * hour_multiplier * day_multiplier * random_factor)
            misses = int(base_misses * hour_multiplier * day_multiplier * random_factor)

            # Memory gradually increases over time (with some fluctuation)
            days_elapsed = (timestamp - start_time).total_seconds() / (24 * 3600)
            memory_base = 1_000_000  # 1 MB
            memory_growth = days_elapsed * 100_000  # Grows 100KB per day
            memory = int(memory_base + memory_growth + random.randint(-50000, 50000))

            # Total keys (also grows over time)
            keys_base = 10
            keys_growth = int(days_elapsed * 2)  # +2 keys per day
            total_keys = keys_base + keys_growth + random.randint(-2, 2)

            # Create metrics for this timestamp
            SystemMetric.record_metric("cache_hits", float(hits), timestamp=timestamp)
            SystemMetric.record_metric("cache_misses", float(misses), timestamp=timestamp)
            SystemMetric.record_metric("memory_used", float(memory), timestamp=timestamp)
            SystemMetric.record_metric("total_keys", float(total_keys), timestamp=timestamp)

            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Created {created_count * 4} metric records ({created_count} timestamps)"
            )
        )
        if skipped_count > 0:
            self.stdout.write(
                self.style.WARNING(f"⏭️  Skipped {skipped_count} existing timestamps")
            )

        # Show summary
        total_metrics = SystemMetric.objects.count()
        recent_count = SystemMetric.objects.filter(timestamp__gte=start_time).count()

        self.stdout.write("\n📊 Database status:")
        self.stdout.write(f"  Total metrics: {total_metrics}")
        self.stdout.write(f"  Last {days} days: {recent_count}")

        self.stdout.write(self.style.SUCCESS("\n✨ Seeding complete!\n"))
