from django.core.management.base import BaseCommand
from organisations.models import Organisation, Membership
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Verify demo data state"

    def handle(self, *args, **options):
        self.stdout.write("--- Verification Report ---")

        # 1. Total Memberships
        count = Membership.objects.count()
        self.stdout.write(f"Total Memberships: {count}")

        # 2. Check specific users
        targets = [
            ("koeman@eredivisie.demo", "Eredivisie", "admin"),
            ("slot@liverpool.demo", "Premier League", "member"),
            ("kompany@bayern.demo", "Bundesliga", "member"),
            ("alonso@leverkusen.demo", "Bundesliga", "member"),
        ]

        for email, org_name, role in targets:
            try:
                u = User.objects.get(email=email)
                o = Organisation.objects.get(name=org_name)
                m = Membership.objects.get(user=u, organisation=o)
                status = "PASS" if m.role == role else f"FAIL (Role mismatch: {m.role} != {role})"
                self.stdout.write(f"[{status}] {email} -> {org_name}")
            except User.DoesNotExist:
                self.stdout.write(f"[FAIL] User {email} missing")
            except Organisation.DoesNotExist:
                self.stdout.write(f"[FAIL] Org {org_name} missing")
            except Membership.DoesNotExist:
                self.stdout.write(f"[FAIL] Membership missing for {email} in {org_name}")

        # 3. Counts per org
        self.stdout.write("\n--- Organisation Counts ---")
        for o in Organisation.objects.all().order_by("name"):
            c = o.memberships.count()
            self.stdout.write(f"{o.name}: {c}")
