#!/usr/bin/env python
"""
Create admin user for testing
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Create admin user
admin_user, created = User.objects.get_or_create(
    email="admin@example.com",
    defaults={
        "first_name": "Admin",
        "last_name": "User",
        "is_staff": True,
        "is_superuser": True,
    },
)

admin_user.set_password("admin123")
admin_user.save()

print(f"Admin user {'created' if created else 'updated'}: {admin_user.email}")
print("Password: admin123")
