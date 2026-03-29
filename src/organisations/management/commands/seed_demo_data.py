import random
from datetime import timedelta
from decimal import Decimal

from credits.models import CreditsBalance
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from django.utils import timezone
from notifications.models import Notification, NotificationType, RetryPolicy
from organisations.models import Organisation
from projects.models import Project
from settings.models import FeatureFlag, ScopeType
from transactions.models import Transaction

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds demo data for the Django Core application."

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        with db_transaction.atomic():
            self.seed_users()
            self.seed_organisations_and_projects()
            self.seed_notifications()
            self.seed_transactions_and_balances()
            self.seed_feature_flags()

        self.stdout.write(self.style.SUCCESS("Successfully seeded demo data."))

    def seed_users(self):
        self.stdout.write("Seeding users...")
        users_data = [
            {
                "email": "admin@example.com",
                "first_name": "Super",
                "last_name": "Admin",
                "is_superuser": True,
                "is_staff": True,
            },
            {
                "email": "org_admin@example.com",
                "first_name": "Bundesliga",
                "last_name": "Admin",
                "is_superuser": False,
                "is_staff": False,
            },
            {
                "email": "user@example.com",
                "first_name": "Bundesliga",
                "last_name": "User",
                "is_superuser": False,
                "is_staff": False,
            },
            {
                "email": "pl_admin@example.com",
                "first_name": "Premier",
                "last_name": "League Admin",
                "is_superuser": False,
                "is_staff": False,
            },
            {
                "email": "laliga_admin@example.com",
                "first_name": "La Liga",
                "last_name": "Admin",
                "is_superuser": False,
                "is_staff": False,
            },
        ]

        for u_data in users_data:
            user, created = User.objects.get_or_create(
                email=u_data["email"],
                defaults={
                    "username": u_data["email"],
                    "first_name": u_data["first_name"],
                    "last_name": u_data["last_name"],
                    "is_superuser": u_data["is_superuser"],
                    "is_staff": u_data["is_staff"],
                    "is_active": True,
                    "email_verified": True,
                },
            )
            if created:
                user.set_password("password123")
                user.save()
                self.stdout.write(f"Created user: {user.email}")
            else:
                self.stdout.write(f"User exists: {user.email}")

    def seed_organisations_and_projects(self):
        self.stdout.write("Seeding organisations and projects...")

        orgs_data = [
            {
                "name": "Bundesliga",
                "slug": "bundesliga",
                "projects": ["Website Redesign", "Mobile App", "Ticketing System"],
            },
            {
                "name": "Premier League",
                "slug": "premier-league",
                "projects": ["Global Marketing", "Fan Engagement", "Video Archive"],
            },
            {
                "name": "La Liga",
                "slug": "la-liga",
                "projects": ["Digital Transformation", "Youth Academy Portal"],
            },
        ]

        for org_data in orgs_data:
            org, created = Organisation.objects.get_or_create(
                slug=org_data["slug"], defaults={"name": org_data["name"]}
            )
            if created:
                self.stdout.write(f"Created org: {org.name}")

            # Add users to orgs (simplified logic)
            if org.slug == "bundesliga":
                org.users.add(User.objects.get(email="org_admin@example.com"))
                org.users.add(User.objects.get(email="user@example.com"))
            elif org.slug == "premier-league":
                org.users.add(User.objects.get(email="pl_admin@example.com"))
            elif org.slug == "la-liga":
                org.users.add(User.objects.get(email="laliga_admin@example.com"))

            # Always add superadmin
            org.users.add(User.objects.get(email="admin@example.com"))

            # Create Projects
            for proj_name in org_data["projects"]:
                Project.objects.get_or_create(
                    name=proj_name,
                    organisation=org,
                    defaults={"description": f"Project for {org.name}"},
                )

    def seed_notifications(self):
        self.stdout.write("Seeding notifications...")

        # Ensure RetryPolicy
        policy, _ = RetryPolicy.objects.get_or_create(
            name="default-policy",
            defaults={
                "max_attempts": 3,
                "retry_window_seconds": 3600,
                "backoff_strategy": "exponential",
                "backoff_multiplier": 2.0,
                "initial_delay_seconds": 60,
            },
        )

        # Ensure NotificationTypes
        types = ["info", "warning", "success", "error"]
        type_objs = {}
        for t_code in types:
            nt, _ = NotificationType.objects.get_or_create(
                code=t_code,
                defaults={
                    "name": t_code.capitalize(),
                    "default_channel": "in_app",
                    "retry_policy": policy,
                },
            )
            type_objs[t_code] = nt

        users = User.objects.all()

        for user in users:
            # Create 5-10 notifications per user
            count = random.randint(5, 10)
            for i in range(count):
                t_code = random.choice(types)
                is_read = random.choice([True, False])

                Notification.objects.create(
                    type=type_objs[t_code],
                    channel="in_app",
                    recipient=str(user.id),
                    recipient_user=user,
                    status="sent",
                    payload={
                        "subject": f"Demo Notification {i+1}",
                        "body": f"This is a {t_code} notification for {user.first_name}.",
                        "action_url": "/dashboard",
                    },
                    read_at=timezone.now() if is_read else None,
                    created_at=timezone.now() - timedelta(days=random.randint(0, 7)),
                )
        self.stdout.write("Notifications seeded.")

    def seed_transactions_and_balances(self):
        self.stdout.write("Seeding transactions and balances...")

        orgs = Organisation.objects.all()

        for org in orgs:
            # Clear existing transactions to ensure balance match
            # In a real seed, we might want to append, but for demo consistency, let's be careful.
            # We'll just add new ones and update balance.

            current_balance = 0

            # Create 10-20 transactions
            count = random.randint(10, 20)
            for _ in range(count):
                amount = Decimal(random.randint(-500, 1000))
                # Ensure non-zero
                if amount == 0:
                    amount = Decimal(100)

                Transaction.objects.create(
                    amount=amount,
                    organization=org,
                    project=org.projects.first(),  # Assign to first project
                )
                current_balance += amount

            # Update CreditsBalance
            # Note: CreditsBalance uses Integer, Transaction uses Decimal.
            # We'll cast to int for the balance model.
            balance_obj, _ = CreditsBalance.objects.get_or_create(organisation=org)

            # Recalculate total from DB to be safe
            total = sum(t.amount for t in Transaction.objects.filter(organization=org))
            balance_obj.current_balance = int(total)
            balance_obj.save()

            self.stdout.write(
                f"Org {org.name}: {count} transactions, Balance: {balance_obj.current_balance}"
            )

    def seed_feature_flags(self):
        self.stdout.write("Seeding feature flags...")

        # Global theme toggle (enabled)
        FeatureFlag.objects.update_or_create(
            key="theme_toggle",
            scope_type=ScopeType.GLOBAL,
            defaults={"enabled": True, "description": "Enable theme toggling globally"},
        )

        # Per-org Dark Mode preference
        # Bundesliga: Light (False)
        bundesliga = Organisation.objects.filter(slug="bundesliga").first()
        if bundesliga:
            FeatureFlag.objects.update_or_create(
                key="dark_mode",
                scope_type=ScopeType.ORGANISATION,
                organisation=bundesliga,
                defaults={"enabled": False, "description": "Force Dark Mode for this organisation"},
            )

        # Premier League: Dark (True)
        pl = Organisation.objects.filter(slug="premier-league").first()
        if pl:
            FeatureFlag.objects.update_or_create(
                key="dark_mode",
                scope_type=ScopeType.ORGANISATION,
                organisation=pl,
                defaults={"enabled": True, "description": "Force Dark Mode for this organisation"},
            )

        self.stdout.write("Feature flags seeded.")
