"""Test different user roles based on memberships."""

import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User
from accounts.serializers import UserListSerializer
from projects.models import ProjectMembership

print("=== TESTING DIFFERENT USER ROLES ===\n")

# Test different role types
role_tests = {
    "admin": User.objects.filter(email__contains="directeur").first(),  # Club admins
    "staff": User.objects.filter(email__contains="assistant").first(),  # Team staff
    "player": User.objects.filter(email__contains="speler")
    .exclude(email__contains="admin")
    .first(),  # Players
}

for role_type, user in role_tests.items():
    if user:
        data = UserListSerializer(user).data
        pm = ProjectMembership.objects.filter(user=user).select_related("project").first()
        team_name = pm.project.name if pm and pm.project else "N/A"
        pm_role = pm.role if pm else "N/A"

        print(f"Expected: {role_type.upper()}")
        print(f"User: {user.email}")
        print(f"Team: {team_name}")
        print(f"ProjectMembership.role: {pm_role}")
        print(f"Serializer Role: {data['role']}")
        print(
            f"Organisations: {data['organisations'][0]['name'] if data['organisations'] else 'None'}"
        )
        print("-" * 80)
    else:
        print(f"No user found for role: {role_type}\n")

# Test system admin
admin_user = User.objects.filter(is_superuser=True).first()
if admin_user:
    data = UserListSerializer(admin_user).data
    print(f"System Admin User: {admin_user.email}")
    print(f"Role: {data['role']}")
    print("-" * 80)
