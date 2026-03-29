"""
Management command to create Organisation Memberships for all players.

Logic:
- Every user who has a ProjectMembership (player in a team)
  should also have an Organisation Membership
- The organisation is the team's parent club's organisation
- Default role: "member" (unless they already have a higher role)
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Membership
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = "Create organisation memberships for all players based on their team memberships"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving to database",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN MODE - No changes will be saved"))

        # Get all project memberships (team memberships)
        project_memberships = ProjectMembership.objects.select_related(
            "project__organisation", "user"
        ).all()

        self.stdout.write(f"\n📊 Found {project_memberships.count()} project memberships")

        created = 0
        skipped = 0
        errors = 0

        with transaction.atomic():
            for pm in project_memberships:
                try:
                    user = pm.user
                    organisation = pm.project.organisation

                    if not organisation:
                        self.stdout.write(
                            self.style.ERROR(f"❌ Project {pm.project.name} has no organisation")
                        )
                        errors += 1
                        continue

                    # Check if membership already exists
                    existing = Membership.objects.filter(
                        user=user, organisation=organisation
                    ).first()

                    if existing:
                        skipped += 1
                        continue

                    # Create new membership
                    if not dry_run:
                        Membership.objects.create(
                            user=user,
                            organisation=organisation,
                            role="member",  # Default role for players
                            is_active=True,
                            invited_by=None,  # System-created
                        )

                    created += 1

                    if created % 100 == 0:
                        self.stdout.write(f"✅ Created {created} memberships...")

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"❌ Error processing {pm.user.email}: {str(e)}")
                    )
                    errors += 1

            if dry_run:
                raise Exception("Dry run - rolling back transaction")

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS(f"✅ Created: {created}"))
        self.stdout.write(self.style.WARNING(f"⏭️  Skipped (already exists): {skipped}"))
        if errors > 0:
            self.stdout.write(self.style.ERROR(f"❌ Errors: {errors}"))
        self.stdout.write("=" * 60 + "\n")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("🔍 This was a dry run. Run without --dry-run to apply changes.")
            )
