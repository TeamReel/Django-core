"""
Seed Admin User Only

Creates a single admin user for demo purposes.

Usage:
    $env:DATABASE_URL="postgresql://..."; python manage.py seed_admin_user
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Seed admin user only"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n👤 Creating Admin User\n"))
        self.stdout.write("=" * 70)

        user, created = User.objects.get_or_create(
            email="admin@teamreel.demo",
            defaults={
                "first_name": "Demo",
                "last_name": "Administrator",
                "email_verified": True,
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if created:
            user.set_password("demo123")
            user.save()
            self.stdout.write(f"  ✓ Created admin: {user.email}")
        else:
            self.stdout.write(f"  ↻ Admin exists: {user.email}")

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Admin user ready"))
        self.stdout.write("=" * 70 + "\n")
