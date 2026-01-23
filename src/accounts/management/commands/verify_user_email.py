"""Verify (mark email_verified=True) for one or more users.

This is intended for demo/ops use where you run commands locally against the
Railway database by providing DATABASE_URL.

Examples:
  # Railway (recommended):
  $env:DATABASE_URL="postgresql://..."; $env:DJANGO_SETTINGS_MODULE="config.settings.production"; python manage.py verify_user_email land-admin@knvb.demo

  # Local dev:
  python manage.py verify_user_email land-admin@knvb.demo
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Mark one or more users as email_verified=True"

    def add_arguments(self, parser):
        parser.add_argument(
            "emails",
            nargs="+",
            help="One or more user emails to verify",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        emails: list[str] = options["emails"]

        updated = 0
        missing: list[str] = []

        for email in emails:
            user = User.objects.filter(email=email).first()
            if not user:
                missing.append(email)
                continue

            if getattr(user, "email_verified", True) is True:
                self.stdout.write(self.style.SUCCESS(f"✓ Already verified: {email}"))
                continue

            user.email_verified = True
            user.save(update_fields=["email_verified"])
            updated += 1
            self.stdout.write(self.style.SUCCESS(f"✓ Verified: {email}"))

        if missing:
            raise CommandError("User(s) not found: " + ", ".join(missing))

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Updated={updated}, Already verified={len(emails) - updated}."
            )
        )
