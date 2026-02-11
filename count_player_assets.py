"""Count players with all required assets."""
import os
import sys

sys.path.insert(0, 'src')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

import django
django.setup()

from projects.models import ProjectMembership
from projects.api.serializers import ProjectMembershipSerializer

members = ProjectMembership.objects.filter(
    project_id=93,
    period_id='5956166a-7911-4ce9-878b-0afccb96c2bd',
    deleted_at__isnull=True
).select_related('user')

# Group and count like frontend
players = []
for m in members:
    s = ProjectMembershipSerializer(m)
    data = s.data
    roles = data.get('functional_roles', [])
    if not roles:
        roles = ['player']

    if 'player' in roles:
        name = f"{m.user.first_name} {m.user.last_name}"
        tr = data.get('metadata', {}).get('teamreel_assets', {})
        images = list(tr.get('images', {}).keys())
        videos = list(tr.get('videos', {}).keys())
        has_all = 'closeup' in images and 'fullbody' in images and 'intro' in videos
        players.append((name, has_all))
        status = "OK" if has_all else "MISSING"
        print(f"  {status}: {name} - images={images}, videos={videos}")

print(f"\nTotal players: {len(players)}")
print(f"With all assets: {sum(1 for _, has_all in players if has_all)}")
