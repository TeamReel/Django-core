"""Check current user membership status."""

import os
import sys
import django

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from projects.models import ProjectMembership, Project
from accounts.models import User
from organisations.models import Organisation
from activities.models import Period

print("=" * 80)
print("USER MEMBERSHIP STATUS")
print("=" * 80)

total_users = User.objects.count()
total_memberships = ProjectMembership.objects.count()

print(f"\n📊 Overview:")
print(f"  Total users: {total_users}")
print(f"  Total memberships: {total_memberships}")
print(
    f"  Users without membership: {total_users - User.objects.filter(projectmembership__isnull=False).distinct().count()}"
)

print(f"\n🏢 Memberships per Organisation:")
for org in Organisation.objects.all():
    count = ProjectMembership.objects.filter(project__organisation=org).count()
    user_count = (
        User.objects.filter(projectmembership__project__organisation=org).distinct().count()
    )
    print(f"  {org.name}: {count} memberships ({user_count} unique users)")

print(f"\n⚽ Memberships per Team:")
teams = Project.objects.filter(parent_project__isnull=False).select_related(
    "organisation", "parent_project"
)
for team in teams[:10]:  # First 10 teams
    count = ProjectMembership.objects.filter(project=team).count()
    season_count = Period.objects.filter(project=team, type="season").count()
    print(f"  {team.name} ({team.organisation.name}): {count} members, {season_count} seasons")

if teams.count() > 10:
    print(f"  ... and {teams.count() - 10} more teams")

print(f"\n🕐 Sample Memberships (first 10):")
for membership in ProjectMembership.objects.select_related("user", "project", "period")[:10]:
    period_name = membership.period.name if membership.period else "No period"
    print(f"  {membership.user.email} → {membership.project.name} ({period_name})")

print("\n" + "=" * 80)
