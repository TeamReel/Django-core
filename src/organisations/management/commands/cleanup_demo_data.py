from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from organisations.models import Organisation, Membership
from transactions.models import Transaction, UsageEvent, BalancePolicy
from settings.models import FeatureFlag, Setting
from projects.models import Project
from audit.models import AuditEvent
from contextual_notifications.models import OrganisationNotificationPolicy, RoutingRule
from credits.models import CreditsBalance
from files.models import FileAsset
from permissions.models import RoleAssignment

User = get_user_model()


class Command(BaseCommand):
    help = "Cleans up demo data created by seed_demo_data."

    def handle(self, *args, **options):
        self.stdout.write("Cleaning up demo data...")

        emails = [
            "admin@example.com",
            "org_admin@example.com",
            "user@example.com",
            "pl_admin@example.com",
            "laliga_admin@example.com",
        ]
        slugs = ["bundesliga", "premier-league", "la-liga"]

        # Get objects
        orgs = Organisation.objects.filter(slug__in=slugs)
        users = User.objects.filter(email__in=emails)

        if orgs.exists():
            self.stdout.write(f"Found {orgs.count()} organisations to clean up.")

            # 1. Delete Child Objects (Reverse Dependency Order)

            # Transactions & Usage (PROTECT)
            Transaction.objects.filter(organization__in=orgs).delete()
            UsageEvent.objects.filter(organization__in=orgs).delete()
            BalancePolicy.objects.filter(organization__in=orgs).delete()
            self.stdout.write("Deleted transactions, usage events, and balance policies.")

            # Settings & Feature Flags
            FeatureFlag.objects.filter(key="theme_toggle", scope_type="GLOBAL").delete()
            FeatureFlag.objects.filter(key="dark_mode", organisation__in=orgs).delete()
            Setting.objects.filter(organisation__in=orgs).delete()
            self.stdout.write("Deleted settings and feature flags.")

            # Contextual Notifications
            OrganisationNotificationPolicy.objects.filter(organisation__in=orgs).delete()
            RoutingRule.objects.filter(organisation__in=orgs).delete()
            self.stdout.write("Deleted notification policies and routing rules.")

            # Credits
            CreditsBalance.objects.filter(organisation__in=orgs).delete()
            self.stdout.write("Deleted credits balances.")

            # Files
            FileAsset.objects.filter(organization__in=orgs).delete()
            self.stdout.write("Deleted file assets.")

            # Permissions & Roles
            RoleAssignment.objects.filter(target_organization__in=orgs).delete()
            self.stdout.write("Deleted role assignments.")

            # Audit Events
            AuditEvent.objects.filter(organization__in=orgs).delete()
            self.stdout.write("Deleted audit events.")

            # Projects (CASCADE, but lets be explicit to be safe)
            Project.objects.filter(organisation__in=orgs).delete()
            self.stdout.write("Deleted projects.")

            # Memberships (CASCADE usually, but lets be explicit)
            Membership.objects.filter(organisation__in=orgs).delete()
            self.stdout.write("Deleted memberships.")

        # 2. Delete Organisations
        count, _ = orgs.delete()
        self.stdout.write(f"Deleted {count} organisations.")

        # 3. Delete Users
        count, _ = users.delete()
        self.stdout.write(f"Deleted {count} users.")

        self.stdout.write(self.style.SUCCESS("Cleanup complete."))
