"""Seed TeamReel governance defaults (policies + routing rules).

This command exists to keep production/demo environments consistent with the
TeamReel strategy while remaining safe to run multiple times.

- Creates org-level BalancePolicy if missing
- Creates org-level OrganisationNotificationPolicy if missing
- Ensures global contextual notification RoutingRules exist (via configure_routing)

By design, we do NOT bulk-create NotificationPreference rows: absence implies
"enabled=True" by default and keeps the table small.
"""

from __future__ import annotations

import os
from datetime import time
from decimal import Decimal

from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from organisations.models import Organisation
from transactions.models import EnforcementModeChoices


class Command(BaseCommand):
    help = "Seed TeamReel governance defaults (dry-run by default)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Actually create/update data. Without this, only a preview is shown.",
        )
        parser.add_argument(
            "--org-id",
            default=None,
            help="Optional organisation UUID to scope changes to a single org.",
        )
        parser.add_argument(
            "--quiet-hours",
            action="store_true",
            help=(
                "Enable quiet hours (22:00-08:00 Europe/Amsterdam)"
                " for newly created org policies."
            ),
        )
        parser.add_argument(
            "--allow-sqlite",
            action="store_true",
            help=(
                "Allow running against SQLite (not recommended;"
                " intended for local-only debugging)."
            ),
        )

    def handle(self, *args, **options):
        execute: bool = options["execute"]
        org_id: str | None = options["org_id"]
        enable_quiet_hours: bool = options["quiet_hours"]
        allow_sqlite: bool = options["allow_sqlite"]

        db_engine = settings.DATABASES.get("default", {}).get("ENGINE", "")
        if ("sqlite" in db_engine.lower()) and (not allow_sqlite):
            db_url_present = bool(os.environ.get("DATABASE_URL"))
            raise CommandError(
                "Refusing to run seed_teamreel_governance against SQLite. "
                "This command is intended for Railway/PostgreSQL governance seeding. "
                f"DATABASE_URL present: {db_url_present}. "
                "Set DATABASE_URL to your Railway Postgres URL (or run in Railway environment), "
                "or pass --allow-sqlite for local debugging."
            )

        org_qs = Organisation.objects.all()
        if org_id:
            org_qs = org_qs.filter(id=org_id)

        org_count = org_qs.count()
        if org_id and org_count == 0:
            self.stderr.write(f"No Organisation found for id={org_id}")
            return

        self.stdout.write("\n=== TeamReel Governance Seed ===")
        self.stdout.write(f"Scope: {'single org' if org_id else 'all orgs'} ({org_count})")
        self.stdout.write(f"Mode: {'EXECUTE' if execute else 'DRY RUN'}")

        # 1) Routing rules (global) via existing command
        self.stdout.write("\n[1/3] Contextual notification routing rules")
        if execute:
            call_command("configure_routing")
        else:
            call_command("configure_routing", dry_run=True)

        # 2) Organisation notification policy (one per org)
        self.stdout.write("\n[2/3] Organisation notification policies")
        created_org_policies = 0
        skipped_org_policies = 0

        OrganisationNotificationPolicy = apps.get_model(
            "contextual_notifications", "OrganisationNotificationPolicy"
        )

        for org in org_qs.iterator():
            if OrganisationNotificationPolicy.objects.filter(
                organisation=org
            ).exists():  # pyright: ignore[reportPrivateUsage]
                skipped_org_policies += 1
                continue

            created_org_policies += 1
            if not execute:
                continue

            if enable_quiet_hours:
                OrganisationNotificationPolicy.objects.create(  # pyright: ignore[reportPrivateUsage]
                    organisation=org,
                    policy_type=OrganisationNotificationPolicy.POLICY_TYPE_DEFAULT,
                    quiet_hours_enabled=True,
                    quiet_hours_start=time(22, 0),
                    quiet_hours_end=time(8, 0),
                    quiet_hours_timezone="Europe/Amsterdam",
                    quiet_hours_rate_limit=10,
                )
            else:
                OrganisationNotificationPolicy.objects.create(  # pyright: ignore[reportPrivateUsage]
                    organisation=org,
                    policy_type=OrganisationNotificationPolicy.POLICY_TYPE_DEFAULT,
                    quiet_hours_enabled=False,
                    quiet_hours_timezone="UTC",
                    quiet_hours_rate_limit=10,
                )

        self.stdout.write(
            f"OrganisationNotificationPolicy: "
            f"create={created_org_policies} skip={skipped_org_policies}"
        )

        # 3) BalancePolicy (org-level) for prepaid safety
        self.stdout.write("\n[3/3] Balance policies")
        created_balance_policies = 0
        skipped_balance_policies = 0

        BalancePolicy = apps.get_model("transactions", "BalancePolicy")

        for org in org_qs.iterator():
            if BalancePolicy.objects.filter(
                organization=org, project__isnull=True
            ).exists():  # pyright: ignore[reportPrivateUsage]
                skipped_balance_policies += 1
                continue

            created_balance_policies += 1
            if not execute:
                continue

            BalancePolicy.objects.create(  # pyright: ignore[reportPrivateUsage]
                organization=org,
                project=None,
                allow_negative=False,
                warn_threshold=Decimal("100.0000"),
                enforcement_mode=EnforcementModeChoices.BLOCK,
            )

        self.stdout.write(
            f"BalancePolicy(org): create={created_balance_policies} skip={skipped_balance_policies}"
        )

        if not execute:
            self.stdout.write("\nDRY RUN complete. Re-run with --execute to apply.")
        else:
            self.stdout.write("\nGovernance seed complete.")
