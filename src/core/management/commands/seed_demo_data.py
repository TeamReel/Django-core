from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.organisations.models import Organisation, OrganisationMembership
from apps.projects.models import Project
from apps.transactions.models import Transaction
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed minimal demo data (5 users, 2 orgs, 6 projects)"

    def handle(self, *args, **options):
        # Create users
        admin, _ = User.objects.get_or_create(
            email="admin@example.com",
            defaults={
                "is_superuser": True,
                "is_staff": True,
                "first_name": "Admin",
            },
        )
        admin.set_password("demo1234")
        admin.save()

        alice, _ = User.objects.get_or_create(
            email="alice@example.com", defaults={"first_name": "Alice"}
        )
        alice.set_password("demo1234")
        alice.save()

        bob, _ = User.objects.get_or_create(email="bob@example.com", defaults={"first_name": "Bob"})
        bob.set_password("demo1234")
        bob.save()

        carol, _ = User.objects.get_or_create(
            email="carol@example.com", defaults={"first_name": "Carol"}
        )
        carol.set_password("demo1234")
        carol.save()

        dave, _ = User.objects.get_or_create(
            email="dave@example.com", defaults={"first_name": "Dave"}
        )
        dave.set_password("demo1234")
        dave.save()

        # Create organisations
        techcorp, _ = Organisation.objects.get_or_create(
            slug="techcorp", defaults={"name": "TechCorp"}
        )

        datalab, _ = Organisation.objects.get_or_create(
            slug="datalab", defaults={"name": "DataLab"}
        )

        # Create memberships
        OrganisationMembership.objects.get_or_create(
            user=alice, organisation=techcorp, defaults={"role": "admin"}
        )

        OrganisationMembership.objects.get_or_create(
            user=bob, organisation=techcorp, defaults={"role": "member"}
        )

        OrganisationMembership.objects.get_or_create(
            user=carol, organisation=datalab, defaults={"role": "admin"}
        )

        OrganisationMembership.objects.get_or_create(
            user=dave, organisation=datalab, defaults={"role": "member"}
        )

        # Create projects (3 per org)
        Project.objects.get_or_create(
            slug="web-platform",
            organisation=techcorp,
            defaults={"name": "Web Platform", "status": "active"},
        )

        Project.objects.get_or_create(
            slug="mobile-app",
            organisation=techcorp,
            defaults={"name": "Mobile App", "status": "active"},
        )

        Project.objects.get_or_create(
            slug="legacy-api",
            organisation=techcorp,
            defaults={"name": "Legacy API", "status": "archived"},
        )

        Project.objects.get_or_create(
            slug="ml-pipeline",
            organisation=datalab,
            defaults={"name": "ML Pipeline", "status": "active"},
        )

        Project.objects.get_or_create(
            slug="data-warehouse",
            organisation=datalab,
            defaults={"name": "Data Warehouse", "status": "active"},
        )

        Project.objects.get_or_create(
            slug="analytics-dashboard",
            organisation=datalab,
            defaults={"name": "Analytics Dashboard", "status": "archived"},
        )

        # Create transactions (credits)
        Transaction.objects.get_or_create(
            organisation=techcorp,
            defaults={
                "type": "credit",
                "amount": 1000,
                "balance_after": 1000,
                "metadata": {"limit": 5000},
            },
        )

        Transaction.objects.get_or_create(
            organisation=datalab,
            defaults={
                "type": "credit",
                "amount": 250,
                "balance_after": 250,
                "metadata": {"limit": 1000},  # Low credits (25%)
            },
        )

        # Create notifications
        Notification.objects.get_or_create(
            user=alice,
            defaults={
                "type": "info",
                "message": "Welcome to TechCorp!",
                "read": False,
            },
        )

        Notification.objects.get_or_create(
            user=carol,
            defaults={
                "type": "warning",
                "message": "Low credits warning (25% remaining)",
                "read": False,
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
