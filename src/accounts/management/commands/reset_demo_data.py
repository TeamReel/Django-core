"""
Management command to reset demo production database.

Wipes demo-scoped data and optionally reseeds with seed_demo_data.
"""

import json
import time
from typing import Dict

from accounts.models import User
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Membership, Organisation
from projects.models import Project

from ._seed_helpers import DEMO_ACCOUNTS, ORG_DATA


class Command(BaseCommand):
    help = (
        "Reset demo production database by wiping demo-scoped data and reseeding. "
        "Requires --force flag to proceed."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Required flag to proceed with reset (safety gate)",
        )
        parser.add_argument(
            "--no-seed",
            action="store_true",
            help="Skip reseeding after wipe (only delete data)",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Output results in JSON format",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed progress messages",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)
        no_seed = options.get("no_seed", False)
        json_output = options.get("json", False)
        verbose = options.get("verbose", False)

        if not force:
            self.stdout.write(
                self.style.ERROR("✗ Reset requires --force flag to proceed (safety gate)")
            )
            raise SystemExit(1)

        start_time = time.time()

        # Step 1: Wipe demo data
        deleted_counts = self._wipe_demo_data(verbose)

        wipe_time = time.time()
        wipe_elapsed = round(wipe_time - start_time, 2)

        # Step 2: Reseed (unless --no-seed)
        if not no_seed:
            if verbose:
                self.stdout.write("\nReseeding demo data...")

            # Call seed_demo_data with force (suppress JSON to avoid double output)
            from io import StringIO

            seed_out = StringIO() if json_output else self.stdout
            call_command("seed_demo_data", force=True, json=False, stdout=seed_out)

            seed_time = time.time()
            seed_elapsed = round(seed_time - wipe_time, 2)
        else:
            seed_elapsed = 0

        total_elapsed = round(time.time() - start_time, 2)

        # Prepare results
        result = {
            "status": "success",
            "wipe": {
                "deleted": deleted_counts,
                "elapsed_seconds": wipe_elapsed,
            },
            "seed": {
                "skipped": no_seed,
                "elapsed_seconds": seed_elapsed if not no_seed else 0,
            },
            "total_elapsed_seconds": total_elapsed,
        }

        if json_output:
            self.stdout.write(json.dumps(result, indent=2))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n✓ Reset complete ({total_elapsed}s total)"))
            self.stdout.write(f"  Wipe: {wipe_elapsed}s")
            if not no_seed:
                self.stdout.write(f"  Seed: {seed_elapsed}s")
            self.stdout.write(f"\nDeleted counts: {deleted_counts}")

    def _wipe_demo_data(self, verbose: bool) -> Dict[str, int]:
        """Delete demo-scoped data only (preserves non-demo records)."""
        deleted_counts = {
            "users": 0,
            "organisations": 0,
            "projects": 0,
            "memberships": 0,
            "audit_events": 0,
            "notifications": 0,
            "transactions": 0,
        }

        with transaction.atomic():
            demo_slugs = [org["slug"] for org in ORG_DATA]
            demo_emails = [acc["email"] for acc in DEMO_ACCOUNTS]

            # Delete organisations (cascade handles projects, memberships, transactions)
            demo_orgs = Organisation.objects.filter(slug__in=demo_slugs)
            deleted_counts["organisations"] = demo_orgs.count()

            # Count projects before deletion (cascade from org delete)
            deleted_counts["projects"] = Project.objects.filter(organisation__in=demo_orgs).count()

            # Count memberships before deletion (cascade from org delete)
            deleted_counts["memberships"] = Membership.objects.filter(
                organisation__in=demo_orgs
            ).count()

            # Count transactions if available (use 'organization' not 'organisation')
            try:
                from transactions.models import Transaction

                deleted_counts["transactions"] = Transaction.objects.filter(
                    organization__in=demo_orgs
                ).count()
            except ImportError:
                pass

            # Count audit events if available (don't cascade, delete explicitly)
            try:
                from audit.models import AuditEvent

                audit_count, _ = AuditEvent.objects.filter(organization__in=demo_orgs).delete()
                deleted_counts["audit_events"] = audit_count
            except ImportError:
                pass

            # Count and delete notifications if available
            try:
                from notifications.models import Notification

                demo_users = User.objects.filter(email__in=demo_emails)
                notif_count, _ = Notification.objects.filter(recipient_user__in=demo_users).delete()
                deleted_counts["notifications"] = notif_count
            except ImportError:
                pass

            # Now delete orgs (cascade handles projects, memberships)
            demo_orgs.delete()

            # Delete demo user accounts
            demo_users = User.objects.filter(email__in=demo_emails)
            deleted_counts["users"] = demo_users.count()
            demo_users.delete()

            # Delete additional users created by seed command
            # Pattern: firstname.lastname@demo.djangocore.app
            # or firstname.lastname.N@demo.djangocore.app
            additional_users = User.objects.filter(
                email__regex=r"^[a-z]+\.[a-z]+(\.\d+)?@demo\.djangocore\.app$"
            )
            additional_count = additional_users.count()
            additional_users.delete()
            deleted_counts["users"] += additional_count

            if verbose:
                self.stdout.write("  Deleted demo data:")
                for entity, count in deleted_counts.items():
                    if count > 0:
                        self.stdout.write(f"    {entity}: {count}")

        return deleted_counts
