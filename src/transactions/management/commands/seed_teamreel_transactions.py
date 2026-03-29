"""Seed org + per-project (team) transactions for the TeamReel demo.

This command populates the transactions ledger with deterministic, idempotent
data so the demo UI has realistic balances and histories.

Key goals:
- Org-level credits exist for the Credits page (project=None)
- Project-level (team) credits + debits exist so each team has its own balance
- Safe to run multiple times (idempotency_key-based)
- Backdated timestamps (auto_now_add fields are updated after creation)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from accounts.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from organisations.models import Membership, Organisation
from projects.models import Project
from transactions.models import SourceTypeChoices, Transaction, UsageEvent
from transactions.services import create_transaction, record_usage_event


@dataclass(frozen=True)
class _TxnTemplate:
    days_ago: int
    amount: Decimal
    source_type: str
    notes: str
    usage_event_type: str | None = None
    usage_metadata: dict | None = None


def _pick_actor_for_org(org: Organisation) -> User | None:
    if getattr(org, "creator", None):
        return org.creator

    membership = (
        Membership.objects.filter(organisation=org, is_active=True).select_related("user").first()
    )
    if membership:
        return membership.user

    return None


def _backdate(model_cls, pk, *, field: str, value) -> None:
    # auto_now_add prevents setting on create; update after insert.
    model_cls.objects.filter(pk=pk).update(**{field: value})


class Command(BaseCommand):
    help = "Seed deterministic transactions & credits for orgs and teams (projects)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--orgs",
            nargs="+",
            help="Organisation slugs to seed (omit for all)",
        )
        parser.add_argument(
            "--include-org-credits",
            action="store_true",
            default=True,
            help="Also create org-level credit adjustments (default: true)",
        )
        parser.add_argument(
            "--no-org-credits",
            action="store_true",
            help="Do not create org-level credit adjustments",
        )
        parser.add_argument(
            "--per-project",
            action="store_true",
            default=True,
            help="Also seed per-project (team) credits/debits (default: true)",
        )
        parser.add_argument(
            "--no-per-project",
            action="store_true",
            help="Do not seed per-project (team) transactions",
        )
        parser.add_argument(
            "--projects-limit",
            type=int,
            default=None,
            help="Limit number of projects per org (useful for quick runs)",
        )
        parser.add_argument(
            "--project-slugs",
            nargs="+",
            help="Only seed these project slugs (team slugs) within the selected org(s)",
        )
        parser.add_argument(
            "--teams-only",
            action="store_true",
            help=(
                "Only seed team projects (child projects: parent_project__isnull=false). "
                "Recommended for TeamReel where project wallets primarily live on teams."
            ),
        )
        parser.add_argument(
            "--club-slugs",
            nargs="+",
            help=(
                "Only seed teams under these club slugs (root projects). "
                "Example: --orgs knvb --teams-only --club-slugs ajax"
            ),
        )
        parser.add_argument(
            "--list-projects",
            action="store_true",
            help="List projects (teams) for the selected org(s) and exit",
        )
        parser.add_argument(
            "--list-clubs",
            action="store_true",
            help="List club projects (root projects) for the selected org(s) and exit",
        )
        parser.add_argument(
            "--series",
            default="v1",
            help=(
                "Namespace for idempotency keys (default: v1). "
                "Use a new value (e.g. v2) to seed a new"
                " deterministic set without touching"
                " existing records."
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        org_slugs: list[str] | None = options.get("orgs")
        include_org_credits: bool = bool(options.get("include_org_credits")) and not bool(
            options.get("no_org_credits")
        )
        per_project: bool = bool(options.get("per_project")) and not bool(
            options.get("no_per_project")
        )
        projects_limit: int | None = options.get("projects_limit")
        project_slugs: list[str] | None = options.get("project_slugs")
        teams_only: bool = bool(options.get("teams_only"))
        club_slugs: list[str] | None = options.get("club_slugs")
        list_projects: bool = bool(options.get("list_projects"))
        list_clubs: bool = bool(options.get("list_clubs"))
        series: str = str(options.get("series") or "v1").strip() or "v1"

        if org_slugs:
            orgs = Organisation.objects.filter(slug__in=org_slugs)
        else:
            orgs = Organisation.objects.all()

        if not orgs.exists():
            self.stdout.write(self.style.ERROR("No organisations found."))
            return

        now = timezone.now()

        # Requested amounts: 250, 500, 1000 (use negatives for debits)
        org_templates: list[_TxnTemplate] = [
            _TxnTemplate(
                days_ago=30,
                amount=Decimal("250.00"),
                source_type=SourceTypeChoices.ADJUSTMENT,
                notes="Initial credit allocation (demo)",
            ),
            _TxnTemplate(
                days_ago=20,
                amount=Decimal("500.00"),
                source_type=SourceTypeChoices.EXTERNAL_BILLING,
                notes="Credit top-up (demo)",
            ),
            _TxnTemplate(
                days_ago=10,
                amount=Decimal("1000.00"),
                source_type=SourceTypeChoices.EXTERNAL_BILLING,
                notes="Bulk top-up (demo)",
            ),
            _TxnTemplate(
                days_ago=5,
                amount=Decimal("-250.00"),
                source_type=SourceTypeChoices.USAGE_EVENT,
                notes="Usage (demo)",
                usage_event_type="api_request",
                usage_metadata={
                    "endpoint": "/api/v1/organisations",
                    "method": "GET",
                    "status": 200,
                },
            ),
        ]

        project_templates: list[_TxnTemplate] = [
            _TxnTemplate(
                days_ago=30,
                amount=Decimal("250.00"),
                source_type=SourceTypeChoices.ADJUSTMENT,
                notes="Team allocation (demo)",
            ),
            _TxnTemplate(
                days_ago=20,
                amount=Decimal("500.00"),
                source_type=SourceTypeChoices.EXTERNAL_BILLING,
                notes="Team top-up (demo)",
            ),
            _TxnTemplate(
                days_ago=10,
                amount=Decimal("1000.00"),
                source_type=SourceTypeChoices.EXTERNAL_BILLING,
                notes="Team bulk top-up (demo)",
            ),
            _TxnTemplate(
                days_ago=7,
                amount=Decimal("-250.00"),
                source_type=SourceTypeChoices.USAGE_EVENT,
                notes="Usage (demo)",
                usage_event_type="api_request",
                usage_metadata={"endpoint": "/api/v1/projects", "method": "GET", "status": 200},
            ),
            _TxnTemplate(
                days_ago=4,
                amount=Decimal("-500.00"),
                source_type=SourceTypeChoices.USAGE_EVENT,
                notes="Usage (demo)",
                usage_event_type="video_processed",
                usage_metadata={"file_size_mb": 250, "duration_sec": 300},
            ),
            _TxnTemplate(
                days_ago=2,
                amount=Decimal("-1000.00"),
                source_type=SourceTypeChoices.USAGE_EVENT,
                notes="Usage (demo)",
                usage_event_type="ai_token_usage",
                usage_metadata={"model": "gpt-4", "tokens": 2000},
            ),
        ]

        totals = {
            "org_txns_created": 0,
            "proj_txns_created": 0,
            "usage_events_created": 0,
            "orgs": orgs.count(),
        }

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeding transactions for {totals['orgs']} organisation(s) "
                f"(org_credits={include_org_credits}, per_project={per_project})..."
            )
        )

        for org in orgs:
            actor = _pick_actor_for_org(org)
            if not actor:
                self.stdout.write(self.style.WARNING(f"Skipping {org.slug}: no actor user found"))
                continue

            if list_clubs:
                clubs = list(
                    Project.objects.filter(
                        organisation=org, is_active=True, parent_project__isnull=True
                    )
                    .order_by("id")
                    .only("slug", "name")
                    .values_list("slug", "name")
                )
                if not clubs:
                    self.stdout.write(self.style.WARNING(f"{org.slug}: no clubs found"))
                else:
                    self.stdout.write(self.style.SUCCESS(f"{org.slug}: {len(clubs)} club(s)"))
                    for slug, name in clubs:
                        self.stdout.write(f"- {slug}  ({name})")
                continue

            if list_projects:
                projects_qs = Project.objects.filter(organisation=org, is_active=True).order_by(
                    "id"
                )
                if teams_only:
                    projects_qs = projects_qs.filter(parent_project__isnull=False)
                if club_slugs:
                    clubs = Project.objects.filter(
                        organisation=org,
                        is_active=True,
                        parent_project__isnull=True,
                        slug__in=club_slugs,
                    )
                    projects_qs = projects_qs.filter(parent_project__in=clubs)
                if project_slugs:
                    projects_qs = projects_qs.filter(slug__in=project_slugs)

                projects = list(projects_qs.only("slug", "name").values_list("slug", "name"))
                if not projects:
                    self.stdout.write(self.style.WARNING(f"{org.slug}: no projects found"))
                else:
                    self.stdout.write(self.style.SUCCESS(f"{org.slug}: {len(projects)} project(s)"))
                    for slug, name in projects:
                        self.stdout.write(f"- {slug}  ({name})")
                continue

            if include_org_credits:
                for idx, tmpl in enumerate(org_templates):
                    idem = f"seed:{series}:org-txn:{org.slug}:{idx}"
                    if Transaction.objects.filter(idempotency_key=idem).exists():
                        continue

                    usage_event = None
                    if tmpl.source_type == SourceTypeChoices.USAGE_EVENT:
                        usevt_idem = f"seed:{series}:org-usevt:{org.slug}:{idx}"
                        existing_evt = UsageEvent.objects.filter(idempotency_key=usevt_idem).first()
                        if existing_evt:
                            usage_event = existing_evt
                        else:
                            usage_event = record_usage_event(
                                event_type=tmpl.usage_event_type or "api_request",
                                user=actor,
                                organization=org,
                                project=None,
                                metadata=tmpl.usage_metadata or {},
                                idempotency_key=usevt_idem,
                            )
                            _backdate(
                                UsageEvent,
                                usage_event.pk,
                                field="timestamp",
                                value=now - timedelta(days=tmpl.days_ago),
                            )
                            totals["usage_events_created"] += 1

                    txn = create_transaction(
                        amount=tmpl.amount,
                        organization=org,
                        project=None,
                        source_type=tmpl.source_type,
                        usage_event=usage_event,
                        created_by=actor,
                        idempotency_key=idem,
                        notes=tmpl.notes,
                    )
                    _backdate(
                        Transaction,
                        txn.pk,
                        field="timestamp",
                        value=now - timedelta(days=tmpl.days_ago),
                    )
                    totals["org_txns_created"] += 1

            # Ensure CreditsBalance exists and is correct even if we skipped creating
            # org-level transactions due to idempotency.
            from credits.models import CreditsBalance

            org_balance_sum = Transaction.objects.filter(
                organization=org, project__isnull=True
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
            CreditsBalance.objects.update_or_create(
                organisation=org,
                defaults={"current_balance": int(org_balance_sum)},
            )

            if not per_project:
                continue

            projects_qs = Project.objects.filter(organisation=org, is_active=True).order_by("id")
            if teams_only:
                projects_qs = projects_qs.filter(parent_project__isnull=False)
            if club_slugs:
                clubs = list(
                    Project.objects.filter(
                        organisation=org,
                        is_active=True,
                        parent_project__isnull=True,
                        slug__in=club_slugs,
                    )
                )
                if not clubs:
                    self.stdout.write(
                        self.style.WARNING(
                            f"{org.slug}: no clubs found for"
                            f" --club-slugs={club_slugs};"
                            f" skipping per-project seeding"
                        )
                    )
                    continue
                projects_qs = projects_qs.filter(parent_project__in=clubs)
            if project_slugs:
                projects_qs = projects_qs.filter(slug__in=project_slugs)

            projects_qs = projects_qs.only("id", "slug", "name", "organisation_id")
            if projects_limit:
                projects_qs = projects_qs[:projects_limit]

            for project in projects_qs:
                # Ensure credits exist before debits (prepaid default policy).
                for idx, tmpl in enumerate(project_templates):
                    idem = f"seed:{series}:proj-txn:{org.slug}:{project.slug}:{idx}"
                    if Transaction.objects.filter(idempotency_key=idem).exists():
                        continue

                    usage_event = None
                    if tmpl.source_type == SourceTypeChoices.USAGE_EVENT:
                        usevt_idem = f"seed:{series}:proj-usevt:{org.slug}:{project.slug}:{idx}"
                        existing_evt = UsageEvent.objects.filter(idempotency_key=usevt_idem).first()
                        if existing_evt:
                            usage_event = existing_evt
                        else:
                            usage_event = record_usage_event(
                                event_type=tmpl.usage_event_type or "api_request",
                                user=actor,
                                organization=org,
                                project=project,
                                metadata=tmpl.usage_metadata or {},
                                idempotency_key=usevt_idem,
                            )
                            _backdate(
                                UsageEvent,
                                usage_event.pk,
                                field="timestamp",
                                value=now - timedelta(days=tmpl.days_ago),
                            )
                            totals["usage_events_created"] += 1

                    txn = create_transaction(
                        amount=tmpl.amount,
                        organization=org,
                        project=project,
                        source_type=tmpl.source_type,
                        usage_event=usage_event,
                        created_by=actor,
                        idempotency_key=idem,
                        notes=tmpl.notes,
                    )
                    _backdate(
                        Transaction,
                        txn.pk,
                        field="timestamp",
                        value=now - timedelta(days=tmpl.days_ago),
                    )
                    totals["proj_txns_created"] += 1

                # Ensure ProjectCreditsBalance exists and matches sum(project transactions)
                from credits.models import ProjectCreditsBalance

                proj_sum = Transaction.objects.filter(project=project).aggregate(
                    total=Sum("amount")
                )["total"] or Decimal("0")
                ProjectCreditsBalance.objects.update_or_create(
                    project=project,
                    defaults={"current_balance": proj_sum},
                )

        self.stdout.write(
            self.style.SUCCESS(
                "\n✅ Done. "
                f"Org txns: +{totals['org_txns_created']}, "
                f"Project txns: +{totals['proj_txns_created']}, "
                f"Usage events: +{totals['usage_events_created']}"
            )
        )
        return
