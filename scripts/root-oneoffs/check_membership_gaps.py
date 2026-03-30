"""Check membership gaps: users with ProjectMembership but no Org Membership."""

import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from organisations.models import Membership, Organisation
from projects.models import ProjectMembership
from accounts.models import User

print("=== CURRENT STATE ===")
print(f"Total Users: {User.objects.count()}")
print(f"Org Memberships (Membership): {Membership.objects.count()}")
print(f"Project Memberships (ProjectMembership): {ProjectMembership.objects.count()}")
print()

# Users with ProjectMembership
users_with_pm = User.objects.filter(project_memberships__isnull=False).distinct()
print(f"Users with ProjectMembership: {users_with_pm.count()}")

# Users with Org Membership
users_with_om = User.objects.filter(organisation_memberships__isnull=False).distinct()
print(f"Users with Org Membership: {users_with_om.count()}")

# Users with ONLY ProjectMembership (no org membership)
users_only_pm = users_with_pm.exclude(id__in=users_with_om)
print(f"Users with ProjectMembership but NO Org Membership: {users_only_pm.count()}")
print()

# Sample users
print("=== SAMPLE USERS (with ProjectMembership, no Org Membership) ===")
for user in users_only_pm[:5]:
    pm_count = ProjectMembership.objects.filter(user=user).count()
    om_count = Membership.objects.filter(user=user).count()

    # Get org from project membership
    pm = ProjectMembership.objects.filter(user=user).select_related("project__organisation").first()
    org_name = (
        pm.project.organisation.name if pm and pm.project and pm.project.organisation else "N/A"
    )

    print(
        f"{user.email}: {pm_count} ProjectMemberships, {om_count} Org Memberships (org: {org_name})"
    )
