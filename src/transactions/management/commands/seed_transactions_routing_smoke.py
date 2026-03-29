"""Seed a small deterministic set of transactions to smoke-test payer routing.

Goal (demo):
- Exercise fallback routing order: user -> project -> organisation.
- Create only a handful of transactions (topups + debits), idempotent.
- Do not create any users/projects/organisations.

This command is safe to run multiple times because it uses deterministic
idempotency keys.

It assumes payer routing default is configured for the organisation (B10
Setting key `transactions_payer_routing_default`) or via env fallback.

Usage:
    python manage.py seed_transactions_routing_smoke --org knvb
    python manage.py seed_transactions_routing_smoke --org knvb --user admin@teamreel.demo

Notes:
- Debits are created via create_transaction_with_routing(payer_routing=None)
  so the org default is used.
- When falling back to organisation wallet, the resulting transaction has
  wallet_scope=organization and project=NULL by design; we keep auditability
  via notes.
"""

from __future__ import annotations

from decimal import Decimal

from accounts.models import User
from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models import Project
from transactions.exceptions import DuplicateIdempotencyKeyError
from transactions.models import SourceTypeChoices
from transactions.services import (
    create_transaction,
    create_transaction_with_routing,
    get_organization_balance,
    get_project_balance,
    get_user_balance,
    record_usage_event,
)


class Command(BaseCommand):
    help = "Seed a small deterministic set of transactions that exercises payer routing fallback."

    def add_arguments(self, parser):
        parser.add_argument("--org", type=str, required=True, help="Organisation slug (e.g. knvb)")
        parser.add_argument(
            "--user",
            type=str,
            default="admin@teamreel.demo",
            help="User email used for user-wallet debits (default: admin@teamreel.demo)",
        )
        parser.add_argument(
            "--team-id",
            type=int,
            default=0,
            help="Optional explicit team/project id to use (default: first active team in org)",
        )

    def handle(self, *args, **options):
        org_slug: str = options["org"]
        user_email: str = options["user"]
        team_id: int = int(options.get("team_id") or 0)

        org = Organisation.objects.filter(slug=org_slug).first()
        if not org:
            self.stderr.write(f"Organisation '{org_slug}' not found")
            return

        user = User.objects.filter(email__iexact=user_email, is_active=True).first()
        if not user:
            self.stderr.write(f"User '{user_email}' not found or inactive")
            return

        team: Project | None
        if team_id:
            team = Project.objects.filter(
                id=team_id, organisation=org, archived_at__isnull=True
            ).first()
        else:
            team = (
                Project.objects.filter(
                    organisation=org,
                    parent_project__isnull=False,
                    archived_at__isnull=True,
                )
                .order_by("id")
                .first()
            )

        if not team:
            self.stderr.write(f"No active team project found for org '{org.slug}'")
            return

        # Deterministic idempotency keys.
        prefix = f"demo:routing_smoke:{org.slug}:{user.id}:{team.id}"

        # Seed amounts (intentionally small but crafted to force fallbacks).
        topup_user = Decimal("20.00")
        topup_project = Decimal("50.00")
        topup_org = Decimal("100.00")

        debit_1 = Decimal("-10.00")  # should hit user wallet (20 -> 10)
        debit_2 = Decimal("-30.00")  # user insufficient (10), should hit project wallet (50 -> 20)
        debit_3 = Decimal(
            "-60.00"
        )  # user (10) + project (20) insufficient, should hit org wallet (100 -> 40)

        self.stdout.write("\nSeeding transactions routing smoke test")
        self.stdout.write(f"Org: {org.name} ({org.slug})")
        self.stdout.write(f"User wallet: {user.email} (id={user.id})")
        self.stdout.write(f"Team: {team.name} (id={team.id})")

        # 1) Top-ups (explicit wallet selection)
        self._maybe_create(
            idempotency_key=f"{prefix}:topup:user",
            fn=lambda: create_transaction(
                organization=org,
                project=None,
                charged_user=user,
                amount=topup_user,
                source_type=SourceTypeChoices.ADJUSTMENT,
                created_by=user,
                idempotency_key=f"{prefix}:topup:user",
                notes="Demo routing smoke: topup user wallet",
            ),
        )

        self._maybe_create(
            idempotency_key=f"{prefix}:topup:project",
            fn=lambda: create_transaction(
                organization=org,
                project=team,
                charged_user=None,
                amount=topup_project,
                source_type=SourceTypeChoices.ADJUSTMENT,
                created_by=user,
                idempotency_key=f"{prefix}:topup:project",
                notes=f"Demo routing smoke: topup team wallet ({team.name})",
            ),
        )

        self._maybe_create(
            idempotency_key=f"{prefix}:topup:org",
            fn=lambda: create_transaction(
                organization=org,
                project=None,
                charged_user=None,
                amount=topup_org,
                source_type=SourceTypeChoices.ADJUSTMENT,
                created_by=user,
                idempotency_key=f"{prefix}:topup:org",
                notes="Demo routing smoke: topup org wallet",
            ),
        )

        # 2) Debits (uses org default payer routing)
        self._maybe_create(
            idempotency_key=f"{prefix}:debit:1",
            fn=lambda: create_transaction_with_routing(
                organization=org,
                project=team,
                charged_user=user,
                amount=debit_1,
                source_type=SourceTypeChoices.USAGE_EVENT,
                created_by=user,
                idempotency_key=f"{prefix}:debit:1",
                payer_routing=None,
                usage_event=record_usage_event(
                    event_type="routing_smoke_debit",
                    user=user,
                    organization=org,
                    project=team,
                    idempotency_key=f"{prefix}:evt:debit:1",
                    metadata={"seed": "seed_transactions_routing_smoke", "step": 1},
                ),
                notes=f"Demo routing smoke: debit 1 (expect user wallet) team={team.name}",
            ),
        )

        self._maybe_create(
            idempotency_key=f"{prefix}:debit:2",
            fn=lambda: create_transaction_with_routing(
                organization=org,
                project=team,
                charged_user=user,
                amount=debit_2,
                source_type=SourceTypeChoices.USAGE_EVENT,
                created_by=user,
                idempotency_key=f"{prefix}:debit:2",
                payer_routing=None,
                usage_event=record_usage_event(
                    event_type="routing_smoke_debit",
                    user=user,
                    organization=org,
                    project=team,
                    idempotency_key=f"{prefix}:evt:debit:2",
                    metadata={"seed": "seed_transactions_routing_smoke", "step": 2},
                ),
                notes=f"Demo routing smoke: debit 2 (expect project wallet) team={team.name}",
            ),
        )

        self._maybe_create(
            idempotency_key=f"{prefix}:debit:3",
            fn=lambda: create_transaction_with_routing(
                organization=org,
                project=team,
                charged_user=user,
                amount=debit_3,
                source_type=SourceTypeChoices.USAGE_EVENT,
                created_by=user,
                idempotency_key=f"{prefix}:debit:3",
                payer_routing=None,
                usage_event=record_usage_event(
                    event_type="routing_smoke_debit",
                    user=user,
                    organization=org,
                    project=team,
                    idempotency_key=f"{prefix}:evt:debit:3",
                    metadata={"seed": "seed_transactions_routing_smoke", "step": 3},
                ),
                notes=f"Demo routing smoke: debit 3 (expect org wallet) team={team.name}",
            ),
        )

        # 2b) Ensure we can demonstrate project->org fallback even if the project
        # already has a large balance in the demo DB.
        # We do this by creating ONE additional debit whose magnitude exceeds
        # the current project balance, forcing routing to reach the org wallet.
        proj_bal_now = get_project_balance(team.id, use_cache=False)["current_balance"]
        org_bal_now = get_organization_balance(org.id, use_cache=False)["current_balance"]
        user_bal_now = get_user_balance(organization_id=org.id, user_id=user.id, use_cache=False)[
            "current_balance"
        ]

        desired_org_debit = -(Decimal(proj_bal_now) + Decimal("1.00"))
        if abs(desired_org_debit) <= Decimal(org_bal_now):
            self._maybe_create(
                idempotency_key=f"{prefix}:debit:org_fallback",
                fn=lambda: create_transaction_with_routing(
                    organization=org,
                    project=team,
                    charged_user=user,
                    amount=desired_org_debit,
                    source_type=SourceTypeChoices.USAGE_EVENT,
                    created_by=user,
                    idempotency_key=f"{prefix}:debit:org_fallback",
                    payer_routing=None,
                    usage_event=record_usage_event(
                        event_type="routing_smoke_debit",
                        user=user,
                        organization=org,
                        project=team,
                        idempotency_key=f"{prefix}:evt:debit:org_fallback",
                        metadata={
                            "seed": "seed_transactions_routing_smoke",
                            "step": "org_fallback",
                            "project_balance_before": str(proj_bal_now),
                            "user_balance_before": str(user_bal_now),
                            "org_balance_before": str(org_bal_now),
                        },
                    ),
                    notes=(
                        f"Demo routing smoke: org fallback (debit exceeds project balance) "
                        f"team={team.name}"
                    ),
                ),
            )
        else:
            self.stdout.write(
                "  ! skipped org fallback debit: org balance is too low to cover a debit larger than the project balance"
            )

        # 3) Minimal verification (DB-backed): fetch by idempotency key and show wallet_scope.
        self.stdout.write("\nVerification (wallet_scope per idempotency key):")
        for key in [
            f"{prefix}:topup:user",
            f"{prefix}:topup:project",
            f"{prefix}:topup:org",
            f"{prefix}:debit:1",
            f"{prefix}:debit:2",
            f"{prefix}:debit:3",
            f"{prefix}:debit:org_fallback",
        ]:
            txn = self._get_txn_by_key(org_id=org.id, key=key)
            if not txn:
                self.stdout.write(f"- {key}: (missing)")
                continue
            self.stdout.write(
                f"- {key}: wallet_scope={txn.wallet_scope} project_id={txn.project_id} charged_user_id={txn.charged_user_id} amount={txn.amount}"
            )

        user_bal = get_user_balance(organization_id=org.id, user_id=user.id, use_cache=False)[
            "current_balance"
        ]
        proj_bal = get_project_balance(team.id, use_cache=False)["current_balance"]
        org_bal = get_organization_balance(org.id, use_cache=False)["current_balance"]
        self.stdout.write("\nBalances (post-seed):")
        self.stdout.write(f"User balance:    {user_bal}")
        self.stdout.write(f"Project balance: {proj_bal}")
        self.stdout.write(f"Org balance:     {org_bal}")

    def _maybe_create(self, *, idempotency_key: str, fn):
        try:
            txn = fn()
            self.stdout.write(f"  + created {idempotency_key} -> wallet_scope={txn.wallet_scope}")
            return txn
        except DuplicateIdempotencyKeyError:
            self.stdout.write(f"  ↻ exists {idempotency_key}")
            return None

    def _get_txn_by_key(self, *, org_id, key: str):
        from transactions.models import Transaction

        return Transaction.objects.filter(organization_id=org_id, idempotency_key=key).first()
