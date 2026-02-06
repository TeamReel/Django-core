"""
Link Team Members to Season 2024/2025

For each team (eerste elftal), find the ProjectMemberships and create
Participation records linking them to the 2024/2025 season.

Participation links:
- member (organisations.Membership) -> the org membership
- period (activities.Period) -> the season
- role = 'squad_member'
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import transaction
from activities.models import Period, Participation
from projects.models import Project, ProjectMembership
from organisations.models import Organisation, Membership


def link_members_to_seasons():
    """
    For each eerste elftal team:
    1. Find the team's Season 2024/2025
    2. Get all ProjectMemberships for that team
    3. For each ProjectMembership, get the user's OrgMembership
    4. Create Participation (member=OrgMembership, period=season, role='squad_member')
    """

    # Get KNVB organisation
    knvb = Organisation.objects.filter(name__icontains='KNVB').first()
    if not knvb:
        print("❌ KNVB organisation not found")
        return

    print(f"Organisation: {knvb.name}")
    print()

    # Get all teams (projects with parent_project = club)
    teams = Project.objects.filter(
        organisation=knvb,
        parent_project__isnull=False  # Has a parent = is a team
    ).select_related('parent_project')

    print(f"Found {teams.count()} teams")
    print()

    total_created = 0
    total_skipped = 0

    with transaction.atomic():
        for team in teams:
            # Find Season 2024/2025 for this team
            season = Period.objects.filter(
                project=team,
                parent_period__isnull=True,  # Root period = season
                name__icontains='2024/2025'
            ).first()

            if not season:
                # Try alternative naming
                season = Period.objects.filter(
                    project=team,
                    parent_period__isnull=True,
                    start_date__year=2024,
                    end_date__year=2025
                ).first()

            if not season:
                print(f"⚠️  No 2024/2025 season found for {team.name}")
                continue

            # Get all team members (ProjectMembership)
            memberships = ProjectMembership.objects.filter(project=team).select_related('user')

            if not memberships.exists():
                print(f"⚠️  No members for {team.name}")
                continue

            created_count = 0
            skipped_count = 0

            for pm in memberships:
                user = pm.user

                # Get user's OrgMembership in KNVB
                org_membership = Membership.objects.filter(
                    user=user,
                    organisation=knvb
                ).first()

                if not org_membership:
                    print(f"    ⚠️  No org membership for {user.email}")
                    skipped_count += 1
                    continue

                # Check if Participation already exists
                existing = Participation.objects.filter(
                    period=season,
                    member=org_membership
                ).exists()

                if existing:
                    skipped_count += 1
                    continue

                # Create Participation
                Participation.objects.create(
                    period=season,
                    member=org_membership,
                    role='squad_member',
                    status='confirmed',
                    data={}
                )
                created_count += 1

            if created_count > 0:
                print(f"✅ {team.name}: created {created_count} participations (skipped {skipped_count})")
            else:
                print(f"⏭️  {team.name}: all {skipped_count} already linked or skipped")

            total_created += created_count
            total_skipped += skipped_count

    print()
    print(f"{'='*50}")
    print(f"Total created: {total_created}")
    print(f"Total skipped: {total_skipped}")


if __name__ == '__main__':
    link_members_to_seasons()
