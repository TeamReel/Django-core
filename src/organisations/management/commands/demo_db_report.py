from django.core.management.base import BaseCommand
from django.apps import apps
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Generates a report on the demo database state."

    def handle(self, *args, **options):
        self.stdout.write("=== DEMO DB COVERAGE REPORT ===")

        # 1. Environment Header
        db_settings = settings.DATABASES["default"]
        self.stdout.write(
            f"Database: {db_settings.get('NAME', 'default')} (Engine: {db_settings.get('ENGINE', 'unknown')})"
        )
        self.stdout.write(f"Timestamp: {timezone.now().isoformat()}")
        self.stdout.write("-" * 40)

        # 2. Model Inventory & 3. Readiness Classification
        populate_next = []

        # Exclude system apps
        excluded_apps = [
            "admin",
            "auth",
            "contenttypes",
            "sessions",
            "messages",
            "staticfiles",
            "django_extensions",
            "corsheaders",
            "rest_framework",
            "drf_spectacular",
            "axes",
            "django_prometheus",
            "health_check",
            "rosetta",
        ]

        # Specific system tables to exclude even if app is included (e.g. migrations)
        excluded_tables = [
            "django_migrations",
            "django_admin_log",
            "auth_permission",
            "auth_group",
            "auth_group_permissions",
            "django_content_type",
            "django_session",
        ]

        User = get_user_model()

        # Heuristics Data
        try:
            active_org_count = (
                apps.get_model("organisations", "Organisation")
                .objects.filter(is_active=True)
                .count()
            )
            active_user_count = User.objects.filter(is_active=True).count()
        except LookupError:
            active_org_count = 0
            active_user_count = 0

        self.stdout.write(
            f"{'Model':<40} | {'Rows':<8} | {'Status':<15} | {'Last Updated':<16} | Reason"
        )
        self.stdout.write("-" * 110)

        for app_config in apps.get_app_configs():
            if app_config.label in excluded_apps:
                continue

            for model in app_config.get_models():
                if model._meta.db_table in excluded_tables:
                    continue

                model_name = f"{app_config.label}.{model.__name__}"
                row_count = model.objects.count()

                # Timestamp
                last_updated = "-"
                if hasattr(model, "updated_at"):
                    latest = model.objects.order_by("-updated_at").first()
                    if latest:
                        last_updated = latest.updated_at.strftime("%Y-%m-%d %H:%M")
                elif hasattr(model, "created_at"):
                    latest = model.objects.order_by("-created_at").first()
                    if latest:
                        last_updated = latest.created_at.strftime("%Y-%m-%d %H:%M")
                elif hasattr(model, "date_joined"):  # User model
                    latest = model.objects.order_by("-date_joined").first()
                    if latest:
                        last_updated = latest.date_joined.strftime("%Y-%m-%d %H:%M")

                # Classification Logic
                status = "READY"
                reason = ""

                # Specific Heuristics
                if model_name == "organisations.Organisation":
                    if row_count < 5:  # Arbitrary demo threshold
                        status = "EMPTY-NOT-OK"
                        reason = "Need at least 5 organisations for demo"
                        populate_next.append(
                            (
                                model_name,
                                "Seed basic organisations (Premier League, etc.)",
                            )
                        )

                elif model_name == "accounts.User":
                    if row_count < 10:
                        status = "EMPTY-NOT-OK"
                        reason = "Need users for demo scenarios"
                        populate_next.append((model_name, "Seed users (admins, members)"))
                    elif active_user_count < 5:
                        status = "INCONSISTENT"
                        reason = "Many users are inactive"

                elif model_name == "organisations.Membership":
                    if active_org_count > 0 and row_count < active_org_count:
                        status = "INCONSISTENT"
                        reason = "Fewer memberships than organisations"
                        populate_next.append(
                            (
                                model_name,
                                "Ensure every organisation has at least one admin",
                            )
                        )
                    elif row_count == 0:
                        status = "EMPTY-NOT-OK"
                        reason = "No memberships found"
                        populate_next.append((model_name, "Link users to organisations"))

                elif model_name == "projects.Project":
                    if active_org_count > 0 and row_count < active_org_count:
                        status = "EMPTY-NOT-OK"  # Should have some projects
                        reason = "Most organisations should have projects"
                        populate_next.append(
                            (
                                model_name,
                                "Create sample projects for each organisation",
                            )
                        )

                # Generic Heuristics
                elif row_count == 0:
                    # Check if it's likely critical
                    if "notification" in model_name.lower():
                        status = "EMPTY-OK"  # Notifications generate over time
                    elif "audit" in model_name.lower():
                        status = "EMPTY-OK"
                    else:
                        status = (
                            "EMPTY-OK"  # Default to OK for unknown empty tables unless specified
                        )
                        # You might want to flag unknown empty tables as WARNING if strict

                self.stdout.write(
                    f"{model_name:<40} | {row_count:<8} | {status:<15} | {last_updated:<16} | {reason}"
                )

        # 4. Action List
        self.stdout.write("\n=== POPULATE NEXT (Prioritized) ===")
        if not populate_next:
            self.stdout.write("No critical data gaps found. Database appears demo-ready.")
        else:
            for i, (model, task) in enumerate(populate_next, 1):
                self.stdout.write(f"{i}. {model}: {task}")
