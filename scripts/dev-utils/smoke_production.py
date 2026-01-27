"""Production-safe smoke checks for TeamReel backend.

Goals:
- Validate DB connectivity and basic API health without running pytest.
- Prefer read-only checks.
- Optional minimal write checks exist but are opt-in.

Usage (Railway example):
  - Set env vars so Django can run (DATABASE_URL, SECRET_KEY, etc.)
  - Run: python scripts/dev-utils/smoke_production.py --mode read

Modes:
- read (default): read-only checks
- write: performs minimal write (set+clear active-context) inside a transaction

This script is intentionally conservative: it never runs migrations, never drops
or truncates tables, and avoids any bulk queries.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path


def _setup_django() -> None:
    # Ensure `src/` is on PYTHONPATH (this repo's Django project lives under src/)
    repo_root = Path(__file__).resolve().parents[2]
    src_dir = repo_root / "src"
    sys.path.insert(0, str(src_dir))

    # For production/staging shells, prefer explicit settings module.
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

    import django  # noqa: WPS433

    django.setup()


@dataclass(frozen=True)
class CheckResult:
    name: str
    ok: bool
    detail: str = ""


def _check_db_connection() -> CheckResult:
    from django.db import connection  # noqa: WPS433

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            value = cursor.fetchone()
        return CheckResult("db:select-1", value == (1,), f"returned={value!r}")
    except Exception as exc:  # pragma: no cover
        return CheckResult("db:select-1", False, f"error={exc!r}")


def _check_migrations_applied() -> CheckResult:
    """Checks whether expected migrations are present in django_migrations.

    This is a safety check: it doesn't attempt to migrate.
    """

    try:
        from django.db.migrations.recorder import MigrationRecorder  # noqa: WPS433

        expected = [
            ("accounts", "0003_user_active_context"),
        ]

        missing: list[tuple[str, str]] = []
        for app, name in expected:
            exists = MigrationRecorder.Migration.objects.filter(app=app, name=name).exists()
            if not exists:
                missing.append((app, name))

        if missing:
            return CheckResult("db:migrations", False, f"missing={missing!r}")
        return CheckResult("db:migrations", True, f"present={expected!r}")
    except Exception as exc:  # pragma: no cover
        return CheckResult("db:migrations", False, f"error={exc!r}")


def _check_active_context_read(user_email: str | None) -> CheckResult:
    """Read check for active context.

    If user_email is provided, tries to load the user and the associated context.
    If not, verifies the model exists and table is queryable.
    """

    from django.contrib.auth import get_user_model  # noqa: WPS433

    from accounts.models import UserActiveContext  # noqa: WPS433

    User = get_user_model()

    try:
        if not user_email:
            # Cheap query to ensure table exists and ORM can hit it.
            _ = (
                UserActiveContext.objects.order_by("id").values_list("id", flat=True).first()
            )
            return CheckResult("active-context:read", True, "table query ok")

        user = User.objects.filter(email=user_email).first()
        if not user:
            return CheckResult("active-context:read", False, f"user not found: {user_email}")

        ctx = UserActiveContext.objects.filter(user=user).first()
        # It's ok if it's missing; endpoint can create lazily.
        detail = {
            "has_context_row": bool(ctx),
            "organisation_id": getattr(ctx, "organisation_id", None),
            "project_id": getattr(ctx, "project_id", None),
            "team_organisation_id": getattr(ctx, "team_organisation_id", None),
            "season_id": getattr(ctx, "season_id", None),
            "competition_id": getattr(ctx, "competition_id", None),
            "match_id": getattr(ctx, "match_id", None),
        }
        return CheckResult("active-context:read", True, json.dumps(detail))
    except Exception as exc:  # pragma: no cover
        return CheckResult("active-context:read", False, f"error={exc!r}")


def _check_active_context_write(user_email: str) -> CheckResult:
    """Minimal write smoke: set+clear active context in a transaction.

    This is opt-in.

    To keep it production-safe, the transaction is explicitly rolled back.
    """

    from django.contrib.auth import get_user_model  # noqa: WPS433
    from django.db import transaction  # noqa: WPS433

    from accounts.api.views import _set_active_context_for_user  # noqa: WPS433
    from accounts.models import UserActiveContext  # noqa: WPS433

    User = get_user_model()

    user = User.objects.filter(email=user_email).first()
    if not user:
        return CheckResult("active-context:write", False, f"user not found: {user_email}")

    # Use a match if available, else just clear (still exercises write path).
    from activities.models import Match  # noqa: WPS433

    match = Match.objects.order_by("id").first()

    try:
        ok = False
        detail = ""
        with transaction.atomic():
            if match:
                _set_active_context_for_user(user=user, kind="match", obj_id=match.id)
            else:
                _set_active_context_for_user(user=user, kind="clear", obj_id=None)

            _set_active_context_for_user(user=user, kind="clear", obj_id=None)

            # Verify row exists and is cleared.
            ctx = UserActiveContext.objects.get(user=user)
            ok = (
                ctx.organisation_id is None
                and ctx.project_id is None
                and ctx.team_organisation_id is None
                and ctx.season_id is None
                and ctx.competition_id is None
                and ctx.match_id is None
            )
            detail = "set+clear ok; rolled back" if ok else "context not cleared; rolled back"

            # Always rollback so we don't leave production changes behind.
            transaction.set_rollback(True)

        return CheckResult("active-context:write", ok, detail)
    except Exception as exc:  # pragma: no cover
        return CheckResult("active-context:write", False, f"error={exc!r}")


def _print_results(results: list[CheckResult]) -> int:
    width = max(len(r.name) for r in results)
    failed = 0
    for r in results:
        status = "OK" if r.ok else "FAIL"
        if not r.ok:
            failed += 1
        print(f"{status:<4} {r.name:<{width}}  {r.detail}")
    return 0 if failed == 0 else 2


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=["read", "write"],
        default="read",
        help="read-only checks by default; write is opt-in",
    )
    parser.add_argument(
        "--user-email",
        default=None,
        help="Optional email for active-context checks (required for write mode)",
    )

    args = parser.parse_args(argv)

    _setup_django()

    results: list[CheckResult] = []
    results.append(_check_db_connection())
    results.append(_check_migrations_applied())
    results.append(_check_active_context_read(args.user_email))

    if args.mode == "write":
        if not args.user_email:
            print("--user-email is required for --mode write", file=sys.stderr)
            return 2
        results.append(_check_active_context_write(args.user_email))

    return _print_results(results)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
