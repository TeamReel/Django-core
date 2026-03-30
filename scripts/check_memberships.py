import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from organisations.models import Membership
from accounts.models import User


def check_memberships():
    print(f"\n--- Checking Memberships ---")

    total_memberships = Membership.objects.filter(is_active=True).count()
    print(f"Total active memberships: {total_memberships}")

    users_with_memberships = (
        Membership.objects.filter(is_active=True).values("user_id").distinct().count()
    )
    print(f"Users with active memberships: {users_with_memberships}")

    total_users = User.objects.count()
    print(f"Total users: {total_users}")

    # Sample memberships
    print(f"\n--- Sample Memberships ---")
    memberships = Membership.objects.filter(is_active=True).select_related("user", "organisation")[
        :10
    ]
    for m in memberships:
        print(f"{m.user.first_name} {m.user.last_name} -> {m.organisation.name} ({m.role})")


if __name__ == "__main__":
    check_memberships()
