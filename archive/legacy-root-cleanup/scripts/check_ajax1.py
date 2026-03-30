#!/usr/bin/env python
"""Check Ajax 1 configuration."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

from projects.models import Project, ProjectMembership
from organisations.models import Organisation, Membership as OrgMembership
from activities.models import Period
from accounts.models import User

# Check Ajax 1 team
knvb = Organisation.objects.filter(name__icontains='KNVB').first()
print(f"KNVB org: {knvb}")

ajax1 = Project.objects.filter(name='Ajax 1', organisation=knvb).first()
print(f"Ajax 1 team: {ajax1}")
print(f"Ajax 1 ID: {ajax1.id if ajax1 else None}")

# Check if seasons exist
if ajax1:
    seasons = Period.objects.filter(project=ajax1).order_by('-start_date')[:3]
    print(f"\nSeasons for Ajax 1:")
    for s in seasons:
        print(f"  - {s.id}: {s.name}")

# Check members have org memberships
members = ProjectMembership.objects.filter(project=ajax1)[:5]
print(f"\nSample members ({members.count()} total in queryset):")
for m in members:
    has_org = OrgMembership.objects.filter(user=m.user, organisation=knvb).exists()
    print(f"  - {m.user.email}: org_membership={has_org}")
