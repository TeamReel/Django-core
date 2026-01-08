"""
Generate dummy players for missing KNVB teams in Season 2024/2025.

Missing teams:
- 18 O21 teams (all clubs)
- 3 Vrouwen teams (NEC, SC Heerenveen, Willem II)
- 14 Reserve teams
"""

import csv
import random
from datetime import datetime, timedelta

# Dutch name pools
MALE_FIRST_NAMES = [
    "Lars",
    "Daan",
    "Sem",
    "Lucas",
    "Milan",
    "Levi",
    "Luuk",
    "Bram",
    "Thijs",
    "Finn",
    "Tim",
    "Max",
    "Sven",
    "Rick",
    "Ruben",
    "Kevin",
    "Thomas",
    "Jasper",
    "Niels",
    "Tom",
    "Mike",
    "Jelle",
    "Robin",
    "Dennis",
    "Nick",
    "Mark",
    "Koen",
    "Stijn",
    "Joris",
    "Martijn",
]

FEMALE_FIRST_NAMES = [
    "Emma",
    "Sophie",
    "Julia",
    "Lisa",
    "Anna",
    "Sanne",
    "Eva",
    "Lotte",
    "Laura",
    "Sarah",
    "Femke",
    "Iris",
    "Maud",
    "Evi",
    "Noa",
    "Lynn",
    "Rosa",
    "Fleur",
    "Amber",
    "Nina",
    "Isa",
    "Roos",
    "Fenna",
    "Liv",
    "Amy",
    "Tess",
    "Luna",
    "Julie",
    "Bo",
    "Lily",
]

LAST_NAMES = [
    "de Jong",
    "Jansen",
    "de Vries",
    "van den Berg",
    "van Dijk",
    "Bakker",
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
    "Brink",
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
    "de Bruin",
    "van der Heijden",
    "Schouten",
    "van Beek",
    "Willems",
    "van Vliet",
    "van de Ven",
    "Hoekstra",
    "Maas",
    "Verhoeven",
    "Koster",
    "van Dam",
    "van der Wal",
]

POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"]

# All 18 KNVB Eredivisie clubs
CLUBS = [
    "Ajax",
    "PSV",
    "Feyenoord",
    "AZ",
    "FC Twente",
    "FC Utrecht",
    "FC Groningen",
    "Almere City",
    "Fortuna Sittard",
    "Go Ahead Eagles",
    "Heracles Almelo",
    "NAC Breda",
    "NEC",
    "PEC Zwolle",
    "RKC Waalwijk",
    "SC Heerenveen",
    "Sparta Rotterdam",
    "Willem II",
]

# Clubs missing Vrouwen teams
MISSING_VROUWEN = ["NEC", "SC Heerenveen", "Willem II"]

# Clubs with Reserve teams (14 clubs)
CLUBS_WITH_RESERVES = [
    "Almere City",
    "FC Groningen",
    "FC Twente",
    "Feyenoord",
    "Fortuna Sittard",
    "Go Ahead Eagles",
    "Heracles Almelo",
    "NAC Breda",
    "NEC",
    "PEC Zwolle",
    "RKC Waalwijk",
    "SC Heerenveen",
    "Sparta Rotterdam",
    "Willem II",
]


def generate_birth_date(team_type):
    """Generate realistic birth date based on team type."""
    today = datetime.now()

    if team_type == "O21":
        # O21: 17-21 years old (born 2003-2007)
        min_age, max_age = 17, 21
    elif team_type == "Reserves":
        # Reserves: 20-28 years old (born 1996-2004)
        min_age, max_age = 20, 28
    elif team_type == "Vrouwen":
        # Vrouwen: 18-32 years old (born 1992-2006)
        min_age, max_age = 18, 32
    else:
        min_age, max_age = 18, 35

    age = random.randint(min_age, max_age)
    birth_year = today.year - age
    birth_month = random.randint(1, 12)
    birth_day = random.randint(1, 28)

    return f"{birth_year:04d}-{birth_month:02d}-{birth_day:02d}"


def generate_players_for_team(club, team_type, num_players=15):
    """Generate dummy players for a team."""
    players = []

    # Determine gender based on team type
    is_female_team = team_type == "Vrouwen"
    first_names = FEMALE_FIRST_NAMES if is_female_team else MALE_FIRST_NAMES

    # Position distribution: 2 keepers, 5 defenders, 4 midfielders, 4 forwards
    positions_pool = ["Goalkeeper"] * 2 + ["Defender"] * 5 + ["Midfielder"] * 4 + ["Forward"] * 4
    random.shuffle(positions_pool)

    used_names = set()

    for i in range(num_players):
        # Generate unique name
        attempts = 0
        while attempts < 100:
            first_name = random.choice(first_names)
            last_name = random.choice(LAST_NAMES)
            full_name = f"{first_name} {last_name}"

            if full_name not in used_names:
                used_names.add(full_name)
                break
            attempts += 1
        else:
            # Fallback: add number suffix
            first_name = random.choice(first_names)
            last_name = random.choice(LAST_NAMES)
            full_name = f"{first_name} {last_name} {i+1}"

        position = positions_pool[i] if i < len(positions_pool) else random.choice(POSITIONS)

        player = {
            "federation": "KNVB",
            "club": club,
            "team_type": team_type,
            "first_name": first_name,
            "last_name": last_name,
            "nationality": "Netherlands",
            "birth_date": generate_birth_date(team_type),
            "position": position,
            "shirt_number": str(i + 1),
        }

        players.append(player)

    return players


def main():
    all_players = []

    # Generate O21 teams for all 18 clubs
    print("Generating O21 teams...")
    for club in CLUBS:
        players = generate_players_for_team(club, "O21", 15)
        all_players.extend(players)
        print(f"Generated 15 players for {club} O21")

    # Generate missing Vrouwen teams
    print("\nGenerating missing Vrouwen teams...")
    for club in MISSING_VROUWEN:
        players = generate_players_for_team(club, "Vrouwen", 15)
        all_players.extend(players)
        print(f"Generated 15 players for {club} Vrouwen")

    # Generate Reserve teams
    print("\nGenerating Reserve teams...")
    for club in CLUBS_WITH_RESERVES:
        players = generate_players_for_team(club, "Reserves", 15)
        all_players.extend(players)
        print(f"Generated 15 players for {club} Reserves")

    # Write to CSV
    import os

    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "players_knvb_missing_2024_25.csv")

    fieldnames = [
        "federation",
        "club",
        "team_type",
        "first_name",
        "last_name",
        "nationality",
        "birth_date",
        "position",
        "shirt_number",
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_players)

    print(f"\nTotal players generated: {len(all_players)}")
    print(f"Saved to: {output_path}")
    print(f"Breakdown:")
    print(f"  - O21 teams: 18 clubs × 15 players = {18 * 15}")
    print(f"  - Vrouwen teams: 3 clubs × 15 players = {3 * 15}")
    print(f"  - Reserve teams: 14 clubs × 15 players = {14 * 15}")
    print(f"  - Total: {18 * 15 + 3 * 15 + 14 * 15} players")


if __name__ == "__main__":
    main()
