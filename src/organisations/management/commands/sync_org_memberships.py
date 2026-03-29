"""
Management command to create Organisation Memberships from Project Memberships.

For users who have ProjectMembership (team membership) but no Organisation Membership,
this command creates the missing Org-level membership by inferring the organisation
from their project.

Strategy:
1. Find users with ProjectMembership but no Org Membership
2. Infer organisation from project.organisation
3. Create Membership record with appropriate role:
   - If user has 'admin' role in ProjectMembership → 'member' in Org (not admin)
   - Otherwise → 'member' in Org
4. Skip if user already has Org Membership for that organisation
"""

from accounts.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Membership
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = "Create Organisation Memberships from Project Memberships"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without actually creating",
        )
        parser.add_argument(
            "--org",
            type=str,
            help="Only process users for specific organisation (slug)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        org_slug = options.get("org")

        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN MODE - No changes will be saved\n"))

        # Find users with ProjectMembership but no Org Membership
        users_with_pm = User.objects.filter(project_memberships__isnull=False).distinct()
        users_with_om = User.objects.filter(organisation_memberships__isnull=False).distinct()
        users_missing_om = users_with_pm.exclude(id__in=users_with_om)

        self.stdout.write(f"📊 Users with ProjectMembership: {users_with_pm.count()}")
        self.stdout.write(f"📊 Users with Org Membership: {users_with_om.count()}")
        self.stdout.write(f"📊 Users missing Org Membership: {users_missing_om.count()}\n")

        if users_missing_om.count() == 0:
            self.stdout.write(self.style.SUCCESS("✅ All users already have Org Memberships!"))
            return

        created_count = 0
        skipped_count = 0
        org_summary = {}

        # Get all existing memberships to avoid duplicate checks
        existing_memberships = set(Membership.objects.values_list("user_id", "organisation_id"))

        # Collect memberships to create
        memberships_to_create = []

        for user in users_missing_om:
            # Get all project memberships for this user
            project_memberships = ProjectMembership.objects.filter(user=user).select_related(
                "project__organisation"
            )

            # Group by organisation
            orgs_processed = set()
            for pm in project_memberships:
                if not pm.project or not pm.project.organisation:
                    continue

                org = pm.project.organisation

                # Filter by org slug if specified
                if org_slug and org.slug != org_slug:
                    continue

                # Skip if already processed this org for this user
                if org.id in orgs_processed:
                    continue

                # Check if user already has membership for this org
                if (user.id, org.id) in existing_memberships:
                    skipped_count += 1
                    orgs_processed.add(org.id)
                    continue

                # Track for creation
                role = "member"  # Default to member role

                if dry_run:
                    self.stdout.write(f"  Would create: {user.email} → {org.name} ({role})")
                else:
                    memberships_to_create.append(
                        Membership(
                            user=user,
                            organisation=org,
                            role=role,
                            is_active=True,
                        )
                    )

                created_count += 1
                orgs_processed.add(org.id)

                # Track org summary
                org_name = org.name
                if org_name not in org_summary:
                    org_summary[org_name] = {"created": 0, "skipped": 0}
                org_summary[org_name]["created"] += 1

        # Bulk create if not dry run
        if not dry_run and memberships_to_create:
            with transaction.atomic():
                Membership.objects.bulk_create(memberships_to_create, batch_size=500)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"\n✅ Bulk created {len(memberships_to_create)} memberships"
                    )
                )

        # Summary
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("📊 SUMMARY BY ORGANISATION\n")
        for org_name, counts in sorted(org_summary.items()):
            self.stdout.write(f"  {org_name}: Created {counts['created']} memberships")

        self.stdout.write("\n" + "=" * 80)
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f"🔍 DRY RUN: Would create {created_count} Org Memberships")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Created {created_count} new Org Memberships, "
                    f"⏭️ Skipped {skipped_count} existing"
                )
            )
