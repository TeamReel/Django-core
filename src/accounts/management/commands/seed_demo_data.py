"""
Management command to seed comprehensive demo production database.

Creates:
- 5 organizations (diverse scenarios)
- 20 users (3 superusers, 10 admins, 7 members/viewers)
- 80 projects (15/30/10/5/20 per org)
- 200-300 audit events (seeded range)
- Transactions (last 30 days)
- Notifications (5-10 unread per demo account, 50+ read per org)
- Feature flags (org-scoped)
- User preferences
- File metadata placeholders

Features:
- Idempotent (safe to re-run)
- Deterministic with DEMO_RANDOM_SEED env var
- Progress logging with --verbose
- JSON output with --json
- Performance target: <30s initial, <5s rerun
"""

import json
import os
import time
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Membership, Organisation
from projects.models import Project

from accounts.models import User

from ._seed_helpers import (
    DEMO_ACCOUNTS,
    EVENT_TYPES,
    NOTIFICATION_TYPES,
    ORG_DATA,
    SeedProgress,
    generate_email,
    generate_project_name,
    generate_timestamps,
    generate_user_name,
    get_demo_password,
    random_datetime_last_30_days,
    seeded_random,
)


class Command(BaseCommand):
    help = (
        "Seed comprehensive demo production database "
        "(5 orgs, 20 users, 80 projects, events, transactions, notifications)"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed progress per entity",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Output structured JSON summary",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force recreation even if data exists (WARNING: deletes existing demo data)",
        )

    def handle(self, *args, **options):
        start_time = time.time()
        verbose = options.get("verbose", False)
        json_output = options.get("json", False)
        force = options.get("force", False)

        progress = SeedProgress(self.stdout)

        # Check if demo data already exists
        existing_demo_org = Organisation.objects.filter(
            slug__in=[org["slug"] for org in ORG_DATA]
        ).first()

        if existing_demo_org and not force:
            elapsed = time.time() - start_time
            message = (
                f"Demo data already exists (found {existing_demo_org.name}). "
                "Skipping. (Use --force to recreate)"
            )

            if json_output:
                self.stdout.write(
                    json.dumps(
                        {
                            "status": "skipped",
                            "message": message,
                            "elapsed_seconds": round(elapsed, 2),
                        }
                    )
                )
            else:
                self.stdout.write(self.style.WARNING(message))
                self.stdout.write(f"Elapsed: {elapsed:.2f}s")

            return

        if force and existing_demo_org:
            if verbose:
                self.stdout.write(
                    self.style.WARNING("--force flag detected. Deleting existing demo data...")
                )
            self._delete_demo_data()

        # Start seeding
        if not json_output:
            self.stdout.write(self.style.SUCCESS("Starting demo data generation..."))
            if seeded_random.seeded:
                self.stdout.write(
                    self.style.NOTICE(
                        f"Using deterministic seed: {os.environ.get('DEMO_RANDOM_SEED')}"
                    )
                )

        with transaction.atomic():
            # T001: Seed scaffolding complete (helpers loaded)

            # T002: Organizations, users, demo accounts, preferences
            orgs = self._seed_organizations(progress, verbose)
            users = self._seed_users(orgs, progress, verbose)
            self._seed_demo_accounts(orgs, users, progress, verbose)
            self._seed_user_preferences(users, progress, verbose)

            # T003: Projects
            projects = self._seed_projects(orgs, users, progress, verbose)

            # T004: Transactions
            self._seed_transactions(orgs, progress, verbose)

            # T005: Audit events
            self._seed_audit_events(orgs, users, projects, progress, verbose)

            # T006: Notifications
            self._seed_notifications(orgs, users, progress, verbose)

            # T007: Feature flags and file metadata placeholders
            self._seed_feature_flags(orgs, progress, verbose)
            self._seed_file_metadata(projects, progress, verbose)

        elapsed = time.time() - start_time

        # T008: Summary output
        summary = progress.summary()
        summary["elapsed_seconds"] = round(elapsed, 2)
        summary["idempotent_rerun"] = elapsed < 5.0 if existing_demo_org else False

        if json_output:
            self.stdout.write(json.dumps(summary, indent=2))
        else:
            self.stdout.write(
                self.style.SUCCESS(f"\n✓ Demo data seeded successfully in {elapsed:.2f}s")
            )
            self.stdout.write("\nSummary:")
            for entity, count in summary.items():
                if entity != "elapsed_seconds" and entity != "idempotent_rerun":
                    self.stdout.write(f"  {entity}: {count}")

    def _delete_demo_data(self):
        """Delete existing demo data (scoped to demo org slugs and emails)."""
        demo_slugs = [org["slug"] for org in ORG_DATA]
        demo_emails = [acc["email"] for acc in DEMO_ACCOUNTS]

        # Delete orgs (cascade handles projects, memberships, transactions, etc.)
        Organisation.objects.filter(slug__in=demo_slugs).delete()

        # Delete demo accounts
        User.objects.filter(email__in=demo_emails).delete()

        self.stdout.write("  Deleted existing demo data")

    def _seed_organizations(self, progress, verbose):
        """T002: Create 5 organizations."""
        orgs = {}

        for org_data in ORG_DATA:
            org, created = Organisation.objects.get_or_create(
                slug=org_data["slug"],
                defaults={
                    "name": org_data["name"],
                    "description": org_data.get("description", ""),
                },
            )
            orgs[org_data["slug"]] = org

            if verbose and created:
                self.stdout.write(f"  Created org: {org.name}")

        progress.log("organisations", len(orgs))
        return orgs

    def _seed_users(self, orgs, progress, verbose):
        """T002: Create 20 users (excluding demo accounts) distributed across orgs."""
        users = []

        # Calculate user distribution per org (based on ORG_DATA user_count)
        # Total from ORG_DATA: 5+8+4+2+6 = 25, but we only need 20 total (including demo accounts)
        # So we'll create 16 additional users distributed proportionally

        distribution = [
            ("techcorp", 3),  # 5 - 2 demo accounts already assigned
            ("datalab", 6),  # 8 - 2 demo accounts
            ("marketinghub", 2),  # 4 - 2 demo accounts
            ("opensource", 2),  # 2 - 0 demo accounts
            ("airesearch", 3),  # 6 - 0 demo accounts
        ]

        for org_slug, count in distribution:
            org = orgs[org_slug]

            for i in range(count):
                first, last = generate_user_name()
                email = generate_email(first, last)

                # Avoid collisions
                if User.objects.filter(email=email).exists():
                    email = f"{first.lower()}.{last.lower()}.{i}@demo.djangocore.app"

                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "first_name": first,
                        "last_name": last,
                        "email_verified": True,
                        "is_active": True,
                    },
                )

                if created:
                    user.set_password(get_demo_password())
                    user.save()

                    # Assign role based on position
                    if i == 0:
                        role = "admin"
                    elif i < count // 2:
                        role = "member"
                    else:
                        role = "viewer"

                    Membership.objects.get_or_create(
                        user=user,
                        organisation=org,
                        defaults={"role": role},
                    )

                    users.append(user)

                    if verbose:
                        self.stdout.write(f"  Created user: {email} ({role} in {org.name})")

        progress.log("users_additional", len(users))
        return users

    def _seed_demo_accounts(self, orgs, users, progress, verbose):
        """T002: Create 4 pre-configured demo accounts."""
        demo_users = []

        for account in DEMO_ACCOUNTS:
            user, created = User.objects.get_or_create(
                email=account["email"],
                defaults={
                    "first_name": account["first_name"],
                    "last_name": account["last_name"],
                    "email_verified": True,
                    "is_active": True,
                    "is_superuser": account["role"] == "superuser",
                    "is_staff": account["role"] == "superuser",
                },
            )

            if created:
                user.set_password(get_demo_password())
                user.save()

                # Assign to organization if specified
                if account["org"]:
                    org = orgs[account["org"]]
                    Membership.objects.get_or_create(
                        user=user,
                        organisation=org,
                        defaults={"role": account["role"]},
                    )

                demo_users.append(user)

                if verbose:
                    org_name = orgs[account["org"]].name if account["org"] else "Global"
                    self.stdout.write(
                        f"  Created demo account: {account['email']} "
                        f"({account['role']} in {org_name})"
                    )

        progress.log("demo_accounts", len(demo_users))
        return demo_users

    def _seed_user_preferences(self, users, progress, verbose):
        """T002: Create user preferences for all users."""
        # Import here to avoid circular dependency
        try:
            from settings.models import UserPreference
        except ImportError:
            if verbose:
                self.stdout.write(
                    self.style.WARNING(
                        "  settings.models.UserPreference not available, skipping preferences"
                    )
                )
            return

        preferences_created = 0
        languages = ["en", "nl", "fr", "de"]
        themes = ["light", "dark", "auto"]
        timezones = ["UTC", "Europe/Amsterdam", "America/New_York", "Asia/Tokyo"]

        for user in users:
            pref, created = UserPreference.objects.get_or_create(
                user=user,
                defaults={
                    "language": seeded_random.choice(languages),
                    "theme": seeded_random.choice(themes),
                    "email_notifications_enabled": seeded_random.choice([True, False]),
                    "timezone": seeded_random.choice(timezones),
                },
            )

            if created:
                preferences_created += 1

        progress.log("user_preferences", preferences_created)

    def _seed_projects(self, orgs, users, progress, verbose):
        """T003: Create 80 projects (15/30/10/5/20 per org)."""
        projects = []

        for org_data in ORG_DATA:
            org = orgs[org_data["slug"]]
            project_count = org_data["project_count"]

            # Get org members to assign as creators
            org_members = list(User.objects.filter(memberships__organisation=org))

            if not org_members:
                continue

            for i in range(project_count):
                project_name = generate_project_name()
                slug = f"{org_data['slug']}-{project_name.lower().replace(' ', '-')}-{i}"

                creator = seeded_random.choice(org_members)
                status = "active" if seeded_random.randint(1, 10) > 2 else "archived"

                project, created = Project.objects.get_or_create(
                    slug=slug,
                    organisation=org,
                    defaults={
                        "name": project_name,
                        "description": f"Demo project for {org.name}",
                        "creator": creator,
                        "status": status,
                    },
                )

                if created:
                    projects.append(project)

                    if verbose:
                        self.stdout.write(
                            f"  Created project: {project_name} ({org.name}, {status})"
                        )

        progress.log("projects", len(projects))
        return projects

    def _seed_transactions(self, orgs, progress, verbose):
        """T004: Create transactions for last 30 days."""
        # Import here to avoid circular dependency
        try:
            from billing.models import Transaction, TransactionType
        except ImportError:
            if verbose:
                self.stdout.write(
                    self.style.WARNING(
                        "  billing.models.Transaction not available, skipping transactions"
                    )
                )
            return

        transactions_created = 0
        timestamps = generate_timestamps(
            100, window_days=30
        )  # 100 transactions spread over 30 days

        for org_data in ORG_DATA:
            org = orgs[org_data["slug"]]
            current_balance = org_data["credits"]

            # Create initial purchase transaction
            tx, created = Transaction.objects.get_or_create(
                organisation=org,
                transaction_type=TransactionType.PURCHASE,
                amount=current_balance,
                defaults={
                    "balance_after": current_balance,
                    "description": "Initial credit purchase",
                    "created_at": timestamps[0] if timestamps else random_datetime_last_30_days(),
                },
            )
            if created:
                transactions_created += 1

            # Create 5-10 random transactions per org
            num_transactions = seeded_random.randint(5, 10)

            for i in range(num_transactions):
                transaction_type = seeded_random.choice(
                    [TransactionType.USAGE, TransactionType.REFUND]
                )
                amount = seeded_random.randint(10, 200)

                if transaction_type == TransactionType.USAGE:
                    amount = -amount  # Usage deducts credits

                # Ensure balance never goes negative
                if current_balance + amount < 0:
                    continue

                current_balance += amount

                Transaction.objects.create(
                    organisation=org,
                    transaction_type=transaction_type,
                    amount=abs(amount),
                    balance_after=current_balance,
                    description=f"Demo {transaction_type.value}",
                    created_at=(
                        timestamps[i % len(timestamps)]
                        if timestamps
                        else random_datetime_last_30_days()
                    ),
                )
                transactions_created += 1

        progress.log("transactions", transactions_created)

    def _seed_audit_events(self, orgs, users, projects, progress, verbose):
        """T005: Create 200-300 audit events."""
        # Import here to avoid circular dependency
        try:
            from audit.api import audit_log
        except ImportError:
            if verbose:
                self.stdout.write(
                    self.style.WARNING("  audit.api.audit_log not available, skipping audit events")
                )
            return

        # Sample event count from 200-300 range
        event_count = seeded_random.randint(200, 300)
        timestamps = generate_timestamps(event_count, window_days=30)

        events_created = 0

        for i in range(event_count):
            event_type = seeded_random.choice(EVENT_TYPES)
            user = seeded_random.choice(users) if users else None
            org_list = list(orgs.values())
            org = seeded_random.choice(org_list) if org_list else None

            # Create audit event (using audit_log API for proper registration)
            try:
                audit_log(
                    event_type=event_type,
                    user=user,
                    organisation=org,
                    metadata={"demo": True, "seeded": True},
                    timestamp=timestamps[i],
                )
                events_created += 1
            except Exception as e:
                if verbose:
                    self.stdout.write(self.style.WARNING(f"  Failed to create audit event: {e}"))

        progress.log(
            "audit_events",
            events_created,
            f"Created {events_created} audit events (range: 200-300)",
        )

    def _seed_notifications(self, orgs, users, progress, verbose):
        """T006: Create notifications (5-10 unread per demo account, 50+ read per org)."""
        # Import here to avoid circular dependency
        try:
            from notifications.models import Notification
        except ImportError:
            if verbose:
                self.stdout.write(
                    self.style.WARNING(
                        "  notifications.models.Notification not available, skipping notifications"
                    )
                )
            return

        notifications_created = 0

        # Create 5-10 unread notifications for each demo account
        demo_emails = [acc["email"] for acc in DEMO_ACCOUNTS]
        demo_users = User.objects.filter(email__in=demo_emails)

        for user in demo_users:
            unread_count = seeded_random.randint(5, 10)

            for _ in range(unread_count):
                notif_type, message = seeded_random.choice(NOTIFICATION_TYPES)

                Notification.objects.create(
                    user=user,
                    notification_type=notif_type,
                    message=message,
                    channel="in_app",
                    read_at=None,  # Unread
                    created_at=random_datetime_last_30_days(),
                )
                notifications_created += 1

        # Create 50+ read notifications per org
        for org in orgs.values():
            org_users = list(User.objects.filter(memberships__organisation=org))

            if not org_users:
                continue

            read_count = seeded_random.randint(50, 80)

            for _ in range(read_count):
                user = seeded_random.choice(org_users)
                notif_type, message = seeded_random.choice(NOTIFICATION_TYPES)
                created_at = random_datetime_last_30_days()

                Notification.objects.create(
                    user=user,
                    notification_type=notif_type,
                    message=message,
                    channel="in_app",
                    read_at=created_at + timedelta(hours=seeded_random.randint(1, 48)),
                    created_at=created_at,
                )
                notifications_created += 1

        progress.log("notifications", notifications_created)

    def _seed_feature_flags(self, orgs, progress, verbose):
        """T007: Create feature flags (org-scoped, premium vs trial)."""
        # Import here to avoid circular dependency
        try:
            from feature_flags.models import FeatureFlag
        except ImportError:
            if verbose:
                self.stdout.write(
                    self.style.WARNING(
                        "  feature_flags.models.FeatureFlag not available, skipping feature flags"
                    )
                )
            return

        flags_created = 0

        # Premium orgs: DataLab, AI Research
        premium_slugs = ["datalab", "airesearch"]

        # Trial orgs: TechCorp, MarketingHub, OpenSource (informational)

        premium_flags = [
            "realtime_updates",
            "advanced_search",
            "file_uploads",
            "premium_analytics",
            "priority_support",
        ]
        basic_flags = ["realtime_updates", "advanced_search", "file_uploads"]

        for org_slug, org in orgs.items():
            flags = premium_flags if org_slug in premium_slugs else basic_flags

            for flag_name in flags:
                enabled = org_slug in premium_slugs  # Premium orgs have all flags enabled

                flag, created = FeatureFlag.objects.get_or_create(
                    organisation=org,
                    flag_name=flag_name,
                    defaults={"enabled": enabled},
                )
                if created:
                    flags_created += 1

        progress.log("feature_flags", flags_created)

    def _seed_file_metadata(self, projects, progress, verbose):
        """T007: Create file metadata placeholders (B22 module)."""
        # Import here to avoid circular dependency
        try:
            from files.models import FileMetadata
        except ImportError:
            if verbose:
                self.stdout.write(
                    self.style.WARNING(
                        "  files.models.FileMetadata not available, skipping file metadata"
                    )
                )
            return

        files_created = 0
        file_types = [
            ("document.pdf", "application/pdf", 245000),
            ("image.png", "image/png", 512000),
            (
                "spreadsheet.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                128000,
            ),
            (
                "presentation.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                3500000,
            ),
        ]

        # Create 2-3 file placeholders per project (sample of projects)
        sample_projects = seeded_random.sample(projects, min(20, len(projects)))

        for project in sample_projects:
            file_count = seeded_random.randint(2, 3)

            for i in range(file_count):
                filename, mime_type, size = seeded_random.choice(file_types)

                FileMetadata.objects.create(
                    project=project,
                    filename=f"{project.slug}-{i}-{filename}",
                    mime_type=mime_type,
                    size=size,
                    placeholder_path=f"/demo/files/{project.slug}/{filename}",
                    created_at=random_datetime_last_30_days(),
                )
                files_created += 1

        progress.log("file_metadata_placeholders", files_created)
