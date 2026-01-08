"""Test script to verify user organisations serialization."""

import os
import sys
import django

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User
from accounts.serializers import UserListSerializer

# Test 3 users with project memberships
users = (
    User.objects.exclude(email__contains="admin")
    .filter(project_memberships__isnull=False)
    .distinct()[:3]
)

print(f"Testing {users.count()} users:\n")

for u in users:
    data = UserListSerializer(u).data
    print(f"User: {u.email}")
    print(f"Role: {data['role']}")
    print(f"Organisations: {data['organisations']}")
    print("-" * 80)
