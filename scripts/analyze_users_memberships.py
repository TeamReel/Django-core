"""
Analyze current users and their memberships to understand what needs to be seeded.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from projects.models import Project, ProjectMembership
from organisations.models import Organisation
from activities.models import Period

print("=" * 80)
print("USER & MEMBERSHIP ANALYSIS")
print("=" * 80)

# User stats
total_users = User.objects.count()
users_with_membership = User.objects.filter(projectmembership__isnull=False).distinct().count()
users_without_membership = total_users - users_with_membership

print(f"\n📊 User Overview:")
print(f"  Total users: {total_users}")
print(f"  Users with membership: {users_with_membership}")
print(f"  Users WITHOUT membership: {users_without_membership}")

# Check sample users
print(f"\n👤 Sample Users (first 10):")
for user in User.objects.all()[:10]:
    membership_count = ProjectMembership.objects.filter(user=user).count()
    print(f"  {user.email} - {membership_count} memberships")

# Project structure
print(f"\n🏢 Project Structure:")
for org in Organisation.objects.all():
    clubs = Project.objects.filter(organisation=org, parent_project=None)
    teams = Project.objects.filter(organisation=org, parent_project__isnull=False)
    print(f"\n  {org.name}:")
    print(f"    Clubs: {clubs.count()}")
    print(f"    Teams: {teams.count()}")

    # Show sample teams with season info
    for team in teams[:3]:
        seasons = Period.objects.filter(project=team, type="season")
        members = ProjectMembership.objects.filter(project=team).count()
        print(f"      → {team.name}: {seasons.count()} seasons, {members} members")

# Membership analysis
print(f"\n📋 Membership Distribution:")
memberships_by_org = {}
for org in Organisation.objects.all():
    count = ProjectMembership.objects.filter(project__organisation=org).count()
    user_count = (
        User.objects.filter(projectmembership__project__organisation=org).distinct().count()
    )
    memberships_by_org[org.name] = {"total": count, "unique_users": user_count}

for org_name, counts in memberships_by_org.items():
    print(f"  {org_name}: {counts['total']} memberships ({counts['unique_users']} unique users)")

# Check if users have names (needed for proper seeding)
print(f"\n✏️ User Data Completeness:")
users_with_names = User.objects.exclude(first_name="", last_name="").count()
users_without_names = total_users - users_with_names
print(f"  Users with names: {users_with_names}")
print(f"  Users without names: {users_without_names}")

print("\n" + "=" * 80)
