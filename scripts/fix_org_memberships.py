#!/usr/bin/env python
"""
Fix missing Organisation Memberships for seeded users.

The Participation model requires member to be an Organisation Membership,
not a User directly. This script creates the missing org memberships.
"""
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

from django.db import transaction
from projects.models import ProjectMembership
from organisations.models import Organisation, Membership as OrgMembership
from accounts.models import User

print("=" * 60)
print("FIX MISSING ORGANISATION MEMBERSHIPS")
print("=" * 60)

# Get KNVB organisation
knvb = Organisation.objects.filter(name__icontains='KNVB').first()
if not knvb:
    print("ERROR: KNVB organisation not found!")
    sys.exit(1)

print(f"\nOrganisation: {knvb.name} (ID: {knvb.id})")

# Find all users with project memberships in KNVB but without org membership
users_without_org_membership = []

project_memberships = ProjectMembership.objects.filter(
    project__organisation=knvb
).select_related('user', 'project')

checked = set()
for pm in project_memberships:
    user = pm.user
    if user.id in checked:
        continue
    checked.add(user.id)

    if not OrgMembership.objects.filter(user=user, organisation=knvb).exists():
        users_without_org_membership.append(user)

print(f"\nUsers with project membership but NO org membership: {len(users_without_org_membership)}")

if not users_without_org_membership:
    print("All users already have org memberships. Nothing to do!")
    sys.exit(0)

# Show sample
print("\nSample users to fix:")
for u in users_without_org_membership[:5]:
    print(f"  - {u.email}")
if len(users_without_org_membership) > 5:
    print(f"  ... and {len(users_without_org_membership) - 5} more")

# Create missing org memberships
print("\nCreating organisation memberships...")
with transaction.atomic():
    created = 0
    for user in users_without_org_membership:
        OrgMembership.objects.create(
            user=user,
            organisation=knvb,
            role='viewer',  # Default role for players
        )
        created += 1

print(f"\n✅ Created {created} organisation memberships")
print("\nDone!")
