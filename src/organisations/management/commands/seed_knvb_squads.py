"""
Seed KNVB squads for the TeamReel demo.

Creates ProjectMembership records linking users to teams for an org-wide Season Period.
This is designed to populate the demo UI (Users tab, and as a prerequisite for match seeding).

Prerequisites:
- A KNVB Organisation exists (slug: knvb)
- An org-wide Season Period exists for KNVB
  (Period.organisation=KNVB, parent_period=NULL, project=NULL)
  (Typically created via: python manage.py seed_level_5_seasons)

Usage:
  python manage.py seed_knvb_squads --season "Season 2024/2025"
  python manage.py seed_knvb_squads --season "Season 2024/2025" --players 18
  python manage.py seed_knvb_squads --dry-run

Notes:
- Idempotent per-team per-season: if a team already has memberships for the season, it is skipped.
- Creates 1 admin + 1 editor + N players per team.
"""

from __future__ import annotations

import random
from typing import Optional

from accounts.models import User
from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from faker import Faker
from organisations.models import Membership, Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed KNVB team squads into an org-wide season (players + staff)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--season",
            type=str,
            default="Season 2024/2025",
            help='Season name (root period). Default: "Season 2024/2025"',
        )
        parser.add_argument(
            "--players",
            type=int,
            default=18,
            help="Players per team (viewer role). Default: 18",
        )
        parser.add_argument(
            "--limit-teams",
            type=int,
            default=None,
            help="Optional: only seed the first N matching teams (for quick demos)",
        )
        parser.add_argument(
            "--include-youth",
            action="store_true",
            help="Also seed youth teams (Jong/O21/etc). Default is first teams only.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview without writing to the database",
        )

    def handle(self, *args, **options):
        _args = args
        dry_run: bool = options["dry_run"]
        season_name: str = options["season"]
        players_per_team: int = max(1, int(options["players"]))
        limit_teams: Optional[int] = options.get("limit_teams")
        include_youth: bool = bool(options.get("include_youth"))

        fake = Faker()

        try:
            org = Organisation.objects.get(slug="knvb")
        except Organisation.DoesNotExist:
            self.stdout.write(self.style.ERROR("[X] Organisation 'knvb' not found"))
            return

        season = (
            Period.objects.filter(
                organisation=org,
                parent_period__isnull=True,
                project__isnull=True,
                name=season_name,
            )
            .order_by("start_date")
            .first()
        )

        if not season:
            self.stdout.write(
                self.style.ERROR(
                    f"[X] Season not found: org=knvb, name='{season_name}' (root, org-wide)"
                )
            )
            self.stdout.write("    Create it first with: python manage.py seed_level_5_seasons")
            return

        # Team selection
        # Default: first teams (suffix ' 1')
        teams_qs = Project.objects.filter(
            organisation=org, parent_project__isnull=False, is_active=True
        )

        if include_youth:
            # First teams + youth keywords
            youth_keywords = ["o21", "jong", "u21", "youth", "jeugd", "primavera"]
            youth_q = Q()
            for kw in youth_keywords:
                youth_q |= Q(name__icontains=kw)
            teams_qs = teams_qs.filter(Q(name__endswith=" 1") | youth_q)
        else:
            teams_qs = teams_qs.filter(name__endswith=" 1")

        teams_qs = teams_qs.select_related("parent_project").order_by("name")
        if limit_teams:
            teams_qs = teams_qs[: int(limit_teams)]

        teams = list(teams_qs)
        if not teams:
            self.stdout.write(
                self.style.WARNING(
                    "[!] No teams matched. If your dataset doesn't"
                    " use ' 1' suffix, rerun with"
                    " --include-youth or adjust naming."
                )
            )
            return

        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY-RUN] No records will be created"))

        self.stdout.write(f"[ORG] {org.name} ({org.slug})")
        self.stdout.write(f"[SEASON] {season.name}")
        self.stdout.write(f"[TEAM] Seeding {len(teams)} team(s)")

        total_users_created = 0
        total_memberships_created = 0
        total_teams_skipped = 0

        positions = ["Goalkeeper", "Defender", "Midfielder", "Forward"]

        with transaction.atomic():
            for team in teams:
                existing_memberships = ProjectMembership.objects.filter(
                    project=team, period=season
                ).count()
                if existing_memberships > 0:
                    # Team already seeded for this season. Still ensure
                    # Organisation Memberships exist
                    # for all existing squad users so they can be
                    # used in match participations.
                    if not dry_run:
                        existing_users = User.objects.filter(
                            project_memberships__project=team,
                            project_memberships__period=season,
                            project_memberships__deleted_at__isnull=True,
                        ).distinct()
                        for u in existing_users:
                            m, _ = Membership.objects.get_or_create(
                                organisation=team.organisation,
                                user=u,
                                defaults={
                                    "role": "member",
                                    "is_active": True,
                                },
                            )
                            if not m.is_active:
                                m.is_active = True
                                m.save(update_fields=["is_active"])

                    total_teams_skipped += 1
                    continue

                club = team.parent_project
                club_slug = (club.slug or str(club.id)) if club else "club"
                team_slug = team.slug or str(team.id)

                # Staff
                staff_specs = [
                    ("admin", f"{team_slug}-coach@teamreel.demo", f"{team_slug}_coach", "Coach"),
                    (
                        "editor",
                        f"{team_slug}-assistant@teamreel.demo",
                        f"{team_slug}_assistant",
                        "Assistant Coach",
                    ),
                ]

                created_this_team = 0

                for role, email, username, function in staff_specs:
                    user, user_created = self._get_or_create_user(
                        email=email,
                        username=username,
                        first_name=fake.first_name(),
                        last_name=fake.last_name(),
                        dry_run=dry_run,
                    )
                    if user_created:
                        total_users_created += 1

                    if not dry_run:
                        # Ensure organisation-level membership exists
                        # (required for lineups/participations)
                        m, _ = Membership.objects.get_or_create(
                            organisation=team.organisation,
                            user=user,
                            defaults={
                                "role": "member",
                                "is_active": True,
                            },
                        )
                        if not m.is_active:
                            m.is_active = True
                            m.save(update_fields=["is_active"])

                        _, membership_created = ProjectMembership.objects.get_or_create(
                            project=team,
                            user=user,
                            period=season,
                            role=role,
                            defaults={
                                "metadata": {
                                    "function": function,
                                    "team": team.name,
                                    "club": club.name if club else "",
                                    "club_slug": club_slug,
                                }
                            },
                        )
                        if membership_created:
                            total_memberships_created += 1
                            created_this_team += 1
                    else:
                        total_memberships_created += 1
                        created_this_team += 1

                # Players
                shirt_numbers = random.sample(range(1, 100), k=min(players_per_team, 99))
                for i in range(players_per_team):
                    email = f"{team_slug}-player{i+1}@teamreel.demo"
                    username = f"{team_slug}_player{i+1}"

                    user, user_created = self._get_or_create_user(
                        email=email,
                        username=username,
                        first_name=fake.first_name(),
                        last_name=fake.last_name(),
                        dry_run=dry_run,
                    )
                    if user_created:
                        total_users_created += 1

                    position = self._pick_position(i, positions)
                    shirt_number = shirt_numbers[i] if i < len(shirt_numbers) else None

                    if not dry_run:
                        # Ensure organisation-level membership exists
                        # (required for lineups/participations)
                        m, _ = Membership.objects.get_or_create(
                            organisation=team.organisation,
                            user=user,
                            defaults={
                                "role": "member",
                                "is_active": True,
                            },
                        )
                        if not m.is_active:
                            m.is_active = True
                            m.save(update_fields=["is_active"])

                        _, membership_created = ProjectMembership.objects.get_or_create(
                            project=team,
                            user=user,
                            period=season,
                            role="viewer",
                            defaults={
                                "metadata": {
                                    "position": position,
                                    "shirt_number": shirt_number,
                                    "team": team.name,
                                    "club": club.name if club else "",
                                    "club_slug": club_slug,
                                }
                            },
                        )
                        if membership_created:
                            total_memberships_created += 1
                            created_this_team += 1
                    else:
                        total_memberships_created += 1
                        created_this_team += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"[+] {team.name}: created"
                        f" {created_this_team} memberships"
                        f" (season: {season.name})"
                    )
                )

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS(f"[OK] Seeded KNVB squads for season '{season.name}'"))
        self.stdout.write(f"Teams skipped (already had memberships): {total_teams_skipped}")
        self.stdout.write(f"New users created: {total_users_created}")
        self.stdout.write(f"New memberships created: {total_memberships_created}")
        self.stdout.write("=" * 70)

    def _get_or_create_user(
        self,
        *,
        email: str,
        username: str,
        first_name: str,
        last_name: str,
        dry_run: bool,
    ):
        existing = User.objects.filter(email=email).first()
        if existing:
            return existing, False

        if dry_run:
            # Return a dummy existing user-like object?
            # We still need a real object reference for membership.
            # For dry run, we avoid creating memberships via ORM,
            # so we can safely return None.
            return (
                User(email=email, username=username, first_name=first_name, last_name=last_name),
                True,
            )

        user = User.objects.create_user(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            is_active=True,
        )
        # Demo password for seeded users
        user.set_password("demo123")
        user.save(update_fields=["password"])
        return user, True

    def _pick_position(self, idx: int, positions: list[str]) -> str:
        # Rough distribution: 2 GK, 6 DEF, 6 MID, rest FW
        if idx < 2:
            return positions[0]
        if idx < 8:
            return positions[1]
        if idx < 14:
            return positions[2]
        return positions[3]
