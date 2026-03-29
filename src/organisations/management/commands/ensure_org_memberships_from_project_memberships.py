"""ensure_org_memberships_from_project_memberships

Idempotently ensures that every user who appears in ProjectMemberships for an organisation
also has an Organisation Membership record.

Why:
- Match participations/lineups reference Organisation Membership IDs (not User IDs).
- Some seeders created ProjectMemberships directly (bypassing MembershipService), which can
  leave Organisation memberships missing.

Safe to run multiple times.

Usage examples:
  python manage.py ensure_org_memberships_from_project_memberships --orgs knvb
  python manage.py ensure_org_memberships_from_project_memberships \
      --orgs knvb --period-id <season_uuid>
  python manage.py ensure_org_memberships_from_project_memberships --orgs knvb --dry-run
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Membership, Organisation
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = (
        "Ensure Organisation Memberships exist for users that have ProjectMemberships "
        "in the given organisation(s)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--orgs",
            type=str,
            required=True,
            help="Comma-separated organisation slugs (e.g. knvb,dfb)",
        )
        parser.add_argument(
            "--period-id",
            type=str,
            default=None,
            help="Optional Period UUID to scope to a specific season.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without writing.",
        )

    def _parse_org_slugs(self, raw: str) -> list[str]:
        return [s.strip() for s in (raw or "").split(",") if s.strip()]

    def handle(self, *args, **options):
        org_slugs = self._parse_org_slugs(options.get("orgs"))
        period_id = (options.get("period_id") or "").strip() or None
        dry_run = bool(options.get("dry_run"))

        if not org_slugs:
            self.stderr.write("[X] Provide --orgs")
            return

        orgs = list(Organisation.objects.filter(slug__in=org_slugs))
        missing = sorted(set(org_slugs) - {o.slug for o in orgs})
        if missing:
            self.stdout.write(f"[!] Unknown org slug(s): {', '.join(missing)}")

        total_users = 0
        created = 0
        activated = 0

        for org in orgs:
            self.stdout.write(f"[ORG] {org.name} ({org.slug})")

            pm_qs = ProjectMembership.objects.filter(
                project__organisation=org,
                deleted_at__isnull=True,
            ).select_related("user")
            if period_id:
                pm_qs = pm_qs.filter(period_id=period_id)

            # Distinct users in this org's project memberships.
            users = {}
            for pm in pm_qs:
                if pm.user_id is not None:
                    users[int(pm.user_id)] = pm.user

            self.stdout.write(f"  Project members found: {len(users)}")
            total_users += len(users)

            if dry_run:
                continue

            with transaction.atomic():
                membership_manager = getattr(Membership, "objects")
                for user in users.values():
                    m, was_created = membership_manager.get_or_create(
                        organisation=org,
                        user=user,
                        defaults={
                            "role": "member",
                            "is_active": True,
                        },
                    )
                    if was_created:
                        created += 1
                    elif not m.is_active:
                        m.is_active = True
                        m.save(update_fields=["is_active"])
                        activated += 1

        suffix = " (dry-run)" if dry_run else ""
        self.stdout.write(
            f"\n[OK]{suffix} users_scanned={total_users}"
            f" memberships_created={created}"
            f" memberships_activated={activated}"
        )
