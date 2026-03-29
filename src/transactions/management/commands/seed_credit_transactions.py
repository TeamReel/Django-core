"""
Management command to seed credit transactions for demo validation.

This creates credit-specific transactions for existing organizations,
designed for manual testing of the Credits page UI.
"""

import logging
from datetime import timedelta
from decimal import Decimal

from accounts.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from organisations.models import Organisation
from transactions.models import SourceTypeChoices, Transaction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Seed credit transactions for demo validation."""

    help = "Create credit transactions for existing organizations"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--orgs",
            nargs="+",
            help="Specific organization slugs to seed (e.g., eredivisie bundesliga). If omitted, seeds all.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """Execute the seed command."""
        target_org_slugs = options.get("orgs")

        # Get organizations to seed
        if target_org_slugs:
            orgs = Organisation.objects.filter(slug__in=target_org_slugs)
        else:
            orgs = Organisation.objects.all()

        if not orgs.exists():
            self.stdout.write(self.style.ERROR("No organizations found to seed."))
            return 1

        self.stdout.write(
            self.style.SUCCESS(f"Seeding credit transactions for {orgs.count()} organization(s)...")
        )

        # Define credit transaction templates
        # These are deterministic: each org gets the same pattern
        now = timezone.now()
        credit_templates = [
            {
                "amount": Decimal("1000.00"),
                "notes": "Initial credit allocation",
                "offset_days": -30,
            },
            {
                "amount": Decimal("-250.00"),
                "notes": "Credit usage - API calls",
                "offset_days": -20,
            },
            {
                "amount": Decimal("500.00"),
                "notes": "Credit top-up",
                "offset_days": -10,
            },
            {
                "amount": Decimal("-150.00"),
                "notes": "Credit usage - Storage",
                "offset_days": -5,
            },
            {
                "amount": Decimal("300.00"),
                "notes": "Bonus credits",
                "offset_days": -2,
            },
        ]

        total_created = 0
        for org in orgs:
            # Get a user for this org (prefer creator, fallback to first member)
            user = org.creator if hasattr(org, "creator") and org.creator else None
            if not user:
                # Find any user with membership in this org
                from permissions.models import Membership

                membership = Membership.objects.filter(organisation=org, is_active=True).first()
                if membership:
                    user = membership.user
                else:
                    # Create a system user for this org if none exists
                    user, created = User.objects.get_or_create(
                        email=f"system-{org.slug}@demo.example.com",
                        defaults={
                            "first_name": "System",
                            "last_name": f"{org.name}",
                        },
                    )
                    if created:
                        self.stdout.write(f"Created system user for {org.name}")

            # Create credit transactions with staggered timestamps
            org_transaction_count = 0
            for idx, template in enumerate(credit_templates):
                # Create a timestamp offset
                timestamp = now + timedelta(days=template["offset_days"])

                # Use idempotency key to prevent duplicates
                idempotency_key = f"seed-credit-{org.slug}-{idx}"

                # Check if already exists
                if Transaction.objects.filter(idempotency_key=idempotency_key).exists():
                    self.stdout.write(
                        self.style.WARNING(f"Skipping {org.name} credit #{idx+1} (already exists)")
                    )
                    continue

                try:
                    # Temporarily override timestamp by creating directly
                    # (create_transaction uses auto_now_add which we can't override easily)
                    Transaction.objects.create(
                        amount=template["amount"],
                        organization=org,
                        project=None,  # Credits are org-level
                        source_type=SourceTypeChoices.ADJUSTMENT,  # Credits are adjustments
                        usage_event=None,
                        created_by=user,
                        idempotency_key=idempotency_key,
                        notes=template["notes"],
                        timestamp=timestamp,
                    )
                    org_transaction_count += 1
                    self.stdout.write(
                        f"  ✓ {org.name}: {template['amount']:+.2f} - {template['notes']}"
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f"Failed to create transaction for {org.name}: {e}")
                    )
                    continue

            total_created += org_transaction_count
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {org_transaction_count} credit transactions for {org.name}"
                )
            )

        # Print summary
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Seeding complete! Created {total_created} credit transactions."
            )
        )
        return 0
