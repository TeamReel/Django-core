import os
import sys
from pathlib import Path
import django

# Add src to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "src"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.contrib.auth import get_user_model
from permissions.models import RoleAssignment
from organisations.models import Organisation
from projects.models import Project

User = get_user_model()


def inspect_users():
    print("\n--- Available Roles ---")
    from permissions.models import Role

    for r in Role.objects.all():
        print(f"- {r.name}")

    print("\n--- Hunting for Team Admins ---")
    assignments = RoleAssignment.objects.filter(role__name="Team Admin")[:1]
    for ra in assignments:
        print(
            f"User: {ra.user.email} | Role: {ra.role.name} | Context: {ra.target_project.slug if ra.target_project else '?'}"
        )

    print("\n--- Hunting for Supporters ---")
    assignments = RoleAssignment.objects.filter(role__name="Supporter")[:1]
    for ra in assignments:
        print(
            f"User: {ra.user.email} | Role: {ra.role.name} | Context: {ra.target_project.slug if ra.target_project else 'Global/Org'}"
        )


if __name__ == "__main__":
    try:
        inspect_users()
    except Exception as e:
        print(f"Error: {e}")
