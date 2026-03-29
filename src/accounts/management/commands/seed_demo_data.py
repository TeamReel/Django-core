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
import logging
import os
import time
from contextlib import contextmanager
from datetime import timedelta

from accounts.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

logger = logging.getLogger(__name__)
from organisations.models import Membership, Organisation
from projects.models import Project

from ._seed_helpers import (
    ADDITIONAL_USER_DISTRIBUTION,
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

        # Demo seeding should be fast and should not generate per-object audit/metrics logs.
        # Temporarily disconnect noisy signal handlers to keep performance predictable.
        with self._disable_noisy_signals_for_seed():
            with transaction.atomic():
                # T001: Seed scaffolding complete (helpers loaded)

                # T002: Demo accounts (org creators), orgs, users, preferences
                demo_accounts = self._seed_demo_accounts_first(progress, verbose)
                orgs = self._seed_organizations(demo_accounts, progress, verbose)
                users = self._seed_users(orgs, progress, verbose)
                self._seed_user_preferences(users, progress, verbose)

                # T003: Projects
                projects = self._seed_projects(orgs, users, progress, verbose)

                # T004: Transactions
                self._seed_transactions(orgs, progress, verbose)

                # T005: Audit events
                self._seed_audit_events(orgs, users, projects, progress, verbose)

                # T006: Notifications (skip for now - model needs updating)
                # self._seed_notifications(orgs, users, progress, verbose)

                # T007: Feature flags and file metadata placeholders
                self._seed_feature_flags(orgs, progress, verbose)
                self._seed_file_metadata(projects, progress, verbose)

                # T008: Credits balance
                self._seed_credits_balance(orgs, progress, verbose)

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

    @contextmanager
    def _disable_noisy_signals_for_seed(self):
        """Disable expensive audit/metrics/caching signal handlers during demo seeding.

        This command can create many Organisations, Memberships and Projects. Some signal
        handlers do per-save aggregation queries + structured logging, which can dominate
        runtime under pytest log capture.
        """

        from django.db.models.signals import post_delete, post_save, pre_delete

        disconnected: list[tuple[object, object, object]] = []

        def _disconnect(signal, receiver, sender):
            if signal.disconnect(receiver, sender=sender):
                disconnected.append((signal, receiver, sender))

        # Organisations app signals
        try:
            from organisations.models import Membership as OrgMembership
            from organisations.models import Organisation
            from organisations.signals import (
                log_membership_change,
                log_membership_deletion,
                log_organisation_change,
                log_organisation_deletion,
            )

            _disconnect(post_save, log_organisation_change, Organisation)
            _disconnect(pre_delete, log_organisation_deletion, Organisation)
            _disconnect(post_save, log_membership_change, OrgMembership)
            _disconnect(pre_delete, log_membership_deletion, OrgMembership)
        except Exception:
            # Best-effort: seeding must never fail because of optional signal wiring.
            logger.debug("Failed to disconnect organisation signals for seeding", exc_info=True)

        # Projects app signals
        try:
            from projects.models import Project, ProjectMembership
            from projects.signals import (
                invalidate_on_membership_change,
                log_project_deleted,
                log_project_pre_delete,
                log_project_saved,
            )

            _disconnect(post_save, log_project_saved, Project)
            _disconnect(pre_delete, log_project_pre_delete, Project)
            _disconnect(post_delete, log_project_deleted, Project)
            _disconnect(post_save, invalidate_on_membership_change, ProjectMembership)
        except Exception:
            logger.debug("Failed to disconnect project signals for seeding", exc_info=True)

        try:
            yield
        finally:
            for signal, receiver, sender in disconnected:
                signal.connect(receiver, sender=sender, weak=False)

    def _delete_demo_data(self):
        """Delete existing demo data (scoped to demo org slugs and emails)."""
        demo_slugs = [org["slug"] for org in ORG_DATA]
        demo_emails = [acc["email"] for acc in DEMO_ACCOUNTS]

        # Delete orgs (cascade handles projects, memberships, transactions, etc.)
        Organisation.objects.filter(slug__in=demo_slugs).delete()

        # Delete demo accounts
        User.objects.filter(email__in=demo_emails).delete()

        self.stdout.write("  Deleted existing demo data")

    def _seed_organizations(self, demo_accounts, progress, verbose):
        """T002: Create 5 organizations with first superuser as creator."""
        orgs = {}
        creator = demo_accounts[0]  # Use first demo account (admin@demo) as creator

        for org_data in ORG_DATA:
            org, created = Organisation.objects.get_or_create(
                slug=org_data["slug"],
                defaults={
                    "name": org_data["name"],
                    "description": org_data.get("description", ""),
                    "creator": creator,
                },
            )
            orgs[org_data["slug"]] = org

            if verbose and created:
                self.stdout.write(f"  Created org: {org.name}")

        progress.log("organisations", len(orgs))

        # Now assign demo account memberships
        for account in DEMO_ACCOUNTS:
            if account["org"]:
                user = User.objects.get(email=account["email"])
                org = orgs[account["org"]]
                Membership.objects.get_or_create(
                    user=user,
                    organisation=org,
                    defaults={"role": account["role"]},
                )

        return orgs

    def _seed_users(self, orgs, progress, verbose):
        """
        T002: Create 14 additional users to reach 20 total (6 demo accounts + 14 additional).

        FR-004 distribution: 3 superusers, 10 org admins, 7 members/viewers
        Demo accounts contribute: 3 superusers, 1 admin, 1 member, 1 viewer
        Additional users contribute: 0 superusers, 9 admins, 4 members/viewers
        """
        users = []
        admin_count = 0
        member_viewer_count = 0

        # Use ADDITIONAL_USER_DISTRIBUTION from helpers
        # Format: [(org_slug, total_count, [(role, count), ...]), ...]
        for org_slug, _, role_distribution in ADDITIONAL_USER_DISTRIBUTION:
            org = orgs[org_slug]

            for role, role_count in role_distribution:
                for _ in range(role_count):
                    first, last = generate_user_name()
                    email = generate_email(first, last)

                    # Avoid collisions with deterministic fallback
                    collision_index = 0
                    while User.objects.filter(email=email).exists():
                        collision_index += 1
                        email = (
                            f"{first.lower()}.{last.lower()}.{collision_index}@demo.djangocore.app"
                        )

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

                        # Create membership with specified role
                        Membership.objects.get_or_create(
                            user=user,
                            organisation=org,
                            defaults={"role": role},
                        )

                        users.append(user)

                        # Track role counts for FR-004 validation
                        if role == "admin":
                            admin_count += 1
                        elif role in ("member", "viewer"):
                            member_viewer_count += 1

                        if verbose:
                            self.stdout.write(f"  Created user: {email} ({role} in {org.name})")

        progress.log("users_additional", len(users))
        progress.log_role("org_admins", admin_count)
        progress.log_role("members_viewers", member_viewer_count)
        return users

    def _seed_demo_accounts_first(self, progress, verbose):
        """
        T002: Create 6 pre-configured demo accounts (users only, memberships added later).

        FR-004 contribution: 3 superusers, 1 admin, 1 member, 1 viewer
        """
        demo_users = []
        superuser_count = 0
        admin_count = 0
        member_viewer_count = 0

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

                # Track role counts for FR-004 validation
                if account["role"] == "superuser":
                    superuser_count += 1
                elif account["role"] == "admin":
                    admin_count += 1
                elif account["role"] in ("member", "viewer"):
                    member_viewer_count += 1

                demo_users.append(user)

                if verbose:
                    self.stdout.write(
                        f"  Created demo account: {account['email']} ({account['role']})"
                    )

        progress.log("demo_accounts", len(demo_users))
        progress.log_role("superusers", superuser_count)
        progress.log_role("org_admins", admin_count)
        progress.log_role("members_viewers", member_viewer_count)
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
            org_members = list(User.objects.filter(organisation_memberships__organisation=org))

            if not org_members:
                continue

            for i in range(project_count):
                base_name = generate_project_name()
                project_name = f"{base_name} {i+1}"  # Ensure unique names
                slug = f"{org_data['slug']}-{base_name.lower().replace(' ', '-')}-{i}"

                creator = seeded_random.choice(org_members)
                is_active = seeded_random.randint(1, 10) > 2

                project, created = Project.objects.get_or_create(
                    slug=slug,
                    organisation=org,
                    defaults={
                        "name": project_name,
                        "description": f"Demo project for {org.name}",
                        "creator": creator,
                        "is_active": is_active,
                    },
                )

                if created:
                    projects.append(project)

                    if verbose:
                        status_text = "active" if is_active else "archived"
                        self.stdout.write(
                            f"  Created project: {project_name} ({org.name}, {status_text})"
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

    def _seed_credits_balance(self, orgs, progress, verbose):
        """T008: Create credits balance for organisations (test data)."""
        try:
            from credits.models import CreditsBalance
        except ImportError:
            if verbose:
                self.stdout.write(
                    self.style.WARNING(
                        "  credits.models.CreditsBalance not available, skipping credits balance"
                    )
                )
            return

        balances_created = 0

        # Test data: Different balances for different organisations
        # TechCorp: High balance
        # MarketingHub: Low balance (to test low balance alert)
        # Others: Medium balance
        balance_map = {
            "techcorp": 1200,  # High balance (Eredivisie)
            "marketinghub": 75,  # Low balance (La Liga)
            "datalab": 500,  # Medium balance (Serie A)
            "opensource": 350,  # Medium balance (Bundesliga)
            "premier-league": 1000,  # Standard demo org
            "eredivisie": 1200,
            "la-liga": 75,
            "serie-a": 500,
            "bundesliga": 350,
            # global intentionally skipped to test 404
        }

        for org_slug, balance_amount in balance_map.items():
            org = orgs.get(org_slug)

            # Fallback: Try to find org in DB if not in seeded map
            if not org:
                from organisations.models import Organisation

                org = Organisation.objects.filter(slug=org_slug).first()

            if not org:
                continue

            # Skip global to test 404 response
            if org_slug == "global":
                continue

            _, created = CreditsBalance.objects.get_or_create(
                organisation=org,
                defaults={"current_balance": balance_amount},
            )

            if created:
                balances_created += 1
                if verbose:
                    self.stdout.write(f"  Created credits balance for {org.name}: {balance_amount}")

        progress.log("credits_balance", balances_created)
