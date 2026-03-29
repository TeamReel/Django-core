"""
Set demo password for all users in the database.

This is ONLY for demo/development environments.
DO NOT run in production!
"""

from accounts.models import User
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Set password 'Basis123.' for all users (DEMO ONLY)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            type=str,
            default="Basis123.",
            help="Password to set for all users (default: Basis123.)",
        )

    def handle(self, *args, **options):
        password = options.get("password", "Basis123.")

        self.stdout.write("=" * 70)
        self.stdout.write("SET DEMO PASSWORDS")
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.WARNING(f"\nSetting password '{password}' for all users..."))

        users = User.objects.all()
        total = users.count()

        with transaction.atomic():
            for user in users:
                user.set_password(password)
                user.is_active = True  # Also activate all users
                user.email_verified = True  # Mark email as verified
                user.save()

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(f"TOTAL USERS UPDATED: {total}")
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS(f"\nAll {total} users now have password: {password}"))
        self.stdout.write(self.style.SUCCESS("All users are activated and email verified."))
