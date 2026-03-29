"""Retry failed generation requests.

WP07 T060: Management Command for Operations

Create new requests with same input_data for failed requests. Useful for
recovering from temporary errors or provider outages.

Usage:
    python manage.py retry_failed_requests
    python manage.py retry_failed_requests --max-retries=5
    python manage.py retry_failed_requests --template-slug=video-generator
    python manage.py retry_failed_requests --days=7
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from src.generative.models import GenerationRequest, RequestStatus
from src.generative.tasks import process_generation_request


class Command(BaseCommand):
    """Retry failed generation requests."""

    help = "Retry failed generation requests by creating new requests"

    def add_arguments(self, parser):
        parser.add_argument(
            "--max-retries",
            type=int,
            default=5,
            help="Only retry requests with retry_count < max-retries (default: 5)",
        )
        parser.add_argument(
            "--template-slug",
            type=str,
            help="Only retry requests for specific template slug",
        )
        parser.add_argument(
            "--days",
            type=int,
            default=7,
            help="Only retry requests from last N days (default: 7)",
        )
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Actually queue tasks for execution (default: just create requests)",
        )

    def handle(self, *args, **options):
        """Execute retry command."""
        max_retries = options["max_retries"]
        template_slug = options["template_slug"]
        days = options["days"]
        execute = options["execute"]

        cutoff_date = timezone.now() - timedelta(days=days)

        # Build query
        queryset = GenerationRequest.objects.filter(
            status=RequestStatus.FAILED,
            retry_count__lt=max_retries,
            created_at__gte=cutoff_date,
        )

        if template_slug:
            queryset = queryset.filter(template__slug=template_slug)

        failed_count = queryset.count()

        if failed_count == 0:
            self.stdout.write(self.style.WARNING("No failed requests found matching criteria"))
            return

        self.stdout.write(self.style.NOTICE(f"Found {failed_count} failed requests to retry..."))

        created_count = 0
        for failed_request in queryset:
            # Create new request with same input
            new_request = GenerationRequest.objects.create(
                template=failed_request.template,
                requester=failed_request.requester,
                project=failed_request.project,
                input_data=failed_request.input_data,
                estimated_cost=failed_request.estimated_cost,
                metadata={
                    "retry_of": failed_request.id,
                    "original_error": failed_request.error_message[:200]
                    if failed_request.error_message
                    else None,
                },
            )

            # Optionally queue for execution
            if execute:
                process_generation_request.delay(new_request.id)

            created_count += 1

            self.stdout.write(f"  Created request {new_request.id} (retry of {failed_request.id})")

        action = "and queued" if execute else "(not queued)"
        self.stdout.write(self.style.SUCCESS(f"Created {created_count} new request(s) {action}"))
