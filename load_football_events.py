from datetime import datetime, timedelta
import random
from accounts.models import User
from organisations.models import Organisation
from projects.models import Project
from transactions.models import UsageEvent
from django.db.models import Count

users = list(User.objects.all())
orgs = list(Organisation.objects.all())
projects = list(Project.objects.all())

print(f"Found {len(users)} users, {len(orgs)} orgs, {len(projects)} projects")

event_types = [
    (
        "match.scheduled",
        {"competition": "La Liga", "home_team": "FC Barcelona", "away_team": "Real Madrid"},
    ),
    ("match.result", {"home_score": 2, "away_score": 1, "attendance": 85000}),
    ("player.signed", {"player_name": "New Player", "position": "Forward", "fee_millions": 50}),
    ("training.session", {"type": "tactical", "duration_minutes": 90, "attendance": 22}),
    ("injury.report", {"player": "Player Name", "type": "muscle", "expected_recovery_days": 14}),
    ("ticket.sold", {"match_id": "M123", "section": "VIP", "quantity": 2, "revenue": 250}),
    ("video.analysis", {"match_id": "M123", "analyst": "Coach Name", "duration_minutes": 45}),
    ("scout.report", {"player": "Target Player", "club": "Other Club", "rating": 8.5}),
    ("contract.renewal", {"player": "Player Name", "years": 3, "salary_millions": 10}),
    ("youth.academy", {"action": "enrollment", "age_group": "U17", "players": 5}),
    ("stadium.maintenance", {"area": "pitch", "type": "routine", "cost": 15000}),
    ("merchandise.sale", {"item": "jersey", "player_name": "Star Player", "quantity": 150}),
    ("press.conference", {"speaker": "Manager", "topic": "upcoming_match", "attendees": 30}),
    (
        "tactical.analysis",
        {"opponent": "Next Team", "formation": "4-3-3", "weaknesses": ["left_flank"]},
    ),
    ("fitness.test", {"player": "Player Name", "vo2_max": 58, "sprint_speed": 34.5}),
]

created = 0
for day in range(30):
    date_offset = timedelta(days=day)
    num_events = random.randint(8, 20)

    for _ in range(num_events):
        user = random.choice(users)
        org = random.choice(orgs)
        project = random.choice(projects) if projects and random.random() > 0.2 else None

        event_type, base_metadata = random.choice(event_types)
        metadata = {**base_metadata, "source": "football_ops", "recorded_by": user.email}

        UsageEvent.objects.create(
            event_type=event_type,
            user=user,
            organization=org,
            project=project,
            metadata=metadata,
        )
        created += 1

print(f"Created {created} events")

for org in orgs:
    count = UsageEvent.objects.filter(organization=org).count()
    print(f"  {org.name}: {count} events")

top_events = (
    UsageEvent.objects.values("event_type").annotate(count=Count("id")).order_by("-count")[:10]
)
print("\nTop event types:")
for item in top_events:
    print(f"  {item['event_type']}: {item['count']}")
