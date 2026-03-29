"""
Management command to register teams for their competitions.

Creates "team registration" ProjectMemberships (without user) linking teams
to the competitions they participate in. This is required before running
seed_level_10_matches to generate match schedules.

The registration is based on existing player memberships: if a team has players
registered for a specific competition, the team itself should be registered too.

Usage:
    python manage.py register_teams_for_competitions --all
    python manage.py register_teams_for_competitions --organisation knvb
    python manage.py register_teams_for_competitions --dry-run
"""

from activities.models import Period
from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Register teams for competitions based on existing player memberships"

    def add_arguments(self, parser):
        parser.add_argument(
            "--organisation",
            type=str,
            help="Organisation slug (e.g., knvb, dfb, figc, the-fa)",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Register teams for all organisations",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview without creating records",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING("[DRY-RUN] Preview mode - no records will be created")
            )

        # Determine scope
        if options["all"]:
            organisations = Organisation.objects.all()
        elif options["organisation"]:
            try:
                org = Organisation.objects.get(slug=options["organisation"])
                organisations = [org]
            except Organisation.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"[X] Organisation '{options['organisation']}' not found")
                )
                return
        else:
            self.stdout.write(self.style.ERROR("[X] Specify --organisation <slug> or --all"))
            return

        total_created = 0

        for org in organisations:
            self.stdout.write(f"\n[ORG] Processing {org.name} ({org.slug})")

            # Find all teams with players (period-based memberships)
            teams_with_players = (
                Project.objects.filter(
                    organisation=org,
                    memberships__user__isnull=False,  # Has players
                    memberships__period__isnull=False,  # Period-specific
                )
                .distinct()
                .order_by("name")
            )

            if not teams_with_players.exists():
                self.stdout.write(self.style.WARNING("   [!] No teams with players found"))
                continue

            self.stdout.write(f"   [TEAM] Found {teams_with_players.count()} teams with players")

            for team in teams_with_players:
                # Get all seasons (root periods) this team has players in
                seasons = (
                    Period.objects.filter(
                        project_memberships__project=team,
                        project_memberships__user__isnull=False,  # Player memberships
                        parent_period__isnull=True,  # Root periods (seasons)
                    )
                    .distinct()
                    .order_by("name")
                )

                if not seasons.exists():
                    continue

                self.stdout.write(f"\n      [TEAM] {team.name} - {seasons.count()} season(s)")

                for season in seasons:
                    # Determine which competitions to register for based on team type
                    # Youth teams (O21, Jong, U21, etc.) -> Youth competition only
                    # Senior teams (1, Reserves, First Team, etc.) -> League + Cup
                    is_youth_team = any(
                        keyword in team.name.lower()
                        for keyword in ["o21", "jong", "u21", "youth", "jeugd", "primavera"]
                    )

                    if is_youth_team:
                        # Youth teams only get "Youth" competition (or O21 Divisie 1)
                        allowed_competitions = ["Youth", "O21 Divisie 1"]
                    else:
                        # Senior teams get League and Cup
                        allowed_competitions = ["League", "Cup"]

                    # Get all child competitions for this season
                    competitions = Period.objects.filter(
                        parent_period=season, name__in=allowed_competitions
                    ).order_by("name")

                    if not competitions.exists():
                        self.stdout.write(
                            f"         [!] No matching competitions found for {season.name}"
                        )
                        continue

                    self.stdout.write(
                        f"         [SEASON] {season.name}: {competitions.count()} competition(s) "
                        f"({', '.join(allowed_competitions)})"
                    )

                    for competition in competitions:
                        # Check if team is already registered for this competition
                        existing = ProjectMembership.objects.filter(
                            project=team,
                            period=competition,
                            user__isnull=True,  # Team registration (not player)
                        ).exists()

                        if existing:
                            self.stdout.write(
                                f"            [SKIP] Already registered for {competition.name}"
                            )
                            continue

                        if not dry_run:
                            # Create team registration
                            ProjectMembership.objects.create(
                                project=team,
                                period=competition,
                                user=None,  # No user = team registration
                                role="team",  # Generic role for team registration
                                metadata={
                                    "registration_type": "competition",
                                    "competition_name": competition.name,
                                    "season_name": season.name,
                                    "competition_type": competition.metadata.get(
                                        "competition_type", "league"
                                    ),
                                },
                            )
                            total_created += 1
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"            [+] Registered for {competition.name}"
                                )
                            )
                        else:
                            self.stdout.write(
                                f"            [DRY-RUN] Would register for {competition.name}"
                            )
                            total_created += 1

        # Summary
        self.stdout.write("\n" + "=" * 70)
        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY-RUN] Preview complete - no changes made"))
            self.stdout.write(f"[STAT] Would create: {total_created} registrations")
        else:
            self.stdout.write(self.style.SUCCESS(f"[+] COMPLETE: {total_created} teams registered"))
