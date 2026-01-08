"""
Seed Team Admins for demo data.

Creates admin-level ProjectMemberships for team coaches/managers.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model
from projects.models import Project, ProjectMembership

User = get_user_model()


def seed_team_admins():
    """Create admin memberships for team coaches."""

    # Find teams and assign coaches as admins
    teams_with_coaches = [
        # SC Heerenveen
        ("SC Heerenveen O21", "sven.jacobs@sc-heerenveen.demo"),  # Make Sven admin
        ("SC Heerenveen O19", "lucas.bos@sc-heerenveen.demo"),  # Make Lucas admin
        # Ajax teams
        ("Ajax 1", "marco.vanbasten@ajax.demo"),
        ("Ajax O21", "dennis.bergkamp@ajax.demo"),
        # PSV teams
        ("PSV 1", "ruud.vandervoort@psv.demo"),
        ("PSV O21", "martin.janssen@psv.demo"),
        # Feyenoord teams
        ("Feyenoord 1", "jan.de vries@feyenoord.demo"),
        ("Feyenoord O21", "ruud.bakker@feyenoord.demo"),
    ]

    created = 0
    updated = 0

    for team_name, coach_email in teams_with_coaches:
        try:
            team = Project.objects.get(name=team_name)
            coach = User.objects.get(email=coach_email)

            # Check if membership exists
            pm, is_new = ProjectMembership.objects.get_or_create(
                user=coach, project=team, defaults={"role": "admin"}
            )

            if is_new:
                print(f"✅ Created admin membership: {coach.email} → {team.name}")
                created += 1
            else:
                if pm.role != "admin":
                    pm.role = "admin"
                    pm.save()
                    print(f"🔄 Updated to admin: {coach.email} → {team.name} (was {pm.role})")
                    updated += 1
                else:
                    print(f"⏭️  Already admin: {coach.email} → {team.name}")

        except Project.DoesNotExist:
            print(f"❌ Team not found: {team_name}")
        except User.DoesNotExist:
            print(f"❌ User not found: {coach_email}")

    print(f"\n✅ Created {created} admin memberships")
    print(f"🔄 Updated {updated} memberships to admin")


def seed_club_admins():
    """Create admin memberships for club directors."""

    clubs_with_admins = [
        ("Ajax", "marco.vanbasten@ajax.demo"),
        ("PSV", "ruud.vandervoort@psv.demo"),
        ("Feyenoord", "jan.de vries@feyenoord.demo"),
        ("SC Heerenveen", "sven.jacobs@sc-heerenveen.demo"),
    ]

    created = 0
    updated = 0

    for club_name, admin_email in clubs_with_admins:
        try:
            club = Project.objects.get(name=club_name, parent_project=None)
            admin = User.objects.get(email=admin_email)

            # Check if membership exists
            pm, is_new = ProjectMembership.objects.get_or_create(
                user=admin, project=club, defaults={"role": "admin"}
            )

            if is_new:
                print(f"✅ Created club admin: {admin.email} → {club.name}")
                created += 1
            else:
                if pm.role != "admin":
                    pm.role = "admin"
                    pm.save()
                    print(f"🔄 Updated to club admin: {admin.email} → {club.name} (was {pm.role})")
                    updated += 1
                else:
                    print(f"⏭️  Already club admin: {admin.email} → {club.name}")

        except Project.DoesNotExist:
            print(f"❌ Club not found: {club_name}")
        except User.DoesNotExist:
            print(f"❌ User not found: {admin_email}")

    print(f"\n✅ Created {created} club admin memberships")
    print(f"🔄 Updated {updated} memberships to club admin")


if __name__ == "__main__":
    print("🏃 Seeding Team Admins...")
    print("=" * 60)
    seed_team_admins()
    print("\n" + "=" * 60)
    print("\n🏢 Seeding Club Admins...")
    print("=" * 60)
    seed_club_admins()
    print("\n✅ Done!")
