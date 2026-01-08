"""
Generate dummy players for Jong/O21, Reserves, and Vrouwen teams.
Creates CSV with 15 players per team for all 18 KNVB clubs.
"""

import csv
import random
from datetime import datetime, timedelta

# Dutch first names
FIRST_NAMES_MALE = [
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
    "Stijn",
    "Jesse",
    "Julian",
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
    "Joey",
]

FIRST_NAMES_FEMALE = [
    "Emma",
    "Sophie",
    "Julia",
    "Lisa",
    "Anna",
    "Sarah",
    "Laura",
    "Mila",
    "Eva",
    "Noa",
    "Lynn",
    "Fleur",
    "Lotte",
    "Roos",
    "Sanne",
    "Nina",
    "Isa",
    "Floor",
    "Amber",
    "Lieke",
    "Demi",
    "Fenna",
    "Iris",
    "Luna",
    "Sara",
    "Femke",
    "Evi",
    "Kim",
    "Lisa",
    "Julie",
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

POSITIONS = ["Keeper", "Verdediger", "Middenvelder", "Aanvaller"]

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

TEAM_TYPES = ["Jong", "Reserves", "Vrouwen"]


def generate_birth_date(team_type):
    """Generate realistic birth date based on team type."""
    current_year = 2024
    if team_type == "Jong":
        # 17-21 years old
        age = random.randint(17, 21)
    elif team_type == "Reserves":
        # 20-28 years old
        age = random.randint(20, 28)
    else:  # Vrouwen
        # 18-32 years old
        age = random.randint(18, 32)

    birth_year = current_year - age
    month = random.randint(1, 12)
    day = random.randint(1, 28)  # Safe for all months
    return f"{birth_year}-{month:02d}-{day:02d}"


def generate_players_for_team(club, team_type):
    """Generate 15 players for a team."""
    players = []

    # Select name pool based on team type
    if team_type == "Vrouwen":
        first_names = FIRST_NAMES_FEMALE
        nationality = "NED"  # Mostly Dutch for women's teams
    else:
        first_names = FIRST_NAMES_MALE
        nationality = "NED"

    # Generate 15 players
    used_names = set()
    while len(players) < 15:
        first_name = random.choice(first_names)
        last_name = random.choice(LAST_NAMES)
        full_name = f"{first_name} {last_name}"

        # Avoid duplicates
        if full_name in used_names:
            continue
        used_names.add(full_name)

        # Position distribution: 2 keepers, 5 defenders, 4 midfielders, 4 attackers
        if len(players) < 2:
            position = "Keeper"
        elif len(players) < 7:
            position = "Verdediger"
        elif len(players) < 11:
            position = "Middenvelder"
        else:
            position = "Aanvaller"

        player = {
            "federation": "KNVB",
            "club": club,
            "team_type": team_type,
            "first_name": first_name,
            "last_name": last_name,
            "nationality": nationality,
            "birth_date": generate_birth_date(team_type),
            "position": position,
            "shirt_number": len(players) + 1,
        }
        players.append(player)

    return players


def main():
    """Generate reserve teams CSV."""
    output_file = "documents/05-demo/players_knvb_reserves_2024_25.csv"

    all_players = []

    for club in CLUBS:
        for team_type in TEAM_TYPES:
            players = generate_players_for_team(club, team_type)
            all_players.extend(players)
            print(f"Generated {len(players)} players for {club} {team_type}")

    # Write to CSV
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

    import os

    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "players_knvb_reserves_2024_25.csv")

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_players)

    print(f"\nTotal players generated: {len(all_players)}")
    print(f"Saved to: {output_path}")
    print(
        f"Breakdown: {len(CLUBS)} clubs × {len(TEAM_TYPES)} team types × 15 players = {len(all_players)}"
    )


if __name__ == "__main__":
    main()
