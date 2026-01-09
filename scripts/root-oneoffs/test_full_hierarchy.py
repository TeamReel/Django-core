"""Test complete role hierarchy (read-only)."""

import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User
from accounts.serializers import UserListSerializer
from organisations.models import Membership
from projects.models import ProjectMembership, Project

print("=== COMPLETE ROLE HIERARCHY TEST ===\n")

# Test all existing roles
test_cases = [
    {
        "expected": "Superadmin",
        "query": lambda: User.objects.filter(is_superuser=True).first(),
        "description": "Django superuser (can see all organisations)",
    },
    {
        "expected": "Land Admin",
        "query": lambda: (
            Membership.objects.filter(role="admin", is_active=True)
            .select_related("user")
            .first()
            .user
            if Membership.objects.filter(role="admin", is_active=True).exists()
            else None
        ),
        "description": "Organisation admin (e.g., KNVB admin)",
    },
    {
        "expected": "Club Admin",
        "query": lambda: (
            ProjectMembership.objects.filter(role="admin", project__parent_project__isnull=True)
            .select_related("user", "project")
            .first()
            .user
            if ProjectMembership.objects.filter(
                role="admin", project__parent_project__isnull=True
            ).exists()
            else None
        ),
        "description": "Project parent admin (e.g., Ajax club admin)",
    },
    {
        "expected": "Team Admin",
        "query": lambda: (
            ProjectMembership.objects.filter(role="admin", project__parent_project__isnull=False)
            .select_related("user", "project")
            .first()
            .user
            if ProjectMembership.objects.filter(
                role="admin", project__parent_project__isnull=False
            ).exists()
            else None
        ),
        "description": "Project child admin (e.g., Ajax 1 team admin)",
    },
    {
        "expected": "Team Staff",
        "query": lambda: User.objects.filter(email__contains="assistant@ajax1").first(),
        "description": "Team staff/editor role",
    },
    {
        "expected": "Team Member",
        "query": lambda: (
            ProjectMembership.objects.filter(role="player").select_related("user").first().user
            if ProjectMembership.objects.filter(role="player").exists()
            else None
        ),
        "description": "Team player",
    },
    {
        "expected": "Viewer",
        "query": lambda: (
            ProjectMembership.objects.filter(role="viewer").select_related("user").first().user
            if ProjectMembership.objects.filter(role="viewer").exists()
            else None
        ),
        "description": "Read-only viewer",
    },
]

for test in test_cases:
    try:
        user = test["query"]()
        if not user:
            print(f"⚠️  {test['expected']}: No user found ({test['description']})\n")
            continue

        data = UserListSerializer(user).data
        actual_role = data["role"]

        status = "✅" if actual_role == test["expected"] else "❌"

        print(f"{status} {test['expected']}")
        print(f"   Description: {test['description']}")
        print(f"   User: {user.email}")
        print(f"   Actual Role: {actual_role}")

        if data["organisations"]:
            print(f"   Organisation: {data['organisations'][0]['name']}")
        print()
    except Exception as e:
        print(f"❌ {test['expected']}: Error - {str(e)}\n")

print("\n=== ROLE HIERARCHY (TeamReel Strategy) ===")
print("1. Superadmin (is_superuser=True) - All organisations")
print("2. Land Admin (Membership.role=admin) - e.g., KNVB admin")
print("3. Club Admin (PM.role=admin, parent=None) - e.g., Ajax club")
print("4. Team Admin (PM.role=admin, parent!=None) - e.g., Ajax 1")
print("5. Team Staff (PM.role=staff/editor)")
print("6. Team Member (PM.role=player)")
print("7. Viewer (PM.role=viewer)")
print("8. User (default - no memberships)")
