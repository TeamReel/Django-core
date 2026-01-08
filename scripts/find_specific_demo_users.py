import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User
from organisations.models import Organisation, Membership
from projects.models import Project
from permissions.models import RoleAssignment


def find_users():
    print("--- Searching for KNVB / Jan de Jong ---")
    users = User.objects.filter(email__icontains="jan").exclude(email__icontains="django")
    for u in users:
        print(f"User: {u.email} ({u.first_name} {u.last_name})")
        # Check orgs
        memberships = Membership.objects.filter(user=u)
        for m in memberships:
            print(f"  - Member of Org: {m.organisation.name} ({m.role})")

    knvb = Organisation.objects.filter(name__icontains="KNVB").first()
    if knvb:
        print(f"\n--- Members of {knvb.name} ---")
        members = Membership.objects.filter(organisation=knvb)
        for m in members:
            print(f"  - {m.user.email} ({m.role})")

    print("\n--- Searching for Club Directors (Ajax) ---")
    ajax_club = Project.objects.filter(name="Ajax", parent_project__isnull=True).first()
    if ajax_club:
        print(f"Found Club: {ajax_club.name}")
        # Validating who has roles on this project
        assignments = RoleAssignment.objects.filter(target_project=ajax_club)
        for ra in assignments:
            print(f"  - {ra.user.email} -> {ra.role.name} on {ajax_club.name}")

    print("\n--- Searching for Team Managers (Ajax 1) ---")
    ajax_team = Project.objects.filter(name="Ajax 1").first()
    if ajax_team:
        print(f"Found Team: {ajax_team.name}")
        assignments = RoleAssignment.objects.filter(target_project=ajax_team)
        for ra in assignments:
            print(f"  - {ra.user.email} -> {ra.role.name} on {ajax_team.name}")


if __name__ == "__main__":
    find_users()
