"""Check role distribution."""

import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from projects.models import ProjectMembership
from django.db.models import Count

print("=== ProjectMembership Role Distribution ===\n")
roles = ProjectMembership.objects.values("role").annotate(count=Count("role")).order_by("role")
for r in roles:
    print(f"{r['role']}: {r['count']}")

print("\n=== Sample Admin/Director Users ===\n")
admins = ProjectMembership.objects.filter(user__email__contains="directeur")[:3]
for pm in admins:
    print(f"User: {pm.user.email}")
    print(f"Team: {pm.project.name}")
    print(f"Role: {pm.role}")
    print()
