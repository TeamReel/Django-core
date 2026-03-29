"""Seed multi-team / multi-admin manager memberships for the demo.

Goal:
- One user can manage multiple teams.
- Multiple users can manage the same team.

Implementation:
- Creates ProjectMembership rows with role='admin' (access role) and period=NULL.
- Stores functional intent in metadata (character_role='coach'/'manager').
- Idempotent and safe to run multiple times.

Usage:
    $env:DATABASE_URL="postgresql://..."; python manage.py seed_team_manager_memberships --org knvb
    python manage.py seed_team_manager_memberships --org knvb --dry-run
"""

from __future__ import annotations

from dataclasses import dataclass

from accounts.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


@dataclass(frozen=True)
class ManagerSeedUser:
    email: str
    character_role: str


class Command(BaseCommand):
    help = (
        "Seed project admin memberships so users can manage"
        " multiple teams (and teams multiple admins)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--org",
            type=str,
            required=True,
            help="Organisation slug (e.g. knvb)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving to database",
        )
        parser.add_argument(
            "--limit-teams",
            type=int,
            default=0,
            help="Optionally limit number of teams processed (0 = all)",
        )

    def handle(self, *args, **options):
        org_slug: str = options["org"]
        dry_run: bool = bool(options["dry_run"])
        limit_teams: int = int(options["limit_teams"] or 0)

        org = Organisation.objects.filter(slug=org_slug).first()
        if not org:
            self.stdout.write(self.style.ERROR(f"❌ Organisation '{org_slug}' not found"))
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
            self.stdout.write(
                self.style.WARNING(f"⚠️  No teams found for organisation '{org.slug}'")
            )
            return

        # Prefer known demo users if present; otherwise fall back to any active users.
        preferred_users: list[ManagerSeedUser] = [
            ManagerSeedUser(email="admin@teamreel.demo", character_role="manager"),
            ManagerSeedUser(email="john.heitinga@ajax.nl", character_role="coach"),
            ManagerSeedUser(email="peter.bosz@psv.nl", character_role="coach"),
        ]

        candidate_users: list[tuple[User, str]] = []
        for pref in preferred_users:
            user = User.objects.filter(email__iexact=pref.email, is_active=True).first()
            if user:
                candidate_users.append((user, pref.character_role))

        if not candidate_users:
            fallback_users = list(User.objects.filter(is_active=True).order_by("id")[:5])
            candidate_users = [(u, "manager") for u in fallback_users]

        if not candidate_users:
            self.stdout.write(
                self.style.ERROR(
                    "❌ No active users available"
                    " to assign as managers"
                )
            )
            return

        primary_user, primary_role = candidate_users[0]

        self.stdout.write(self.style.SUCCESS("\n👥 Seeding Team Manager Memberships"))
        self.stdout.write(f"Organisation: {org.name} ({org.slug})")
        self.stdout.write(f"Teams: {len(teams)}")
        self.stdout.write(f"Primary manager: {primary_user.email}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no changes will be saved"))

        created = 0
        skipped = 0

        with transaction.atomic():
            # 1) Ensure primary manager is admin on ALL teams (one user manages multiple teams).
            for team in teams:
                if self._ensure_admin_membership(
                    user=primary_user,
                    team=team,
                    character_role=primary_role,
                    dry_run=dry_run,
                ):
                    created += 1
                else:
                    skipped += 1

            # 2) Ensure each team has a second admin (multiple users manage same team).
            rotating = list(candidate_users[1:]) or [(primary_user, primary_role)]
            rot_idx = 0
            for team in teams:
                user, char_role = rotating[rot_idx % len(rotating)]
                rot_idx += 1

                if user.id == primary_user.id:
                    continue

                if self._ensure_admin_membership(
                    user=user,
                    team=team,
                    character_role=char_role,
                    dry_run=dry_run,
                ):
                    created += 1
                else:
                    skipped += 1

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS(f"✅ Created {created} admin memberships"))
        self.stdout.write(f"⏭️  Skipped {skipped} existing admin memberships")
        self.stdout.write("=" * 60 + "\n")

    def _ensure_admin_membership(
        self,
        *,
        user: User,
        team: Project,
        character_role: str,
        dry_run: bool,
    ) -> bool:
        existing = ProjectMembership.objects.filter(
            user=user,
            project=team,
            period__isnull=True,
            role=ProjectMembership.Role.ADMIN,
            deleted_at__isnull=True,
        ).exists()

        if existing:
            return False

        if not dry_run:
            ProjectMembership.objects.create(
                user=user,
                project=team,
                period=None,
                role=ProjectMembership.Role.ADMIN,
                assignment_reason=ProjectMembership.AssignmentReason.MANUAL,
                metadata={"character_role": character_role},
            )

        self.stdout.write(f"  + {user.email} -> {team.name} (admin)")
        return True
