"""
TeamReel Level 3 Seeder: Clubs (Root Projects)

Seeds 92 European football clubs from top leagues as root Projects (parent_project=NULL).

Leagues:
- Eredivisie (NL): 18 clubs
- Bundesliga (DE): 18 clubs
- Jupiler Pro League (BE): 16 clubs
- Premier League (EN): 20 clubs
- Serie A (IT): 20 clubs

Usage:
    $env:DATABASE_URL="postgresql://..."; python manage.py seed_level_3_clubs
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models.project import Project

User = get_user_model()


class Command(BaseCommand):
    help = "Seed Level 3: 92 European Football Clubs (root projects from top leagues)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n⚽ Level 3: European Football Clubs\n"))
        self.stdout.write("=" * 70)

        # Get admin user
        try:
            admin = User.objects.get(email="admin@teamreel.demo")
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Admin user not found!"))
            return

        # Get organisations
        try:
            knvb = Organisation.objects.get(name="KNVB")
            dfb = Organisation.objects.get(name="DFB")
            rbfa = Organisation.objects.get(name="RBFA")
            the_fa = Organisation.objects.get(name="The FA")
            figc = Organisation.objects.get(name="FIGC")
        except Organisation.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f"❌ Organisation not found: {e}"))
            return

        clubs_data = {
            "KNVB": [
                ("PSV", "Eindhoven", "Philips Stadion", 1913, ["#ED1C24", "#FFFFFF"]),
                ("Ajax", "Amsterdam", "Johan Cruijff ArenA", 1900, ["#D2122E", "#FFFFFF"]),
                ("Feyenoord", "Rotterdam", "De Kuip", 1908, ["#E30613", "#FFFFFF"]),
                ("FC Twente", "Enschede", "De Grolsch Veste", 1965, ["#E1251B", "#FFFFFF"]),
                ("AZ", "Alkmaar", "AFAS Stadion", 1967, ["#C8102E", "#FFFFFF"]),
                ("FC Utrecht", "Utrecht", "Stadion Galgenwaard", 1970, ["#C8102E", "#FFFFFF"]),
                ("Go Ahead Eagles", "Deventer", "De Adelaarshorst", 1902, ["#FFED00", "#E30613"]),
                (
                    "Fortuna Sittard",
                    "Sittard",
                    "Fortuna Sittard Stadion",
                    1968,
                    ["#FFE500", "#008F39"],
                ),
                ("NEC", "Nijmegen", "Stadion De Goffert", 1900, ["#C8102E", "#000000"]),
                ("Willem II", "Tilburg", "Koning Willem II Stadion", 1896, ["#EF3340", "#FFFFFF"]),
                ("NAC Breda", "Breda", "Rat Verlegh Stadion", 1912, ["#FFE500", "#000000"]),
                (
                    "SC Heerenveen",
                    "Heerenveen",
                    "Abe Lenstra Stadion",
                    1920,
                    ["#003DA5", "#FFFFFF"],
                ),
                ("FC Groningen", "Groningen", "Euroborg", 1971, ["#008F39", "#FFFFFF"]),
                ("PEC Zwolle", "Zwolle", "MAC³PARK Stadion", 1910, ["#1E3A8A", "#FFFFFF"]),
                ("Heracles Almelo", "Almelo", "Erve Asito", 1903, ["#000000", "#FFFFFF"]),
                ("Sparta Rotterdam", "Rotterdam", "Het Kasteel", 1888, ["#E30613", "#FFFFFF"]),
                ("Almere City", "Almere", "Yanmar Stadion", 2001, ["#000000", "#FFE500"]),
                ("RKC Waalwijk", "Waalwijk", "Mandemakers Stadion", 1940, ["#FFE500", "#1E3A8A"]),
            ],
            "DFB": [
                ("Bayern München", "München", "Allianz Arena", 1900, ["#DC052D", "#FFFFFF"]),
                ("Bayer Leverkusen", "Leverkusen", "BayArena", 1904, ["#E32221", "#000000"]),
                (
                    "Eintracht Frankfurt",
                    "Frankfurt",
                    "Deutsche Bank Park",
                    1899,
                    ["#E1000F", "#000000"],
                ),
                ("RB Leipzig", "Leipzig", "Red Bull Arena", 2009, ["#DD0741", "#FFFFFF"]),
                (
                    "Borussia Dortmund",
                    "Dortmund",
                    "Signal Iduna Park",
                    1909,
                    ["#FDE100", "#000000"],
                ),
                ("VfB Stuttgart", "Stuttgart", "Mercedes-Benz Arena", 1893, ["#E32221", "#FFFFFF"]),
                ("VfL Wolfsburg", "Wolfsburg", "Volkswagen Arena", 1945, ["#65B32E", "#FFFFFF"]),
                ("SC Freiburg", "Freiburg", "Europa-Park Stadion", 1904, ["#E32221", "#FFFFFF"]),
                (
                    "Borussia Mönchengladbach",
                    "Mönchengladbach",
                    "Borussia-Park",
                    1900,
                    ["#000000", "#FFFFFF"],
                ),
                ("FSV Mainz 05", "Mainz", "MEWA Arena", 1905, ["#C3161C", "#FFFFFF"]),
                ("Werder Bremen", "Bremen", "Weserstadion", 1899, ["#1D9053", "#FFFFFF"]),
                ("FC Augsburg", "Augsburg", "WWK Arena", 1907, ["#BA3733", "#FFFFFF"]),
                ("Union Berlin", "Berlin", "An der Alten Försterei", 1966, ["#EB1923", "#FFFFFF"]),
                ("1. FC Heidenheim", "Heidenheim", "Voith-Arena", 1846, ["#003DA5", "#E32221"]),
                ("VfL Bochum", "Bochum", "Vonovia Ruhrstadion", 1848, ["#005CA9", "#FFFFFF"]),
                ("TSG Hoffenheim", "Sinsheim", "PreZero Arena", 1899, ["#1961B5", "#FFFFFF"]),
                ("FC St. Pauli", "Hamburg", "Millerntor-Stadion", 1910, ["#5A3A29", "#FFFFFF"]),
                ("Holstein Kiel", "Kiel", "Holstein-Stadion", 1900, ["#003DA5", "#FFFFFF"]),
            ],
            "RBFA": [
                ("Club Brugge", "Brugge", "Jan Breydel Stadion", 1891, ["#003DA5", "#000000"]),
                (
                    "Union Saint-Gilloise",
                    "Brussels",
                    "Joseph Marien Stadion",
                    1897,
                    ["#FFE500", "#1E3A8A"],
                ),
                ("Royal Antwerp", "Antwerpen", "Bosuilstadion", 1880, ["#E32221", "#FFFFFF"]),
                ("KAA Gent", "Gent", "Ghelamco Arena", 1900, ["#003DA5", "#FFFFFF"]),
                ("RSC Anderlecht", "Brussels", "Lotto Park", 1908, ["#71368A", "#FFFFFF"]),
                ("KRC Genk", "Genk", "Cegeka Arena", 1988, ["#005CA9", "#FFFFFF"]),
                ("Standard Liège", "Liège", "Stade Maurice Dufrasne", 1898, ["#E32221", "#FFFFFF"]),
                ("Cercle Brugge", "Brugge", "Jan Breydel Stadion", 1899, ["#008F39", "#000000"]),
                ("OH Leuven", "Leuven", "Den Dreef", 2002, ["#FFFFFF", "#E32221"]),
                ("KV Mechelen", "Mechelen", "AFAS Stadion", 1904, ["#FFE500", "#E32221"]),
                (
                    "Sporting Charleroi",
                    "Charleroi",
                    "Stade du Pays de Charleroi",
                    1904,
                    ["#000000", "#FFFFFF"],
                ),
                ("STVV", "Sint-Truiden", "Stayen", 1924, ["#FFE500", "#1E3A8A"]),
                ("KVC Westerlo", "Westerlo", "Het Kuipje", 1933, ["#FFE500", "#1E3A8A"]),
                ("Beerschot VA", "Antwerpen", "Olympisch Stadion", 1899, ["#71368A", "#FFFFFF"]),
                ("KAS Eupen", "Eupen", "Kehrwegstadion", 1945, ["#003DA5", "#FFFFFF"]),
                (
                    "FCV Dender",
                    "Denderleeuw",
                    "Florent Beeckmanstadion",
                    1926,
                    ["#FFE500", "#000000"],
                ),
            ],
            "The FA": [
                ("Liverpool", "Liverpool", "Anfield", 1892, ["#C8102E", "#FFFFFF"]),
                ("Arsenal", "London", "Emirates Stadium", 1886, ["#EF0107", "#FFFFFF"]),
                ("Chelsea", "London", "Stamford Bridge", 1905, ["#034694", "#FFFFFF"]),
                ("Manchester City", "Manchester", "Etihad Stadium", 1880, ["#6CABDD", "#FFFFFF"]),
                ("Newcastle United", "Newcastle", "St James' Park", 1892, ["#000000", "#FFFFFF"]),
                ("Manchester United", "Manchester", "Old Trafford", 1878, ["#DA291C", "#FFFFFF"]),
                (
                    "Tottenham Hotspur",
                    "London",
                    "Tottenham Hotspur Stadium",
                    1882,
                    ["#132257", "#FFFFFF"],
                ),
                ("Nottingham Forest", "Nottingham", "City Ground", 1865, ["#DD0000", "#FFFFFF"]),
                (
                    "Brighton & Hove Albion",
                    "Brighton",
                    "Amex Stadium",
                    1901,
                    ["#0057B8", "#FFFFFF"],
                ),
                ("Fulham", "London", "Craven Cottage", 1879, ["#000000", "#FFFFFF"]),
                ("Aston Villa", "Birmingham", "Villa Park", 1874, ["#670E36", "#95BFE5"]),
                (
                    "AFC Bournemouth",
                    "Bournemouth",
                    "Vitality Stadium",
                    1899,
                    ["#DA291C", "#000000"],
                ),
                ("West Ham United", "London", "London Stadium", 1895, ["#7A263A", "#1BB1E7"]),
                ("Everton", "Liverpool", "Goodison Park", 1878, ["#003399", "#FFFFFF"]),
                ("Leicester City", "Leicester", "King Power Stadium", 1884, ["#003090", "#FDBE11"]),
                ("Brentford", "London", "Gtech Community Stadium", 1889, ["#D20000", "#FFFFFF"]),
                ("Crystal Palace", "London", "Selhurst Park", 1905, ["#1B458F", "#C4122E"]),
                (
                    "Wolverhampton Wanderers",
                    "Wolverhampton",
                    "Molineux Stadium",
                    1877,
                    ["#FDB913", "#000000"],
                ),
                ("Ipswich Town", "Ipswich", "Portman Road", 1878, ["#0033A0", "#FFFFFF"]),
                ("Southampton", "Southampton", "St Mary's Stadium", 1885, ["#D71920", "#FFFFFF"]),
            ],
            "FIGC": [
                ("Inter Milan", "Milano", "San Siro", 1908, ["#0068A8", "#000000"]),
                ("Atalanta", "Bergamo", "Gewiss Stadium", 1907, ["#1A54A1", "#000000"]),
                ("Napoli", "Napoli", "Stadio Diego Armando Maradona", 1926, ["#0D4BA6", "#FFFFFF"]),
                ("Juventus", "Torino", "Allianz Stadium", 1897, ["#000000", "#FFFFFF"]),
                ("Lazio", "Roma", "Stadio Olimpico", 1900, ["#87CEEB", "#FFFFFF"]),
                ("Fiorentina", "Firenze", "Stadio Artemio Franchi", 1926, ["#6C2E91", "#FFFFFF"]),
                ("AC Milan", "Milano", "San Siro", 1899, ["#FB090B", "#000000"]),
                ("Bologna", "Bologna", "Stadio Renato Dall'Ara", 1909, ["#003082", "#CC092F"]),
                ("AS Roma", "Roma", "Stadio Olimpico", 1927, ["#8B0304", "#F5A623"]),
                ("Udinese", "Udine", "Bluenergy Stadium", 1896, ["#000000", "#FFFFFF"]),
                ("Torino", "Torino", "Stadio Olimpico Grande Torino", 1906, ["#8B1212", "#FFFFFF"]),
                ("Empoli", "Empoli", "Stadio Carlo Castellani", 1920, ["#0066B2", "#FFFFFF"]),
                ("Parma", "Parma", "Stadio Ennio Tardini", 1913, ["#FFD700", "#003DA5"]),
                (
                    "Hellas Verona",
                    "Verona",
                    "Stadio Marcantonio Bentegodi",
                    1903,
                    ["#0066B2", "#FFD700"],
                ),
                ("Como 1907", "Como", "Stadio Giuseppe Sinigaglia", 1907, ["#003DA5", "#FFFFFF"]),
                ("Cagliari", "Cagliari", "Unipol Domus", 1920, ["#AD1F23", "#003082"]),
                ("Genoa", "Genova", "Stadio Luigi Ferraris", 1893, ["#D2122E", "#003082"]),
                ("Lecce", "Lecce", "Stadio Via del Mare", 1908, ["#FFE500", "#D2122E"]),
                ("Venezia", "Venezia", "Stadio Pier Luigi Penzo", 1907, ["#FF6A00", "#008F39"]),
                ("Monza", "Monza", "U-Power Stadium", 1912, ["#E32221", "#FFFFFF"]),
            ],
        }

        total_created = 0
        total_existing = 0

        for federation_name, clubs in clubs_data.items():
            if federation_name == "KNVB":
                org = knvb
                country = "Netherlands"
            elif federation_name == "DFB":
                org = dfb
                country = "Germany"
            elif federation_name == "RBFA":
                org = rbfa
                country = "Belgium"
            elif federation_name == "The FA":
                org = the_fa
                country = "England"
            elif federation_name == "FIGC":
                org = figc
                country = "Italy"

            self.stdout.write(f"\n🏴 {federation_name} ({country})")
            self.stdout.write("-" * 70)

            for name, city, stadium, founded, colors in clubs:
                project, created = Project.objects.get_or_create(
                    name=name,
                    organisation=org,
                    parent_project=None,  # ROOT PROJECT (CRITICAL!)
                    defaults={
                        "description": f"{name} - {city}",
                        "creator": admin,
                        "metadata": {
                            "city": city,
                            "stadium": stadium,
                            "founded": founded,
                            "country": country,
                            "colors": colors,
                            "type": "club",
                        },
                    },
                )
                if created:
                    total_created += 1
                    self.stdout.write(f"  ✓ {name} ({city})")
                else:
                    total_existing += 1
                    self.stdout.write(f"  ↻ {name} (exists)")

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Level 3 Complete"))
        self.stdout.write(f"   Created:  {total_created}")
        self.stdout.write(f"   Existing: {total_existing}")
        self.stdout.write(f"   Total:    {total_created + total_existing} clubs")
        self.stdout.write("=" * 70 + "\n")
