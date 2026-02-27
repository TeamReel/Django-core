"""
Sync RBAC RoleAssignments for ALL existing ProjectMemberships.

Iterates every active ProjectMembership and ensures the corresponding
RoleAssignment exists in the permissions system.

Usage:
    python manage.py sync_all_rbac              # dry-run (default)
    python manage.py sync_all_rbac --apply      # actually create assignments
    python manage.py sync_all_rbac --apply --include-org   # also sync org memberships
"""

import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Sync RBAC RoleAssignments for all ProjectMemberships (and optionally OrgMemberships)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually create/update RoleAssignments (default is dry-run)",
        )
        parser.add_argument(
            "--include-org",
            action="store_true",
            help="Also sync Organisation memberships → Land Admin role",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        include_org = options["include_org"]

        self.stdout.write("=" * 70)
        self.stdout.write(
            f"SYNC ALL RBAC ROLE ASSIGNMENTS {'(DRY RUN)' if not apply else '(APPLYING)'}"
        )
        self.stdout.write("=" * 70)

        from projects.models import ProjectMembership

        stats = {
            "club_admin": 0,
            "team_admin": 0,
            "team_member": 0,
            "supporter": 0,
            "land_admin": 0,
            "skipped_superadmin": 0,
            "errors": 0,
        }

        # ── Project memberships ─────────────────────────────────────────
        memberships = (
            ProjectMembership.objects.filter(deleted_at__isnull=True)
            .select_related("user", "project", "project__parent_project")
            .order_by("project__name", "user__email")
        )

        total = memberships.count()
        self.stdout.write(f"\nFound {total} active ProjectMemberships")

        for pm in memberships:
            user = pm.user

            # Skip super admins
            if user.is_superuser:
                stats["skipped_superadmin"] += 1
                continue

            is_root = pm.project.parent_project_id is None
            role = str(pm.role).strip().lower()

            # Determine RBAC role name
            if role == "admin":
                rbac_name = "Club Admin" if is_root else "Team Admin"
                stat_key = "club_admin" if is_root else "team_admin"
            else:
                rbac_name = "Supporter" if is_root else "Team Member"
                stat_key = "supporter" if is_root else "team_member"

            self.stdout.write(
                f"  {'→' if apply else '○'} {user.email:45s} "
                f"membership={role:8s} project={pm.project.name:30s} "
                f"→ {rbac_name}"
            )

            if apply:
                try:
                    from permissions.sync import sync_rbac_for_membership

                    result = sync_rbac_for_membership(
                        user_id=user.id,
                        project_id=pm.project_id,
                        membership_role=pm.role,
                        actor=None,
                    )
                    if result:
                        stats[stat_key] += 1
                    else:
                        stats["errors"] += 1
                        self.stdout.write(self.style.WARNING("    ⚠ sync returned None"))
                except Exception as e:
                    stats["errors"] += 1
                    self.stdout.write(self.style.ERROR(f"    ✗ {e}"))
            else:
                stats[stat_key] += 1

        # ── Organisation memberships (optional) ─────────────────────────
        if include_org:
            from organisations.models import Membership as OrgMembership
            from permissions.models import Role, RoleAssignment, ScopeChoices

            org_memberships = OrgMembership.objects.filter(
                role="admin", is_active=True
            ).select_related("user", "organisation")

            self.stdout.write(f"\nFound {org_memberships.count()} org admin memberships")

            for om in org_memberships:
                if om.user.is_superuser:
                    stats["skipped_superadmin"] += 1
                    continue

                self.stdout.write(
                    f"  {'→' if apply else '○'} {om.user.email:45s} "
                    f"org_admin @ {om.organisation.name:20s} → Land Admin"
                )

                if apply:
                    try:
                        land_admin_role = Role.objects.filter(
                            name="Land Admin", scope=ScopeChoices.ORGANIZATION
                        ).first()
                        if not land_admin_role:
                            self.stdout.write(self.style.WARNING("    ⚠ Land Admin role not found"))
                            stats["errors"] += 1
                            continue

                        _assignment, created = RoleAssignment.objects.get_or_create(
                            user=om.user,
                            role=land_admin_role,
                            scope=ScopeChoices.ORGANIZATION,
                            target_organization=om.organisation,
                            defaults={"assigned_by": None},
                        )
                        if created:
                            stats["land_admin"] += 1
                        else:
                            self.stdout.write("    (already exists)")
                    except Exception as e:
                        stats["errors"] += 1
                        self.stdout.write(self.style.ERROR(f"    ✗ {e}"))
                else:
                    stats["land_admin"] += 1

        # ── Summary ─────────────────────────────────────────────────────
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(f"SYNC RESULTS {'(DRY RUN)' if not apply else '(APPLIED)'}")
        self.stdout.write("=" * 70)
        self.stdout.write(f"  Club Admin:     {stats['club_admin']}")
        self.stdout.write(f"  Team Admin:     {stats['team_admin']}")
        self.stdout.write(f"  Team Member:    {stats['team_member']}")
        self.stdout.write(f"  Supporter:      {stats['supporter']}")
        if include_org:
            self.stdout.write(f"  Land Admin:     {stats['land_admin']}")
        self.stdout.write(f"  Skipped (super): {stats['skipped_superadmin']}")
        self.stdout.write(f"  Errors:         {stats['errors']}")
        total_synced = sum(
            stats[k] for k in ["club_admin", "team_admin", "team_member", "supporter", "land_admin"]
        )
        self.stdout.write(f"  TOTAL:          {total_synced}")
        self.stdout.write("=" * 70)

        if not apply:
            self.stdout.write(
                self.style.WARNING("\n⚠ DRY RUN — no changes made. Add --apply to execute.")
            )
        else:
            self.stdout.write(self.style.SUCCESS(f"\n✅ {total_synced} RBAC assignments synced!"))
