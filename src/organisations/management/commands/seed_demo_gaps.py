import random
from datetime import time

from contextual_notifications.models import NotificationPreference, OrganisationNotificationPolicy
from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models.signals import post_save
from django.utils import timezone
from organisations.models import Organisation
from projects.models import Project, ProjectInvite, ProjectMembership
from search.registry import search_registry

# Import Search Signal Handler to disconnect it
from search.signals import handle_save
from transactions.models import BalancePolicy, EnforcementModeChoices

User = get_user_model()


class Command(BaseCommand):
    help = "Seed missing data for empty tables identified in audit. Dry-run by default."

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Actually create the data. Without this, only a summary is shown.",
        )
        parser.add_argument(
            "--only-activities",
            action="store_true",
            help="Only run activity seeding.",
        )
        parser.add_argument(
            "--only-policies",
            action="store_true",
            help="Only run policy creation (notification & balance).",
        )
        parser.add_argument(
            "--only-invites",
            action="store_true",
            help="Only run project invite creation.",
        )
        parser.add_argument(
            "--only-preferences",
            action="store_true",
            help="Only run notification preference seeding.",
        )

    def handle(self, *args, **options):
        execute = options["execute"]
        only_activities = options["only_activities"]
        only_policies = options["only_policies"]
        only_invites = options["only_invites"]
        only_preferences = options["only_preferences"]

        # Determine what to run
        run_all = not (only_activities or only_policies or only_invites or only_preferences)
        run_activities = run_all or only_activities
        run_policies = run_all or only_policies
        run_invites = run_all or only_invites
        run_preferences = run_all or only_preferences

        self.stdout.write(self.style.HTTP_INFO("\n=== Gap Analysis & Seeding Plan ===\n"))

        # --- Analysis Phase ---

        # 1. Activities
        Activity = django_apps.get_model("activities", "Activity")
        activity_count = Activity.objects.count()
        activity_plan = "None (Data exists)"
        if activity_count == 0:
            activity_plan = "Run 'seed_demo_activities'"

        if not run_activities:
            activity_plan = "SKIPPED (Command arg)"

        # 2. Notification Policies
        existing_policy_org_ids = OrganisationNotificationPolicy.objects.values_list(
            "organisation_id", flat=True
        )
        orgs_without_policy = Organisation.objects.exclude(id__in=existing_policy_org_ids)
        missing_policy_count = orgs_without_policy.count()

        # 3. Balance Policies
        orgs_without_balance = Organisation.objects.annotate(
            num_policies=Count("balance_policies")
        ).filter(num_policies=0)
        missing_balance_count = orgs_without_balance.count()

        if not run_policies:
            policy_msg_notif = "SKIPPED (Command arg)"
            policy_msg_bal = "SKIPPED (Command arg)"
        else:
            policy_msg_notif = "Create Default Policy (Quiet Hours 22-08)"
            policy_msg_bal = "Create Default Policy (Warn @ 100)"

        # 4. Project Invites
        projects_without_invites = Project.objects.annotate(
            num_invites=Count("invitations")
        ).filter(num_invites=0)
        missing_invite_count = projects_without_invites.count()

        if not run_invites:
            invite_plan = "SKIPPED (Command arg)"
        else:
            invite_plan = "Create 1 Viewer Invite per empty project"

        # 5. Notification Preferences
        total_users = User.objects.count()
        users_with_prefs = NotificationPreference.objects.values("user").distinct().count()
        # missing_prefs_count = (total_users - users_with_prefs)

        if not run_preferences:
            prefs_plan = "SKIPPED (Command arg)"
        else:
            prefs_plan = "Seed random preferences for 50 random users"

        # --- Summary Table ---
        headers = ["Model / Area", "Current Status", "Planned Action", "Volume"]
        row_format = "{:<30} | {:<20} | {:<50} | {:<10}"

        self.stdout.write("-" * 120)
        self.stdout.write(row_format.format(*headers))
        self.stdout.write("-" * 120)

        # Row 1: Activities
        act_status = "EMPTY" if activity_count == 0 else f"{activity_count} records"
        self.stdout.write(
            row_format.format(
                "Activities (events)",
                act_status,
                activity_plan,
                "All Orgs" if activity_count == 0 else "-",
            )
        )

        # Row 2: Notification Policy
        self.stdout.write(
            row_format.format(
                "NotificationPolicy",
                f"Missing in {missing_policy_count} orgs",
                policy_msg_notif,
                str(missing_policy_count),
            )
        )

        # Row 3: Balance Policy
        self.stdout.write(
            row_format.format(
                "BalancePolicy",
                f"Missing in {missing_balance_count} orgs",
                policy_msg_bal,
                str(missing_balance_count),
            )
        )

        # Row 4: Project Invites
        self.stdout.write(
            row_format.format(
                "ProjectInvite",
                f"Missing in {missing_invite_count} projects",
                invite_plan,
                str(missing_invite_count),
            )
        )

        # Row 5: Notification Preferences
        self.stdout.write(
            row_format.format(
                "NotificationPreference",
                f"{users_with_prefs}/{total_users} users customized",
                prefs_plan,
                "~50 Users",
            )
        )

        self.stdout.write("-" * 120)
        self.stdout.write("\n")

        if not execute:
            self.stdout.write(self.style.WARNING("DRY RUN MODE. No changes made."))
            self.stdout.write("Run with --execute to apply these changes.")
            return

        # --- Execution Phase ---

        # Disconnect Search Signals to prevent Redis crashes during seeding
        self.stdout.write(
            self.style.WARNING(
                ">> Disconnecting Search Signals (Preventing Redis Recurise Errors)..."
            )
        )
        post_save.disconnect(handle_save, dispatch_uid="search.signals.handle_save")

        try:
            self.stdout.write(self.style.SUCCESS("Executing Plan...\n"))

            # 1. Activities
            if run_activities:
                if activity_count == 0:
                    self.stdout.write(">> Seeding Activities...")
                    # Additional safety: ensure signals are disconnected for models in registry
                    for model in search_registry.get_registered_models():
                        post_save.disconnect(handle_save, sender=model)

                    try:
                        call_command("seed_demo_activities")
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Failed: {e}"))
                else:
                    self.stdout.write(">> Activities already exist. Skipping.")

            # 2. Notification Policies
            if run_policies and missing_policy_count > 0:
                self.stdout.write(f">> Creating {missing_policy_count} Notification Policies...")
                new_policies = []
                for org in orgs_without_policy:
                    new_policies.append(
                        OrganisationNotificationPolicy(
                            organisation=org,
                            policy_type=OrganisationNotificationPolicy.POLICY_TYPE_DEFAULT,
                            quiet_hours_enabled=True,
                            quiet_hours_start=time(22, 0),
                            quiet_hours_end=time(8, 0),
                        )
                    )
                OrganisationNotificationPolicy.objects.bulk_create(new_policies)
                self.stdout.write(f"   [OK] Created {str(len(new_policies))} policies.")

            # 3. Balance Policies
            if run_policies and missing_balance_count > 0:
                self.stdout.write(f">> Creating {missing_balance_count} Balance Policies...")
                new_balance_policies = []
                for org in orgs_without_balance:
                    new_balance_policies.append(
                        BalancePolicy(
                            organization=org,
                            allow_negative=random.choice([True, False]),
                            warn_threshold=100.00,
                            enforcement_mode=EnforcementModeChoices.WARN,
                        )
                    )
                BalancePolicy.objects.bulk_create(new_balance_policies)
                self.stdout.write(f"   [OK] Created {str(len(new_balance_policies))} policies.")

            # 4. Project Invites
            if run_invites and missing_invite_count > 0:
                self.stdout.write(f">> Creating {missing_invite_count} Project Invites...")
                new_invites = []
                # Prefetch creators
                projects_to_seed = Project.objects.filter(invitations__isnull=True).select_related(
                    "organisation__creator"
                )

                for proj in projects_to_seed:
                    rand_id = random.randint(10000, 99999)
                    # Ensure future expiry
                    expiry = timezone.now() + timezone.timedelta(days=7)

                    inv = ProjectInvite(
                        project=proj,
                        email=f"scout_{rand_id}@example.com",
                        invited_by=proj.organisation.creator,
                        role=ProjectMembership.Role.VIEWER,
                        status=ProjectInvite.Status.PENDING,
                        expires_at=expiry,
                    )
                    new_invites.append(inv)

                created_count = 0
                for inv in new_invites:
                    inv.save()
                    created_count += 1

                self.stdout.write(f"   [OK] Created {created_count} invites.")

            # 5. Notification Preferences
            if run_preferences:
                self.stdout.write(">> Seeding Notification Preferences...")

                # Definieer de event types en channels op basis van de frontend screenshot
                # Project -> Updated | Task -> Assigned | Comment -> Added
                # Channels: Email, Push, In-App

                event_types = ["project.updated", "task.assigned", "comment.added"]
                channels = [
                    NotificationPreference.CHANNEL_EMAIL,
                    NotificationPreference.CHANNEL_PUSH,
                    NotificationPreference.CHANNEL_IN_APP,
                ]

                # Filter users that don't have preferences yet to avoid duplicates/overwrite
                target_users = list(
                    User.objects.exclude(notification_preferences__isnull=False).order_by("?")[:50]
                )

                new_prefs = []
                for user in target_users:
                    # Voor elke user, maak willekeurig wat aanpassingen
                    # (niet alles, want dan is alles 'custom')
                    # We simuleren dat sommige users specifieke dingen UIT zetten.
                    # Default is alles AAN (True). We slaan alleen
                    # afwijkingen op, of expliciete voorkeuren.

                    for event in event_types:
                        for channel in channels:
                            # 20% kans dat een user iets specifieks instelt
                            if random.random() < 0.20:
                                # 50/50 kans op aan of uit als ze het expliciet instellen
                                enabled = random.choice([True, False])

                                new_prefs.append(
                                    NotificationPreference(
                                        user=user,
                                        event_type=event,
                                        channel=channel,
                                        enabled=enabled,
                                    )
                                )

                if new_prefs:
                    NotificationPreference.objects.bulk_create(new_prefs)
                    self.stdout.write(
                        f"   [OK] Created {len(new_prefs)} preferences"
                        f" for {len(target_users)} users."
                    )
                else:
                    self.stdout.write("   [INFO] No new preferences generated (random chance).")

            self.stdout.write(self.style.SUCCESS("\nDone!"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Critical seeding error: {e}"))
        finally:
            # Reconnect Signals (Normally not needed as process ends, but good practice)
            pass
