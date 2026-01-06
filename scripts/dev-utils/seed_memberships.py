import os
import django
import sys
import random
from django.conf import settings
from django.apps import apps
from django.db import transaction


def seed_memberships():
    # Add src to path
    sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

    # Configure Django settings
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

    # Check for DATABASE_PUBLIC_URL first (for local audit against production)
    if os.environ.get("DATABASE_PUBLIC_URL"):
        print("Using DATABASE_PUBLIC_URL for connection...")
        os.environ["DATABASE_URL"] = os.environ["DATABASE_PUBLIC_URL"]

    # Check for DATABASE_URL
    if not os.environ.get("DATABASE_URL"):
        print("ERROR: DATABASE_URL environment variable is not set.")
        sys.exit(1)

    # Initialize Django
    try:
        django.setup()
    except Exception as e:
        print(f"Error setting up Django: {e}")
        sys.exit(1)

    print(f"Connected to database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")

    # Import models
    User = apps.get_model("accounts", "User")
    Organisation = apps.get_model("organisations", "Organisation")
    OrgMembership = apps.get_model("organisations", "Membership")
    Project = apps.get_model("projects", "Project")
    ProjectMembership = apps.get_model("projects", "ProjectMembership")

    # Verification counters
    users_created = 0
    org_memberships_created = 0
    project_memberships_created = 0
    distinct_users_linked = set()

    print("\n--- Starting Seeding Process ---")
    print("Constraint: NO NEW USERS will be created.")

    all_users = list(User.objects.all().order_by("date_joined"))
    if not all_users:
        print("CRITICAL ERROR: No users found in database. Cannot proceed.")
        sys.exit(1)

    print(f"Found {len(all_users)} existing users.")

    projects = Project.objects.all()
    print(f"Found {projects.count()} projects.")

    with transaction.atomic():
        for project in projects:
            org = project.organisation
            print(f"\nProcessing Project: {project.name} (Org: {org.name})")

            # 1. Find potential members (users already in the Org)
            org_members = list(User.objects.filter(organisation_memberships__organisation=org))

            # 2. If no org members, recruit some existing users
            if not org_members:
                print(f"  - No members in Org '{org.name}'. Recruiting existing users...")
                # Pick up to 3 random users from the global pool
                recruits = random.sample(all_users, min(len(all_users), 3))

                for user in recruits:
                    # Create Org Membership
                    obj, created = OrgMembership.objects.get_or_create(
                        user=user, organisation=org, defaults={"role": "member"}
                    )
                    if created:
                        org_memberships_created += 1
                        print(f"    + Added {user.email} to Org '{org.name}'")
                    org_members.append(user)

            # 3. Create Project Memberships
            # Link up to 5 members to this project
            members_to_link = org_members[:5]

            for user in members_to_link:
                # Check if already linked (including soft-deleted check if needed, but get_or_create handles active constraint usually if unique)
                # The model has a unique constraint on (project, user) where deleted_at is null.
                # We should check for existing active membership first.

                existing = ProjectMembership.objects.filter(
                    project=project, user=user, deleted_at__isnull=True
                ).exists()

                if not existing:
                    ProjectMembership.objects.create(
                        project=project,
                        user=user,
                        role=ProjectMembership.Role.EDITOR,
                        assignment_reason=ProjectMembership.AssignmentReason.MANUAL,
                    )
                    project_memberships_created += 1
                    distinct_users_linked.add(user.id)
                    print(f"    + Linked {user.email} to Project '{project.name}'")
                else:
                    distinct_users_linked.add(user.id)
                    # print(f"    . {user.email} already linked")

    print("\n--- Seeding Verification Report ---")
    print(f"Users Created: {users_created} (MUST BE 0)")
    print(f"Org Memberships Created: {org_memberships_created}")
    print(f"Project Memberships Created: {project_memberships_created}")
    print(f"Distinct Users Linked to Projects: {len(distinct_users_linked)}")

    if users_created > 0:
        print("\n❌ FAILED: Users were created!")
    else:
        print("\n✅ SUCCESS: No new users created.")


if __name__ == "__main__":
    seed_memberships()
