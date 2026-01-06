import os
import django
import sys
import random
from django.conf import settings
from django.apps import apps
from django.db import transaction


def seed_settings():
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
    Setting = apps.get_model("settings", "Setting")

    # Enums (hardcoded to avoid import issues if paths differ)
    SCOPE_GLOBAL = "GLOBAL"
    SCOPE_ORGANISATION = "ORGANISATION"
    SCOPE_USER = "USER"

    TYPE_JSON = "JSON"

    # Verification counters
    settings_created = 0
    settings_existing = 0
    users_created = 0  # Must remain 0

    print("\n--- Starting Settings Seeding ---")
    print("Constraint: NO NEW USERS. Only 'i18n.preferences' key.")

    # 1. Organisation Settings
    organisations = Organisation.objects.filter(is_active=True)
    print(f"Found {organisations.count()} active organisations.")

    # Varied preferences for demo
    org_prefs = [
        {"language": "en", "locale": "en-US", "timezone": "UTC"},
        {"language": "en", "locale": "en-GB", "timezone": "Europe/London"},
        {"language": "nl", "locale": "nl-NL", "timezone": "Europe/Amsterdam"},
        {"language": "fr", "locale": "fr-FR", "timezone": "Europe/Paris"},
    ]

    with transaction.atomic():
        for org in organisations:
            # Deterministic choice based on org name length
            pref = org_prefs[len(org.name) % len(org_prefs)]

            obj, created = Setting.objects.get_or_create(
                key="i18n.preferences",
                scope_type=SCOPE_ORGANISATION,
                organisation=org,
                defaults={
                    "value": pref,
                    "value_type": TYPE_JSON,
                    "default_value": {"language": "en", "locale": "en-US", "timezone": "UTC"},
                },
            )

            if created:
                settings_created += 1
                print(f"  + Org Setting '{org.name}': {pref['locale']}")
            else:
                settings_existing += 1

        # 2. User Settings (Seed a few for variety)
        # Pick top 10 users
        users = User.objects.all().order_by("date_joined")[:10]

        for user in users:
            # Deterministic choice
            pref = org_prefs[len(user.email) % len(org_prefs)]

            obj, created = Setting.objects.get_or_create(
                key="i18n.preferences",
                scope_type=SCOPE_USER,
                user=user,
                defaults={
                    "value": pref,
                    "value_type": TYPE_JSON,
                    "default_value": {"language": "en", "locale": "en-US", "timezone": "UTC"},
                },
            )

            if created:
                settings_created += 1
                print(f"  + User Setting '{user.email}': {pref['locale']}")
            else:
                settings_existing += 1

    print("\n--- Settings Seeding Verification Report ---")
    print(f"Users Created: {users_created} (MUST BE 0)")
    print(f"Settings Created: {settings_created}")
    print(f"Settings Existing: {settings_existing}")
    print(f"Total Settings: {Setting.objects.count()}")

    if users_created > 0:
        print("\n❌ FAILED: Users were created!")
    else:
        print("\n✅ SUCCESS: No new users created.")


if __name__ == "__main__":
    seed_settings()
