"""Update template estimated costs based on actual usage.

WP07 T056-T058: Cost Update Management Command

Recalculates GenerationTemplate.pipeline_config['estimated_cost'] based on
recent actual costs from completed requests. Only updates if sufficient sample
size (≥10 requests in last 30 days).

Usage:
    python manage.py update_template_costs
    python manage.py update_template_costs --days=60
    python manage.py update_template_costs --min-samples=20
    python manage.py update_template_costs --dry-run
"""

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Avg, Count
from django.utils import timezone

from src.generative.models import GenerationRequest, GenerationTemplate, RequestStatus


class Command(BaseCommand):
    """Update template estimated costs based on actual usage."""

    help = "Update template estimated costs from recent actual costs"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Number of days to look back for cost calculations (default: 30)",
        )
        parser.add_argument(
            "--min-samples",
            type=int,
            default=10,
            help="Minimum number of completed requests required for update (default: 10)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without actually updating",
        )

    def handle(self, *args, **options):
        """Execute cost update command."""
        days = options["days"]
        min_samples = options["min_samples"]
        dry_run = options["dry_run"]

        cutoff_date = timezone.now() - timedelta(days=days)

        # Get all active templates
        templates = GenerationTemplate.objects.filter(is_active=True)

        updated_count = 0
        skipped_count = 0

        self.stdout.write(
            self.style.NOTICE(
                f"Analyzing costs for last {days} days (min {min_samples} samples)..."
            )
        )

        for template in templates:
            # Get completed requests for this template in time window
            requests = GenerationRequest.objects.filter(
                template=template,
                status=RequestStatus.COMPLETED,
                completed_at__gte=cutoff_date,
                actual_cost__isnull=False,
            ).aggregate(
                avg_cost=Avg("actual_cost"),
                sample_count=Count("id"),
            )

            avg_cost = requests["avg_cost"]
            sample_count = requests["sample_count"] or 0

            # Skip if insufficient samples
            if sample_count < min_samples:
                skipped_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  SKIP: {template.name} v{template.version} - "
                        f"only {sample_count}/{min_samples} samples"
                    )
                )
                continue

            # Calculate new estimated cost
            if avg_cost is not None:
                new_estimate = Decimal(str(avg_cost))
                old_estimate = template.pipeline_config.get("estimated_cost", 0)

                # Update pipeline_config
                if not dry_run:
                    template.pipeline_config["estimated_cost"] = float(new_estimate)
                    template.pipeline_config["cost_last_updated"] = timezone.now().isoformat()
                    template.pipeline_config["cost_sample_size"] = sample_count
                    template.pipeline_config["cost_lookback_days"] = days
                    template.save(update_fields=["pipeline_config", "updated_at"])

                updated_count += 1

                # Calculate percentage change
                if old_estimate > 0:
                    change_pct = (
                        (new_estimate - Decimal(str(old_estimate))) / Decimal(str(old_estimate))
                    ) * 100
                    change_str = f"{change_pct:+.1f}%"
                else:
                    change_str = "N/A"

                action = "WOULD UPDATE" if dry_run else "UPDATED"
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  {action}: {template.name} v{template.version} - "
                        f"${old_estimate:.4f} → ${new_estimate:.4f} ({change_str}) "
                        f"[{sample_count} samples]"
                    )
                )

        # Summary
        self.stdout.write("\n" + "=" * 60)
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"DRY RUN: Would update {updated_count} templates, skipped {skipped_count}"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Updated {updated_count} templates, skipped {skipped_count} "
                    f"(insufficient samples)"
                )
            )
