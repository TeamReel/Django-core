from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Sum
from organisations.models import Organisation
from projects.models import Project
from transactions.models import Transaction


class Command(BaseCommand):
    help = "Recompute and persist ProjectCreditsBalance from the sum of project transactions"

    def add_arguments(self, parser):
        parser.add_argument(
            "--orgs",
            nargs="+",
            help="Organisation slugs to recompute (omit for all)",
        )
        parser.add_argument(
            "--project-slugs",
            nargs="+",
            help="Only recompute these project slugs (teams)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limit number of projects processed",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Compute and report, but do not write balances",
        )

    def handle(self, *args, **options):
        from credits.models import ProjectCreditsBalance

        org_slugs: list[str] | None = options.get("orgs")
        project_slugs: list[str] | None = options.get("project_slugs")
        limit: int | None = options.get("limit")
        dry_run: bool = bool(options.get("dry_run"))

        orgs_qs = Organisation.objects.all()
        if org_slugs:
            orgs_qs = orgs_qs.filter(slug__in=org_slugs)

        projects_qs = Project.objects.filter(organisation__in=orgs_qs, is_active=True).order_by(
            "id"
        )
        if project_slugs:
            projects_qs = projects_qs.filter(slug__in=project_slugs)
        if limit:
            projects_qs = projects_qs[:limit]

        projects = list(projects_qs.only("id", "slug"))
        if not projects:
            self.stdout.write(self.style.WARNING("No matching projects found."))
            return

        updated = 0
        for project in projects:
            total = Transaction.objects.filter(project_id=project.id).aggregate(
                total=Sum("amount")
            )["total"] or Decimal("0")

            if dry_run:
                self.stdout.write(f"{project.slug}: {total}")
                continue

            ProjectCreditsBalance.objects.update_or_create(
                project_id=project.id,
                defaults={"current_balance": total},
            )
            updated += 1

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f"✅ Dry run complete for {len(projects)} project(s).")
            )
        else:
            self.stdout.write(self.style.SUCCESS(f"✅ Updated {updated} project balance(s)."))
