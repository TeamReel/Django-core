"""
Django management command to seed audit events with test data.

Usage:
    python manage.py audit_seed              # Generate 100 events
    python manage.py audit_seed --count 500  # Generate 500 events

Note: Uses random module for test data generation (not cryptographic purposes).
"""  # noqa: S311 (test data generation, not cryptographic)

import random
from datetime import datetime, timedelta, timezone

from audit.api import audit_log
from audit.registry import is_event_type_registered, register_event_type
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models import Project

User = get_user_model()


class Command(BaseCommand):
    """Generate test audit events with diverse event types and realistic metadata."""

    help = "Seed the database with test audit events"

    # Event type templates with (category, description, metadata_generator)
    EVENT_TEMPLATES = [
        (
            "auth.login",
            "auth",
            "User login",
            lambda: {"ip": _random_ip(), "user_agent": _random_user_agent()},
        ),
        (
            "auth.logout",
            "auth",
            "User logout",
            lambda: {"ip": _random_ip(), "session_duration_seconds": random.randint(60, 14400)},
        ),
        (
            "auth.login_failed",
            "auth",
            "Failed login attempt",
            lambda: {
                "ip": _random_ip(),
                "reason": random.choice(["invalid_password", "user_not_found", "account_locked"]),
            },
        ),
        (
            "permission.checked",
            "security",
            "Permission check",
            lambda: {
                "permission": random.choice(["view", "edit", "delete", "admin"]),
                "resource_type": random.choice(["project", "organisation", "user"]),
                "granted": random.choice([True, False]),
            },
        ),
        (
            "role.assigned",
            "security",
            "Role assigned to user",
            lambda: {"role": random.choice(["admin", "member", "viewer"]), "assigned_by": "admin"},
        ),
        (
            "config.updated",
            "system",
            "Configuration change",
            lambda: {
                "setting": random.choice(["max_upload_size", "session_timeout", "api_rate_limit"]),
                "old_value": random.randint(1, 100),
                "new_value": random.randint(1, 100),
            },
        ),
        (
            "resource.created",
            "resource",
            "Resource created",
            lambda: {
                "resource_type": random.choice(["project", "organisation", "document"]),
                "resource_id": random.randint(1000, 9999),
            },
        ),
    ]

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--count",
            type=int,
            default=100,
            help="Number of audit events to generate (default: 100)",
        )

    def handle(self, *args, **options):
        """Generate test audit events."""
        count = options["count"]

        # Register event types if needed
        self._register_event_types()

        # Get or create users, orgs, projects
        users = self._get_or_create_users()
        orgs = self._get_or_create_organisations()
        projects = self._get_or_create_projects(orgs)

        self.stdout.write(f"Generating {count} audit events...")

        # Generate events
        progress_interval = 20
        for i in range(count):
            # Pick random event template
            event_type, _category, _description, metadata_generator = random.choice(
                self.EVENT_TEMPLATES
            )

            # Pick random context (60% with user, 40% anonymous)
            user = random.choice(users) if random.random() < 0.6 else None

            # 50% with org, 30% with project
            org = random.choice(orgs) if random.random() < 0.5 else None
            project = random.choice(projects) if org and random.random() < 0.3 else None

            # Generate metadata
            metadata = metadata_generator()

            # Random timestamp in last 30 days
            days_ago = random.randint(0, 30)
            hours_ago = random.randint(0, 23)
            minutes_ago = random.randint(0, 59)
            created_at = datetime.now(timezone.utc) - timedelta(
                days=days_ago, hours=hours_ago, minutes=minutes_ago
            )

            # Record event
            audit_log.record(
                event_type,
                user=user,
                organization=org,
                project=project,
                metadata=metadata,
            )

            # Update created_at to simulate historical data
            from audit.models import AuditEvent

            event = AuditEvent.objects.latest("created_at")
            event.created_at = created_at
            event.save(update_fields=["created_at"])

            # Progress indicator
            if (i + 1) % progress_interval == 0:
                self.stdout.write(self.style.SUCCESS(f"  Generated {i + 1}/{count} events..."))

        self.stdout.write(self.style.SUCCESS(f"\n✓ Successfully generated {count} audit events"))

    def _register_event_types(self):
        """Register all event types used by the seeder."""
        for event_type, category, description, _metadata_gen in self.EVENT_TEMPLATES:
            if not is_event_type_registered(event_type):
                register_event_type(event_type, category, description)

    def _get_or_create_users(self):
        """Get existing users or create test users."""
        users = list(User.objects.all()[:10])
        if len(users) < 3:
            # Create test users if not enough exist
            for i in range(3 - len(users)):
                user = User.objects.create_user(
                    email=f"testuser{i}@example.com",
                    password="testpass123",  # noqa: S106 (test data only)
                )
                users.append(user)
        return users

    def _get_or_create_organisations(self):
        """Get existing organisations or create test orgs."""
        orgs = list(Organisation.objects.all()[:5])
        if len(orgs) < 2:
            # Create test orgs if not enough exist
            creator = User.objects.first()
            for i in range(2 - len(orgs)):
                org = Organisation.objects.create(
                    name=f"Test Organisation {i}",
                    creator=creator,
                )
                orgs.append(org)
        return orgs

    def _get_or_create_projects(self, orgs):
        """Get existing projects or create test projects."""
        projects = list(Project.objects.all()[:10])
        if len(projects) < 3 and orgs:
            # Create test projects if not enough exist
            creator = User.objects.first()
            for i in range(3 - len(projects)):
                project = Project.objects.create(
                    name=f"Test Project {i}",
                    organisation=random.choice(orgs),
                    creator=creator,
                )
                projects.append(project)
        return projects


def _random_ip():  # noqa: S311 (test data, not cryptographic)
    """Generate a random IP address."""
    # Line too long split avoided for readability
    parts = [random.randint(1, 255), random.randint(0, 255)]
    parts.extend([random.randint(0, 255), random.randint(1, 255)])
    return f"{parts[0]}.{parts[1]}.{parts[2]}.{parts[3]}"


def _random_user_agent():
    """Generate a random user agent string."""
    browsers = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0",
    ]
    return random.choice(browsers)
