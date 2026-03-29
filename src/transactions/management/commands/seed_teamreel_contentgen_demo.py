from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any, cast

from accounts.models import User
from activities.models import Activity, Period
from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models import Project, ProjectMembership
from transactions.exceptions import DuplicateIdempotencyKeyError
from transactions.models import SourceTypeChoices
from transactions.services import (
    create_transaction,
    create_transaction_with_routing,
    record_usage_event,
)


@dataclass(frozen=True)
class PlannedUsage:
    step: str
    event_type: str
    amount: Decimal
    payer_routing: str | None
    charged_user_mode: str  # "user" | "team" | "org"
    description: str
    metadata: dict


class Command(BaseCommand):
    help = (
        "Seed a small, TeamReel-flavored set of content-generation usage events + transactions "
        "for a specific org/team/user (idempotent)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--org", type=str, default="knvb", help="Organisation slug (default: knvb)"
        )
        parser.add_argument(
            "--user",
            type=str,
            default="coach@ajax1.demo",
            help="User email to charge/attribute (default: coach@ajax1.demo)",
        )
        parser.add_argument(
            "--club-name",
            type=str,
            default="Ajax",
            help="Club project name match (icontains) used to find the root club (default: Ajax)",
        )
        parser.add_argument(
            "--team-name",
            type=str,
            default="Ajax 1",
            help="Team project name match (icontains) used to find the team under the club (default: Ajax 1)",
        )
        parser.add_argument(
            "--team-id",
            type=int,
            default=0,
            help="Optional explicit team/project id (overrides --club-name/--team-name)",
        )
        parser.add_argument(
            "--season-id",
            type=str,
            default="",
            help="Optional explicit season Period UUID (root period under the team). If omitted, picks the most recent team season.",
        )
        parser.add_argument(
            "--matches",
            type=int,
            default=3,
            help="How many matches to seed content-generation usage for (default: 3)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be created without writing to the database",
        )

    def handle(self, *args, **options):
        org_slug: str = options["org"]
        user_email: str = options["user"]
        club_name: str = options["club_name"]
        team_name: str = options["team_name"]
        team_id: int = int(options.get("team_id") or 0)
        season_id_raw: str = str(options.get("season_id") or "").strip()
        matches_count: int = int(options.get("matches") or 0)
        dry_run: bool = bool(options.get("dry_run"))

        org = Organisation.objects.filter(slug=org_slug).first()
        if not org:
            self.stderr.write(f"Organisation '{org_slug}' not found")
            return

        user = User.objects.filter(email__iexact=user_email, is_active=True).first()
        if not user:
            self.stderr.write(f"User '{user_email}' not found or inactive")
            return

        club: Project | None = None
        team: Project | None = None

        if team_id:
            team = Project.objects.filter(
                id=team_id, organisation=org, archived_at__isnull=True
            ).first()
            if team and team.parent_project_id:
                club = team.parent_project
        else:
            club = (
                Project.objects.filter(
                    organisation=org,
                    parent_project__isnull=True,
                    archived_at__isnull=True,
                    name__icontains=club_name,
                )
                .order_by("id")
                .first()
            )
            if club:
                team = (
                    Project.objects.filter(
                        organisation=org,
                        parent_project=club,
                        archived_at__isnull=True,
                        name__icontains=team_name,
                    )
                    .order_by("id")
                    .first()
                )

        if not club:
            self.stderr.write(
                f"Club project not found for org '{org.slug}' using --club-name '{club_name}' (or via --team-id)"
            )
            return

        if not team:
            self.stderr.write(
                f"Team project not found under club '{club.name}' using --team-name '{team_name}' (or via --team-id)"
            )
            return

        self.stdout.write("\nTeamReel content-generation credits demo seed")
        self.stdout.write(f"Org:  {org.name} ({org.slug})")
        self.stdout.write(f"Club: {club.name} (id={club.id})")
        self.stdout.write(f"Team: {team.name} (id={team.id})")
        self.stdout.write(f"User: {user.email} (id={user.id})")

        is_member = ProjectMembership.objects.filter(user=user, project=team).exists()
        if not is_member:
            self.stdout.write(
                "! WARNING: user is not a member of the team. The API/UI may not show team transactions/balance for this user.\n"
                "  Consider running: python manage.py seed_team_manager_memberships --org knvb (or your membership seeders)."
            )

        prefix = f"demo:teamreel:contentgen:{org.slug}:{club.id}:{team.id}:{user.id}:v2"

        # Resolve a team-scoped season (root period for the team).
        season: Period | None
        if season_id_raw:
            season = Period.objects.filter(  # pyright: ignore[reportGeneralTypeIssues]
                id=season_id_raw, organisation=org, project=team
            ).first()
        else:
            seasons = list(
                Period.objects.filter(  # pyright: ignore[reportGeneralTypeIssues]
                    organisation=org, project=team, parent_period__isnull=True
                ).order_by("-start_date", "-created_at")
            )

            best_season: Period | None = None
            best_match_count = -1
            best_latest_match: datetime | None = None

            for candidate in seasons:
                descendant_ids = list(
                    Period.objects.get_descendants(
                        candidate.id
                    ).values_list(  # pyright: ignore[reportGeneralTypeIssues]
                        "id", flat=True
                    )
                )
                candidate_period_ids = [candidate.id, *descendant_ids]
                candidate_matches = cast(Any, Activity).objects.filter(
                    project=team,
                    activity_type__iexact="match",
                    period_id__in=candidate_period_ids,
                )
                count = int(candidate_matches.count())
                latest = (
                    candidate_matches.order_by("-start_time")
                    .values_list("start_time", flat=True)
                    .first()
                )

                if count > best_match_count:
                    best_season = candidate
                    best_match_count = count
                    best_latest_match = latest
                    continue

                if count == best_match_count and count > 0:
                    if (latest is not None) and (
                        best_latest_match is None or latest > best_latest_match
                    ):
                        best_season = candidate
                        best_latest_match = latest

            season = best_season

        if not season:
            self.stderr.write(
                "No team-scoped root season Period found for this team. "
                "This command expects TeamReel team-scoped seasons (Period.project=team, parent_period=NULL)."
            )
            return

        self.stdout.write(f"Season: {season.name} (id={season.id})")

        descendants = Period.objects.get_descendants(
            season.id
        )  # pyright: ignore[reportGeneralTypeIssues]
        period_ids = [season.id, *list(descendants.values_list("id", flat=True))]

        qs = cast(Any, Activity).objects.filter(
            project=team,
            activity_type__iexact="match",
            period_id__in=period_ids,
        )
        matches = list(qs.order_by("start_time")[: max(matches_count, 0)])
        self.stdout.write(f"Matches selected: {len(matches)} (requested {matches_count})")

        # Top-ups: keep modest; goal is UI visibility, not production accounting.
        topups = [
            ("topup:user", Decimal("25.00"), team, user, "Topup user wallet (coach)"),
            ("topup:team", Decimal("100.00"), team, None, "Topup team wallet (Ajax 1)"),
            ("topup:org", Decimal("250.00"), None, None, "Topup organisation wallet (KNVB)"),
        ]

        self.stdout.write("\n1) Top-ups")
        for key_suffix, amount, project, charged_user, notes in topups:
            self._maybe_create(
                idempotency_key=f"{prefix}:{key_suffix}",
                dry_run=dry_run,
                fn=lambda amount=amount, project=project, charged_user=charged_user, notes=notes, key_suffix=key_suffix: create_transaction(
                    organization=org,
                    project=project,
                    charged_user=charged_user,
                    amount=amount,
                    source_type=SourceTypeChoices.ADJUSTMENT,
                    created_by=user,
                    idempotency_key=f"{prefix}:{key_suffix}",
                    notes=f"TeamReel demo: {notes}",
                ),
            )

        # Season-level content generation usage (a couple of entries).
        season_plan: list[PlannedUsage] = [
            PlannedUsage(
                step="season:brand_guide",
                event_type="content_generation",
                amount=Decimal("-6.00"),
                payer_routing="explicit",  # team budget
                charged_user_mode="team",
                description="Season kickoff: brand & tone guide (team media pack)",
                metadata={
                    "feature": "season_kickoff_pack",
                    "output": "guide",
                    "model": "gpt-5.2",
                    "language": "nl",
                },
            ),
            PlannedUsage(
                step="season:sponsor_deck",
                event_type="content_generation",
                amount=Decimal("-9.00"),
                payer_routing="explicit",  # team budget
                charged_user_mode="team",
                description="Season kickoff: sponsor deck variants",
                metadata={
                    "feature": "sponsor_deck",
                    "output": "variants",
                    "count": 5,
                    "model": "gpt-5.2",
                    "language": "nl",
                },
            ),
        ]

        # Per-match content generation usage (a few entries per match).
        per_match_plan: list[PlannedUsage] = [
            PlannedUsage(
                step="match:report",
                event_type="content_generation",
                amount=Decimal("-3.00"),
                payer_routing=None,  # use org default routing (often user->team->org)
                charged_user_mode="user",
                description="Generate match report (post-match article)",
                metadata={
                    "feature": "match_report",
                    "output": "article",
                    "model": "gpt-5.2",
                    "language": "nl",
                    "length": "medium",
                },
            ),
            PlannedUsage(
                step="match:lineup_preview",
                event_type="content_generation",
                amount=Decimal("-2.00"),
                payer_routing=None,
                charged_user_mode="user",
                description="Generate lineup preview (coach notes)",
                metadata={
                    "feature": "lineup_preview",
                    "output": "notes",
                    "model": "gpt-5.2",
                    "language": "nl",
                },
            ),
            PlannedUsage(
                step="match:social_post",
                event_type="content_generation",
                amount=Decimal("-1.50"),
                payer_routing=None,
                charged_user_mode="user",
                description="Generate social post (Instagram caption)",
                metadata={
                    "feature": "social_post",
                    "channel": "instagram",
                    "output": "caption",
                    "model": "gpt-5.2",
                    "language": "nl",
                },
            ),
        ]

        self.stdout.write(
            "\n2) Season-level content generation usage (UsageEvent + debit transactions)"
        )
        for item in season_plan:
            step_key = item.step.replace(":", "_")
            event_key = f"{prefix}:evt:{step_key}:{season.id}"
            txn_key = f"{prefix}:txn:{step_key}:{season.id}"
            self._create_usage_txn(
                org=org,
                club=club,
                team=team,
                user=user,
                season=season,
                match=None,
                item=item,
                event_key=event_key,
                txn_key=txn_key,
                dry_run=dry_run,
            )

        self.stdout.write(
            "\n3) Per-match content generation usage (UsageEvent + debit transactions)"
        )
        if not matches:
            self.stdout.write(
                "  ! No matches found for this team/season selection; skipping per-match seeding"
            )
        for match in matches:
            for item in per_match_plan:
                step_key = item.step.replace(":", "_")
                event_key = f"{prefix}:evt:{step_key}:{match.id}"
                txn_key = f"{prefix}:txn:{step_key}:{match.id}"
                self._create_usage_txn(
                    org=org,
                    club=club,
                    team=team,
                    user=user,
                    season=season,
                    match=match,
                    item=item,
                    event_key=event_key,
                    txn_key=txn_key,
                    dry_run=dry_run,
                )

        self.stdout.write("\nDone.")
        self.stdout.write(
            "Frontend checks:\n"
            "- Team detail (Ajax 1): should show non-empty Balance + Transactions\n"
            "- User area (coach): should show 'Your Credits Balance' and usage debits\n"
            "- Org view (KNVB): org wallet topup should exist"
        )

    def _create_usage_txn(
        self,
        *,
        org: Organisation,
        club: Project,
        team: Project,
        user: User,
        season: Period,
        match: Activity | None,
        item: PlannedUsage,
        event_key: str,
        txn_key: str,
        dry_run: bool,
    ):
        if dry_run:
            label = f"season={season.id}" + (f" match={match.id}" if match else "")
            self.stdout.write(
                f"  · would create usage_event={event_key} and transaction={txn_key} amount={item.amount} ({item.description}) [{label}]"
            )
            return

        usage_metadata = {
            **(item.metadata or {}),
            "seed": "seed_teamreel_contentgen_demo",
            "organisation_slug": org.slug,
            "club_id": club.id,
            "team_id": team.id,
            "season_id": str(season.id),
            "season_name": season.name,
        }
        if match is not None:
            usage_metadata.update(
                {
                    "activity_id": str(match.id),
                    "activity_slug": match.slug,
                    "activity_title": match.title,
                    "activity_type": match.activity_type,
                    "start_time": match.start_time.isoformat(),
                    "period_id": str(match.period_id),
                    "opponent_project_id": match.opponent_project_id,
                }
            )

        usage_event = record_usage_event(
            event_type=item.event_type,
            user=user,
            organization=org,
            project=team,
            idempotency_key=event_key,
            metadata=usage_metadata,
        )

        charged_user = user if item.charged_user_mode == "user" else None
        project = None if item.charged_user_mode == "org" else team

        self._maybe_create(
            idempotency_key=txn_key,
            dry_run=dry_run,
            fn=lambda item=item, txn_key=txn_key, usage_event=usage_event, charged_user=charged_user, project=project: create_transaction_with_routing(
                organization=org,
                project=project,
                charged_user=charged_user,
                amount=item.amount,
                source_type=SourceTypeChoices.USAGE_EVENT,
                created_by=user,
                idempotency_key=txn_key,
                payer_routing=item.payer_routing,
                usage_event=usage_event,
                notes=f"TeamReel demo usage: {item.description}",
            ),
        )

    def _maybe_create(self, *, idempotency_key: str, dry_run: bool, fn):
        if dry_run:
            self.stdout.write(f"  · would create {idempotency_key}")
            return None

        try:
            txn = fn()
            self.stdout.write(
                f"  + created {idempotency_key} -> wallet_scope={txn.wallet_scope} project_id={txn.project_id} charged_user_id={txn.charged_user_id} amount={txn.amount}"
            )
            return txn
        except DuplicateIdempotencyKeyError:
            self.stdout.write(f"  ↻ exists {idempotency_key}")
            return None
