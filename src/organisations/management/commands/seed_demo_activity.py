import random
from decimal import Decimal

from accounts.models import User
from audit.models import AuditEvent
from credits.models import CreditsBalance
from django.core.management.base import BaseCommand, CommandError
from django.db import models
from django.utils import timezone
from notifications.models import Notification, NotificationType, RetryPolicy
from organisations.models import Organisation
from transactions.models import SourceTypeChoices, Transaction


class Command(BaseCommand):
    help = (
        "Seeds realistic demo activity (transactions, notifications, events) for existing entities."
    )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding demo activity..."))

        # Deterministic seed
        random.seed(42)

        # 1. Safety Check
        organisations = Organisation.objects.all()
        users = User.objects.all()

        if not organisations.exists() or not users.exists():
            raise CommandError(
                "No Organisations or Users found. Please run"
                " 'python manage.py seed_football_data' first."
            )

        self.stdout.write(f"Found {organisations.count()} organisations and {users.count()} users.")

        # 2. Seed Transactions & Balances
        self.seed_transactions_and_balances(organisations)

        # 3. Seed Notifications
        self.seed_notifications(users)

        # 4. Seed Events
        self.seed_events(users)

        self.stdout.write(self.style.SUCCESS("Successfully seeded demo activity."))

    def seed_transactions_and_balances(self, organisations):
        self.stdout.write("Seeding transactions and updating balances...")

        transactions_to_create = []

        for org in organisations:
            # Get active members of the organisation
            members = org.memberships.filter(is_active=True).select_related("user")
            if not members.exists():
                self.stdout.write(
                    self.style.WARNING(f"Skipping org {org.name} (no active members)")
                )
                continue

            org_users = [m.user for m in members]

            # Generate 10-20 transactions per org
            num_txns = random.randint(10, 20)

            for i in range(num_txns):
                # Deterministic idempotency key
                idempotency_key = f"demo-txn-{org.id}-{i}"

                # Check if exists
                if Transaction.objects.filter(idempotency_key=idempotency_key).exists():
                    continue

                amount = Decimal(random.uniform(-500, 1000)).quantize(Decimal("0.0001"))
                if amount == 0:
                    amount = Decimal("10.0000")

                source_type = random.choice(
                    [c for c in SourceTypeChoices.values if c != SourceTypeChoices.USAGE_EVENT]
                )

                created_by = random.choice(org_users)

                txn = Transaction(
                    amount=amount,
                    organization=org,
                    source_type=source_type,
                    notes=f"Demo transaction {i+1}",
                    idempotency_key=idempotency_key,
                    created_by=created_by,
                )
                transactions_to_create.append(txn)

        if transactions_to_create:
            Transaction.objects.bulk_create(transactions_to_create)
            self.stdout.write(f"Created {len(transactions_to_create)} transactions.")
        else:
            self.stdout.write("No new transactions created.")

        # Update CreditsBalance
        for org in organisations:
            total_balance = Transaction.objects.filter(
                organization=org, project__isnull=True
            ).aggregate(total=models.Sum("amount"))["total"] or Decimal("0")

            CreditsBalance.objects.update_or_create(
                organisation=org, defaults={"current_balance": int(total_balance)}
            )

        self.stdout.write(f"Updated balances for {len(organisations)} organisations.")

    def seed_notifications(self, users):
        self.stdout.write("Seeding notifications...")

        retry_policy, _ = RetryPolicy.objects.get_or_create(
            name="default",
            defaults={
                "max_attempts": 3,
                "retry_window_seconds": 3600,
                "backoff_strategy": "exponential",
                "backoff_multiplier": 2.0,
                "initial_delay_seconds": 60,
            },
        )

        notif_type, _ = NotificationType.objects.get_or_create(
            code="system_alert",
            defaults={
                "name": "System Alert",
                "description": "General system alerts",
                "default_channel": "in_app",
                "is_active": True,
                "retry_policy": retry_policy,
            },
        )

        notifications_to_create = []

        for user in users:
            # Check if user already has demo notifications (simple heuristic)
            if Notification.objects.filter(recipient_user=user, type=notif_type).exists():
                continue

            num_notifs = random.randint(5, 10)

            for i in range(num_notifs):
                is_read = random.choice([True, False])
                read_at = timezone.now() if is_read else None

                notif = Notification(
                    type=notif_type,
                    channel="in_app",
                    recipient=user.email,
                    recipient_user=user,
                    payload={
                        "title": random.choice(["Welcome", "Update", "Alert", "Reminder"]),
                        "message": f"This is a demo notification {i+1}",
                    },
                    status="sent",
                    read_at=read_at,
                )
                notifications_to_create.append(notif)

        if notifications_to_create:
            Notification.objects.bulk_create(notifications_to_create)
            self.stdout.write(f"Created {len(notifications_to_create)} notifications.")
        else:
            self.stdout.write("No new notifications created.")

    def seed_events(self, users):
        self.stdout.write("Seeding audit events...")

        events_to_create = []

        for user in users:
            # Get user's organisations
            user_orgs = list(
                user.organisation_memberships.filter(is_active=True).values_list(
                    "organisation", flat=True
                )
            )
            if not user_orgs:
                continue

            # Check if user has events
            if AuditEvent.objects.filter(user=user).exists():
                continue

            num_events = random.randint(3, 8)

            for _ in range(num_events):
                org_id = random.choice(user_orgs)

                event = AuditEvent(
                    event_type=random.choice(
                        ["login", "logout", "view_page", "export_data", "update_settings"]
                    ),
                    user=user,
                    organization_id=org_id,
                    metadata={"ip": "127.0.0.1", "user_agent": "Mozilla/5.0"},
                )
                events_to_create.append(event)

        if events_to_create:
            AuditEvent.objects.bulk_create(events_to_create)
            self.stdout.write(f"Created {len(events_to_create)} audit events.")
        else:
            self.stdout.write("No new audit events created.")
