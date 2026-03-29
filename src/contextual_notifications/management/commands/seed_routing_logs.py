"""Seed routing logs for demo purposes."""

import random
from datetime import timedelta

from audit.models import AuditEvent
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from organisations.models import Organisation
from projects.models import Project

User = get_user_model()


class Command(BaseCommand):
    help = "Seed routing logs for demo purposes"

    def handle(self, *args, **options):
        self.stdout.write("Seeding routing logs...")

        # Get demo data
        orgs = Organisation.objects.all()
        projects = Project.objects.all()
        users = User.objects.all()

        if not orgs.exists():
            self.stdout.write(
                self.style.WARNING("No organisations found. Run seed_football_data first.")
            )
            return

        # Event types to simulate
        event_types = [
            "project.created",
            "project.updated",
            "member.role_changed",
            "auth.login",
            "transaction.created",
        ]

        # Decisions
        decisions = ["delivered", "filtered", "failed"]

        # Channels
        channels = ["in_app", "email", "webhook"]

        # Create 20 random logs
        for _ in range(20):
            org = random.choice(orgs)
            # Pick a project belonging to the org if possible, or just any project (for demo simplicity)
            # Ideally we should pick a project from the org
            org_projects = projects.filter(organisation=org)
            project = (
                random.choice(org_projects)
                if org_projects.exists() and random.random() > 0.3
                else None
            )

            user = random.choice(users) if users.exists() else None

            event_type = random.choice(event_types)
            decision = random.choice(decisions)

            # Generate metadata
            metadata = {
                "notification_type": event_type,
                "recipient_count": random.randint(1, 5),
                "decision": decision,
                "delivery_channels": random.sample(channels, k=random.randint(1, 2))
                if decision == "delivered"
                else [],
                "reason": "Policy match" if decision == "delivered" else "No matching rule",
            }

            # Create AuditEvent
            log = AuditEvent.objects.create(
                event_type="notification_routing_decision",
                user=user,
                organization=org,
                project=project,
                metadata=metadata,
            )

            # Backdate some logs to show history
            # We need to use update() to bypass auto_now_add if we want to be sure,
            # or just save() might work depending on Django version/settings.
            # Safest is update() on queryset
            new_time = timezone.now() - timedelta(minutes=random.randint(1, 1000))
            AuditEvent.objects.filter(id=log.id).update(created_at=new_time)

        self.stdout.write(self.style.SUCCESS("Successfully seeded 20 routing logs."))
