"""
Management command to seed test data for transactions.

This command creates sample organizations, users, usage events, and transactions
for testing and development purposes.
"""

import logging
import random
from decimal import Decimal

from accounts.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project
from transactions.models import SourceTypeChoices, Transaction, UsageEvent
from transactions.services import create_transaction, record_usage_event

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Seed test data for transactions."""

    help = "Create sample organizations, users, and transactions for testing"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--count",
            type=int,
            default=10,
            help="Number of transactions to create per organization (default: 10)",
        )
        parser.add_argument(
            "--orgs",
            type=int,
            default=3,
            help="Number of organizations to create (default: 3)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """Execute the seed command."""
        count = options["count"]
        org_count = options["orgs"]

        self.stdout.write(
            self.style.SUCCESS(f"Seeding {count} transactions for {org_count} organizations...")
        )

        # Event types for variety
        event_types = [
            "api_call",
            "storage_write",
            "compute_job",
            "data_transfer",
            "ml_inference",
            "webhook_delivery",
        ]

        # Create organizations with users and projects
        for org_idx in range(org_count):
            org_name = f"Test Organization {org_idx + 1}"

            # Check if org exists
            org = Organisation.objects.filter(name=org_name).first()
            if not org:
                # Create admin user for this org
                admin_email = f"admin{org_idx + 1}@testorg.example.com"
                admin_user = User.objects.filter(email=admin_email).first()
                if not admin_user:
                    admin_user = User.objects.create_user(
                        email=admin_email,
                        password="TestPass123!",
                        first_name="Admin",
                        last_name=f"User {org_idx + 1}",
                    )
                    self.stdout.write(f"Created user: {admin_email}")

                org = Organisation.objects.create(
                    name=org_name,
                    creator=admin_user,
                )
                self.stdout.write(f"Created organization: {org_name}")
            else:
                admin_user = org.creator
                self.stdout.write(f"Using existing organization: {org_name}")

            # Create a project for this org
            project_name = f"{org_name} - Project Alpha"
            project = Project.objects.filter(name=project_name, organisation=org).first()
            if not project:
                project = Project.objects.create(
                    name=project_name,
                    organisation=org,
                    creator=admin_user,
                )
                self.stdout.write(f"Created project: {project_name}")
            else:
                self.stdout.write(f"Using existing project: {project_name}")

            # Create transactions for this org
            for txn_idx in range(count):
                # Randomly decide if this transaction has a usage event
                has_usage_event = random.choice([True, False])
                usage_event = None

                if has_usage_event:
                    # Create usage event first
                    event_type = random.choice(event_types)
                    usage_event = record_usage_event(
                        event_type=event_type,
                        user=admin_user,
                        organization=org,
                        project=project if random.choice([True, False]) else None,
                        metadata={
                            "quantity": random.randint(1, 100),
                            "unit": "requests",
                            "test_data": True,
                        },
                        idempotency_key=f"seed-usage-{org.id}-{txn_idx}",
                    )

                # Create transaction with random amount
                is_credit = random.choice([True, True, False])  # 2/3 chance of credit
                amount = Decimal(str(random.uniform(5.00, 500.00))).quantize(Decimal("0.01"))
                if not is_credit:
                    amount = -amount

                # Choose source type
                if usage_event:
                    source_type = SourceTypeChoices.USAGE_EVENT
                elif random.choice([True, False]):
                    source_type = SourceTypeChoices.ADJUSTMENT
                else:
                    source_type = SourceTypeChoices.EXTERNAL_BILLING

                try:
                    create_transaction(
                        amount=amount,
                        organization=org,
                        project=project if random.choice([True, False]) else None,
                        source_type=source_type,
                        usage_event=usage_event,
                        created_by=admin_user,
                        idempotency_key=f"seed-txn-{org.id}-{txn_idx}",
                        notes=f"Test transaction #{txn_idx + 1}",
                    )
                except Exception as e:
                    # Skip if transaction already exists or fails
                    self.stdout.write(self.style.WARNING(f"Skipped transaction: {e}"))
                    continue

            self.stdout.write(self.style.SUCCESS(f"Created transactions for {org_name}"))

        # Print summary
        total_orgs = Organisation.objects.filter(name__startswith="Test Organization").count()
        total_users = User.objects.filter(email__contains="@testorg.example.com").count()
        total_projects = Project.objects.filter(name__contains="Project Alpha").count()
        total_usage_events = UsageEvent.objects.filter(
            idempotency_key__startswith="seed-usage"
        ).count()
        total_transactions = Transaction.objects.filter(
            idempotency_key__startswith="seed-txn"
        ).count()

        self.stdout.write(self.style.SUCCESS("\nSeeding complete!"))
        self.stdout.write(f"Organizations: {total_orgs}")
        self.stdout.write(f"Users: {total_users}")
        self.stdout.write(f"Projects: {total_projects}")
        self.stdout.write(f"Usage Events: {total_usage_events}")
        self.stdout.write(f"Transactions: {total_transactions}")

        return 0
