"""Final complete role test."""

import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User
from accounts.serializers import UserListSerializer
from projects.models import ProjectMembership

print("=== FINAL ROLE HIERARCHY TEST ===\n")

# Get one user from each role category
test_users = {
    "Land Admin": User.objects.filter(is_superuser=True).first(),
    "Club Admin": User.objects.filter(email__contains="directeur").first(),
    "Team Staff": User.objects.filter(email__contains="assistant").first(),
    "Team Member": (
        ProjectMembership.objects.filter(role="player").select_related("user").first().user
        if ProjectMembership.objects.filter(role="player").exists()
        else None
    ),
    "Viewer": (
        ProjectMembership.objects.filter(role="viewer").select_related("user").first().user
        if ProjectMembership.objects.filter(role="viewer").exists()
        else None
    ),
}

for expected_role, user in test_users.items():
    if not user:
        print(f"❌ {expected_role}: No user found")
        continue

    data = UserListSerializer(user).data
    actual_role = data["role"]

    # Check if role matches
    status = "✅" if actual_role == expected_role else "❌"

    print(f"{status} {expected_role}")
    print(f"   User: {user.email}")
    print(f"   Actual Role: {actual_role}")
    if data["organisations"]:
        print(f"   Organisation: {data['organisations'][0]['name']}")
    print()
