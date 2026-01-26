from __future__ import annotations

import os
import sys

import django
from django.utils import timezone


def main() -> int:
    sys.path.insert(0, "src")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL is not set; refusing to run against a local/empty DB.")
        print("   Set DATABASE_URL to the Railway Postgres connection string and retry.")
        return 2
    django.setup()

    from django.db import connection

    if connection.vendor != "postgresql":
        db_name = connection.settings_dict.get("NAME")
        print("❌ Refusing to run: expected PostgreSQL (Railway), got:")
        print(f"   vendor={connection.vendor} name={db_name!r}")
        print("   Ensure DATABASE_URL points to Railway Postgres.")
        return 3

    from activities.models import Activity, Period
    from organisations.models import Organisation
    from projects.models import Project, ProjectMembership

    out: list[str] = []
    out.append("# TeamReel Current Database State")
    out.append("")
    out.append(f"**Last Updated:** {timezone.now().strftime('%Y-%m-%d %H:%M')}")
    out.append("**Environment:** Railway PostgreSQL Production")
    out.append("**Purpose:** Quick hierarchy snapshot (teams/seasons/competitions with players + matches)")
    out.append("")
    out.append("> This file is auto-generated. Do not edit manually.")
    out.append("")
    out.append("---")
    out.append("")
    out.append("## Snapshot")
    out.append("")
    out.append("| ORG | CLUB | TEAM | SEASON | COMPETITION | PLAYERS | MATCHES |")
    out.append("| :--- | :--- | :--- | :--- | :--- | ---: | ---: |")

    rows_written = 0

    for org in Organisation.objects.all().order_by("name"):
        clubs = Project.objects.filter(organisation=org, parent_project__isnull=True).order_by("name")
        for club in clubs:
            teams = Project.objects.filter(parent_project=club).order_by("name")
            for team in teams:
                seasons = Period.objects.filter(project=team, parent_period__isnull=True).order_by("name")
                for season in seasons:
                    player_count = ProjectMembership.objects.filter(project=team, period=season).count()
                    competitions = Period.objects.filter(parent_period=season).order_by("name")
                    if competitions.exists():
                        for comp in competitions:
                            match_count = Activity.objects.filter(project=team, period=comp).count()
                            if match_count == 0:
                                continue
                            out.append(
                                "| "
                                + " | ".join(
                                    [
                                        str(org.slug),
                                        str(club.name),
                                        str(team.name),
                                        str(season.name),
                                        str(comp.name),
                                        str(player_count),
                                        str(match_count),
                                    ]
                                )
                                + " |"
                            )
                            rows_written += 1
                    else:
                        # No competitions under this season.
                        continue

    output_file = "documents/05-demo/teamreel-current-db-state.md"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")

    print(f"\n✅ Database state written to {output_file}")
    print(f"   Rows: {rows_written}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
