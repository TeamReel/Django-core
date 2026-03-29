"""
Seed Competition Registrations via ProjectMembership

Creates ProjectMembership records linking teams to competitions they participate in.
This enables:
- Auto-fill: Match data via ForeignKey cascade (no metadata duplication)
- Clean queries: "Which teams play Eredivisie?" via period.memberships filter
- Type-safety: Database ForeignKeys instead of metadata filtering

Logic:
- Eredivisie/League: Only "1" teams (first teams)
- League Cup: Only "1" teams
- Youth: Only "O21" teams
- European: Top clubs (Ajax, PSV, Feyenoord, AZ, FC Utrecht, FC Twente)
- Cup: All teams
- Friendly: All teams
- Play-offs: Top 8 "1" teams

Usage:
    python manage.py seed_competition_registrations --organisation knvb --season "Season 2024/2025"
    python manage.py seed_competition_registrations --all
"""

from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed team registrations for competitions via ProjectMembership"

    def add_arguments(self, parser):
        parser.add_argument(
            "--organisation",
            type=str,
            help="Organisation slug (e.g., knvb, dfb, figc)",
        )
        parser.add_argument(
            "--season",
            type=str,
            help="Season name filter (e.g., 'Season 2024/2025')",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Seed registrations for all organisations and seasons",
        )

    def handle(self, *args, **options):
        # Determine scope
        if options["all"]:
            organisations = Organisation.objects.all()
            season_filter = None
        elif options["organisation"]:
            try:
                org = Organisation.objects.get(slug=options["organisation"])
                organisations = [org]
            except Organisation.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"[X] Organisation '{options['organisation']}' not found")
                )
                return
            season_filter = options.get("season")
        else:
            self.stdout.write(self.style.ERROR("[X] Specify --organisation <slug> or --all"))
            return

        total_registrations = 0

        for org in organisations:
            self.stdout.write(f"\n[ORG] Processing {org.name} ({org.slug})")

            # Get all root periods (seasons) for this organisation
            seasons_query = Period.objects.filter(organisation=org, parent_period__isnull=True)

            if season_filter:
                seasons_query = seasons_query.filter(name__icontains=season_filter)

            seasons = list(seasons_query.order_by("start_date"))

            if not seasons:
                self.stdout.write(self.style.WARNING("   [!] No seasons found"))
                continue

            self.stdout.write(f"   [DATE] Found {len(seasons)} season(s)")

            for season in seasons:
                self.stdout.write(f"\n   [SEASON] {season.name}")

                # Get all teams in this organisation
                all_teams = list(
                    Project.objects.filter(
                        organisation=org, parent_project__isnull=False, is_active=True
                    ).select_related("parent_project")
                )

                if not all_teams:
                    self.stdout.write("      [!] No teams found")
                    continue

                # Categorize teams by type
                first_teams = [t for t in all_teams if t.name.endswith(" 1")]
                o21_teams = [t for t in all_teams if "O21" in t.name]
                _youth_teams = [
                    t for t in all_teams if any(x in t.name for x in ["O21", "O19", "O17", "Youth"])
                ]
                _women_teams = [t for t in all_teams if "Vrouwen" in t.name]
                _reserve_teams = [t for t in all_teams if "Reserves" in t.name]

                # Top clubs for European competitions
                top_clubs = ["Ajax", "PSV", "Feyenoord", "AZ", "FC Utrecht", "FC Twente"]
                european_teams = [
                    t
                    for t in first_teams
                    if any(club in t.parent_project.name for club in top_clubs)
                ]

                self.stdout.write(f"      [TEAM] {len(all_teams)} total teams")
                self.stdout.write(f"         - {len(first_teams)} first teams")
                self.stdout.write(f"         - {len(o21_teams)} O21 teams")
                self.stdout.write(f"         - {len(european_teams)} European-eligible teams")

                # Get competitions (child periods) for this season
                competitions = list(Period.objects.filter(parent_period=season).order_by("name"))

                if not competitions:
                    self.stdout.write("      [!] No competitions found")
                    continue

                self.stdout.write(f"\n      [COMP] Processing {len(competitions)} competition(s):")

                for competition in competitions:
                    comp_type = competition.metadata.get("competition_type", "league")

                    # Determine eligible teams based on competition type
                    if "eredivisie" in competition.name.lower() or comp_type == "league":
                        eligible_teams = first_teams
                        desc = "First teams (Eredivisie)"
                    elif comp_type == "league_cup":
                        eligible_teams = first_teams
                        desc = "First teams (League Cup)"
                    elif comp_type == "youth" or "youth" in competition.name.lower():
                        eligible_teams = o21_teams
                        desc = "O21 teams"
                    elif comp_type == "european":
                        eligible_teams = european_teams
                        desc = "Top clubs (European)"
                    elif comp_type == "cup":
                        eligible_teams = all_teams
                        desc = "All teams (Cup)"
                    elif comp_type == "friendly":
                        eligible_teams = all_teams
                        desc = "All teams (Friendly)"
                    elif comp_type == "playoffs":
                        eligible_teams = first_teams[:8] if len(first_teams) >= 8 else first_teams
                        desc = "Top 8 first teams (Play-offs)"
                    else:
                        eligible_teams = first_teams  # Default
                        desc = "First teams (default)"

                    created = 0
                    existing = 0

                    with transaction.atomic():
                        for team in eligible_teams:
                            membership, was_created = ProjectMembership.objects.get_or_create(
                                project=team,
                                period=competition,
                                user=None,  # No user - this is team registration
                            )
                            if was_created:
                                created += 1
                            else:
                                existing += 1

                    total_registrations += created

                    self.stdout.write(f"         [{comp_type.upper()}] {competition.name}")
                    self.stdout.write(
                        f"            {desc}: {created} registered, {existing} existing"
                    )

        # Summary
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(
            self.style.SUCCESS(
                f"[+] COMPLETE: {total_registrations} new team registrations created"
            )
        )
