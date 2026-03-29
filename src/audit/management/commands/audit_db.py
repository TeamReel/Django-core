import os
import re
from datetime import datetime

from django.apps import apps
from django.conf import settings as django_settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Audit database table counts and update documentation status"

    def handle(self, *args, **options):
        # Path to report. BASE_DIR is 'src', so we go up one level for project root 'documents'
        project_root = django_settings.BASE_DIR.parent
        docs_dir = os.path.join(project_root, "documents", "05-demo")
        report_path = os.path.join(docs_dir, "production-db-audit.md")

        self.stdout.write(f"Target report path: {report_path}")

        # 1. Load existing impacts
        impact_map = {}
        if os.path.exists(report_path):
            with open(report_path, "r", encoding="utf-8") as f:
                content = f.read()
                # Regex to find existing rows and capture manual "Demo Impact" notes
                # Matches: | **app.Model** | `table_name` | 123 | ✅ OK | impact text |
                # We extract group 1 (model label) and group 5 (impact)
                rows = re.findall(
                    r"\| \s*\*\*(.*?)\*\* \s*\| \s*`(.*?)` \s*"
                    r"\| \s*(\d+) \s*\| \s*(.*?) \s*\| \s*(.*?) \s*\|",
                    content,
                )
                for r in rows:
                    model_label = r[0].strip()
                    impact = r[4].strip()
                    impact_map[model_label] = impact
            self.stdout.write(f"Loaded {len(impact_map)} existing impact definitions.")

        # 2. Audit
        all_models = apps.get_models()
        # Sort by app_label, then model_name
        all_models.sort(key=lambda x: (x._meta.app_label, x._meta.model_name))

        results = []
        empty_count = 0
        total_models = 0

        # Exclude list (internal Django stuff that isn't relevant for business audit if desired)
        # But for "production-db-audit", typically all are shown.
        # We will iterate all.

        for model in all_models:
            # Skip migrations as it's technical
            if model._meta.model_name == "migration":
                continue

            total_models += 1

            app_label = model._meta.app_label
            model_name = model._meta.object_name
            full_label = f"{app_label}.{model_name}"

            try:
                count = model.objects.count()
            except Exception as e:
                self.stderr.write(f"Error counting {full_label}: {e}")
                count = 0

            table_name = model._meta.db_table

            status = "✅ OK"
            if count == 0:
                status = "❌ EMPTY"
                empty_count += 1
            elif count < 5:
                status = "⚠️ THIN"

            # Retrieve processed impact or default
            impact = impact_map.get(full_label, "General data availability")

            results.append(
                {
                    "label": full_label,
                    "table": table_name,
                    "count": count,
                    "status": status,
                    "impact": impact,
                }
            )

        # 3. Generate Report
        lines = []
        lines.append("# Production Database Audit Report")
        lines.append("")
        lines.append(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        env_name = "Local Development" if django_settings.DEBUG else "Production"
        # Since we are running this likely in a varied env, we can try to detect if RAILWAY is set
        if os.environ.get("RAILWAY_ENVIRONMENT"):
            env_name = f"Railway ({os.environ.get('RAILWAY_ENVIRONMENT')})"

        lines.append(f"**Environment:** {env_name}")
        # Database host is hard to get safely from settings if
        # it's a URL, but we can skip or put placeholder
        db_host = django_settings.DATABASES["default"].get("HOST", "localhost")
        lines.append(f"**Database Host:** {db_host}")
        lines.append("")

        lines.append("## Summary")
        lines.append(f"- **Total Models Scanned:** {total_models}")
        lines.append(f"- **Empty Models:** {empty_count}")

        # Largest tables
        lines.append("- **Largest Tables:**")
        sorted_by_count = sorted(results, key=lambda x: x["count"], reverse=True)[:5]
        for r in sorted_by_count:
            lines.append(f"  - `{r['label']}`: {r['count']}")

        lines.append("")
        lines.append("## Detailed Audit")
        lines.append("")
        lines.append("| Model | Table | Count | Status | Demo Impact |")
        lines.append("| :--- | :--- | :--- | :--- | :--- |")

        for r in results:
            lines.append(
                f"| **{r['label']}** | `{r['table']}` "
                f"| {r['count']} | {r['status']} | {r['impact']} |"
            )

        lines.append("")
        lines.append("## Seeding Priorities")
        lines.append("Based on 'EMPTY' status and Demo Impact:")
        lines.append("")

        empty_models = [r for r in results if "EMPTY" in r["status"]]
        for i, m in enumerate(empty_models, 1):
            lines.append(f"{i}. **{m['label']}**: {m['impact']}")

        lines.append("")  # Final newline

        final_content = "\n".join(lines)

        # 4. Write
        os.makedirs(docs_dir, exist_ok=True)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(final_content)

        self.stdout.write(
            self.style.SUCCESS(f"Audit report successfully generated at: {report_path}")
        )
