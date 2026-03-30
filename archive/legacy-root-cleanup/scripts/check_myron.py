"""Check Myron Boadu memberships and assets."""
import os
import sys

sys.path.insert(0, 'src')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

import django
django.setup()

from projects.models import ProjectMembership

ms = ProjectMembership.objects.filter(
    user__first_name='Myron', 
    user__last_name='Boadu'
).select_related('user', 'project')

print('All Myron Boadu memberships:')
for m in ms:
    tr = m.metadata.get('teamreel_assets', {})
    has_assets = bool(tr)
    images = list(tr.get('images', {}).keys())
    videos = list(tr.get('videos', {}).keys())
    print(f"  Project {m.project_id} ({m.project.name}): has_assets={has_assets}, images={images}, videos={videos}")
