import logging

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Membership, Organisation

# Reduce logging noise
logging.getLogger("permissions.registry").setLevel(logging.WARNING)


class Command(BaseCommand):
    help = "Restores memberships for the football demo data in production."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without making changes",
        )
        parser.add_argument(
            "--org",
            type=str,
            help="Filter by organisation slug (e.g. 'eredivisie')",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        target_org_slug = options["org"]
        User = get_user_model()

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))

        competitions_data = [
            {
                "name": "Eredivisie",
                "slug": "eredivisie",
                "bondscoach": {"email": "koeman@eredivisie.demo"},
                "clubs": [
                    {
                        "name": "Ajax Amsterdam",
                        "slug": "ajax",
                        "coach": {"email": "farioli@ajax.demo"},
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
                        "coach": {"email": "bosz@psv.demo"},
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
                        "coach": {"email": "priske@feyenoord.demo"},
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
                        "coach": {"email": "martens@az.demo"},
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
                        "coach": {"email": "hake@utrecht.demo"},
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
                "bondscoach": {"email": "carsley@premierleague.demo"},
                "clubs": [
                    {
                        "name": "Liverpool FC",
                        "slug": "liverpool",
                        "coach": {"email": "slot@liverpool.demo"},
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
                        "coach": {"email": "arteta@arsenal.demo"},
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
                        "coach": {"email": "guardiola@mancity.demo"},
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
                        "coach": {"email": "maresca@chelsea.demo"},
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
                        "coach": {"email": "postecoglou@tottenham.demo"},
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
                "bondscoach": {"email": "spalletti@seriea.demo"},
                "clubs": [
                    {
                        "name": "Inter Milan",
                        "slug": "inter",
                        "coach": {"email": "inzaghi@inter.demo"},
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
                        "coach": {"email": "fonseca@milan.demo"},
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
                        "coach": {"email": "motta@juventus.demo"},
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
                        "coach": {"email": "conte@napoli.demo"},
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
                        "coach": {"email": "ranieri@roma.demo"},
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
                "bondscoach": {"email": "nagelsmann@bundesliga.demo"},
                "clubs": [
                    {
                        "name": "Bayern München",
                        "slug": "bayern",
                        "coach": {"email": "kompany@bayern.demo"},
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
                        "coach": {"email": "sahin@dortmund.demo"},
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
                        "coach": {"email": "rose@leipzig.demo"},
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
                        "coach": {"email": "alonso@leverkusen.demo"},
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
                        "coach": {"email": "hoeness@stuttgart.demo"},
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
                "bondscoach": {"email": "deschamps@ligue1.demo"},
                "clubs": [
                    {
                        "name": "Paris Saint-Germain",
                        "slug": "psg",
                        "coach": {"email": "enrique@psg.demo"},
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
                        "coach": {"email": "de-zerbi@marseille.demo"},
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
                        "coach": {"email": "hutter@monaco.demo"},
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
                        "coach": {"email": "genesio@lille.demo"},
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
                        "coach": {"email": "sage@lyon.demo"},
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

        stats = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

        for comp in competitions_data:
            if target_org_slug and comp["slug"] != target_org_slug:
                continue

            self.stdout.write(f"Processing Organisation: {comp['name']}")

            try:
                with transaction.atomic():
                    try:
                        org = Organisation.objects.get(name=comp["name"])
                    except Organisation.DoesNotExist:
                        self.stdout.write(
                            self.style.ERROR(
                                f"  ERROR: Organisation '{comp['name']}' not found. Skipping."
                            )
                        )
                        stats["errors"] += 1
                        continue

                    # Bondscoach (Admin)
                    email = comp["bondscoach"]["email"]
                    try:
                        user = User.objects.get(email=email)
                        if not dry_run:
                            m, created = Membership.objects.get_or_create(
                                user=user, organisation=org
                            )
                            if created:
                                m.role = "admin"
                                m.save()
                                self.stdout.write(
                                    self.style.SUCCESS(f"  + Created Admin Membership: {email}")
                                )
                                stats["created"] += 1
                            else:
                                if m.role != "admin":
                                    m.role = "admin"
                                    m.save()
                                    self.stdout.write(
                                        self.style.WARNING(f"  * Updated Admin Membership: {email}")
                                    )
                                    stats["updated"] += 1
                                else:
                                    stats["skipped"] += 1
                        else:
                            # Dry run check
                            if Membership.objects.filter(user=user, organisation=org).exists():
                                m = Membership.objects.get(user=user, organisation=org)
                                if m.role != "admin":
                                    self.stdout.write(
                                        f"  [DRY-RUN] Would update Admin Membership: {email}"
                                    )
                                else:
                                    pass  # Skipped
                            else:
                                self.stdout.write(
                                    f"  [DRY-RUN] Would create Admin Membership: {email}"
                                )

                    except User.DoesNotExist:
                        self.stdout.write(self.style.ERROR(f"  ERROR: User '{email}' not found."))
                        stats["errors"] += 1

                    # Clubs
                    for club in comp["clubs"]:
                        # Coach (Member)
                        email = club["coach"]["email"]
                        try:
                            user = User.objects.get(email=email)
                            if not dry_run:
                                m, created = Membership.objects.get_or_create(
                                    user=user, organisation=org
                                )
                                if created:
                                    m.role = "member"
                                    m.save()
                                    self.stdout.write(
                                        self.style.SUCCESS(
                                            f"  + Created Member Membership (Coach): {email}"
                                        )
                                    )
                                    stats["created"] += 1
                                else:
                                    stats["skipped"] += 1
                            else:
                                if not Membership.objects.filter(
                                    user=user, organisation=org
                                ).exists():
                                    self.stdout.write(
                                        f"  [DRY-RUN] Would create Member"
                                        f" Membership (Coach): {email}"
                                    )

                        except User.DoesNotExist:
                            self.stdout.write(
                                self.style.ERROR(f"  ERROR: User '{email}' not found.")
                            )
                            stats["errors"] += 1

                        # Players (Member)
                        for player_name in club["players"]:
                            email = f"{player_name.lower().replace(' ', '')}@{club['slug']}.demo"
                            try:
                                user = User.objects.get(email=email)
                                if not dry_run:
                                    m, created = Membership.objects.get_or_create(
                                        user=user, organisation=org
                                    )
                                    if created:
                                        m.role = "member"
                                        m.save()
                                        # self.stdout.write(
                                        #     self.style.SUCCESS(
                                        #         f"  + Created Member Membership (Player): {email}"
                                        #     )
                                        # )
                                        stats["created"] += 1
                                    else:
                                        stats["skipped"] += 1
                                else:
                                    if not Membership.objects.filter(
                                        user=user, organisation=org
                                    ).exists():
                                        # self.stdout.write(
                                        #     f"  [DRY-RUN] Would create Member"
                                        #     f" Membership (Player): {email}"
                                        # )
                                        pass  # Too noisy for dry run to print every player

                            except User.DoesNotExist:
                                self.stdout.write(
                                    self.style.ERROR(f"  ERROR: User '{email}' not found.")
                                )
                                stats["errors"] += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  ERROR: Transaction failed for {comp['name']}: {str(e)}")
                )
                stats["errors"] += 1

        self.stdout.write("\nSummary:")
        self.stdout.write(f"Created: {stats['created']}")
        self.stdout.write(f"Updated: {stats['updated']}")
        self.stdout.write(f"Skipped: {stats['skipped']}")
        self.stdout.write(f"Errors: {stats['errors']}")
