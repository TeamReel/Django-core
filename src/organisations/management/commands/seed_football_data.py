"""
Django management command to create football test data with RBAC assignments.

Creates:
- 5 football competitions as organizations (Eredivisie, Premier League, etc.)
- 5 football clubs as projects per organization
- Organization Admin users (bondscoaches like Ronald Koeman)
- Project Admin users (club coaches)
- Player users as Project Members
- Proper RBAC role assignments for permission testing
"""

import logging
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from permissions.models import Role, RoleAssignment, ScopeChoices
from projects.models import Project

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seed database with football test data and RBAC assignments for permission testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )
        parser.add_argument(
            "--password",
            type=str,
            default=os.getenv("DEMO_PASSWORD", "Basis123."),
            help="Password for all demo accounts (default: Basis123. or DEMO_PASSWORD env var)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        dry_run = options["dry_run"]
        demo_password = options["password"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))

        self.stdout.write(
            self.style.HTTP_INFO(f"Using password: {demo_password} for all demo users")
        )

        # Ensure default roles exist first
        self.stdout.write("\n=== Checking Default Roles ===")
        required_roles = [
            "Global Admin",
            "Organization Admin",
            "Organization Member",
            "Organization Viewer",
            "Project Admin",
            "Project Member",
            "Project Viewer",
        ]

        missing_roles = []
        for role_name in required_roles:
            if not Role.objects.filter(name=role_name).exists():
                missing_roles.append(role_name)

        if missing_roles and not dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"Missing roles: {', '.join(missing_roles)}."
                    " Run 'python manage.py seed_default_roles' first."
                )
            )
            return

        self.stdout.write(self.style.SUCCESS("[OK] All required roles exist"))

        # Football competitions data with bondscoaches and clubs
        competitions_data = [
            {
                "name": "Eredivisie",
                "slug": "eredivisie",
                "description": "Nederlandse topcompetitie",
                "bondscoach": {
                    "email": "koeman@eredivisie.demo",
                    "first_name": "Ronald",
                    "last_name": "Koeman",
                },
                "clubs": [
                    {
                        "name": "Ajax Amsterdam",
                        "slug": "ajax",
                        "coach": {
                            "email": "farioli@ajax.demo",
                            "first_name": "Francesco",
                            "last_name": "Farioli",
                        },
                        "players": [
                            "Pasveer",
                            "Timber",
                            "Baas",
                            "Taylor",
                            "Hato",
                            "Henderson",
                            "Berghuis",
                            "Godts",
                            "Weghorst",
                            "Brobbey",
                        ],
                    },
                    {
                        "name": "PSV Eindhoven",
                        "slug": "psv",
                        "coach": {
                            "email": "bosz@psv.demo",
                            "first_name": "Peter",
                            "last_name": "Bosz",
                        },
                        "players": [
                            "Benitez",
                            "Teze",
                            "Boscagli",
                            "Karsdorp",
                            "Mauro",
                            "Schouten",
                            "Tillman",
                            "Bakayoko",
                            "Pepi",
                            "De Jong",
                        ],
                    },
                    {
                        "name": "Feyenoord Rotterdam",
                        "slug": "feyenoord",
                        "coach": {
                            "email": "priske@feyenoord.demo",
                            "first_name": "Brian",
                            "last_name": "Priske",
                        },
                        "players": [
                            "Bijlow",
                            "Nieuwkoop",
                            "Trauner",
                            "Hancock",
                            "Smal",
                            "Hwang",
                            "Timber",
                            "Milambo",
                            "Paixao",
                            "Gimenez",
                        ],
                    },
                    {
                        "name": "AZ Alkmaar",
                        "slug": "az",
                        "coach": {
                            "email": "martens@az.demo",
                            "first_name": "Maarten",
                            "last_name": "Martens",
                        },
                        "players": [
                            "Owusu-Oduro",
                            "Maikuma",
                            "Goes",
                            "Penetra",
                            "Wolfe",
                            "Clasie",
                            "Koopmeiners",
                            "Mijnans",
                            "Parrott",
                            "Van Bommel",
                        ],
                    },
                    {
                        "name": "FC Utrecht",
                        "slug": "utrecht",
                        "coach": {
                            "email": "hake@utrecht.demo",
                            "first_name": "Ron",
                            "last_name": "Jans",
                        },
                        "players": [
                            "Barkas",
                            "Horemans",
                            "Viergever",
                            "Van der Hoorn",
                            "El Karouani",
                            "Bozdogan",
                            "Toornstra",
                            "Cathline",
                            "Min",
                            "Booth",
                        ],
                    },
                ],
            },
            {
                "name": "Premier League",
                "slug": "premier-league",
                "description": "English Premier League",
                "bondscoach": {
                    "email": "carsley@premierleague.demo",
                    "first_name": "Lee",
                    "last_name": "Carsley",
                },
                "clubs": [
                    {
                        "name": "Liverpool FC",
                        "slug": "liverpool",
                        "coach": {
                            "email": "slot@liverpool.demo",
                            "first_name": "Arne",
                            "last_name": "Slot",
                        },
                        "players": [
                            "Alisson",
                            "Alexander-Arnold",
                            "Van Dijk",
                            "Robertson",
                            "Mac Allister",
                            "Gravenberch",
                            "Szoboszlai",
                            "Salah",
                            "Nunez",
                            "Diaz",
                        ],
                    },
                    {
                        "name": "Arsenal FC",
                        "slug": "arsenal",
                        "coach": {
                            "email": "arteta@arsenal.demo",
                            "first_name": "Mikel",
                            "last_name": "Arteta",
                        },
                        "players": [
                            "Raya",
                            "White",
                            "Saliba",
                            "Gabriel",
                            "Timber",
                            "Partey",
                            "Rice",
                            "Odegaard",
                            "Saka",
                            "Havertz",
                        ],
                    },
                    {
                        "name": "Manchester City",
                        "slug": "mancity",
                        "coach": {
                            "email": "guardiola@mancity.demo",
                            "first_name": "Pep",
                            "last_name": "Guardiola",
                        },
                        "players": [
                            "Ederson",
                            "Walker",
                            "Dias",
                            "Akanji",
                            "Gvardiol",
                            "Rodri",
                            "De Bruyne",
                            "Foden",
                            "Grealish",
                            "Haaland",
                        ],
                    },
                    {
                        "name": "Chelsea FC",
                        "slug": "chelsea",
                        "coach": {
                            "email": "maresca@chelsea.demo",
                            "first_name": "Enzo",
                            "last_name": "Maresca",
                        },
                        "players": [
                            "Sanchez",
                            "James",
                            "Fofana",
                            "Colwill",
                            "Cucurella",
                            "Caicedo",
                            "Fernandez",
                            "Palmer",
                            "Madueke",
                            "Jackson",
                        ],
                    },
                    {
                        "name": "Tottenham Hotspur",
                        "slug": "tottenham",
                        "coach": {
                            "email": "postecoglou@tottenham.demo",
                            "first_name": "Ange",
                            "last_name": "Postecoglou",
                        },
                        "players": [
                            "Vicario",
                            "Porro",
                            "Romero",
                            "Van de Ven",
                            "Udogie",
                            "Bissouma",
                            "Maddison",
                            "Kulusevski",
                            "Son",
                            "Solanke",
                        ],
                    },
                ],
            },
            {
                "name": "Serie A",
                "slug": "serie-a",
                "description": "Italian Serie A",
                "bondscoach": {
                    "email": "spalletti@seriea.demo",
                    "first_name": "Luciano",
                    "last_name": "Spalletti",
                },
                "clubs": [
                    {
                        "name": "Inter Milan",
                        "slug": "inter",
                        "coach": {
                            "email": "inzaghi@inter.demo",
                            "first_name": "Simone",
                            "last_name": "Inzaghi",
                        },
                        "players": [
                            "Sommer",
                            "Pavard",
                            "Acerbi",
                            "Bastoni",
                            "Dumfries",
                            "Barella",
                            "Calhanoglu",
                            "Mkhitaryan",
                            "Thuram",
                            "Lautaro",
                        ],
                    },
                    {
                        "name": "AC Milan",
                        "slug": "milan",
                        "coach": {
                            "email": "fonseca@milan.demo",
                            "first_name": "Paulo",
                            "last_name": "Fonseca",
                        },
                        "players": [
                            "Maignan",
                            "Calabria",
                            "Tomori",
                            "Gabbia",
                            "Hernandez",
                            "Reijnders",
                            "Fofana",
                            "Pulisic",
                            "Leao",
                            "Morata",
                        ],
                    },
                    {
                        "name": "Juventus",
                        "slug": "juventus",
                        "coach": {
                            "email": "motta@juventus.demo",
                            "first_name": "Thiago",
                            "last_name": "Motta",
                        },
                        "players": [
                            "Di Gregorio",
                            "Savona",
                            "Bremer",
                            "Gatti",
                            "Cambiaso",
                            "Locatelli",
                            "Thuram",
                            "Yildiz",
                            "Koopmeiners",
                            "Vlahovic",
                        ],
                    },
                    {
                        "name": "Napoli",
                        "slug": "napoli",
                        "coach": {
                            "email": "conte@napoli.demo",
                            "first_name": "Antonio",
                            "last_name": "Conte",
                        },
                        "players": [
                            "Meret",
                            "Di Lorenzo",
                            "Rrahmani",
                            "Buongiorno",
                            "Spinazzola",
                            "Anguissa",
                            "Lobotka",
                            "Politano",
                            "Lukaku",
                            "Kvaratskhelia",
                        ],
                    },
                    {
                        "name": "AS Roma",
                        "slug": "roma",
                        "coach": {
                            "email": "ranieri@roma.demo",
                            "first_name": "Claudio",
                            "last_name": "Ranieri",
                        },
                        "players": [
                            "Svilar",
                            "Mancini",
                            "Ndicka",
                            "Hermoso",
                            "Angelino",
                            "Kone",
                            "Cristante",
                            "Pellegrini",
                            "Dybala",
                            "Dovbyk",
                        ],
                    },
                ],
            },
            {
                "name": "Bundesliga",
                "slug": "bundesliga",
                "description": "German Bundesliga",
                "bondscoach": {
                    "email": "nagelsmann@bundesliga.demo",
                    "first_name": "Julian",
                    "last_name": "Nagelsmann",
                },
                "clubs": [
                    {
                        "name": "Bayern München",
                        "slug": "bayern",
                        "coach": {
                            "email": "kompany@bayern.demo",
                            "first_name": "Vincent",
                            "last_name": "Kompany",
                        },
                        "players": [
                            "Neuer",
                            "Kimmich",
                            "Upamecano",
                            "Kim",
                            "Davies",
                            "Goretzka",
                            "Musiala",
                            "Sane",
                            "Gnabry",
                            "Kane",
                        ],
                    },
                    {
                        "name": "Borussia Dortmund",
                        "slug": "dortmund",
                        "coach": {
                            "email": "sahin@dortmund.demo",
                            "first_name": "Nuri",
                            "last_name": "Sahin",
                        },
                        "players": [
                            "Kobel",
                            "Ryerson",
                            "Sule",
                            "Schlotterbeck",
                            "Bensebaini",
                            "Can",
                            "Brandt",
                            "Sabitzer",
                            "Adeyemi",
                            "Guirassy",
                        ],
                    },
                    {
                        "name": "RB Leipzig",
                        "slug": "leipzig",
                        "coach": {
                            "email": "rose@leipzig.demo",
                            "first_name": "Marco",
                            "last_name": "Rose",
                        },
                        "players": [
                            "Gulacsi",
                            "Henrichs",
                            "Orban",
                            "Lukeba",
                            "Raum",
                            "Haidara",
                            "Kampl",
                            "Simons",
                            "Openda",
                            "Sesko",
                        ],
                    },
                    {
                        "name": "Bayer Leverkusen",
                        "slug": "leverkusen",
                        "coach": {
                            "email": "alonso@leverkusen.demo",
                            "first_name": "Xabi",
                            "last_name": "Alonso",
                        },
                        "players": [
                            "Hradecky",
                            "Tapsoba",
                            "Tah",
                            "Hincapie",
                            "Grimaldo",
                            "Xhaka",
                            "Palacios",
                            "Wirtz",
                            "Frimpong",
                            "Boniface",
                        ],
                    },
                    {
                        "name": "VfB Stuttgart",
                        "slug": "stuttgart",
                        "coach": {
                            "email": "hoeness@stuttgart.demo",
                            "first_name": "Sebastian",
                            "last_name": "Hoeness",
                        },
                        "players": [
                            "Nubel",
                            "Vagnoman",
                            "Rouault",
                            "Chabot",
                            "Mittelstadt",
                            "Karazor",
                            "Stiller",
                            "Millot",
                            "Fuhrich",
                            "Undav",
                        ],
                    },
                ],
            },
            {
                "name": "Ligue 1",
                "slug": "ligue1",
                "description": "French Ligue 1",
                "bondscoach": {
                    "email": "deschamps@ligue1.demo",
                    "first_name": "Didier",
                    "last_name": "Deschamps",
                },
                "clubs": [
                    {
                        "name": "Paris Saint-Germain",
                        "slug": "psg",
                        "coach": {
                            "email": "enrique@psg.demo",
                            "first_name": "Luis",
                            "last_name": "Enrique",
                        },
                        "players": [
                            "Donnarumma",
                            "Hakimi",
                            "Marquinhos",
                            "Pacho",
                            "Mendes",
                            "Vitinha",
                            "Ruiz",
                            "Zaire-Emery",
                            "Dembele",
                            "Asensio",
                        ],
                    },
                    {
                        "name": "Olympique Marseille",
                        "slug": "marseille",
                        "coach": {
                            "email": "de-zerbi@marseille.demo",
                            "first_name": "Roberto",
                            "last_name": "De Zerbi",
                        },
                        "players": [
                            "Rulli",
                            "Murillo",
                            "Balerdi",
                            "Cornelius",
                            "Merlin",
                            "Hojbjerg",
                            "Rongier",
                            "Greenwood",
                            "Rabiot",
                            "Maupay",
                        ],
                    },
                    {
                        "name": "AS Monaco",
                        "slug": "monaco",
                        "coach": {
                            "email": "hutter@monaco.demo",
                            "first_name": "Adi",
                            "last_name": "Hutter",
                        },
                        "players": [
                            "Majecki",
                            "Vanderson",
                            "Kehrer",
                            "Salisu",
                            "Henrique",
                            "Zakaria",
                            "Camara",
                            "Minamino",
                            "Golovin",
                            "Embolo",
                        ],
                    },
                    {
                        "name": "Lille OSC",
                        "slug": "lille",
                        "coach": {
                            "email": "genesio@lille.demo",
                            "first_name": "Bruno",
                            "last_name": "Genesio",
                        },
                        "players": [
                            "Chevalier",
                            "Mandi",
                            "Diakite",
                            "Alexsandro",
                            "Gudmundsson",
                            "Andre",
                            "Gomes",
                            "Zhegrova",
                            "Cabella",
                            "David",
                        ],
                    },
                    {
                        "name": "Olympique Lyon",
                        "slug": "lyon",
                        "coach": {
                            "email": "sage@lyon.demo",
                            "first_name": "Pierre",
                            "last_name": "Sage",
                        },
                        "players": [
                            "Perri",
                            "Maitland-Niles",
                            "Mata",
                            "Caleta-Car",
                            "Tagliafico",
                            "Matic",
                            "Tolisso",
                            "Cherki",
                            "Fofana",
                            "Lacazette",
                        ],
                    },
                ],
            },
        ]

        # Statistics
        stats = {
            "orgs_created": 0,
            "projects_created": 0,
            "users_created": 0,
            "role_assignments": 0,
        }

        login_info = []

        # Get or create system user for assignments
        system_user = User.objects.filter(is_superuser=True).first()
        if not system_user and not dry_run:
            self.stdout.write(self.style.ERROR("No superuser found. Create one first."))
            return

        # Get roles
        org_admin_role = Role.objects.filter(name="Organization Admin").first()
        org_member_role = Role.objects.filter(name="Organization Member").first()
        project_admin_role = Role.objects.filter(name="Project Admin").first()
        project_member_role = Role.objects.filter(name="Project Member").first()

        self.stdout.write("\n=== Creating Football Organizations, Users, and Assignments ===\n")

        for comp_data in competitions_data:
            self.stdout.write(self.style.HTTP_INFO(f"\n[ORG] {comp_data['name']}"))

            # Create organization
            if not dry_run:
                organisation, org_created = Organisation.objects.update_or_create(
                    slug=comp_data["slug"],
                    defaults={
                        "name": comp_data["name"],
                        "description": comp_data["description"],
                        "creator": system_user,
                    },
                )
                if org_created:
                    stats["orgs_created"] += 1
                    self.stdout.write(f"  + Created organisation: {organisation.name}")
                else:
                    self.stdout.write(f"  • Organisation exists: {organisation.name}")
            else:
                self.stdout.write(f"  Would create organisation: {comp_data['name']}")

            # Create bondscoach (Organization Admin)
            bondscoach_data = comp_data["bondscoach"]
            if not dry_run:
                bondscoach, user_created = User.objects.update_or_create(
                    email=bondscoach_data["email"],
                    defaults={
                        "first_name": bondscoach_data["first_name"],
                        "last_name": bondscoach_data["last_name"],
                        "is_active": True,
                        "email_verified": True,
                    },
                )
                if user_created:
                    bondscoach.set_password(demo_password)
                    bondscoach.save()
                    stats["users_created"] += 1
                    self.stdout.write(
                        f"    + Created bondscoach:"
                        f" {bondscoach.get_full_name()} ({bondscoach.email})"
                    )
                else:
                    self.stdout.write(
                        f"    • Bondscoach exists:"
                        f" {bondscoach.get_full_name()} ({bondscoach.email})"
                    )

                # Assign Organization Admin role
                assignment, created = RoleAssignment.objects.get_or_create(
                    user=bondscoach,
                    role=org_admin_role,
                    scope=ScopeChoices.ORGANIZATION,
                    target_organization=organisation,
                    defaults={"assigned_by": system_user},
                )
                if created:
                    stats["role_assignments"] += 1

                login_info.append(
                    {
                        "role": "Organization Admin",
                        "org": comp_data["name"],
                        "name": bondscoach.get_full_name(),
                        "email": bondscoach.email,
                        "password": demo_password,
                    }
                )
            else:
                self.stdout.write(
                    f"    Would create bondscoach:"
                    f" {bondscoach_data['first_name']} {bondscoach_data['last_name']}"
                )

            # Create clubs and their coaches/players
            for club_data in comp_data["clubs"]:
                if not dry_run:
                    project, proj_created = Project.objects.update_or_create(
                        slug=club_data["slug"],
                        organisation=organisation,
                        defaults={
                            "name": club_data["name"],
                            "description": f"{club_data['name']} Football Club",
                            "creator": system_user,
                        },
                    )
                    if proj_created:
                        stats["projects_created"] += 1
                        self.stdout.write(f"    + Created club: {project.name}")
                    else:
                        self.stdout.write(f"    • Club exists: {project.name}")
                else:
                    self.stdout.write(f"    Would create club: {club_data['name']}")

                # Create coach (Project Admin)
                coach_data = club_data["coach"]
                if not dry_run:
                    coach, user_created = User.objects.update_or_create(
                        email=coach_data["email"],
                        defaults={
                            "first_name": coach_data["first_name"],
                            "last_name": coach_data["last_name"],
                            "is_active": True,
                            "email_verified": True,
                        },
                    )
                    if user_created:
                        coach.set_password(demo_password)
                        coach.save()
                        stats["users_created"] += 1
                    else:
                        self.stdout.write(
                            f"      • Coach exists: {coach.get_full_name()} ({coach.email})"
                        )

                    # Assign Project Admin role
                    assignment, created = RoleAssignment.objects.get_or_create(
                        user=coach,
                        role=project_admin_role,
                        scope=ScopeChoices.PROJECT,
                        target_project=project,
                        target_organization=organisation,
                        defaults={"assigned_by": system_user},
                    )
                    if created:
                        stats["role_assignments"] += 1

                    # Also assign Organization Member (so they can see org)
                    org_assignment, created = RoleAssignment.objects.get_or_create(
                        user=coach,
                        role=org_member_role,
                        scope=ScopeChoices.ORGANIZATION,
                        target_organization=organisation,
                        defaults={"assigned_by": system_user},
                    )
                    if created:
                        stats["role_assignments"] += 1

                    login_info.append(
                        {
                            "role": "Project Admin (Coach)",
                            "org": comp_data["name"],
                            "project": club_data["name"],
                            "name": coach.get_full_name(),
                            "email": coach.email,
                            "password": demo_password,
                        }
                    )

                # Create players (Project Members)
                for idx, player_name in enumerate(club_data["players"][:10]):  # First 10 players
                    player_email = (
                        f"{player_name.lower().replace(' ', '')}@{club_data['slug']}.demo"
                    )

                    if not dry_run:
                        player, user_created = User.objects.update_or_create(
                            email=player_email,
                            defaults={
                                "first_name": player_name,
                                "last_name": f"({club_data['name']})",
                                "is_active": True,
                                "email_verified": True,
                            },
                        )
                        if user_created:
                            player.set_password(demo_password)
                            player.save()
                            stats["users_created"] += 1
                        else:
                            if idx == 0:
                                self.stdout.write(
                                    f"      • Players exist for {club_data['name']}..."
                                )

                        # Assign Project Member role
                        assignment, created = RoleAssignment.objects.get_or_create(
                            user=player,
                            role=project_member_role,
                            scope=ScopeChoices.PROJECT,
                            target_project=project,
                            target_organization=organisation,
                            defaults={"assigned_by": system_user},
                        )
                        if created:
                            stats["role_assignments"] += 1

                        # Also assign Organization Member
                        org_assignment, created = RoleAssignment.objects.get_or_create(
                            user=player,
                            role=org_member_role,
                            scope=ScopeChoices.ORGANIZATION,
                            target_organization=organisation,
                            defaults={"assigned_by": system_user},
                        )
                        if created:
                            stats["role_assignments"] += 1

                        # Add first 2 players to login info for sampling
                        if idx < 2:
                            login_info.append(
                                {
                                    "role": "Project Member (Player)",
                                    "org": comp_data["name"],
                                    "project": club_data["name"],
                                    "name": player.get_full_name(),
                                    "email": player.email,
                                    "password": demo_password,
                                }
                            )

        # Summary
        self.stdout.write("\n" + "=" * 70)
        if dry_run:
            self.stdout.write(self.style.SUCCESS("\n[COMPLETE] DRY RUN COMPLETE"))
        else:
            self.stdout.write(self.style.SUCCESS("\n[COMPLETE] FOOTBALL DATA SEEDING COMPLETE!"))
            self.stdout.write("\nStatistics:")
            self.stdout.write(f"  • Organizations: {stats['orgs_created']} created")
            self.stdout.write(f"  • Projects (Clubs): {stats['projects_created']} created")
            self.stdout.write(f"  • Users: {stats['users_created']} created")
            self.stdout.write(f"  • Role Assignments: {stats['role_assignments']} created")

            # Print login credentials grouped by role
            self.stdout.write("\n" + "=" * 70)
            self.stdout.write(self.style.HTTP_INFO("\n=== DEMO LOGIN CREDENTIALS ===\n"))
            self.stdout.write(f"Password for all accounts: {demo_password}\n")

            # Group by organization
            for comp_data in competitions_data:
                org_logins = [entry for entry in login_info if entry["org"] == comp_data["name"]]
                if org_logins:
                    self.stdout.write(self.style.HTTP_INFO(f"\n{comp_data['name']}:"))

                    # Organization Admin
                    org_admins = [
                        entry for entry in org_logins if entry["role"] == "Organization Admin"
                    ]
                    if org_admins:
                        self.stdout.write("  Organization Admin:")
                        for login in org_admins:
                            self.stdout.write(f"    • {login['name']}: {login['email']}")

                    # Project Admins (grouped by club)
                    clubs = list(
                        set([entry.get("project") for entry in org_logins if entry.get("project")])
                    )
                    for club in clubs:
                        club_logins = [
                            entry for entry in org_logins if entry.get("project") == club
                        ]
                        project_admins = [
                            entry for entry in club_logins if "Coach" in entry["role"]
                        ]
                        players = [entry for entry in club_logins if "Player" in entry["role"]]

                        if project_admins or players:
                            self.stdout.write(f"\n  {club}:")
                            for login in project_admins:
                                self.stdout.write(f"    Coach: {login['name']}: {login['email']}")
                            if players:
                                self.stdout.write("    Players (sample):")
                                for login in players[:2]:  # Show first 2 players
                                    self.stdout.write(f"      • {login['name']}: {login['email']}")

            self.stdout.write("\n" + "=" * 70)
            self.stdout.write(self.style.HTTP_INFO("\n=== Testing Instructions ==="))
            self.stdout.write("1. Login at http://localhost:3000/ with any account above")
            self.stdout.write("2. Organization Admins can see/manage their entire organization")
            self.stdout.write("3. Project Admins (Coaches) can only see/manage their club")
            self.stdout.write("4. Players can only view their club (read-only access)")
            self.stdout.write("5. Test cross-org isolation: users cannot see other organizations")
            self.stdout.write("\n" + "=" * 70 + "\n")
