#!/usr/bin/env python
"""
Generate comprehensive database state documentation.

Outputs:
- documents/05-demo/data/counts.md (model counts with status)
- documents/05-demo/data/hierarchy-compact.md (org→club→team→season tree)
- documents/05-demo/data/tables.md (table structure + FK relations)

Usage:
    # Local (SQLite)
    python scripts/generate_demo_docs.py

    # Production (PostgreSQL)
    $env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
    python scripts/generate_demo_docs.py

Author: TeamReel
Date: 2026-02-04
"""

import os
import sys
from datetime import datetime

# Django setup
sys.path.insert(0, "src")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

from django.db import connection
from django.apps import apps


def get_db_info():
    """Get database connection info."""
    vendor = connection.vendor
    name = connection.settings_dict.get("NAME", "unknown")
    host = connection.settings_dict.get("HOST", "localhost")
    return vendor, name, host


def generate_counts():
    """Generate model counts with status."""
    output_lines = [
        "# Database Model Counts",
        "",
        f"> Auto-generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
    ]

    vendor, name, host = get_db_info()
    output_lines.append(f"**Database**: {vendor} ({host})")
    output_lines.append("")
    output_lines.append("| App | Model | Count | Status |")
    output_lines.append("|-----|-------|-------|--------|")

    # All Django apps to include (comprehensive list — 33 apps)
    core_apps = [
        # Core domain
        "organisations",
        "projects",
        "activities",
        # Auth & users
        "accounts",
        "permissions",
        # Content & media
        "content_generation",
        "medialib",
        "files",
        "branding",
        # Generative AI
        "generative",
        # Video processing
        "video",
        # Credits & transactions
        "credits",
        "transactions",
        # Templates & settings
        "settings",
        "sport_configuration",
        # Workflows & approvals
        "workflows",
        # Notifications & audit
        "notifications",
        "contextual_notifications",
        "audit",
        # Navigation & UI
        "navigation",
        # Platform infrastructure
        "observability",
        "rtc_websockets",
        "i18n_preferences",
        "constitution_engine",
        "security_baseline",
        "search",
        "scaffolding",
        "tasks",
    ]

    for app_label in core_apps:
        try:
            app_config = apps.get_app_config(app_label)
            for model in app_config.get_models():
                try:
                    count = model.objects.count()
                    if count == 0:
                        status = "🔴 EMPTY"
                    elif count < 3:
                        status = "🟡 THIN"
                    else:
                        status = "🟢 OK"

                    output_lines.append(f"| {app_label} | {model.__name__} | {count} | {status} |")
                except Exception as e:
                    output_lines.append(f"| {app_label} | {model.__name__} | ERROR | ⚠️ {e} |")
        except LookupError:
            output_lines.append(f"| {app_label} | - | - | ⚠️ App not found |")

    output_lines.append("")
    output_lines.append("**Legend**: 🟢 OK (3+) | 🟡 THIN (1-2) | 🔴 EMPTY (0)")

    output_path = "documents/05-demo/data/counts.md"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))
    print(f"✅ Generated: {output_path}")


def generate_hierarchy():
    """Generate org→club→team→season hierarchy tree."""
    from organisations.models import Organisation
    from projects.models import Project
    from activities.models import Period

    output_lines = [
        "# Database Hierarchy",
        "",
        f"> Auto-generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
    ]

    vendor, name, host = get_db_info()
    output_lines.append(f"**Database**: {vendor} ({host})")
    output_lines.append("")

    for org in Organisation.objects.all().order_by("name"):
        output_lines.append(f"## 🏛️ {org.name}")
        output_lines.append(f"- Slug: `{org.slug}`")
        if hasattr(org, "country_code") and org.country_code:
            output_lines.append(f"- Country: {org.country_code}")
        output_lines.append("")

        # Root projects (clubs)
        clubs = Project.objects.filter(
            organisation=org,
            parent_project__isnull=True
        ).order_by("name")

        for club in clubs:
            output_lines.append(f"### 🏟️ {club.name}")
            output_lines.append(f"- Slug: `{club.slug}`")
            output_lines.append("")

            # Child projects (teams)
            teams = Project.objects.filter(parent_project=club).order_by("name")
            for team in teams:
                output_lines.append(f"#### ⚽ {team.name}")
                output_lines.append(f"- Slug: `{team.slug}`")

                # Root periods (seasons)
                seasons = Period.objects.filter(
                    project=team,
                    parent_period__isnull=True
                ).order_by("-name")

                if seasons.exists():
                    output_lines.append("- Seasons:")
                    for season in seasons:
                        output_lines.append(f"  - **{season.name}**")

                        # Child periods (competitions)
                        competitions = Period.objects.filter(
                            parent_period=season
                        ).order_by("name")

                        for comp in competitions:
                            output_lines.append(f"    - {comp.name}")

                output_lines.append("")

        output_lines.append("---")
        output_lines.append("")

    if not Organisation.objects.exists():
        output_lines.append("⚠️ No organisations found in database.")
        output_lines.append("")
        output_lines.append("Run seed scripts to populate:")
        output_lines.append("```bash")
        output_lines.append("python scripts/seed_organisations.py")
        output_lines.append("```")

    output_path = "documents/05-demo/data/hierarchy-compact.md"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))
    print(f"✅ Generated: {output_path}")


def generate_schema():
    """Generate table schema with FK relations."""
    output_lines = [
        "# Database Schema",
        "",
        f"> Auto-generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
    ]

    vendor, name, host = get_db_info()
    output_lines.append(f"**Database**: {vendor} ({host})")
    output_lines.append("")

    # All Django apps (comprehensive list — 33 apps)
    all_apps = [
        # Core domain
        "organisations",
        "projects",
        "activities",
        # Auth & users
        "accounts",
        "permissions",
        # Content & media
        "content_generation",
        "medialib",
        "files",
        "branding",
        # Generative AI
        "generative",
        # Video processing
        "video",
        # Credits & transactions
        "credits",
        "transactions",
        # Templates & settings
        "settings",
        "sport_configuration",
        # Workflows & approvals
        "workflows",
        # Notifications & audit
        "notifications",
        "contextual_notifications",
        "audit",
        # Navigation & UI
        "navigation",
        # Platform infrastructure
        "observability",
        "rtc_websockets",
        "i18n_preferences",
        "constitution_engine",
        "security_baseline",
        "search",
        "scaffolding",
        "tasks",
    ]

    output_lines.append("## FK Relationship Summary")
    output_lines.append("")
    output_lines.append("| Model | FK Field | Target |")
    output_lines.append("|-------|----------|--------|")

    fk_relations = []

    for app_label in all_apps:
        try:
            app_config = apps.get_app_config(app_label)
            for model in app_config.get_models():
                for field in model._meta.get_fields():
                    if hasattr(field, "related_model") and field.related_model:
                        if field.many_to_one or field.one_to_one:
                            fk_relations.append({
                                "model": f"{app_label}.{model.__name__}",
                                "field": field.name,
                                "target": f"{field.related_model._meta.app_label}.{field.related_model.__name__}"
                            })
        except LookupError:
            pass

    for rel in sorted(fk_relations, key=lambda x: x["model"]):
        output_lines.append(f"| {rel['model']} | `{rel['field']}` | {rel['target']} |")

    output_lines.append("")
    output_lines.append("---")
    output_lines.append("")

    # Table details
    output_lines.append("## Table Details")
    output_lines.append("")

    for app_label in all_apps:
        try:
            app_config = apps.get_app_config(app_label)
            output_lines.append(f"### {app_label}")
            output_lines.append("")

            for model in app_config.get_models():
                output_lines.append(f"#### {model.__name__}")
                output_lines.append(f"- Table: `{model._meta.db_table}`")
                output_lines.append("")
                output_lines.append("| Field | Type | Nullable | FK Target |")
                output_lines.append("|-------|------|----------|-----------|")

                for field in model._meta.get_fields():
                    if hasattr(field, "get_internal_type"):
                        field_type = field.get_internal_type()
                        nullable = "Yes" if getattr(field, "null", False) else "No"

                        fk_target = "-"
                        if hasattr(field, "related_model") and field.related_model:
                            fk_target = f"`{field.related_model._meta.db_table}`"

                        output_lines.append(f"| `{field.name}` | {field_type} | {nullable} | {fk_target} |")

                output_lines.append("")
        except LookupError:
            output_lines.append(f"### {app_label}")
            output_lines.append("⚠️ App not found")
            output_lines.append("")

    output_path = "documents/05-demo/data/tables.md"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))
    print(f"✅ Generated: {output_path}")


def main():
    print("=" * 50)
    print("Generating Demo Documentation")
    print("=" * 50)

    vendor, name, host = get_db_info()
    print(f"Database: {vendor} @ {host}")
    print()

    generate_counts()
    generate_hierarchy()
    generate_schema()

    print()
    print("✅ All documentation generated!")
    print("   - documents/05-demo/data/counts.md")
    print("   - documents/05-demo/data/hierarchy-compact.md")
    print("   - documents/05-demo/data/tables.md")


if __name__ == "__main__":
    main()
