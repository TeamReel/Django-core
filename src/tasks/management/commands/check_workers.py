"""Management command to check Celery worker health."""

import sys

from django.core.management.base import BaseCommand

from tasks.health import get_celery_health_status


class Command(BaseCommand):
    help = "Check health of Celery workers and broker"

    def add_arguments(self, parser):
        parser.add_argument(
            "--timeout",
            type=int,
            default=5,
            help="Timeout in seconds for health checks (default: 5)",
        )
        parser.add_argument(
            "--exit-code",
            action="store_true",
            help="Exit with non-zero code if unhealthy (for scripts)",
        )

    def handle(self, *args, **options):
        timeout = options["timeout"]
        use_exit_code = options["exit_code"]

        self.stdout.write("Checking Celery infrastructure health...\n")

        health_status = get_celery_health_status(timeout=timeout)

        # Display results
        status_style = (
            self.style.SUCCESS if health_status["status"] == "healthy" else self.style.ERROR
        )
        self.stdout.write(status_style(f"Overall Status: {health_status['status'].upper()}\n"))

        # Broker status
        broker = health_status["broker"]
        broker_style = self.style.SUCCESS if broker["status"] == "ok" else self.style.ERROR
        self.stdout.write(broker_style(f"Broker: {broker['status'].upper()} - {broker['message']}"))

        # Workers status
        workers = health_status["workers"]
        workers_style = self.style.SUCCESS if workers["status"] == "ok" else self.style.ERROR
        self.stdout.write(
            workers_style(f"Workers: {workers['status'].upper()} - {workers['message']}")
        )

        # Exit with appropriate code if requested
        if use_exit_code and health_status["status"] != "healthy":
            sys.exit(1)

        sys.exit(0)
