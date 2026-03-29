"""
TeamReel Level 1 Seeder: Users (Foundation)

Seeds 5 demo users as foundation for all other data.

Usage:
    # Production (Railway):
    $env:DATABASE_URL="postgresql://..."; python manage.py seed_level_1_users
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Seed Level 1: Users (5 demo users)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n👥 Level 1: Users\n"))
        self.stdout.write("=" * 70)

        users_data = [
            {
                "email": "admin@teamreel.demo",
                "first_name": "Demo",
                "last_name": "Administrator",
                "is_superuser": True,
                "is_staff": True,
            },
            {
                "email": "john.heitinga@ajax.nl",
                "first_name": "John",
                "last_name": "Heitinga",
                "is_superuser": False,
                "is_staff": False,
            },
            {
                "email": "brian.brobbey@ajax.nl",
                "first_name": "Brian",
                "last_name": "Brobbey",
                "is_superuser": False,
                "is_staff": False,
            },
            {
                "email": "peter.bosz@psv.nl",
                "first_name": "Peter",
                "last_name": "Bosz",
                "is_superuser": False,
                "is_staff": False,
            },
            {
                "email": "luuk.dejong@psv.nl",
                "first_name": "Luuk",
                "last_name": "de Jong",
                "is_superuser": False,
                "is_staff": False,
            },
        ]

        created_count = 0
        existing_count = 0

        for user_data in users_data:
            user, created = User.objects.get_or_create(
                email=user_data["email"],
                defaults={
                    "first_name": user_data["first_name"],
                    "last_name": user_data["last_name"],
                    "email_verified": True,
                    "is_active": True,
                    "is_staff": user_data["is_staff"],
                    "is_superuser": user_data["is_superuser"],
                },
            )
            if created:
                user.set_password("demo123")  # Demo password
                user.save()
                created_count += 1
                role = "Admin" if user.is_superuser else "User"
                self.stdout.write(f"  ✓ Created: {user.email} ({role})")
            else:
                existing_count += 1
                self.stdout.write(f"  ↻ Exists: {user.email}")

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Level 1 Complete"))
        self.stdout.write(f"   Created:  {created_count}")
        self.stdout.write(f"   Existing: {existing_count}")
        self.stdout.write(f"   Total:    {created_count + existing_count} users")
        self.stdout.write("=" * 70 + "\n")
