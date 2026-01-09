"""Create Land Admin membership for land-admin@knvb.demo."""

import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User
from organisations.models import Organisation, Membership

print("=== CREATING LAND ADMIN MEMBERSHIP ===\n")

try:
    user = User.objects.get(email="land-admin@knvb.demo")
    knvb = Organisation.objects.get(slug="knvb")

    # Check if membership already exists
    membership, created = Membership.objects.get_or_create(
        user=user, organisation=knvb, defaults={"role": "admin", "is_active": True}
    )

    if created:
        print(f"✅ Created admin membership: {user.email} → {knvb.name} (admin)")
    else:
        print(f"⚠️ Membership already exists: {membership.role}")
        if membership.role != "admin":
            membership.role = "admin"
            membership.save()
            print(f"✅ Updated role to admin")

    # Verify
    from accounts.serializers import UserListSerializer

    serializer = UserListSerializer(user)
    print(f"\nVerification:")
    print(f"  Role: {serializer.data['role']}")
    print(f"  Organisations: {serializer.data['organisations']}")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
