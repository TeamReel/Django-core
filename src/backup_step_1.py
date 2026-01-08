"""
STAP 1: Backup Season 2024/2025 data before deletion
Run with: python manage.py shell < backup_step_1.py
"""

import json
from datetime import datetime
from activities.models import Period
from projects.models import ProjectMembership
from organisations.models import Organisation

knvb = Organisation.objects.get(slug="knvb")
season_2024 = Period.objects.get(
    organisation=knvb, name="Season 2024/2025", parent_period__isnull=True
)

print("STAP 1: BACKUP MAKEN")
print("=" * 70)

# Backup season
season_data = {
    "id": str(season_2024.id),
    "name": season_2024.name,
    "start_date": str(season_2024.start_date),
    "end_date": str(season_2024.end_date),
    "metadata": season_2024.metadata,
}

# Backup competitions
competitions = Period.objects.filter(parent_period=season_2024)
competitions_data = [
    {
        "id": str(c.id),
        "name": c.name,
        "start_date": str(c.start_date),
        "end_date": str(c.end_date),
        "metadata": c.metadata,
    }
    for c in competitions
]

# Backup memberships
memberships = ProjectMembership.objects.filter(period=season_2024).select_related("project", "user")
memberships_data = [
    {
        "id": str(m.id),
        "user_email": m.user.email,
        "team_name": m.project.name,
        "role": m.role,
    }
    for m in memberships
]

backup = {
    "timestamp": datetime.now().isoformat(),
    "season": season_data,
    "competitions": competitions_data,
    "memberships_count": len(memberships_data),
    "teams_with_players": len(set(m["team_name"] for m in memberships_data)),
}

# Save to file
filename = "backup_season_2024_2025.json"
with open(filename, "w", encoding="utf-8") as f:
    json.dump(backup, f, indent=2)

print(f"Backup saved to: {filename}")
print("\nBackup inhoud:")
print(f'  - Season: {season_data["name"]}')
print(f"  - Competitions: {len(competitions_data)}")
print(f"  - Player memberships: {len(memberships_data)}")
print(f'  - Teams with players: {backup["teams_with_players"]}')
print("\nBackup is klaar voor Stap 2 (Delete)")
