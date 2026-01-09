"""
Analyze SoccerWiki Nederland JSON structure and content.
"""

import json
from pathlib import Path
from collections import Counter

# Load SoccerWiki data
# Prefer the archive location to keep repo root clean.
_repo_root = Path(__file__).parent.parent
_archive_path = _repo_root / "archive" / "data" / "soccerwiki" / "SoccerWiki_Nederland.json"
_root_path = _repo_root / "SoccerWiki_Nederland.json"
json_path = _archive_path if _archive_path.exists() else _root_path

if not json_path.exists():
    raise FileNotFoundError(
        "SoccerWiki JSON not found. Expected at either: " f"{_archive_path} or {_root_path}"
    )

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print("=" * 80)
print("SOCCERWIKI NEDERLAND - DATA ANALYSE")
print("=" * 80)

# Player Data Analysis
print("\n" + "=" * 80)
print("SPELERS DATA")
print("=" * 80)

players = data.get("PlayerData", [])
print(f"\n📊 Totaal aantal spelers: {len(players):,}")

# Sample player structure
if players:
    print("\n📋 Speler velden (eerste speler):")
    sample_player = players[0]
    for key, value in sample_player.items():
        value_str = str(value)[:60] + "..." if len(str(value)) > 60 else str(value)
        print(f"  - {key:<20} = {value_str}")

# Check for nationality data (might be in names like "VAN DEN BERG" vs "MESSI")
players_with_photos = sum(1 for p in players if p.get("ImageURL") and p["ImageURL"].strip())
print(
    f"\n📸 Spelers met foto URL: {players_with_photos:,} ({players_with_photos/len(players)*100:.1f}%)"
)

# Sample some international players
print("\n🌍 Voorbeeld buitenlandse spelers (op basis van namen):")
intl_examples = [
    p
    for p in players[:500]
    if any(
        name in p.get("Surname", "").upper()
        for name in ["RULLI", "BENITEZ", "SUTALO", "DEST", "HWANG", "UEDA"]
    )
]
for player in intl_examples[:10]:
    print(f"  - {player['Forename']} {player['Surname']} (ID: {player['ID']})")

# Club Data Analysis
print("\n" + "=" * 80)
print("CLUBS DATA")
print("=" * 80)

clubs = data.get("ClubData", [])
print(f"\n📊 Totaal aantal clubs: {len(clubs)}")

# Sample club structure
if clubs:
    print("\n📋 Club velden (eerste club):")
    sample_club = clubs[0]
    for key, value in sample_club.items():
        print(f"  - {key:<20} = {value}")

# Eredivisie clubs (based on well-known names)
eredivisie_names = [
    "Ajax",
    "PSV",
    "Feyenoord",
    "AZ",
    "FC Twente",
    "FC Utrecht",
    "Go Ahead Eagles",
    "FC Groningen",
    "Fortuna Sittard",
    "Heracles Almelo",
    "NAC Breda",
    "NEC Nijmegen",
    "PEC Zwolle",
    "RKC Waalwijk",
    "Sparta Rotterdam",
    "Almere City",
    "Willem II",
]

eredivisie_clubs = [c for c in clubs if c["Name"] in eredivisie_names]
print(f"\n⚽ Eredivisie clubs gevonden: {len(eredivisie_clubs)}")
for club in sorted(eredivisie_clubs, key=lambda x: x["Name"]):
    logo_status = "✅" if club.get("ImageURL") else "❌"
    print(f"  {logo_status} {club['Name']:<25} (ID: {club['ID']}, Short: {club['ShortName']})")

clubs_with_logos = sum(1 for c in clubs if c.get("ImageURL") and c["ImageURL"].strip())
print(
    f"\n📸 Clubs met logo URL: {clubs_with_logos}/{len(clubs)} ({clubs_with_logos/len(clubs)*100:.1f}%)"
)

# League Data
print("\n" + "=" * 80)
print("COMPETITIES DATA")
print("=" * 80)

leagues = data.get("LeagueData", [])
print(f"\n📊 Totaal competities: {len(leagues)}")
for league in leagues:
    print(f"  - {league['Name']:<30} (ID: {league['ID']})")

# Cup Data
cups = data.get("CupData", [])
print(f"\n🏆 Totaal bekers: {len(cups)}")
for cup in cups:
    print(f"  - {cup['Name']:<30} (ID: {cup['ID']})")

# Stadium Data
print("\n" + "=" * 80)
print("STADION DATA")
print("=" * 80)

stadiums = data.get("StadiumData", [])
print(f"\n📊 Totaal stadions: {len(stadiums)}")

# Sample stadiums
if stadiums:
    print("\n📋 Stadion velden (eerste stadion):")
    sample_stadium = stadiums[0]
    for key, value in sample_stadium.items():
        print(f"  - {key:<20} = {value}")

# Major stadiums
major_stadiums = [
    "Johan Cruyff Arena",
    "De Kuip",
    "Philips Stadion",
    "AFAS Stadion",
    "De Grolsch Veste",
]
print(f"\n🏟️ Bekende stadions:")
for stadium in stadiums:
    if stadium["Name"] in major_stadiums:
        print(f"  - {stadium['Name']:<30} (ID: {stadium['ID']})")

# Manager Data
print("\n" + "=" * 80)
print("TRAINER DATA")
print("=" * 80)

managers = data.get("ManagerData", [])
print(f"\n📊 Totaal trainers: {len(managers)}")

managers_with_photos = sum(1 for m in managers if m.get("ImageURL") and m["ImageURL"].strip())
print(
    f"📸 Trainers met foto URL: {managers_with_photos}/{len(managers)} ({managers_with_photos/len(managers)*100:.1f}%)"
)

# Famous managers
famous = ["Frank de Boer", "Ronald Koeman", "Erik ten Hag", "Peter Bosz", "Arne Slot"]
print(f"\n👔 Bekende trainers:")
for manager in managers:
    full_name = f"{manager.get('Forename', '')} {manager.get('Surname', '')}"
    if any(name in full_name for name in famous):
        photo_status = "📸" if manager.get("ImageURL") and manager["ImageURL"].strip() else "❌"
        print(f"  {photo_status} {full_name:<30} (ID: {manager['ID']})")

# Summary
print("\n" + "=" * 80)
print("METADATA SAMENVATTING")
print("=" * 80)
print(
    f"""
✅ BESCHIKBAAR:
  - Speler ID, Naam (Forename + Surname)
  - Speler foto URL (niet allemaal)
  - Club ID, Naam, Short Name, Logo URL
  - Competitie data (Eredivisie, Eerste Divisie, etc.)
  - Beker data (KNVB Beker, etc.)
  - Stadion namen (geen adressen)
  - Trainer data met foto's

❌ NIET BESCHIKBAAR in SoccerWiki JSON:
  - Geboortedatum spelers
  - Nationaliteit spelers
  - Positie spelers
  - Rugnummer spelers
  - Contracten / salaris
  - Wedstrijd statistieken

💡 VOOR VOLLEDIGE DATA:
  - Combineer met jouw Eredivisie CSV (voor positie, rugnummer, geboortedatum)
  - Of gebruik European Soccer Database (voor historische stats)
"""
)

print("=" * 80)
print("✅ Analyse compleet!")
print("=" * 80)
