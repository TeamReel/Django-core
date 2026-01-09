import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.contrib.auth import get_user_model
from organisations.models import Organisation

User = get_user_model()


def run():
    print("Creating user...")
    user, created = User.objects.get_or_create(
        username="debug_user", defaults={"email": "debug@example.com"}
    )
    print(f"User: {user} (ID: {user.id})")

    print("Creating org...")
    try:
        org = Organisation.objects.create(name="Debug Org", slug="debug-org", creator=user)
        print(f"Org created: {org}")
    except Exception as e:
        print(f"Error creating org: {e}")


if __name__ == "__main__":
    run()
