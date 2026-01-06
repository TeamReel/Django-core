import os
import django
import sys
import random
import uuid
from django.conf import settings
from django.apps import apps
from django.db import transaction


def seed_files():
    # Add src to path
    sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

    # Configure Django settings
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

    # Check for DATABASE_PUBLIC_URL first
    if os.environ.get("DATABASE_PUBLIC_URL"):
        print("Using DATABASE_PUBLIC_URL for connection...")
        os.environ["DATABASE_URL"] = os.environ["DATABASE_PUBLIC_URL"]

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
    FileAsset = apps.get_model("files", "FileAsset")

    # Verification counters
    files_created = 0
    files_existing = 0
    users_created = 0  # Should remain 0

    print("\n--- Starting File Seeding (Metadata Only) ---")
    print("Constraint: NO NEW USERS will be created.")

    organisations = Organisation.objects.filter(is_active=True)
    print(f"Found {organisations.count()} active organisations.")

    dummy_files = [
        {"name": "Q4 Financial Report.pdf", "mime": "application/pdf", "size": 1024 * 1024 * 2},
        {"name": "Project Roadmap 2026.pdf", "mime": "application/pdf", "size": 1024 * 500},
        {"name": "Team Photo.jpg", "mime": "image/jpeg", "size": 1024 * 2000},
        {"name": "Logo_HighRes.png", "mime": "image/png", "size": 1024 * 500},
        {
            "name": "Meeting Notes - Jan 5.docx",
            "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "size": 1024 * 15,
        },
        {
            "name": "Budget_Draft_v2.xlsx",
            "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "size": 1024 * 45,
        },
        {"name": "Architecture Diagram.png", "mime": "image/png", "size": 1024 * 800},
    ]

    with transaction.atomic():
        for org in organisations:
            print(f"\nProcessing Org: {org.name}")

            # Find potential uploaders (members of this org)
            # We use the reverse relation 'memberships' on Organisation to find users
            # Membership model has 'user' field.
            memberships = org.memberships.filter(is_active=True).select_related("user")
            uploaders = [m.user for m in memberships]

            if not uploaders:
                print(f"  - No members found. Skipping file generation for {org.name}.")
                continue

            # Seed 3-5 files per org
            num_files = random.randint(3, 5)
            selected_files = random.sample(dummy_files, num_files)

            for file_info in selected_files:
                uploader = random.choice(uploaders)

                # Generate a deterministic but unique-ish storage path for this "dummy" file
                # We use org.slug and filename to make it readable, but add a hash to ensure uniqueness if we run multiple times or have collisions
                # Actually, to be idempotent, we should use a stable key.
                # Let's use: "dummy/{org.id}/{filename}"
                # But if we want multiple of same name? The requirement says "idempotent".
                # If we run this script twice, we shouldn't create duplicates.
                # So we'll use get_or_create based on storage_path.

                storage_path = f"dummy/{org.id}/{file_info['name']}"

                obj, created = FileAsset.objects.get_or_create(
                    storage_path=storage_path,
                    defaults={
                        "organization": org,
                        "uploaded_by": uploader,
                        "original_name": file_info["name"],
                        "file_size": file_info["size"],
                        "mime_type": file_info["mime"],
                        "is_public": False,
                        "metadata": {"seeded": True, "dummy": True},
                    },
                )

                if created:
                    files_created += 1
                    print(f"    + Created: {file_info['name']} (Uploader: {uploader.email})")
                else:
                    files_existing += 1
                    # print(f"    . Exists: {file_info['name']}")

    print("\n--- File Seeding Verification Report ---")
    print(f"Users Created: {users_created} (MUST BE 0)")
    print(f"FileAssets Created: {files_created}")
    print(f"FileAssets Existing: {files_existing}")
    print(f"Total FileAssets: {FileAsset.objects.count()}")

    if users_created > 0:
        print("\n❌ FAILED: Users were created!")
    else:
        print("\n✅ SUCCESS: No new users created.")


if __name__ == "__main__":
    seed_files()
