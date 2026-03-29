"""
Seed RBAC Memberships for TeamReel Demo.

Creates realistic Organization and Project memberships for demonstration:
- Land Admins (Federation presidents/directors)
- Club Admins (Club directors/CEOs)
- Team Admins (Head coaches)
- Team Members (Keepers, Players, Assistants, Verzorgers - all with same RBAC permissions)
- Supporters (Prominent fans/sponsors)

This completes the Core Hierarchy before Level 7 (Players).
"""

from accounts.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Membership as OrgMembership
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed RBAC memberships for TeamReel demo (Land/Club/Team Admins + Supporters)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--full",
            action="store_true",
            help="Seed all federations (default: only Eredivisie/KNVB)",
        )

    def handle(self, *args, **options):
        full_mode = options.get("full", False)

        self.stdout.write("=" * 70)
        self.stdout.write("RBAC MEMBERSHIPS SEEDING (TeamReel Demo)")
        self.stdout.write("=" * 70)

        with transaction.atomic():
            # Level 1: Land Admins (Organisation Memberships)
            land_admins = self.seed_land_admins(full_mode)

            # Level 2: Club Admins (Project Memberships on Clubs)
            club_admins = self.seed_club_admins(full_mode)

            # Level 3: Team Admins (Project Memberships on Teams)
            team_admins = self.seed_team_admins(full_mode)

            # Level 4: Team Members with functional roles (Project Memberships on Teams)
            team_members = self.seed_support_staff(
                full_mode
            )  # Function name kept for compatibility

            # Level 5: Supporters (Project Memberships on Clubs)
            supporters = self.seed_supporters(full_mode)

        # Summary
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("RBAC MEMBERSHIPS SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"Land Admins (Org):      {land_admins}")
        self.stdout.write(f"Club Admins (Project):  {club_admins}")
        self.stdout.write(f"Team Admins (Project):  {team_admins}")
        self.stdout.write(f"Team Members (Project): {team_members}")
        self.stdout.write(f"Supporters (Project):   {supporters}")
        self.stdout.write(f"{'=' * 70}")
        self.stdout.write(
            "TOTAL USERS:           "
            f" {land_admins + club_admins + team_admins + team_members + supporters}"
        )
        self.stdout.write(f"TOTAL ORG MEMBERSHIPS:  {land_admins}")
        self.stdout.write(
            f"TOTAL PROJECT MEMBERSHIPS: {club_admins + team_admins + team_members + supporters}"
        )
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("\nRBAC memberships seeded successfully!"))

    def seed_land_admins(self, full_mode):
        """Create Land Admins (Federation presidents/directors)."""
        self.stdout.write("\n[1/5] Seeding Land Admins (Organisation Memberships)...")

        # Federation directors (realistic names per country)
        land_admin_data = [
            {
                "org_name": "KNVB",
                "first_name": "Jan",
                "last_name": "de Jong",
                "title": "Directeur KNVB",
            },
            {
                "org_name": "DFB",
                "first_name": "Bernd",
                "last_name": "Neuendorf",
                "title": "Präsident DFB",
            },
            {
                "org_name": "RBFA",
                "first_name": "Pascale",
                "last_name": "Van Damme",
                "title": "CEO RBFA",
            },
            {
                "org_name": "The FA",
                "first_name": "Mark",
                "last_name": "Bullingham",
                "title": "CEO The FA",
            },
            {
                "org_name": "FIGC",
                "first_name": "Gabriele",
                "last_name": "Gravina",
                "title": "Presidente FIGC",
            },
        ]

        if not full_mode:
            # MVP: Only KNVB
            land_admin_data = [land_admin_data[0]]

        created = 0
        for admin_data in land_admin_data:
            org = Organisation.objects.filter(name=admin_data["org_name"]).first()
            if not org:
                self.stdout.write(
                    self.style.WARNING(
                        f"  Organisation {admin_data['org_name']} not found, skipping..."
                    )
                )
                continue

            # Create User
            email = (
                f"{admin_data['first_name'].lower()}"
                f".{admin_data['last_name'].lower()}"
                f"@{admin_data['org_name'].lower()}.demo"
            )
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": admin_data["first_name"],
                    "last_name": admin_data["last_name"],
                    "is_active": True,
                },
            )

            # Create Organisation Membership
            membership, created_new = OrgMembership.objects.get_or_create(
                user=user,
                organisation=org,
                defaults={
                    "role": "admin",
                    "is_active": True,
                },
            )

            if user_created and created_new:
                created += 1
                self.stdout.write(f"  Created: {admin_data['title']} - {user.email}")

        self.stdout.write(f"  Total: {created} Land Admins")
        return created

    def seed_club_admins(self, full_mode):
        """Create Club Admins (Club directors/CEOs)."""
        self.stdout.write("\n[2/5] Seeding Club Admins (Project Memberships)...")

        # Get clubs (root projects without parent_project)
        if full_mode:
            clubs = Project.objects.filter(parent_project__isnull=True).order_by("name")
        else:
            # MVP: Only Eredivisie clubs (KNVB)
            knvb = Organisation.objects.filter(name="KNVB").first()
            if not knvb:
                self.stdout.write(self.style.WARNING("  KNVB not found, skipping..."))
                return 0
            clubs = Project.objects.filter(organisation=knvb, parent_project__isnull=True).order_by(
                "name"
            )

        created = 0
        for club in clubs:
            # Extract club short name for email
            club_slug = club.name.lower().replace(" ", "").replace(".", "")[:15]

            # Generic director names
            first_name = "Directeur"
            last_name = club.name.split()[0]  # e.g., "Ajax" from "Ajax Amsterdam"

            email = f"directeur@{club_slug}.demo"
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_active": True,
                },
            )

            # Create Project Membership
            membership, created_new = ProjectMembership.objects.get_or_create(
                user=user,
                project=club,
                defaults={
                    "role": "admin",
                    "assignment_reason": "manual",
                },
            )

            if user_created and created_new:
                created += 1

        self.stdout.write(f"  Total: {created} Club Admins ({clubs.count()} clubs)")
        return created

    def seed_team_admins(self, full_mode):
        """Create Team Admins (Head coaches)."""
        self.stdout.write("\n[3/5] Seeding Team Admins (Project Memberships)...")

        # Get teams (projects WITH parent_project)
        if full_mode:
            teams = Project.objects.filter(parent_project__isnull=False).order_by("name")
        else:
            # MVP: Only Eredivisie teams (KNVB clubs)
            knvb = Organisation.objects.filter(name="KNVB").first()
            if not knvb:
                self.stdout.write(self.style.WARNING("  KNVB not found, skipping..."))
                return 0
            teams = Project.objects.filter(
                organisation=knvb, parent_project__isnull=False
            ).order_by("name")

        created = 0
        for team in teams:
            # Extract team info
            _club_name = team.parent_project.name if team.parent_project else "Unknown"
            team_slug = team.name.lower().replace(" ", "").replace(".", "")[:20]

            # Generic coach names
            first_name = "Coach"
            last_name = team.name.split()[-1]  # e.g., "Eerste" from "Ajax Eerste Elftal"

            email = f"coach@{team_slug}.demo"
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_active": True,
                },
            )

            # Create Project Membership
            membership, created_new = ProjectMembership.objects.get_or_create(
                user=user,
                project=team,
                defaults={
                    "role": "admin",
                    "assignment_reason": "manual",
                },
            )

            if user_created and created_new:
                created += 1

        self.stdout.write(f"  Total: {created} Team Admins ({teams.count()} teams)")
        return created

    def seed_support_staff(self, full_mode):
        """Create Team Members with different functional roles.

        Roles: Keeper, Player, Assistant, Verzorger.
        """
        self.stdout.write("\n[4/5] Seeding Team Members (Project Memberships)...")

        # Get teams
        if full_mode:
            teams = Project.objects.filter(parent_project__isnull=False).order_by("name")
        else:
            # MVP: Only Eredivisie teams
            knvb = Organisation.objects.filter(name="KNVB").first()
            if not knvb:
                self.stdout.write(self.style.WARNING("  KNVB not found, skipping..."))
                return 0
            teams = Project.objects.filter(
                organisation=knvb, parent_project__isnull=False
            ).order_by("name")

        created = 0

        # Team Member functional roles (all get same RBAC permissions)
        # Different positions/functions but same access level
        member_roles = [
            {"role": "keeper", "title": "Keeper"},
            {"role": "player", "title": "Speler"},
            {"role": "assistant", "title": "Assistent"},
            {"role": "verzorger", "title": "Verzorger"},
        ]

        for team in teams:
            team_slug = team.name.lower().replace(" ", "").replace(".", "")[:20]

            for member in member_roles:
                email = f"{member['role']}@{team_slug}.demo"
                user, user_created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "first_name": member["title"],
                        "last_name": team.name.split()[-1],
                        "is_active": True,
                    },
                )

                # Create Project Membership
                # (viewer role - same RBAC permissions via Team Member role)
                membership, created_new = ProjectMembership.objects.get_or_create(
                    user=user,
                    project=team,
                    defaults={
                        "role": "viewer",  # All team members are viewers in project system
                        "assignment_reason": "manual",
                    },
                )

                if user_created and created_new:
                    created += 1

        self.stdout.write(
            f"  Total: {created} Team Members ({teams.count()} teams × {len(member_roles)} roles)"
        )
        return created

    def seed_supporters(self, full_mode):
        """Create Supporters (Prominent fans/sponsors per club)."""
        self.stdout.write("\n[5/5] Seeding Supporters (Project Memberships)...")

        # Get clubs
        if full_mode:
            clubs = Project.objects.filter(parent_project__isnull=True).order_by("name")
        else:
            # MVP: Only Eredivisie clubs
            knvb = Organisation.objects.filter(name="KNVB").first()
            if not knvb:
                self.stdout.write(self.style.WARNING("  KNVB not found, skipping..."))
                return 0
            clubs = Project.objects.filter(organisation=knvb, parent_project__isnull=True).order_by(
                "name"
            )

        created = 0
        supporters_per_club = 3  # 3 prominent supporters per club

        for club in clubs:
            club_slug = club.name.lower().replace(" ", "").replace(".", "")[:15]

            for i in range(1, supporters_per_club + 1):
                email = f"supporter{i}@{club_slug}.demo"
                user, user_created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "first_name": f"Supporter{i}",
                        "last_name": club.name.split()[0],
                        "is_active": True,
                    },
                )

                # Create Project Membership (viewer role, read-only)
                membership, created_new = ProjectMembership.objects.get_or_create(
                    user=user,
                    project=club,
                    defaults={
                        "role": "viewer",
                        "assignment_reason": "manual",
                    },
                )

                if user_created and created_new:
                    created += 1

        self.stdout.write(
            f"  Total: {created} Supporters ({clubs.count()} clubs × {supporters_per_club})"
        )
        return created
