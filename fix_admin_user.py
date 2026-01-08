"""Fix admin@teamreel.demo to be superadmin."""

import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User

print("=== FIXING ADMIN USER ===\n")

admin_user = User.objects.filter(email="admin@teamreel.demo").first()

if admin_user:
    print(f"Found: {admin_user.email}")
    print(f"Current status:")
    print(f"  - is_superuser: {admin_user.is_superuser}")
    print(f"  - is_staff: {admin_user.is_staff}")
    print(f"  - is_active: {admin_user.is_active}")

    # Make sure they are superadmin
    admin_user.is_superuser = True
    admin_user.is_staff = True
    admin_user.is_active = True
    admin_user.save()

    print(f"\n✅ Updated to Superadmin!")
    print(f"New status:")
    print(f"  - is_superuser: {admin_user.is_superuser}")
    print(f"  - is_staff: {admin_user.is_staff}")
    print(f"  - is_active: {admin_user.is_active}")
else:
    print("❌ admin@teamreel.demo not found!")
