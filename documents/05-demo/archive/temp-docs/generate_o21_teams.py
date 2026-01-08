"""
Generate O21 teams for KNVB clubs (Season 2024/2025)

Creates CSV with 270 dummy players (18 clubs × 15 players each) for O21 teams only.
"""

import csv
import random
from pathlib import Path

# Dutch names pool
FIRST_NAMES_MALE = [
    "Lars",
    "Daan",
    "Sem",
    "Milan",
    "Luuk",
    "Bram",
    "Thijs",
    "Tim",
    "Ruben",
    "Jesse",
    "Thomas",
    "Stijn",
    "Max",
    "Nick",
    "Tom",
    "Lucas",
    "Finn",
    "Jasper",
    "Noah",
    "Levi",
    "Sam",
    "Owen",
    "Jayden",
    "Ryan",
    "Julian",
    "Teun",
    "Sven",
    "Mees",
    "Joep",
    "Cas",
]

LAST_NAMES = [
    "de Jong",
    "Jansen",
    "de Vries",
    "van den Berg",
    "van Dijk",
    "Bakker",
    "Janssen",
    "Visser",
    "Smit",
    "Meijer",
    "de Boer",
    "Mulder",
    "de Groot",
    "Bos",
    "Vos",
    "Peters",
    "Hendriks",
    "van Leeuwen",
    "Dekker",
    "Brouwer",
    "de Wit",
    "Dijkstra",
    "Smits",
    "de Graaf",
    "van der Meer",
    "van der Linden",
    "Kok",
    "Jacobs",
    "de Haan",
    "Vermeulen",
    "van den Heuvel",
    "van der Veen",
    "van den Broek",
    "de Bruijn",
    "de Ruiter",
    "Willems",
    "Timmermans",
    "Groen",
    "Gerritsen",
    "Jonker",
    "van Vliet",
    "Kuiper",
    "van den Brink",
    "Scholten",
    "van de Ven",
    "Prins",
]

POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"]
KNVB_CLUBS = [
    "Ajax",
    "AZ",
    "Feyenoord",
    "PSV",
    "FC Utrecht",
    "FC Twente",
    "Heracles Almelo",
    "PEC Zwolle",
    "FC Groningen",
    "Sparta Rotterdam",
    "Willem II",
    "NAC Breda",
    "NEC",
    "Fortuna Sittard",
    "RKC Waalwijk",
    "Go Ahead Eagles",
    "Almere City",
    "SC Heerenveen",
]


def generate_unique_name(used_names: set) -> tuple[str, str]:
    """Generate unique first + last name combination."""
    for _ in range(100):
        first = random.choice(FIRST_NAMES_MALE)
        last = random.choice(LAST_NAMES)
        if (first, last) not in used_names:
            used_names.add((first, last))
            return first, last

    # Fallback: add number suffix
    first = random.choice(FIRST_NAMES_MALE)
    last = random.choice(LAST_NAMES)
    counter = 1
    while (f"{first}{counter}", last) in used_names:
        counter += 1
    used_names.add((f"{first}{counter}", last))
    return f"{first}{counter}", last


def generate_o21_teams():
    """Generate CSV with O21 teams for all 18 KNVB clubs."""

    output_file = Path(__file__).parent / "players_knvb_o21_2024_25.csv"
    used_names = set()

    rows = []

    # Generate 18 O21 teams (15 players each = 270 total)
    for club in KNVB_CLUBS:
        # 15 players per O21 team
        # 2 GK, 5 DEF, 4 MID, 4 FWD
        position_counts = {"Goalkeeper": 2, "Defender": 5, "Midfielder": 4, "Forward": 4}

        for position, count in position_counts.items():
            for _ in range(count):
                first_name, last_name = generate_unique_name(used_names)
                age = random.randint(17, 21)  # O21 age range

                rows.append(
                    {
                        "federation": "KNVB",
                        "club": club,
                        "team_type": "O21",
                        "first_name": first_name,
                        "last_name": last_name,
                        "age": age,
                        "position": position,
                    }
                )

    # Write to CSV
    with open(output_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "federation",
                "club",
                "team_type",
                "first_name",
                "last_name",
                "age",
                "position",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"✅ Generated {output_file}")
    print(f"   📊 Total players: {len(rows)}")
    print(f"   🏆 O21 teams: 18 clubs × 15 players = 270 players")
    print()
    print("Team composition per club:")
    print("  - 2 Goalkeepers")
    print("  - 5 Defenders")
    print("  - 4 Midfielders")
    print("  - 4 Forwards")
    print()
    print("Age range: 17-21 years (O21 youth category)")


if __name__ == "__main__":
    generate_o21_teams()
