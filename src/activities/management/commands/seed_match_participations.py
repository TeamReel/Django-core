"""Seed Participation rows for match Activities.

Creates activity-level participations (lineups) for TeamReel demo data.

Key properties:
- Idempotent by default (only creates missing rows)
- Uses existing ProjectMemberships (period-scoped to the season)
- Ensures Participation.member is an organisations.Membership (creates it if missing)

Usage:
    python manage.py seed_match_participations --organisation knvb --season "Season 2024/2025"
    python manage.py seed_match_participations --organisation knvb --season "Season 2024/2025" --limit-matches 50
    python manage.py seed_match_participations --all --dry-run

Notes:
- Participation has unique constraint (member, activity), so each org member can appear once per match.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Optional

from activities.models import Activity, Participation, Period
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from organisations.models import Membership, Organisation
from projects.models import Project, ProjectMembership

DEFAULT_POSITIONS = [
    "GK",
    "LB",
    "CB",
    "CB",
    "RB",
    "DM",
    "CM",
    "AM",
    "LW",
    "ST",
    "RW",
]


@dataclass(frozen=True)
class SeedConfig:
    starters_per_team: int
    subs_per_team: int
    dry_run: bool
    limit_matches: Optional[int]
    seed: Optional[int]
    team_filter: Optional[str]


class Command(BaseCommand):
    help = "Seed activity-level Participation rows for match lineups"

    def add_arguments(self, parser):
        parser.add_argument(
            "--organisation",
            type=str,
            help="Organisation slug (e.g., knvb, dfb, figc). If omitted, use --all.",
        )
        parser.add_argument(
            "--season",
            type=str,
            help="Season name filter (e.g., 'Season 2024/2025').",
        )
        parser.add_argument(
            "--team",
            type=str,
            help="Filter matches involving a specific team name (e.g., 'Ajax 1').",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Seed participations for all organisations and seasons.",
        )
        parser.add_argument(
            "--starters",
            type=int,
            default=11,
            help="Starters per team per match (default: 11).",
        )
        parser.add_argument(
            "--subs",
            type=int,
            default=5,
            help="Substitutes per team per match (default: 5).",
        )
        parser.add_argument(
            "--limit-matches",
            type=int,
            default=None,
            help="Limit number of matches processed (useful for testing).",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=None,
            help="Random seed for deterministic selection.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview without creating records.",
        )

    def handle(self, *args, **options):
        cfg = SeedConfig(
            starters_per_team=max(0, int(options["starters"])),
            subs_per_team=max(0, int(options["subs"])),
            dry_run=bool(options["dry_run"]),
            limit_matches=options.get("limit_matches"),
            seed=options.get("seed"),
            team_filter=options.get("team"),
        )

        if cfg.seed is not None:
            random.seed(cfg.seed)

        if cfg.dry_run:
            self.stdout.write(self.style.WARNING("[DRY-RUN] No records will be created"))

        organisations = self._get_organisations(options)
        if not organisations:
            return

        season_filter = (options.get("season") or "").strip() or None

        total_matches = 0
        total_created = 0
        total_skipped_existing = 0
        total_missing_candidates = 0

        for org in organisations:
            self.stdout.write(f"\n[ORG] {org.name} ({org.slug})")

            seasons = Period.objects.filter(organisation=org, parent_period__isnull=True)
            if season_filter:
                seasons = seasons.filter(name__icontains=season_filter)
            seasons = list(seasons.order_by("start_date"))

            if not seasons:
                self.stdout.write(self.style.WARNING("  [!] No seasons found"))
                continue

            self.stdout.write(f"  [SEASONS] {len(seasons)}")

            for season in seasons:
                competitions = list(Period.objects.filter(parent_period=season).order_by("name"))
                if not competitions:
                    self.stdout.write(
                        self.style.WARNING(f"  [!] No competitions found for season: {season.name}")
                    )
                    continue

                self.stdout.write(f"\n  [SEASON] {season.name} (competitions: {len(competitions)})")

                matches_qs = (
                    Activity.objects.filter(
                        activity_type="match",
                        period__in=competitions,
                        project__organisation=org,
                    )
                    .select_related(
                        "project", "opponent_project", "period", "period__parent_period"
                    )
                    .order_by("start_time")
                )

                if cfg.team_filter:
                    # Filter matches where the project OR opponent_project matches the team name
                    matches_qs = matches_qs.filter(
                        Q(project__name__icontains=cfg.team_filter)
                        | Q(opponent_project__name__icontains=cfg.team_filter)
                    )

                if cfg.limit_matches:
                    matches_qs = matches_qs[: cfg.limit_matches]

                matches = list(matches_qs)
                if not matches:
                    self.stdout.write(self.style.WARNING("    [!] No matches found"))
                    continue

                self.stdout.write(f"    [MATCHES] {len(matches)}")

                for match in matches:
                    total_matches += 1
                    created, skipped, missing = self._seed_match(match, season, cfg)
                    total_created += created
                    total_skipped_existing += skipped
                    total_missing_candidates += missing

        self.stdout.write("\n" + "=" * 72)
        if cfg.dry_run:
            self.stdout.write(self.style.WARNING("[DRY-RUN] Complete"))
        self.stdout.write(
            self.style.SUCCESS(
                f"[OK] Matches processed: {total_matches} | Participations created: {total_created} | "
                f"Already existed: {total_skipped_existing} | Missing candidates: {total_missing_candidates}"
            )
        )

        if total_missing_candidates:
            self.stdout.write(
                self.style.WARNING(
                    "[WARN] Some matches could not be fully populated (not enough project memberships)."
                )
            )

    def _get_organisations(self, options) -> list[Organisation]:
        if options.get("all"):
            return list(Organisation.objects.all().order_by("name"))

        slug = (options.get("organisation") or "").strip()
        if not slug:
            self.stdout.write(self.style.ERROR("[X] Specify --organisation <slug> or --all"))
            return []

        try:
            return [Organisation.objects.get(slug=slug)]
        except Organisation.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"[X] Organisation '{slug}' not found"))
            return []

    def _seed_match(self, match: Activity, season: Period, cfg: SeedConfig) -> tuple[int, int, int]:
        """Returns (created, skipped_existing, missing_candidates)."""
        if not match.project_id or not match.opponent_project_id:
            return (0, 0, 0)

        home_team: Project = match.project
        away_team: Project = match.opponent_project

        existing_member_ids = set(
            Participation.objects.filter(activity=match).values_list("member_id", flat=True)
        )

        home_created, home_skipped, home_missing = self._seed_team_side(
            match=match,
            team=home_team,
            organisation_id=home_team.organisation_id,
            season=season,
            side="home",
            starters=cfg.starters_per_team,
            subs=cfg.subs_per_team,
            existing_member_ids=existing_member_ids,
            cfg=cfg,
        )

        away_created, away_skipped, away_missing = self._seed_team_side(
            match=match,
            team=away_team,
            organisation_id=away_team.organisation_id,
            season=season,
            side="away",
            starters=cfg.starters_per_team,
            subs=cfg.subs_per_team,
            existing_member_ids=existing_member_ids,
            cfg=cfg,
        )

        return (
            home_created + away_created,
            home_skipped + away_skipped,
            home_missing + away_missing,
        )

    def _seed_team_side(
        self,
        *,
        match: Activity,
        team: Project,
        organisation_id,
        season: Period,
        side: str,
        starters: int,
        subs: int,
        existing_member_ids: set,
        cfg: SeedConfig,
    ) -> tuple[int, int, int]:
        """Create participations for one team in one match."""
        desired = max(0, starters) + max(0, subs)
        if desired == 0:
            return (0, 0, 0)

        memberships = list(
            ProjectMembership.objects.active()
            .filter(project=team, period=season)
            .select_related("user")
        )

        if not memberships:
            return (0, 0, desired)

        random.shuffle(memberships)

        # Allocate jersey numbers uniquely per side for this match.
        available_numbers = list(range(1, 100))
        random.shuffle(available_numbers)
        used_numbers: set[int] = set()

        created = 0
        skipped = 0
        added = 0

        def role_for_index(i: int) -> str:
            return "starter" if i < starters else "substitute"

        positions = list(DEFAULT_POSITIONS)
        random.shuffle(positions)

        with transaction.atomic():
            for project_membership in memberships:
                if added >= desired:
                    break

                user = project_membership.user
                org_member, _ = Membership.objects.get_or_create(
                    user=user,
                    organisation_id=organisation_id,
                    defaults={"role": "member", "is_active": True},
                )

                # If this org member already participates in this match, skip and try next.
                if org_member.id in existing_member_ids:
                    skipped += 1
                    continue

                i = added

                jersey_number = self._membership_jersey_number(project_membership)
                if jersey_number is not None and jersey_number in used_numbers:
                    jersey_number = None
                if jersey_number is None:
                    while available_numbers and available_numbers[-1] in used_numbers:
                        available_numbers.pop()
                    jersey_number = available_numbers.pop() if available_numbers else None
                if jersey_number is not None:
                    used_numbers.add(jersey_number)

                position = self._membership_position(project_membership)
                if position is None:
                    position = (
                        positions[i] if i < len(positions) else random.choice(DEFAULT_POSITIONS)
                    )

                is_captain = i == 0 and role_for_index(i) == "starter"

                data = {
                    "side": side,
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "jersey_number": jersey_number,
                    "position": position,
                    "is_captain": is_captain,
                }

                if cfg.dry_run:
                    created += 1
                    existing_member_ids.add(org_member.id)
                    added += 1
                    continue

                _, was_created = Participation.objects.get_or_create(
                    activity=match,
                    member=org_member,
                    defaults={
                        "role": role_for_index(i),
                        "status": "confirmed",
                        "data": data,
                        "notes": "",
                    },
                )

                # Either way, this member is now considered "filled" for this match.
                if was_created:
                    created += 1
                else:
                    skipped += 1

                existing_member_ids.add(org_member.id)
                added += 1

            if cfg.dry_run:
                # Avoid holding a transaction open in dry-run.
                transaction.set_rollback(True)

        missing = max(0, desired - added)
        return (created, skipped, missing)

    def _membership_jersey_number(self, membership: ProjectMembership) -> Optional[int]:
        md = membership.metadata or {}
        for key in ("shirt_number", "jersey_number", "number"):
            val = md.get(key)
            if val is None:
                continue
            try:
                num = int(val)
                if 0 < num < 1000:
                    return num
            except (TypeError, ValueError):
                continue
        return None

    def _membership_position(self, membership: ProjectMembership) -> Optional[str]:
        md = membership.metadata or {}
        val = md.get("position")
        if isinstance(val, str) and val.strip():
            return val.strip()
        return None
