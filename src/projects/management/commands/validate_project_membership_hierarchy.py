from django.core.management.base import BaseCommand
from organisations.models import Membership as OrganisationMembership
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = "Validate and fix Team -> Club -> Federation hierarchy consistency"

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix", action="store_true", help="Automatically fix missing memberships"
        )

    def handle(self, *args, **options):
        fix = options["fix"]
        self.stdout.write(self.style.WARNING("Starting Hierarchy Validation..."))

        # 1. Get all memberships for "Child Projects" (Teams)
        # We assume if parent_project is set, it is a Team (Child) and parent is Club.
        team_memberships = ProjectMembership.objects.filter(
            project__parent_project__isnull=False, deleted_at__isnull=True
        ).select_related("project", "project__parent_project", "user", "period")

        missing_club_memberships = []
        missing_org_memberships = []

        self.stdout.write(f"Checking {team_memberships.count()} team memberships...")

        for tm in team_memberships:
            user = tm.user
            team = tm.project
            club = team.parent_project
            period = tm.period

            # Check 1: User must be member of the Club (Parent Project)
            # Logic: Must have membership for Club AND same period (if period varies)
            # Note: Period is technically optional on Model but usually present for Teams/Clubs.
            # We match strictly on Period if present on the Team Membership.

            club_membership_exists = ProjectMembership.objects.filter(
                project=club,
                user=user,
                period=period,  # strict period match
                deleted_at__isnull=True,
            ).exists()

            if not club_membership_exists:
                missing_club_memberships.append(tm)

            # Check 2: User must be member of the Organisation (Federation?)
            # The Organization is team.organisation
            org_membership_exists = OrganisationMembership.objects.filter(
                organisation=team.organisation, user=user, is_active=True
            ).exists()

            if not org_membership_exists:
                missing_org_memberships.append(tm)

        # Report findings
        self.stdout.write(f"Found {len(missing_club_memberships)} missing CLUB memberships.")
        self.stdout.write(
            f"Found {len(missing_org_memberships)} missing FEDERATION (Org) memberships."
        )

        if not fix:
            if missing_club_memberships or missing_org_memberships:
                self.stdout.write(self.style.ERROR("Validation Failed. Run with --fix to resolve."))
                # List first 10 examples
                if missing_club_memberships:
                    self.stdout.write("\nExample Missing Club Memberships:")
                    for m in missing_club_memberships[:10]:
                        self.stdout.write(
                            f" - User {m.user.email} in Team '{m.project.name}' missing in Club '{m.project.parent_project.name}'"
                        )

                if missing_org_memberships:
                    self.stdout.write("\nExample Missing Org Memberships:")
                    for m in missing_org_memberships[:10]:
                        self.stdout.write(
                            f" - User {m.user.email} in Team '{m.project.name}' missing in Org '{m.project.organisation.name}'"
                        )
            else:
                self.stdout.write(self.style.SUCCESS("All hierarchy checks passed."))

        else:
            self.stdout.write(self.style.NOTICE("Applying fixes..."))

            # Fix Organisation Memberships
            for tm in missing_org_memberships:
                org_mem, created = OrganisationMembership.objects.get_or_create(
                    organisation=tm.project.organisation,
                    user=tm.user,
                    defaults={"role": "member", "is_active": True},
                )
                if not org_mem.is_active:
                    org_mem.is_active = True
                    org_mem.save()
                    self.stdout.write(f"Re-activated Org membership for {tm.user.email}")
                elif created:
                    self.stdout.write(f"Created Org membership for {tm.user.email}")

            # Fix Club Memberships
            for tm in missing_club_memberships:
                # Add viewer at club level
                ProjectMembership.objects.get_or_create(
                    project=tm.project.parent_project,
                    user=tm.user,
                    period=tm.period,
                    defaults={
                        "role": ProjectMembership.Role.VIEWER,
                        "assignment_reason": "hierarchy_fix",
                        "metadata": {"auto_created": True},
                    },
                )
                self.stdout.write(
                    f"Created Club membership for {tm.user.email} in {tm.project.parent_project.name}"
                )

            self.stdout.write(self.style.SUCCESS("Fixes applied."))
