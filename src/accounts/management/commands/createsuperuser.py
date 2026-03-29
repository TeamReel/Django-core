"""Django management command to create a superuser account."""

import getpass

from accounts.models import User
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.core.validators import validate_email


class Command(BaseCommand):
    """Create a superuser account with email verification bypassed."""

    help = "Create a superuser account"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument("--email", type=str, help="Superuser email address")
        parser.add_argument("--no-input", action="store_true", help="Non-interactive mode")

    def handle(self, *args, **options):
        """Execute the command."""
        email = options.get("email")
        no_input = options.get("no_input")

        if no_input and not email:
            self.stderr.write("--email required in non-interactive mode")
            return

        # Get email
        while not email:
            email = input("Email address: ").strip()
            if not email:
                self.stderr.write("Email is required")
                continue
            try:
                validate_email(email)
            except ValidationError:
                self.stderr.write("Invalid email format")
                email = None
                continue

            # Check uniqueness
            if User.objects.filter(email=email).exists():
                self.stderr.write(f"User with email {email} already exists")
                email = None

        # Get password
        if no_input:
            self.stderr.write("Cannot create superuser in non-interactive mode without password")
            return

        password = None
        while not password:
            password = getpass.getpass("Password: ")
            password_confirm = getpass.getpass("Password (again): ")

            if password != password_confirm:
                self.stderr.write("Passwords do not match")
                password = None
                continue

            try:
                validate_password(password)
            except ValidationError as e:
                for error in e.messages:
                    self.stderr.write(error)
                password = None

        # Create superuser
        user = User.objects.create_superuser(email=email, password=password)

        # Assign to superadmin group
        try:
            superadmin_group = Group.objects.get(name="superadmin")
            user.groups.add(superadmin_group)
        except Group.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(
                    "Warning: superadmin group does not exist. Run migrations first."
                )
            )

        self.stdout.write(self.style.SUCCESS(f"Superuser created successfully: {email}"))
