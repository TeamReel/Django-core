"""Set password for one or more specific users.

Intended for demo/ops flows where you run commands locally against Railway by
providing DATABASE_URL.

Examples:
  $env:DATABASE_URL="postgresql://..."
  $env:DJANGO_SETTINGS_MODULE="config.settings.production"
  python manage.py set_user_password land-admin@knvb.demo --password "Basis123."

This command also ensures the account is active and email verified by default.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Set password for one or more users (optionally also activate/verify)"

    def add_arguments(self, parser):
        parser.add_argument("emails", nargs="+", help="One or more user emails")
        parser.add_argument(
            "--password",
            type=str,
            default="Basis123.",
            help="Password to set (default: Basis123.)",
        )
        parser.add_argument(
            "--no-activate",
            action="store_true",
            help="Do not force is_active=True",
        )
        parser.add_argument(
            "--no-verify",
            action="store_true",
            help="Do not force email_verified=True",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        emails: list[str] = options["emails"]
        password: str = options["password"]
        activate: bool = not bool(options.get("no_activate"))
        verify: bool = not bool(options.get("no_verify"))

        updated = 0
        missing: list[str] = []

        for email in emails:
            user = User.objects.filter(email=email).first()
            if not user:
                missing.append(email)
                continue

            user.set_password(password)
            if activate and hasattr(user, "is_active"):
                user.is_active = True
            if verify and hasattr(user, "email_verified"):
                user.email_verified = True

            update_fields: list[str] = []
            if activate and hasattr(user, "is_active"):
                update_fields.append("is_active")
            if verify and hasattr(user, "email_verified"):
                update_fields.append("email_verified")

            # set_password updates the hashed password, which lives in `password`.
            update_fields.append("password")
            user.save(update_fields=update_fields)

            updated += 1
            self.stdout.write(f"✓ Updated password for: {email}")

        if missing:
            raise CommandError("User(s) not found: " + ", ".join(missing))

        self.stdout.write(f"Done. Updated={updated}.")
