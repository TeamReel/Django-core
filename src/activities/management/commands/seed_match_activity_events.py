"""Seed ActivityEvent rows for match Activities.

This complements Participation (who played) with events (what happened):
- goals (with optional assist via related_member)
- injuries
- substitutions

Designed to align with planned B30/B32 work:
- Generic event model: activities.ActivityEvent
- Sport-specific vocab/validation can be layered later via B32

Usage:
    python manage.py seed_match_activity_events --organisation knvb --season "Season 2024/2025"
    python manage.py seed_match_activity_events \
        --organisation knvb --season "Season 2024/2025" \
        --limit-matches 50 --dry-run
    python manage.py seed_match_activity_events --all --force
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Optional

from activities.models import Activity, ActivityEvent, Participation, Period
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from organisations.models import Organisation


@dataclass(frozen=True)
class SeedConfig:
    dry_run: bool
    limit_matches: Optional[int]
    seed: Optional[int]
    force: bool
    team_filter: Optional[str]


class Command(BaseCommand):
    help = "Seed ActivityEvent rows for match activities (goals/assists/injuries/subs)"

    def add_arguments(self, parser):
        parser.add_argument("--organisation", type=str, help="Organisation slug (e.g., knvb)")
        parser.add_argument(
            "--season", type=str, help="Season name filter (e.g., 'Season 2024/2025')"
        )
        parser.add_argument(
            "--team",
            type=str,
            help="Filter matches involving a specific team name (e.g., 'Ajax 1').",
        )
        parser.add_argument(
            "--all", action="store_true", help="Run for all organisations and seasons"
        )
        parser.add_argument(
            "--limit-matches", type=int, default=None, help="Limit number of matches processed"
        )
        parser.add_argument(
            "--seed", type=int, default=None, help="Random seed for deterministic output"
        )
        parser.add_argument(
            "--force", action="store_true", help="Delete existing events for a match before seeding"
        )
        parser.add_argument(
            "--dry-run", action="store_true", help="Preview without creating records"
        )

    def handle(self, *args, **options):
        cfg = SeedConfig(
            dry_run=bool(options["dry_run"]),
            limit_matches=options.get("limit_matches"),
            seed=options.get("seed"),
            force=bool(options.get("force")),
            team_filter=options.get("team"),
        )

        if cfg.seed is not None:
            random.seed(cfg.seed)

        if cfg.dry_run:
            self.stdout.write(self.style.WARNING("[DRY-RUN] No records will be created"))

        organisations = self._get_organisations(options)
        season_filter = (options.get("season") or "").strip() or None

        total_matches = 0
        total_created = 0
        total_skipped = 0

        for org in organisations:
            self.stdout.write(f"\n[ORG] {org.name} ({org.slug})")

            seasons = Period.objects.filter(organisation=org, parent_period__isnull=True)
            if season_filter:
                seasons = seasons.filter(name__icontains=season_filter)
            seasons = list(seasons.order_by("start_date"))

            if not seasons:
                self.stdout.write(self.style.WARNING("  [!] No seasons found"))
                continue

            for season in seasons:
                competitions = list(Period.objects.filter(parent_period=season))
                if not competitions:
                    continue

                matches_qs = (
                    Activity.objects.filter(
                        activity_type="match",
                        period__in=competitions,
                        project__organisation=org,
                    )
                    .select_related("project", "opponent_project", "period")
                    .order_by("start_time")
                )

                if cfg.team_filter:
                    matches_qs = matches_qs.filter(
                        Q(project__name__icontains=cfg.team_filter)
                        | Q(opponent_project__name__icontains=cfg.team_filter)
                    )

                if cfg.limit_matches:
                    matches_qs = matches_qs[: cfg.limit_matches]

                matches = list(matches_qs)
                if not matches:
                    continue

                self.stdout.write(f"  [SEASON] {season.name} (matches: {len(matches)})")

                for match in matches:
                    total_matches += 1
                    created, skipped = self._seed_match(match, cfg)
                    total_created += created
                    total_skipped += skipped

        self.stdout.write("\n" + "=" * 72)
        if cfg.dry_run:
            self.stdout.write(self.style.WARNING("[DRY-RUN] Complete"))
        self.stdout.write(
            self.style.SUCCESS(
                f"[OK] Matches processed: {total_matches}"
                f" | Events created: {total_created}"
                f" | Matches skipped: {total_skipped}"
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

    def _seed_match(self, match: Activity, cfg: SeedConfig) -> tuple[int, int]:
        """Return (created_events, skipped_match)."""
        if not match.project_id or not match.opponent_project_id:
            return (0, 0)

        existing_events = ActivityEvent.objects.filter(activity=match)
        if existing_events.exists() and not cfg.force:
            return (0, 1)

        # Prefer participations from our lineup seeder (they contain data.side)
        home_starters = list(
            Participation.objects.filter(
                activity=match, role="starter", data__side="home"
            ).select_related("member__user")
        )
        away_starters = list(
            Participation.objects.filter(
                activity=match, role="starter", data__side="away"
            ).select_related("member__user")
        )
        home_subs = list(
            Participation.objects.filter(
                activity=match, role="substitute", data__side="home"
            ).select_related("member__user")
        )
        away_subs = list(
            Participation.objects.filter(
                activity=match, role="substitute", data__side="away"
            ).select_related("member__user")
        )

        # Fallback if side isn't present (older data): split by project
        # memberships is not possible here, so just treat all starters
        # as eligible.
        if not home_starters and not away_starters:
            all_starters = list(
                Participation.objects.filter(activity=match, role="starter").select_related(
                    "member__user"
                )
            )
            half = len(all_starters) // 2
            home_starters = all_starters[:half]
            away_starters = all_starters[half:]

        if cfg.dry_run:
            # Simulate count without writes.
            goal_home = random.randint(0, 4)
            goal_away = random.randint(0, 4)
            injuries = random.randint(0, 1)
            subs = injuries
            return (goal_home + goal_away + injuries + subs, 0)

        with transaction.atomic():
            if cfg.force:
                existing_events.delete()

            created = 0

            # Goals + optional assists
            goals_home = random.randint(0, 4)
            goals_away = random.randint(0, 4)

            created += self._create_goals(
                match=match,
                team_project_id=match.project_id,
                starters=home_starters,
                goals=goals_home,
            )
            created += self._create_goals(
                match=match,
                team_project_id=match.opponent_project_id,
                starters=away_starters,
                goals=goals_away,
            )

            # Injury + substitution (basic)
            created += self._create_injury_and_subs(
                match=match,
                team_project_id=match.project_id,
                starters=home_starters,
                subs=home_subs,
            )
            created += self._create_injury_and_subs(
                match=match,
                team_project_id=match.opponent_project_id,
                starters=away_starters,
                subs=away_subs,
            )

            # Store a simple derived score summary on the activity
            match.metadata = match.metadata or {}
            match.metadata["score"] = {"home": goals_home, "away": goals_away}
            match.metadata.setdefault("status", "finished")
            match.metadata["events_seeded"] = True
            match.save(update_fields=["metadata"])

            return (created, 0)

    def _create_goals(
        self, *, match: Activity, team_project_id: int, starters: list[Participation], goals: int
    ) -> int:
        if goals <= 0 or not starters:
            return 0

        created = 0
        for _ in range(goals):
            scorer = random.choice(starters)
            assist = None
            if len(starters) > 1 and random.random() < 0.55:
                assist = random.choice([p for p in starters if p.member_id != scorer.member_id])

            minute = random.randint(1, 90)
            _, was_created = ActivityEvent.objects.get_or_create(
                activity=match,
                event_type="goal",
                minute=minute,
                member_id=scorer.member_id,
                related_member_id=(assist.member_id if assist else None),
                team_project_id=team_project_id,
                defaults={"data": {"kind": "regular"}},
            )
            if was_created:
                created += 1
        return created

    def _create_injury_and_subs(
        self,
        *,
        match: Activity,
        team_project_id: int,
        starters: list[Participation],
        subs: list[Participation],
    ) -> int:
        if not starters:
            return 0

        # 0 or 1 injury per team per match (demo-realistic)
        if random.random() > 0.18:
            return 0

        injured = random.choice(starters)
        minute = random.randint(5, 85)

        created = 0
        _, was_created = ActivityEvent.objects.get_or_create(
            activity=match,
            event_type="injury",
            minute=minute,
            member_id=injured.member_id,
            team_project_id=team_project_id,
            defaults={"data": {"severity": random.choice(["minor", "medium", "major"])}},
        )
        if was_created:
            created += 1

        # If we have subs, do a substitution event to replace injured
        if subs:
            player_in = random.choice(subs)
            _, was_created = ActivityEvent.objects.get_or_create(
                activity=match,
                event_type="substitution",
                minute=min(90, minute + random.randint(0, 3)),
                member_id=injured.member_id,
                related_member_id=player_in.member_id,
                team_project_id=team_project_id,
                defaults={
                    "data": {
                        "player_out": str(injured.member_id),
                        "player_in": str(player_in.member_id),
                    }
                },
            )
            if was_created:
                created += 1

        return created
