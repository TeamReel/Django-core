import os
import django
import sys
import datetime
from django.conf import settings
from django.apps import apps


def get_demo_impact(app_label, model_name):
    impact_map = {
        "accounts": {
            "User": "Login, Team Members list",
            "Team": "Team management",
        },
        "organisations": {
            "Organisation": "Dashboard context, Org switcher (B06)",
            "Membership": "User access to Orgs",
        },
        "projects": {
            "Project": "Projects list, Task grouping (B07)",
        },
        "tasks": {
            "Task": "Task Board, Workload views (B15)",
        },
        "audit": {
            "ActivityLog": "Audit Log page (B09)",
        },
        "files": {
            "File": "Files management page (B22)",
        },
        "notifications": {
            "Notification": "Notification bell/list (B16)",
        },
        "permissions": {
            "Role": "RBAC enforcement (B08)",
            "Permission": "Granular access control",
        },
        "observability": {
            "Metric": "Health/Metrics dashboard (B18)",
        },
        "transactions": {
            "Transaction": "Billing/Usage history",
        },
        "settings": {
            "FeatureFlag": "Feature toggles (B10)",
            "GlobalSetting": "System configuration",
        },
    }
    return impact_map.get(app_label, {}).get(model_name, "General data availability")


def audit_db():
    # Add src to path
    sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

    # Configure Django settings
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

    # Check for DATABASE_PUBLIC_URL first (for local audit against production)
    if os.environ.get("DATABASE_PUBLIC_URL"):
        print("Using DATABASE_PUBLIC_URL for connection...")
        os.environ["DATABASE_URL"] = os.environ["DATABASE_PUBLIC_URL"]

    # Check for DATABASE_URL
    if not os.environ.get("DATABASE_URL"):
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("Please export DATABASE_URL='postgres://...' and try again.")
        sys.exit(1)

    db_url = os.environ["DATABASE_URL"]

    # Check if we are trying to use an internal Railway URL locally
    if "railway.internal" in db_url:
        print("\n⚠️  WARNING: Detected internal Railway URL ('railway.internal').")
        print("   This URL is only accessible from inside the Railway network.")
        print("   To run this audit locally, you must provide the Public TCP Proxy URL.")
        print("\n   ACTION REQUIRED:")
        print("   1. Go to Railway Dashboard -> PostgreSQL Service -> Connect -> Public Networking")
        print("   2. Copy the 'PostgreSQL Connection URL' (e.g., postgres://...:12345/railway)")
        print("   3. Run the script again with the public URL:")
        print("\n      $env:DATABASE_PUBLIC_URL='<paste-url-here>'; python audit_db.py")
        print("\n   (Stopping execution to prevent timeout errors)\n")
        sys.exit(1)

    # Initialize Django
    try:
        django.setup()
    except Exception as e:
        print(f"Error setting up Django: {e}")
        sys.exit(1)

    print(f"Connected to database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")

    # Core apps to focus on
    core_apps = [
        "accounts",
        "organisations",
        "projects",
        "permissions",
        "audit",
        "files",
        "transactions",
        "notifications",
        "contextual_notifications",
        "tasks",
        "observability",
        "i18n_preferences",
        "settings",
    ]

    models_data = []
    total_models = 0
    empty_models = 0

    print("Scanning models...")
    for model in apps.get_models():
        app_label = model._meta.app_label
        model_name = model.__name__
        db_table = model._meta.db_table

        # Filter for core apps or important ones
        is_core = app_label in core_apps

        # Skip some internal stuff unless it's auth
        if not is_core and app_label not in ["auth", "contenttypes", "sessions", "admin"]:
            continue

        try:
            count = model.objects.count()
        except Exception as e:
            print(f"Error counting {model_name}: {e}")
            count = -1

        status = "OK"
        if count == 0:
            status = "EMPTY"
            empty_models += 1
        elif count < 5:
            status = "THIN"

        impact = get_demo_impact(app_label, model_name)

        models_data.append(
            {
                "app": app_label,
                "model": model_name,
                "table": db_table,
                "count": count,
                "status": status,
                "impact": impact,
                "is_core": is_core,
            }
        )
        total_models += 1

    # Sort by app, then model
    models_data.sort(key=lambda x: (x["app"], x["model"]))

    # Generate Markdown Report
    report_path = os.path.join("documents", "05-demo", "production-db-audit.md")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Production Database Audit Report\n\n")
        f.write(f"**Date:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Environment:** Production (Railway)\n")
        f.write(f"**Database Host:** {settings.DATABASES['default']['HOST']}\n\n")

        f.write("## Summary\n")
        f.write(f"- **Total Models Scanned:** {total_models}\n")
        f.write(f"- **Empty Models:** {empty_models}\n")

        # Top 5 Largest
        largest = sorted(models_data, key=lambda x: x["count"], reverse=True)[:5]
        f.write("- **Largest Tables:**\n")
        for m in largest:
            f.write(f"  - `{m['table']}`: {m['count']}\n")

        f.write("\n## Detailed Audit\n\n")
        f.write("| Model | Table | Count | Status | Demo Impact |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- |\n")

        for m in models_data:
            status_icon = "✅" if m["status"] == "OK" else ("⚠️" if m["status"] == "THIN" else "❌")
            f.write(
                f"| **{m['app']}.{m['model']}** | `{m['table']}` | {m['count']} | {status_icon} {m['status']} | {m['impact']} |\n"
            )

        f.write("\n## Seeding Priorities\n")
        f.write("Based on 'EMPTY' status and Demo Impact:\n\n")

        priorities = []
        for m in models_data:
            if m["status"] == "EMPTY" and m["is_core"]:
                priorities.append(m)

        # Heuristic sort: prioritize 'organisations', 'projects', 'users'
        def priority_score(item):
            score = 0
            if item["app"] == "organisations":
                score += 10
            if item["app"] == "projects":
                score += 8
            if item["app"] == "accounts":
                score += 9
            if item["app"] == "tasks":
                score += 7
            return score

        priorities.sort(key=priority_score, reverse=True)

        for i, p in enumerate(priorities[:10], 1):
            f.write(f"{i}. **{p['app']}.{p['model']}**: {p['impact']}\n")

    print(f"\nReport generated at: {report_path}")
    print("Done.")


if __name__ == "__main__":
    audit_db()
