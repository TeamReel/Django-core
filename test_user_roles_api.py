"""Test what the users API returns for roles."""

import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User
from accounts.serializers import UserListSerializer

print("=== TESTING USER ROLES API ===\n")

# Test a few specific users
test_emails = [
    "admin@teamreel.demo",
    "land-admin@knvb.demo",
    "sven.jacobs@sc-heerenveen.demo",
]

for email in test_emails:
    try:
        user = User.objects.get(email=email)
        serializer = UserListSerializer(user)
        data = serializer.data

        print(f"User: {email}")
        print(f"  is_superuser: {user.is_superuser}")
        print(f"  Serialized role: {data.get('role')}")
        print(f"  Organisations: {len(data.get('organisations', []))}")
        print(f"  Projects: {len(data.get('projects', []))}")

        if data.get("organisations"):
            print(f"  First org: {data['organisations'][0]}")
        if data.get("projects"):
            print(f"  First project: {data['projects'][0]}")

        print()
    except User.DoesNotExist:
        print(f"❌ User {email} not found\n")

print("\n=== CHECKING MEMBERSHIPS ===\n")

# Check if Membership and ProjectMembership exist
try:
    from organisations.models import Membership
    from projects.models import ProjectMembership

    user = User.objects.filter(email="land-admin@knvb.demo").first()
    if user:
        org_memberships = Membership.objects.filter(user=user, is_active=True)
        project_memberships = ProjectMembership.objects.filter(user=user)

        print(f"land-admin@knvb.demo:")
        print(f"  Org Memberships: {org_memberships.count()}")
        for m in org_memberships:
            print(f"    - {m.organisation.name} ({m.role})")

        print(f"  Project Memberships: {project_memberships.count()}")
        for pm in project_memberships[:3]:
            print(f"    - {pm.project.name} ({pm.role})")
except Exception as e:
    print(f"Error checking memberships: {e}")
