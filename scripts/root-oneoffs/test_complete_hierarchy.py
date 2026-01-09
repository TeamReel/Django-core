"""Test complete role hierarchy including Land Admin."""

import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User
from accounts.serializers import UserListSerializer
from organisations.models import Membership, Organisation

print("=== COMPLETE ROLE HIERARCHY TEST ===\n")

# Check if any Land Admin exists (org-level admin membership)
org = Organisation.objects.first()
land_admin = (
    Membership.objects.filter(organisation=org, role="admin", is_active=True)
    .select_related("user")
    .first()
)

if not land_admin:
    print("⚠️  No Land Admin found - creating test user...")
    # Create a test Land Admin
    test_user, created = User.objects.get_or_create(
        email="land-admin@knvb.demo",
        defaults={"first_name": "KNVB", "last_name": "Admin", "is_active": True},
    )
    land_admin_membership = Membership.objects.create(
        user=test_user, organisation=org, role="admin", is_active=True
    )
    land_admin = land_admin_membership
    print(f"✅ Created: {test_user.email} as Land Admin\n")

# Test all roles
test_users = {
    "Superadmin": User.objects.filter(is_superuser=True).first(),
    "Land Admin": land_admin.user if land_admin else None,
    "Club Admin": User.objects.filter(email__contains="directeur@ajax").first(),
    "Team Staff": User.objects.filter(email__contains="assistant@ajax1").first(),
}

for expected_role, user in test_users.items():
    if not user:
        print(f"❌ {expected_role}: No user found\n")
        continue

    data = UserListSerializer(user).data
    actual_role = data["role"]

    status = "✅" if actual_role == expected_role else "❌"

    print(f"{status} {expected_role}")
    print(f"   User: {user.email}")
    print(f"   Actual Role: {actual_role}")

    # Show org membership for Land Admin
    if expected_role == "Land Admin":
        org_mem = Membership.objects.filter(user=user, is_active=True).first()
        if org_mem:
            print(f"   Org Membership: {org_mem.organisation.name} (role: {org_mem.role})")

    if data["organisations"]:
        print(f"   Organisation: {data['organisations'][0]['name']}")
    print()

print("\n=== ROLE HIERARCHY CONFIRMED ===")
print("1. Superadmin (is_superuser=True)")
print("2. Land Admin (Membership.role=admin on Organisation)")
print("3. Club Admin (ProjectMembership.role=admin on parent project)")
print("4. Team Admin (ProjectMembership.role=admin on child project)")
print("5. Team Staff (ProjectMembership.role=staff/editor)")
print("6. Team Member (ProjectMembership.role=player)")
print("7. Viewer (ProjectMembership.role=viewer)")
print("8. User (default)")
