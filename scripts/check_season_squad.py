import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'src.config.settings.local')
django.setup()

from projects.models import Project
from activities.models import Period, Participation

# Find Ajax season
ajax = Project.objects.filter(name__icontains='ajax 1').first()
if not ajax:
    print("Ajax 1 not found")
    sys.exit(1)

print(f"Found: {ajax.name} (ID: {ajax.id})")

season = Period.objects.filter(project=ajax, activity_type='season', title__icontains='2024').first()
if not season:
    print("Season 2024-2025 not found")
    sys.exit(1)

print(f"Season: {season.title} (ID: {season.id})")

# Get participations
participations = Participation.objects.filter(period=season).select_related('user')
print(f"\nTotal participations: {participations.count()}")

print("\n=== First 10 participations ===")
for p in participations[:10]:
    user_name = p.user.name if p.user else 'No user'
    print(f"\nID: {p.id}")
    print(f"User: {user_name}")
    print(f"functional_roles: {p.functional_roles}")
    print(f"metadata: {p.metadata}")

# Group by functional roles
print("\n=== Grouped by functional roles ===")
goalkeepers = []
players = []
coaches = []
assistants = []

for p in participations:
    roles = p.functional_roles if p.functional_roles else []
    
    # Also check metadata for legacy
    if not roles and p.metadata:
        if p.metadata.get('team_role'):
            roles = [p.metadata.get('team_role')]
    
    if not roles:
        roles = ['player']  # Default
    
    for role in roles:
        role_lower = role.lower()
        if role_lower == 'goalkeeper':
            goalkeepers.append(p)
        elif role_lower == 'player':
            players.append(p)
        elif role_lower == 'coach':
            coaches.append(p)
        elif role_lower == 'assistant':
            assistants.append(p)

print(f"Goalkeepers: {len(goalkeepers)}")
print(f"Players: {len(players)}")
print(f"Coaches: {len(coaches)}")
print(f"Assistants: {len(assistants)}")
