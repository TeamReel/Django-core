from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils import timezone
from notifications.models import Notification, NotificationType, RetryPolicy
from projects.models import Project, ProjectMembership

User = get_user_model()


@dataclass(frozen=True)
class SeedNotification:
    event_type: str
    title: str
    message: str
    level: str
    link_url: str | None = None
    mark_read: bool = False
    age: timedelta = timedelta(hours=0)


class Command(BaseCommand):
    help = (
        "Seed TeamReel in-app notifications (idempotent). "
        "Creates many notifications for ajax-1 team users (Option C) "
        "and a small baseline for all other users (Option A)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--team-slug",
            default="ajax-1",
            help="Team project slug to seed notifications for (default: ajax-1).",
        )
        parser.add_argument(
            "--org-slug",
            default=None,
            help="Optional organisation slug to disambiguate the team project.",
        )
        parser.add_argument(
            "--club-slug",
            default=None,
            help="Optional club (parent project) slug to disambiguate"
            " the team project (e.g. ajax).",
        )
        parser.add_argument(
            "--ajax-count",
            type=int,
            default=50,
            help="How many notifications to seed per ajax-1 user (Option C).",
        )
        parser.add_argument(
            "--others-count",
            type=int,
            default=2,
            help="How many notifications to seed per non-ajax-1 user (Option A).",
        )
        parser.add_argument(
            "--days-span",
            type=int,
            default=14,
            help="Backdate notifications across this many days.",
        )
        parser.add_argument(
            "--seed-version",
            default="v2",
            help="Seed version string used for idempotency keys (change to generate a new set).",
        )
        parser.add_argument(
            "--unread-ratio-ajax",
            type=float,
            default=0.35,
            help="Fraction of ajax-1 notifications to leave unread (0..1).",
        )
        parser.add_argument(
            "--unread-ratio-others",
            type=float,
            default=0.30,
            help="Fraction of baseline notifications to leave unread (0..1).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be created without writing to the database.",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        team_slug: str = options["team_slug"]
        org_slug: str | None = options.get("org_slug")
        club_slug: str | None = options.get("club_slug")
        ajax_count: int = int(options["ajax_count"])
        others_count: int = int(options["others_count"])
        days_span: int = int(options["days_span"])
        seed_version: str = str(options["seed_version"] or "v2").strip() or "v2"
        unread_ratio_ajax: float = float(options["unread_ratio_ajax"])
        unread_ratio_others: float = float(options["unread_ratio_others"])
        dry_run: bool = bool(options["dry_run"])

        if ajax_count < 1:
            raise CommandError("--ajax-count must be >= 1")
        if others_count < 0:
            raise CommandError("--others-count must be >= 0")
        if days_span < 1:
            raise CommandError("--days-span must be >= 1")
        if not (0.0 <= unread_ratio_ajax <= 1.0):
            raise CommandError("--unread-ratio-ajax must be between 0 and 1")
        if not (0.0 <= unread_ratio_others <= 1.0):
            raise CommandError("--unread-ratio-others must be between 0 and 1")

        team_qs = Project.all_objects.filter(slug=team_slug)
        if org_slug:
            team_qs = team_qs.filter(organisation__slug=org_slug)
        if club_slug:
            team_qs = team_qs.filter(parent_project__slug=club_slug)

        team = team_qs.select_related("organisation", "parent_project").first()
        if not team:
            raise CommandError(
                f"Could not find team project with slug='{team_slug}'"
                + (f" in organisation '{org_slug}'" if org_slug else "")
            )

        organisation = team.organisation
        club = team.parent_project

        team_url = (
            f"/organisations/{organisation.slug}/projects/{club.slug}/teams/{team.slug}"
            if club
            else f"/organisations/{organisation.slug}/projects/{team.slug}"
        )

        memberships = (
            ProjectMembership.objects.active()
            .filter(project=team)
            .select_related("user")
            .order_by("created_at")
        )

        ajax_users: list[User] = []
        seen_user_ids = set()
        for m in memberships:
            if not m.user_id or m.user_id in seen_user_ids:
                continue
            ajax_users.append(m.user)
            seen_user_ids.add(m.user_id)

        if not ajax_users:
            self.stdout.write(
                self.style.WARNING(f"No active members found for team '{team.slug}'.")
            )
            return

        other_users = (
            User.objects.filter(is_active=True)
            .exclude(id__in=[u.id for u in ajax_users])
            .order_by("id")
        )

        retry_policy = RetryPolicy.objects.first()
        if not retry_policy and not dry_run:
            retry_policy = RetryPolicy.objects.create(
                name="No Retry",
                max_attempts=1,
                retry_window_seconds=0,
                initial_delay_seconds=0,
                backoff_strategy="linear",
                backoff_multiplier=1.0,
            )

        notification_type: NotificationType | None
        if dry_run:
            notification_type = NotificationType.objects.filter(code="teamreel_event").first()
        else:
            notification_type, _ = NotificationType.objects.get_or_create(
                code="teamreel_event",
                defaults={
                    "name": "TeamReel Event",
                    "description": "Demo notifications for TeamReel user experience.",
                    "default_channel": "in_app",
                    "retry_policy": retry_policy,
                },
            )

        now = timezone.now()
        base_events: list[SeedNotification] = [
            SeedNotification(
                event_type="team_welcome",
                title=f"Welkom bij {team.name}",
                message=(
                    f"Je bent toegevoegd aan {team.name}."
                    " Check je team, roles en aankomende wedstrijden."
                ),
                level="success",
                link_url=team_url,
                mark_read=True,
                age=timedelta(days=3),
            ),
            SeedNotification(
                event_type="schedule_updated",
                title="Wedstrijdschema geüpdatet",
                message=(
                    f"Er zijn nieuwe wedstrijden toegevoegd"
                    f" voor {team.name}."
                ),
                level="info",
                link_url=team_url,
                mark_read=True,
                age=timedelta(days=2, hours=4),
            ),
            SeedNotification(
                event_type="lineup_due",
                title="Line-up nog niet compleet",
                message=(
                    "Er ontbreken nog spelers in de opstelling."
                    " Vul dit aan vóór de wedstrijddag."
                ),
                level="warning",
                link_url=team_url,
                age=timedelta(days=1, hours=6),
            ),
            SeedNotification(
                event_type="credits_used",
                title="Credits gebruikt",
                message=(
                    "Er is een transactie aangemaakt voor een wedstrijdactie."
                    " Check je saldo en usage events."
                ),
                level="info",
                link_url="/credits",
                age=timedelta(hours=18),
            ),
            SeedNotification(
                event_type="ai_content_ready",
                title="AI content concept klaar",
                message=(
                    "Er staat een concept klaar in AI Studio."
                    " Review en publiceer wanneer je wilt."
                ),
                level="success",
                link_url="/studio/create",
                age=timedelta(hours=6),
            ),
            SeedNotification(
                event_type="member_role_changed",
                title="Rol bijgewerkt",
                message="Een teamrol is gewijzigd. Controleer of je toegang nog klopt.",
                level="info",
                link_url=team_url,
                age=timedelta(hours=2),
            ),
            SeedNotification(
                event_type="match_scheduled",
                title="Nieuwe wedstrijd ingepland",
                message=(
                    "Er is een nieuwe wedstrijd toegevoegd."
                    " Check datum, locatie en beschikbaarheid."
                ),
                level="info",
                link_url=team_url,
                age=timedelta(days=6),
            ),
            SeedNotification(
                event_type="match_time_changed",
                title="Wedstrijd tijd gewijzigd",
                message="De aftraptijd is aangepast. Controleer je planning en opstelling.",
                level="warning",
                link_url=team_url,
                age=timedelta(days=5, hours=3),
            ),
            SeedNotification(
                event_type="txn_created",
                title="Transactie aangemaakt",
                message=(
                    "Er is een nieuwe transactie geregistreerd voor team-usage."
                    " Bekijk details in Credits/Usage Events."
                ),
                level="info",
                link_url="/usage-events",
                age=timedelta(days=4, hours=2),
            ),
            SeedNotification(
                event_type="permission_hint",
                title="Toegang & Rollen",
                message=(
                    "Tip: controleer rollen per club en team in Permissions."
                    " Dit bepaalt wat je kan zien/bewerken."
                ),
                level="info",
                link_url="/permissions",
                age=timedelta(days=7),
            ),
        ]

        # Prefetch existing seed keys in bulk to keep this command fast.
        existing_keys_by_user_id: dict[int, set[str]] = defaultdict(set)
        if connection.vendor == "postgresql":
            existing_rows = Notification.objects.filter(
                channel="in_app",
                metadata__seed_version=seed_version,
                metadata__seed_key__contains=f"teamreel:{seed_version}:",
            ).values("recipient_user_id", "metadata")
        else:
            existing_rows = Notification.objects.filter(
                channel="in_app",
            ).values("recipient_user_id", "metadata")

        for row in existing_rows.iterator():
            user_id = row.get("recipient_user_id")
            if not user_id:
                continue
            metadata = row.get("metadata") or {}
            seed_key = metadata.get("seed_key")
            if not seed_key:
                continue
            if connection.vendor != "postgresql":
                if metadata.get("seed_version") != seed_version:
                    continue
                if not str(seed_key).startswith(f"teamreel:{seed_version}:"):
                    continue
            existing_keys_by_user_id[int(user_id)].add(str(seed_key))

        def _create_notification(
            *,
            user: User,
            seed_key: str,
            event: SeedNotification,
            created_at,
            mark_read: bool,
        ) -> bool:
            if seed_key in existing_keys_by_user_id.get(int(user.id), set()):
                return False
            if dry_run:
                return True

            read_at = created_at + timedelta(minutes=10) if mark_read else None

            notif = Notification.objects.create(
                type=notification_type,
                channel="in_app",
                recipient=str(user.id),
                recipient_user=user,
                payload={
                    "title": event.title,
                    "message": event.message,
                    "body": event.message,
                    "link_url": event.link_url,
                },
                metadata={
                    "level": event.level,
                    "event_type": event.event_type,
                    "seed_key": seed_key,
                    "seed_version": seed_version,
                    "team_slug": team.slug,
                    "club_slug": club.slug if club else None,
                    "org_slug": organisation.slug,
                },
                status="sent",
                read_at=read_at,
            )

            Notification.objects.filter(pk=notif.pk).update(created_at=created_at)
            existing_keys_by_user_id[int(user.id)].add(seed_key)
            return True

        created = 0
        skipped = 0

        with transaction.atomic():
            # Option C: lots of notifications for ajax team users
            for user in ajax_users:
                rnd = random.Random(f"teamreel:{seed_version}:{team.slug}:{user.id}")

                for i in range(ajax_count):
                    event = rnd.choice(base_events)
                    # Spread across the last N days with some jitter
                    day_offset = rnd.uniform(0, float(days_span))
                    hour_offset = rnd.uniform(0, 24.0)
                    minute_offset = rnd.uniform(0, 60.0)
                    created_at = now - timedelta(
                        days=day_offset, hours=hour_offset, minutes=minute_offset
                    )

                    mark_read = rnd.random() >= unread_ratio_ajax
                    seed_key = (
                        f"teamreel:{seed_version}:ajax:{team.slug}:{user.id}:{event.event_type}:{i}"
                    )

                    did_create = _create_notification(
                        user=user,
                        seed_key=seed_key,
                        event=event,
                        created_at=created_at,
                        mark_read=mark_read,
                    )
                    if did_create:
                        created += 1
                    else:
                        skipped += 1

            # Option A: small baseline for all other users
            baseline_events = [
                SeedNotification(
                    event_type="welcome",
                    title="Welkom bij TeamReel",
                    message="Tip: gebruik Search om snel clubs, teams en users te vinden.",
                    level="info",
                    link_url="/search?q=ajax",
                ),
                SeedNotification(
                    event_type="profile_hint",
                    title="Maak je demo-ready",
                    message=(
                        "Controleer je notificatievoorkeuren en je rolrechten"
                        " (Preferences/Permissions)."
                    ),
                    level="info",
                    link_url="/config/preferences",
                ),
            ]

            for user in other_users.iterator():
                rnd = random.Random(f"teamreel:{seed_version}:baseline:{user.id}")

                for i in range(min(others_count, len(baseline_events))):
                    event = baseline_events[i]
                    day_offset = rnd.uniform(0, float(days_span))
                    hour_offset = rnd.uniform(0, 24.0)
                    created_at = now - timedelta(days=day_offset, hours=hour_offset)
                    mark_read = rnd.random() >= unread_ratio_others

                    seed_key = f"teamreel:{seed_version}:baseline:{user.id}:{event.event_type}:{i}"
                    did_create = _create_notification(
                        user=user,
                        seed_key=seed_key,
                        event=event,
                        created_at=created_at,
                        mark_read=mark_read,
                    )
                    if did_create:
                        created += 1
                    else:
                        skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded notifications: ajax_team='{team.slug}'"
                f" ajax_users={len(ajax_users)}"
                f" others={other_users.count()}"
                f" created={created} skipped={skipped}"
                f" dry_run={dry_run}"
            )
        )
