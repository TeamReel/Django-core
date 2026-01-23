"""Ad-hoc RBAC verification for TeamReel demo.

Runs against the currently configured Django settings/database (including Railway
when DATABASE_URL is set in the environment).

This script is intentionally *read-only* (except for DRF auth/session handling):
- It performs GETs and no-op PATCHes (role set to the current value) to validate
  permission boundaries without mutating production/demo data.

Usage:
  C:/Users/brian/Documents/django-core/venv/Scripts/python.exe scripts/verify_teamreel_rbac_endpoints.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


def _setup_django() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    src_dir = repo_root / "src"
    sys.path.insert(0, str(src_dir))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

    import django

    django.setup()


def main() -> int:
    _setup_django()

    from django.conf import settings
    from django.db import connection
    from django.db.utils import OperationalError, ProgrammingError

    from rest_framework.test import APIClient

    from projects.models import Project, ProjectMembership

    def _guard_against_unmigrated_db() -> bool:
        """Return True if DB looks compatible, else print hint and return False."""

        # The team/club hierarchy checks rely on `Project.parent_project` being present
        # in the database schema. When someone runs this script against an old local
        # SQLite DB (no migrations), the first ORM query will crash with
        # `no such column: projects_project.parent_project_id`.
        try:
            with connection.cursor() as cursor:
                columns = {
                    col.name
                    for col in connection.introspection.get_table_description(cursor, "projects_project")
                }
        except (OperationalError, ProgrammingError):
            # If the table itself doesn't exist (fresh DB), let the normal fixture
            # selection print a friendly error.
            return True

        if "parent_project_id" in columns:
            return True

        db_name = connection.settings_dict.get("NAME")
        vendor = connection.vendor
        self_hint = (
            "[rbac] DB schema mismatch: 'projects_project.parent_project_id' is missing.\n"
            f"[rbac] Settings: DJANGO_SETTINGS_MODULE={getattr(settings, 'SETTINGS_MODULE', None) or os.environ.get('DJANGO_SETTINGS_MODULE')}\n"
            f"[rbac] Database: vendor={vendor} name={db_name}\n"
            "[rbac] Fix: run migrations for this DB, or run against Railway by setting DATABASE_URL (and usually DJANGO_SETTINGS_MODULE=config.settings.production)."
        )
        print(self_hint)
        return False

    def pick_fixture():
        team = (
            Project.objects.filter(parent_project__isnull=False, is_active=True)
            .select_related("parent_project")
            .order_by("id")
            .first()
        )
        if not team or not team.parent_project_id:
            print("[rbac] No team project found (parent_project != null).")
            return None

        club = team.parent_project

        other_team = (
            Project.objects.filter(parent_project__isnull=False, is_active=True)
            .exclude(parent_project_id=club.id)
            .order_by("id")
            .first()
        )
        if not other_team:
            print("[rbac] No second team found outside the club subtree.")
            return None

        club_admin_pm = (
            ProjectMembership.objects.filter(
                project=club,
                role=ProjectMembership.Role.ADMIN,
                deleted_at__isnull=True,
            )
            .select_related("user")
            .order_by("created_at")
            .first()
        )
        if not club_admin_pm:
            print(f"[rbac] No club admin membership found for club={club.slug}.")
            return None

        team_admin_pm = (
            ProjectMembership.objects.filter(
                project=team,
                role=ProjectMembership.Role.ADMIN,
                deleted_at__isnull=True,
            )
            .select_related("user")
            .order_by("created_at")
            .first()
        )
        if not team_admin_pm:
            print(f"[rbac] No team admin membership found for team={team.slug}.")
            return None

        team_member_pm = (
            ProjectMembership.objects.filter(
                project=team,
                role=ProjectMembership.Role.VIEWER,
                deleted_at__isnull=True,
            )
            .exclude(user_id=club_admin_pm.user_id)
            .exclude(user_id=team_admin_pm.user_id)
            .select_related("user")
            .order_by("created_at")
            .first()
        )
        if not team_member_pm:
            print(f"[rbac] No viewer membership found for team={team.slug}.")
            return None

        other_team_member_pm = (
            ProjectMembership.objects.filter(
                project=other_team,
                deleted_at__isnull=True,
            )
            .select_related("user")
            .order_by("created_at")
            .first()
        )
        if not other_team_member_pm:
            print(f"[rbac] No membership found for other_team={other_team.slug}.")
            return None

        return {
            "club": club,
            "team": team,
            "other_team": other_team,
            "club_admin_pm": club_admin_pm,
            "team_admin_pm": team_admin_pm,
            "team_member_pm": team_member_pm,
            "other_team_member_pm": other_team_member_pm,
        }

    if not _guard_against_unmigrated_db():
        return 2

    fx = pick_fixture()
    if not fx:
        return 2

    club = fx["club"]
    team = fx["team"]
    other_team = fx["other_team"]

    club_admin = fx["club_admin_pm"].user
    team_admin = fx["team_admin_pm"].user
    team_member = fx["team_member_pm"].user

    team_member_pm = fx["team_member_pm"]
    other_team_member_pm = fx["other_team_member_pm"]

    print("[rbac] Using fixtures:")
    print(f"  club       = {club.name} ({club.slug})")
    print(f"  team       = {team.name} ({team.slug})")
    print(f"  other_team = {other_team.name} ({other_team.slug})")
    print(f"  club_admin = {club_admin.email} (id={club_admin.id})")
    print(f"  team_admin = {team_admin.email} (id={team_admin.id})")
    print(f"  team_member= {team_member.email} (id={team_member.id})")

    client = APIClient()

    def req(user, method: str, path: str, data=None):
        client.force_authenticate(user=user)
        fn = getattr(client, method)

        # Production settings typically enforce HTTPS via SECURE_SSL_REDIRECT, which
        # would cause 301s in the Django test client unless we mark the request as
        # secure. Also ensure a host that is allowed by default.
        request_kwargs = {
            "secure": True,
            "HTTP_X_FORWARDED_PROTO": "https",
            "HTTP_HOST": "localhost",
        }

        if data is not None:
            resp = fn(path, data=data, format="json", **request_kwargs)
        else:
            resp = fn(path, **request_kwargs)
        try:
            body = resp.json()
        except (ValueError, TypeError):
            body = (resp.content or b"")[:250].decode("utf-8", errors="ignore")
        summary = body
        if isinstance(body, dict):
            summary = {k: body.get(k) for k in ("detail", "error", "message") if k in body}
            if not summary:
                summary = {"keys": sorted(list(body.keys()))[:12]}
        print(f"  {method.upper():5s} {path} -> {resp.status_code} {summary}")
        return resp

    print("\n[rbac] 1) Club Admin: can view & manage child team members")
    req(club_admin, "get", f"/api/v1/projects/{team.slug}/members/?page_size=5")
    req(
        club_admin,
        "patch",
        f"/api/v1/projects/{team.slug}/members/{team_member_pm.id}/",
        data={"role": str(team_member_pm.role)},
    )

    print("\n[rbac] 2) Club Admin: cannot manage another club's team")
    req(club_admin, "get", f"/api/v1/projects/{other_team.slug}/members/?page_size=5")
    req(
        club_admin,
        "patch",
        f"/api/v1/projects/{other_team.slug}/members/{other_team_member_pm.id}/",
        data={"role": str(other_team_member_pm.role)},
    )

    print("\n[rbac] 3) Team Admin: can manage own team, not other teams")
    req(team_admin, "get", f"/api/v1/projects/{team.slug}/members/?page_size=5")
    req(
        team_admin,
        "patch",
        f"/api/v1/projects/{team.slug}/members/{team_member_pm.id}/",
        data={"role": str(team_member_pm.role)},
    )
    req(team_admin, "get", f"/api/v1/projects/{other_team.slug}/members/?page_size=5")

    print("\n[rbac] 4) Team Member: can view own roster, cannot manage")
    req(team_member, "get", f"/api/v1/projects/{team.slug}/members/?page_size=5")
    req(
        team_member,
        "patch",
        f"/api/v1/projects/{team.slug}/members/{team_member_pm.id}/",
        data={"role": str(team_member_pm.role)},
    )
    req(team_member, "get", f"/api/v1/projects/{other_team.slug}/members/?page_size=5")

    print("\n[rbac] Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
