#!/usr/bin/env python
"""
Seed players with photos for Eredivisie eerste elftallen.

This script:
1. Removes existing users from eerste elftallen (teams ending in ' 1')
2. Creates new users based on SoccerWiki player data with photos
3. Assigns them to eerste elftallen (distributed across clubs)
4. Sets avatar URLs to S3 player photos

Usage:
    python scripts/seed_players_with_photos.py --dry-run
    python scripts/seed_players_with_photos.py
"""

import argparse
import json
import os
import random
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

from django.db import transaction
from accounts.models import User
from projects.models import Project, ProjectMembership
from organisations.models import Organisation


# Club ID to SoccerWiki ID mapping (for distributing players)
CLUB_SOCCERWIKI_MAP = {
    "Ajax": 180,
    "PSV": 201,
    "Feyenoord": 192,
    "AZ": 179,
    "FC Twente": 188,
    "FC Utrecht": 189,
    "FC Groningen": 187,
    "SC Heerenveen": 205,
    "Vitesse": 210,  # if exists
    "NEC": 200,
    "Willem II": 212,
    "Sparta Rotterdam": 206,
    "Fortuna Sittard": 193,
    "RKC Waalwijk": 203,
    "Go Ahead Eagles": 194,
    "Heracles Almelo": 197,
    "PEC Zwolle": 191,
    "NAC Breda": 199,
    "Almere City": 997,
}


def load_players_with_photos(import_results_path: str) -> list[dict]:
    """Load players from import results."""
    with open(import_results_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("players", [])


def load_soccerwiki_data(json_path: str) -> dict:
    """Load full SoccerWiki data."""
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_eerste_elftallen() -> list[Project]:
    """Get all eerste elftallen (teams ending in ' 1') within KNVB."""
    knvb = Organisation.objects.filter(name__icontains="KNVB").first()
    if not knvb:
        print("❌ KNVB organisation not found!")
        return []

    return list(Project.objects.filter(
        name__endswith=" 1",
        organisation=knvb
    ).exclude(
        name__icontains="O21"
    ).exclude(
        name__icontains="U21"
    ).exclude(
        name__icontains="Vrouwen"
    ))


def remove_existing_members(teams: list[Project], dry_run: bool = False) -> int:
    """Remove all existing members from teams."""
    removed = 0

    for team in teams:
        memberships = ProjectMembership.objects.filter(project=team)
        count = memberships.count()

        if count > 0:
            print(f"  🗑️  {team.name}: removing {count} members")

            if not dry_run:
                # Get users to potentially delete
                users = [m.user for m in memberships]
                memberships.delete()

                # Delete users that have no other memberships and aren't superusers
                for user in users:
                    if not user.is_superuser and not ProjectMembership.objects.filter(user=user).exists():
                        user.delete()

            removed += count

    return removed


def find_team_for_club_name(teams: list[Project], club_name: str) -> Project | None:
    """Find a team that matches the club name."""
    club_lower = club_name.lower()

    for team in teams:
        team_lower = team.name.lower()
        # Match patterns like "Ajax 1", "PSV 1", etc.
        if club_lower in team_lower:
            return team

    return None


def seed_players(
    players: list[dict],
    soccerwiki_data: dict,
    teams: list[Project],
    dry_run: bool = False
) -> tuple[int, int]:
    """
    Create users from player data and assign to teams.

    Returns:
        Tuple of (users_created, memberships_created)
    """
    users_created = 0
    memberships_created = 0

    # Build player ID to player data mapping from SoccerWiki
    player_lookup = {p["ID"]: p for p in soccerwiki_data.get("PlayerData", [])}

    # Distribute players evenly across teams
    players_per_team = len(players) // len(teams) if teams else 0
    team_assignments = {team.id: [] for team in teams}

    # Shuffle players for random distribution
    shuffled_players = players.copy()
    random.shuffle(shuffled_players)

    # Assign players to teams (round-robin)
    team_list = list(teams)
    for i, player in enumerate(shuffled_players):
        if i >= len(teams) * 25:  # Max 25 players per team
            break
        team = team_list[i % len(team_list)]
        team_assignments[team.id].append(player)

    # Create users and memberships
    for team in teams:
        assigned_players = team_assignments[team.id]
        print(f"\n📋 {team.name}: assigning {len(assigned_players)} players")

        for player in assigned_players:
            player_id = player["id"]
            name = player["name"]
            s3_url = player["s3_url"]

            # Get full name from SoccerWiki data
            sw_player = player_lookup.get(player_id, {})
            forename = sw_player.get("Forename", name.split()[0] if name else "Player")
            surname = sw_player.get("Surname", name.split()[-1] if name and len(name.split()) > 1 else str(player_id))

            # Create email from name
            email = f"{forename.lower()}.{surname.lower()}@teamreel.demo".replace(" ", "")

            if dry_run:
                print(f"    Would create: {forename} {surname} ({email}) → {team.name}")
                users_created += 1
                memberships_created += 1
                continue

            # Create or get user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": forename,
                    "last_name": surname,
                    "is_active": True,
                    "email_verified": True,
                }
            )

            if created:
                # Set avatar URL - store S3 path in avatar field
                # Note: avatar is ImageField, we store the relative path
                user.avatar = f"players/{player_id}.png"
                user.set_password("demo123")  # Set a default password
                user.save()
                users_created += 1
                print(f"    ✅ Created: {forename} {surname}")
            else:
                # Update existing user's avatar
                user.avatar = f"players/{player_id}.png"
                user.first_name = forename
                user.last_name = surname
                user.save()
                print(f"    🔄 Updated: {forename} {surname}")

            # Create membership
            membership, m_created = ProjectMembership.objects.get_or_create(
                user=user,
                project=team,
                defaults={"role": "member"}
            )

            if m_created:
                memberships_created += 1

    return users_created, memberships_created


def main():
    parser = argparse.ArgumentParser(
        description="Seed players with photos for eerste elftallen"
    )
    parser.add_argument(
        "--import-results",
        default="import_results.json",
        help="Path to import results JSON with S3 URLs",
    )
    parser.add_argument(
        "--soccerwiki",
        default="SoccerWiki_2026-02-06 - Player Data - Club Data - Netherlands_1770382293.json",
        help="Path to SoccerWiki JSON",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without saving",
    )
    parser.add_argument(
        "--max-players-per-team",
        type=int,
        default=25,
        help="Maximum players per team",
    )

    args = parser.parse_args()

    print("🚀 Seed Players with Photos")
    print("=" * 50)

    # Load data
    print("\n📂 Loading data...")
    players = load_players_with_photos(args.import_results)
    soccerwiki_data = load_soccerwiki_data(args.soccerwiki)
    print(f"   Loaded {len(players)} players with photos")

    # Get eerste elftallen
    print("\n🏟️  Finding eerste elftallen...")
    teams = get_eerste_elftallen()
    print(f"   Found {len(teams)} eerste elftallen")

    if not teams:
        print("❌ No eerste elftallen found!")
        return

    for team in teams[:5]:
        print(f"   - {team.name}")
    if len(teams) > 5:
        print(f"   ... and {len(teams) - 5} more")

    # Remove existing members
    print("\n🗑️  Removing existing members...")
    with transaction.atomic():
        removed = remove_existing_members(teams, args.dry_run)
    print(f"   Removed {removed} memberships")

    # Seed new players
    print("\n👤 Creating players and assigning to teams...")
    with transaction.atomic():
        users_created, memberships_created = seed_players(
            players,
            soccerwiki_data,
            teams,
            args.dry_run
        )

    # Summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    print(f"Teams processed:     {len(teams)}")
    print(f"Members removed:     {removed}")
    print(f"Users created:       {users_created}")
    print(f"Memberships created: {memberships_created}")

    if args.dry_run:
        print("\n⚠️  DRY RUN - No changes were made")

    print("\n✅ Done!")


if __name__ == "__main__":
    main()
