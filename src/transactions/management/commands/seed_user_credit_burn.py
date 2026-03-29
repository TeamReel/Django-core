"""Seed lots of credit spend against a user wallet (demo helper).

Use-case:
- Few users manage many teams.
- Credits should be deducted from the managing user (user wallet), not from each team.

This command:
- Creates a user-wallet top-up transaction (positive amount).
- Creates many user-wallet debit transactions (negative) attributed to teams via project.

Idempotent:
- Uses deterministic idempotency keys so it can be safely re-run.

Example:
    $env:DATABASE_URL="postgresql://..."
    python manage.py seed_user_credit_burn --org knvb --user admin@teamreel.demo
"""

from __future__ import annotations

from decimal import Decimal

from accounts.models import User
from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models import Project
from transactions.exceptions import (
    DuplicateIdempotencyKeyError,
    InsufficientBalanceError,
    PolicyViolationError,
)
from transactions.models import SourceTypeChoices
from transactions.services import create_transaction


class Command(BaseCommand):
    help = "Seed many user-wallet transactions to simulate heavy credit usage across teams."

    def add_arguments(self, parser):
        parser.add_argument("--org", type=str, required=True, help="Organisation slug (e.g. knvb)")
        parser.add_argument(
            "--user",
            type=str,
            default="admin@teamreel.demo",
            help="User email to charge (default: admin@teamreel.demo)",
        )
        parser.add_argument(
            "--topup",
            type=str,
            default="5000",
            help="Top-up amount to seed on the user wallet (default: 5000)",
        )
        parser.add_argument(
            "--debit-amount",
            type=str,
            default="5",
            help="Debit amount per transaction (positive number; will be negated) (default: 5)",
        )
        parser.add_argument(
            "--debits-per-team",
            type=int,
            default=25,
            help="How many debit transactions to create per team (default: 25)",
        )
        parser.add_argument(
            "--limit-teams",
            type=int,
            default=0,
            help="Optionally limit number of teams processed (0 = all)",
        )

    def handle(self, *args, **options):
        org_slug: str = options["org"]
        user_email: str = options["user"]
        topup_amount = Decimal(str(options["topup"]))
        debit_amount = Decimal(str(options["debit_amount"]))
        debits_per_team: int = int(options["debits_per_team"])
        limit_teams: int = int(options["limit_teams"] or 0)

        org = Organisation.objects.filter(slug=org_slug).first()
        if not org:
            self.stderr.write(f"Organisation '{org_slug}' not found")
            return

        user = User.objects.filter(email__iexact=user_email, is_active=True).first()
        if not user:
            self.stderr.write(f"User '{user_email}' not found or inactive")
            return

        teams_qs = Project.objects.filter(
            organisation=org,
            parent_project__isnull=False,
            archived_at__isnull=True,
        ).order_by("id")
        if limit_teams > 0:
            teams_qs = teams_qs[:limit_teams]
        teams = list(teams_qs)

        if not teams:
            self.stdout.write(f"No teams found for organisation '{org.slug}'")
            return

        if debits_per_team <= 0:
            self.stdout.write("debits-per-team <= 0; nothing to do")
            return

        self.stdout.write("\nSeeding user-wallet credit burn")
        self.stdout.write(f"Org: {org.name} ({org.slug})")
        self.stdout.write(f"User wallet: {user.email}")
        self.stdout.write(f"Teams: {len(teams)}")
        self.stdout.write(f"Top-up: +{topup_amount}")
        self.stdout.write(f"Per-team debits: {debits_per_team} × -{debit_amount}")

        # 1) Top-up once
        topup_key = f"demo:user_wallet_topup:{org.slug}:{user.id}"
        try:
            create_transaction(
                organization=org,
                project=None,
                charged_user=user,
                amount=topup_amount,
                source_type=SourceTypeChoices.ADJUSTMENT,
                created_by=user,
                idempotency_key=topup_key,
                notes="Demo: user wallet top-up",
            )
            self.stdout.write(f"  + Top-up created ({topup_key})")
        except DuplicateIdempotencyKeyError:
            self.stdout.write(f"  ↻ Top-up already exists ({topup_key})")

        # 2) Debits per team
        created = 0
        skipped = 0

        for team in teams:
            for i in range(debits_per_team):
                idem = f"demo:user_wallet_burn:{org.slug}:{user.id}:{team.id}:{i}"
                try:
                    create_transaction(
                        organization=org,
                        project=team,
                        charged_user=user,
                        amount=-debit_amount,
                        source_type=SourceTypeChoices.USAGE_EVENT,
                        created_by=user,
                        idempotency_key=idem,
                        notes=f"Demo: credit burn on {team.name}",
                    )
                    created += 1
                except DuplicateIdempotencyKeyError:
                    skipped += 1
                except (InsufficientBalanceError, PolicyViolationError) as e:
                    self.stderr.write(
                        f"Stopped: balance policy blocked at team='{team.name}' key='{idem}': {e}"
                    )
                    self.stdout.write(f"Created so far: {created}; skipped: {skipped}")
                    return

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(f"Created {created} debit transactions")
        self.stdout.write(f"⏭️  Skipped {skipped} (already existed / blocked)")
        self.stdout.write("=" * 60 + "\n")
