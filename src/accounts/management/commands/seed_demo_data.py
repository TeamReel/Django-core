from django.core.management.base import BaseCommand
from organisations.models import Membership, Organisation
from projects.models import Project

from accounts.models import User


class Command(BaseCommand):
    help = "Seed minimal demo data (5 users, 2 orgs, 6 projects)"

    def handle(self, *args, **options):
        # Create users
        admin, created = User.objects.get_or_create(
            email="admin@example.com",
            defaults={
                "is_superuser": True,
                "is_staff": True,
                "first_name": "Admin",
                "email_verified": True,
                "is_active": True,
            },
        )
        if created:
            admin.set_password("demo1234")
            admin.save()
            self.stdout.write("Created user: admin@example.com")

        alice, created = User.objects.get_or_create(
            email="alice@example.com",
            defaults={"first_name": "Alice", "email_verified": True, "is_active": True},
        )
        if created:
            alice.set_password("demo1234")
            alice.save()
            self.stdout.write("Created user: alice@example.com")

        bob, created = User.objects.get_or_create(
            email="bob@example.com",
            defaults={"first_name": "Bob", "email_verified": True, "is_active": True},
        )
        if created:
            bob.set_password("demo1234")
            bob.save()
            self.stdout.write("Created user: bob@example.com")

        carol, created = User.objects.get_or_create(
            email="carol@example.com",
            defaults={"first_name": "Carol", "email_verified": True, "is_active": True},
        )
        if created:
            carol.set_password("demo1234")
            carol.save()
            self.stdout.write("Created user: carol@example.com")

        dave, created = User.objects.get_or_create(
            email="dave@example.com",
            defaults={"first_name": "Dave", "email_verified": True, "is_active": True},
        )
        if created:
            dave.set_password("demo1234")
            dave.save()
            self.stdout.write("Created user: dave@example.com")

        # Create organisations
        techcorp, created = Organisation.objects.get_or_create(
            slug="techcorp",
            defaults={"name": "TechCorp", "creator": admin},
        )
        if created:
            self.stdout.write("Created organisation: TechCorp")

        # Ensure admin is a member of TechCorp
        Membership.objects.get_or_create(
            user=admin, organisation=techcorp, defaults={"role": "admin"}
        )

        datalab, created = Organisation.objects.get_or_create(
            slug="datalab",
            defaults={"name": "DataLab", "creator": admin},
        )
        if created:
            self.stdout.write("Created organisation: DataLab")

        # Ensure admin is a member of DataLab
        Membership.objects.get_or_create(
            user=admin, organisation=datalab, defaults={"role": "admin"}
        )

        # Create projects (3 per org)
        projects = [
            ("web-platform", techcorp, "Web Platform"),
            ("mobile-app", techcorp, "Mobile App"),
            ("legacy-api", techcorp, "Legacy API"),
            ("ml-pipeline", datalab, "ML Pipeline"),
            ("data-warehouse", datalab, "Data Warehouse"),
            ("analytics-dashboard", datalab, "Analytics Dashboard"),
        ]

        for slug, org, name in projects:
            project, created = Project.objects.get_or_create(
                slug=slug,
                organisation=org,
                defaults={"name": name, "creator": admin},
            )
            if created:
                self.stdout.write(f"Created project: {name} ({org.name})")

        self.stdout.write(self.style.SUCCESS("\nDemo data seeded successfully!"))
