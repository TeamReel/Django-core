"""
Seed Team Admins for demo data via management command.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from projects.models import Project, ProjectMembership

User = get_user_model()


class Command(BaseCommand):
    help = "Create admin memberships for team coaches and club directors"

    def handle(self, *args, **options):
        self.stdout.write("🏃 Seeding Team Admins...")
        self.stdout.write("=" * 60)
        self.seed_team_admins()

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("\n🏢 Seeding Club Admins...")
        self.stdout.write("=" * 60)
        self.seed_club_admins()

        self.stdout.write("\n✅ Done!")

    def seed_team_admins(self):
        """Create admin memberships for team coaches."""

        teams_with_coaches = [
            # SC Heerenveen
            ("SC Heerenveen O21", "sven.jacobs@sc-heerenveen.demo"),
            ("SC Heerenveen O19", "lucas.bos@sc-heerenveen.demo"),
            # Ajax teams
            ("Ajax 1", "marco.vanbasten@ajax.demo"),
            ("Ajax O21", "dennis.bergkamp@ajax.demo"),
            # PSV teams
            ("PSV 1", "ruud.vandervoort@psv.demo"),
            ("PSV O21", "martin.janssen@psv.demo"),
            # Feyenoord teams
            ("Feyenoord 1", "jan.de vries@feyenoord.demo"),
            ("Feyenoord O21", "ruud.bakker@feyenoord.demo"),
        ]

        created = 0
        updated = 0

        for team_name, coach_email in teams_with_coaches:
            try:
                team = Project.objects.get(name=team_name)
                coach = User.objects.get(email=coach_email)

                pm, is_new = ProjectMembership.objects.get_or_create(
                    user=coach, project=team, defaults={"role": "admin"}
                )

                if is_new:
                    self.stdout.write(
                        self.style.SUCCESS(f"✅ Created admin: {coach.email} → {team.name}")
                    )
                    created += 1
                else:
                    if pm.role != "admin":
                        pm.role = "admin"
                        pm.save()
                        self.stdout.write(
                            self.style.WARNING(f"🔄 Updated to admin: {coach.email} → {team.name}")
                        )
                        updated += 1
                    else:
                        self.stdout.write(f"⏭️  Already admin: {coach.email} → {team.name}")

            except Project.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"❌ Team not found: {team_name}"))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"❌ User not found: {coach_email}"))

        self.stdout.write(f"\n✅ Created {created} admin memberships")
        self.stdout.write(f"🔄 Updated {updated} memberships to admin")

    def seed_club_admins(self):
        """Create admin memberships for club directors."""

        clubs_with_admins = [
            ("Ajax", "marco.vanbasten@ajax.demo"),
            ("PSV", "ruud.vandervoort@psv.demo"),
            ("Feyenoord", "jan.de vries@feyenoord.demo"),
            ("SC Heerenveen", "sven.jacobs@sc-heerenveen.demo"),
        ]

        created = 0
        updated = 0

        for club_name, admin_email in clubs_with_admins:
            try:
                club = Project.objects.get(name=club_name, parent_project=None)
                admin = User.objects.get(email=admin_email)

                pm, is_new = ProjectMembership.objects.get_or_create(
                    user=admin, project=club, defaults={"role": "admin"}
                )

                if is_new:
                    self.stdout.write(
                        self.style.SUCCESS(f"✅ Created club admin: {admin.email} → {club.name}")
                    )
                    created += 1
                else:
                    if pm.role != "admin":
                        pm.role = "admin"
                        pm.save()
                        self.stdout.write(
                            self.style.WARNING(
                                f"🔄 Updated to club admin: {admin.email} → {club.name}"
                            )
                        )
                        updated += 1
                    else:
                        self.stdout.write(f"⏭️  Already club admin: {admin.email} → {club.name}")

            except Project.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"❌ Club not found: {club_name}"))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"❌ User not found: {admin_email}"))

        self.stdout.write(f"\n✅ Created {created} club admin memberships")
        self.stdout.write(f"🔄 Updated {updated} memberships to club admin")
