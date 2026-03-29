"""
Production Database Audit Tool

Generates a comprehensive report of all database tables with counts and status.
Similar to production-db-audit.md format.

Usage:
    python manage.py audit_production_db
"""

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone


class Command(BaseCommand):
    help = "Generate comprehensive audit report of production database"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\nProduction Database Audit\n"))
        self.stdout.write("=" * 80)

        # Get database info
        db_settings = connection.settings_dict
        db_host = db_settings.get("HOST", "localhost")
        db_name = db_settings.get("NAME", "unknown")

        self.stdout.write(f"\nDatabase: {db_name}")
        self.stdout.write(f"Host: {db_host}")
        self.stdout.write(f"Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Collect all models
        all_models = []
        for app_config in apps.get_app_configs():
            for model in app_config.get_models():
                all_models.append(model)

        total_models = len(all_models)
        empty_models = 0
        total_records = 0

        # Header
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(f"{'Model':<40} | {'Table':<35} | {'Count':>8}")
        self.stdout.write("=" * 80)

        # Sort by app label and model name
        all_models.sort(key=lambda m: f"{m._meta.app_label}.{m._meta.object_name}")

        model_data = []

        for model in all_models:
            app_label = model._meta.app_label
            model_name = model._meta.object_name
            table_name = model._meta.db_table

            try:
                count = model.objects.count()
                total_records += count

                if count == 0:
                    empty_models += 1
                    status = "EMPTY"
                elif count < 10:
                    status = "THIN"
                else:
                    status = "OK"

                model_data.append(
                    {
                        "app_label": app_label,
                        "model_name": model_name,
                        "full_name": f"{app_label}.{model_name}",
                        "table_name": table_name,
                        "count": count,
                        "status": status,
                    }
                )

                # Print row
                self.stdout.write(
                    f"{app_label}.{model_name:<35} | {table_name:<35} | {count:>8,} {status}"
                )

            except Exception:
                self.stdout.write(f"{app_label}.{model_name:<35} | {table_name:<35} | {'ERROR':>8}")

        # Summary
        self.stdout.write("=" * 80)
        self.stdout.write("\nSUMMARY")
        self.stdout.write(f"   Total Models: {total_models}")
        self.stdout.write(f"   Empty Models: {empty_models}")
        self.stdout.write(f"   Total Records: {total_records:,}")
        self.stdout.write(
            f"   Database Fill: {((total_models - empty_models) / total_models * 100):.1f}%"
        )

        # Top 5 largest tables
        self.stdout.write("\nTOP 5 LARGEST TABLES:")
        sorted_data = sorted(model_data, key=lambda x: x["count"], reverse=True)[:5]
        for item in sorted_data:
            self.stdout.write(f"   {item['full_name']:<40} {item['count']:>8,} records")

        # Empty tables for seeding
        self.stdout.write("\nEMPTY TABLES (need seeding):")
        empty_data = [item for item in model_data if item["count"] == 0]
        if empty_data:
            for item in empty_data[:15]:  # Show first 15
                self.stdout.write(f"   - {item['full_name']:<40} ({item['table_name']})")
            if len(empty_data) > 15:
                self.stdout.write(f"   ... and {len(empty_data) - 15} more")
        else:
            self.stdout.write("   (None - all tables have data!)")

        # Critical TeamReel tables
        self.stdout.write("\nTEAMREEL CRITICAL TABLES:")
        critical_tables = [
            "organisations.Organisation",
            "projects.Project",
            "activities.Period",
            "activities.Activity",
            "projects.ProjectMembership",
            "activities.Participation",
            "accounts.User",
        ]

        for table in critical_tables:
            item = next((x for x in model_data if x["full_name"] == table), None)
            if item:
                self.stdout.write(
                    f"   {item['full_name']:<40} {item['count']:>8,} {item['status']}"
                )
            else:
                self.stdout.write(f"   {table:<40} {'N/A':>8}")

        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(self.style.SUCCESS("\nAudit complete!\n"))
