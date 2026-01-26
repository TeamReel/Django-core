"""Generate the TeamReel DB audit markdown from live DB counts.

This is a convenience wrapper around the management command:
    python manage.py audit_production_db

It runs the audit against the database pointed to by DATABASE_URL and
overwrites documents/05-demo/teamreel-db-audit.md with a concise report:
- Executive summary (models/empty/records/fill)
- One table listing every model/table with count + status

Usage (PowerShell):
    $env:DATABASE_URL="postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/<DB>"
    python scripts/update_teamreel_db_audit.py

Safety:
- Read-only: does not write to the database.
- Guardrails prevent overwriting the report when the audit output looks unhealthy.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIT_MD_PATH = REPO_ROOT / "documents" / "05-demo" / "teamreel-db-audit.md"


@dataclass(frozen=True)
class AuditSummary:
    total_models: int
    empty_models: int
    total_records: int
    fill_percent: float


@dataclass(frozen=True)
class AuditRow:
    full_name: str
    table_name: str
    count: Optional[int]
    status: str


def _run_audit_command() -> str:
    # Use the venv/python on PATH; rely on Django settings in manage.py.
    # IMPORTANT: some shells set DJANGO_SETTINGS_MODULE=config.settings.test,
    # which forces an in-memory DB (":memory:") and makes this audit useless.
    # For the production audit, we explicitly force local settings.
    env = dict(os.environ)
    env["DJANGO_SETTINGS_MODULE"] = "config.settings.local"
    proc = subprocess.run(
        [sys.executable, str(REPO_ROOT / "manage.py"), "audit_production_db"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "audit_production_db failed")
    return proc.stdout


def _count_error_rows(stdout: str) -> int:
    # Rows look like:
    #   activities.Activity                         | activities_activity                    |    ERROR
    error_re = re.compile(r"\|\s*ERROR\s*$")
    return sum(1 for line in stdout.splitlines() if error_re.search(line))


def _parse_int(s: str) -> int:
    s = s.strip().replace(",", "")
    return int(s)


def parse_audit_output(stdout: str) -> Tuple[List[AuditRow], AuditSummary]:
    """Return (rows, summary) from `audit_production_db` output."""

    rows: List[AuditRow] = []

    # Rows look like:
    #   activities.Participation                  | activities_participation              |        0 EMPTY
    #   accounts.User                             | accounts_user                         |    2,765 OK
    # Or error rows:
    #   accounts.User                             | accounts_user                         |    ERROR
    for line in stdout.splitlines():
        if "|" not in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) != 3:
            continue

        full_name, table_name, count_and_status = parts
        # Skip header/separator rows
        if full_name.lower() == "model" or table_name.lower() == "table":
            continue
        if full_name.startswith("=") or table_name.startswith("="):
            continue
        if not full_name or not table_name:
            continue

        if count_and_status == "ERROR":
            rows.append(AuditRow(full_name=full_name, table_name=table_name, count=None, status="ERROR"))
            continue

        match = re.match(r"^(?P<count>[0-9,]+)\s+(?P<status>[A-Z_]+)$", count_and_status)
        if not match:
            continue

        rows.append(
            AuditRow(
                full_name=full_name,
                table_name=table_name,
                count=_parse_int(match.group("count")),
                status=match.group("status"),
            )
        )

    # Summary lines:
    #    Total Models: 41
    #    Empty Models: 25
    #    Total Records: 14,927
    #    Database Fill: 39.0%
    total_models: Optional[int] = None
    empty_models: Optional[int] = None
    total_records: Optional[int] = None
    fill_percent: Optional[float] = None

    for line in stdout.splitlines():
        line = line.strip()
        if line.startswith("Total Models:"):
            total_models = _parse_int(line.split(":", 1)[1])
        elif line.startswith("Empty Models:"):
            empty_models = _parse_int(line.split(":", 1)[1])
        elif line.startswith("Total Records:"):
            total_records = _parse_int(line.split(":", 1)[1])
        elif line.startswith("Database Fill:"):
            raw = line.split(":", 1)[1].strip().rstrip("%")
            fill_percent = float(raw)

    if total_models is None or empty_models is None or total_records is None or fill_percent is None:
        raise RuntimeError("Failed to parse audit summary from output")

    rows.sort(key=lambda r: r.full_name)

    return rows, AuditSummary(
        total_models=total_models,
        empty_models=empty_models,
        total_records=total_records,
        fill_percent=fill_percent,
    )


def _status_label(status: str) -> str:
    status = status.strip().upper()
    if status == "OK":
        return "🟢 OK"
    if status == "THIN":
        return "🟡 THIN"
    if status == "EMPTY":
        return "🔴 EMPTY"
    if status == "ERROR":
        return "⚫ ERROR"
    return f"⚪ {status}" if status else "⚪ UNKNOWN"


def render_markdown(now: datetime, summary: AuditSummary, rows: List[AuditRow]) -> str:
    stamp = now.strftime("%Y-%m-%d %H:%M")

    md_lines: List[str] = []
    md_lines.append("# TeamReel Database Audit (Production)")
    md_lines.append("")
    md_lines.append(f"**Last Updated:** {stamp}")
    md_lines.append("**Environment:** Railway PostgreSQL Production")
    md_lines.append("**Generated By:** `python scripts/update_teamreel_db_audit.py` (wraps `python manage.py audit_production_db`)")
    md_lines.append("**Purpose:** Concise overview of all tables and whether they are populated")
    md_lines.append("")
    md_lines.append("> This file is auto-generated. Do not edit manually.")
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")
    md_lines.append("## Regenerate")
    md_lines.append("")
    md_lines.append("```powershell")
    md_lines.append("# DATABASE_URL must point to Railway Postgres")
    md_lines.append("$env:DATABASE_URL=\"postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway\"")
    md_lines.append("python scripts/update_teamreel_db_audit.py")
    md_lines.append("```")
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")
    md_lines.append("## Executive Summary")
    md_lines.append("")
    md_lines.append(f"- **Total Models Scanned:** {summary.total_models}")
    md_lines.append(f"- **Empty Models:** {summary.empty_models}")
    md_lines.append(f"- **Total Records:** {summary.total_records:,}")
    md_lines.append(f"- **Database Fill:** {summary.fill_percent:.1f}%")
    md_lines.append("")
    md_lines.append("Status legend: 🟢 OK (>=10), 🟡 THIN (<10), 🔴 EMPTY (0)")
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")
    md_lines.append("## Table Overview")
    md_lines.append("")
    md_lines.append("| Model | db_table | Count | Status |")
    md_lines.append("| :--- | :--- | ---: | :--- |")

    for row in rows:
        count_str = "ERROR" if row.count is None else f"{row.count:,}"
        md_lines.append(
            f"| {row.full_name} | `{row.table_name}` | {count_str} | {_status_label(row.status)} |"
        )

    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")
    md_lines.append("## Webapp Visibility")
    md_lines.append("")
    md_lines.append("For a current “is it visible in the demo UI?” mapping, see:")
    md_lines.append("- [TeamReel Frontend Integration Audit](teamreel-frontend-integration-audit.md)")
    md_lines.append("")

    return "\n".join(md_lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Update TeamReel DB audit markdown from live DB counts")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Update the markdown even if the audit output looks unhealthy (NOT recommended).",
    )
    args = parser.parse_args()

    if not AUDIT_MD_PATH.exists():
        print(f"ERROR: Missing audit markdown: {AUDIT_MD_PATH}")
        return 2

    if not os.environ.get("DATABASE_URL") and not args.force:
        print("ERROR: DATABASE_URL is not set. Refusing to run against an unknown database.")
        print("Set DATABASE_URL to the Railway Postgres connection string and re-run.")
        print("Tip: use --force only if you know exactly what you're doing.")
        return 3

    stdout = _run_audit_command()

    error_rows = _count_error_rows(stdout)
    if error_rows and not args.force:
        print(f"ERROR: Audit output contains {error_rows} ERROR rows (likely missing tables / wrong DB).")
        print("Refusing to overwrite the audit markdown.")
        print("Fix your DATABASE_URL (and ensure migrations exist on that DB), then re-run.")
        print("Tip: use --force only if you know exactly what you're doing.")
        return 4

    rows, summary = parse_audit_output(stdout)

    # Guardrails: if we couldn't parse most table counts, we likely ran against the wrong DB.
    min_expected_rows = max(10, int(summary.total_models * 0.7))
    if len(rows) < min_expected_rows and not args.force:
        print(
            "ERROR: Parsed too few rows from audit output "
            f"({len(rows)}/{summary.total_models}). Refusing to overwrite the audit markdown."
        )
        print("This usually means the audit printed ERROR rows (missing tables) or output format changed.")
        print("Fix the DB connection and re-run, or use --force to override.")
        return 5

    if summary.total_records == 0 and not args.force:
        print("ERROR: Audit summary reports 0 total records. Refusing to overwrite the audit markdown.")
        print("This usually means the command ran against the wrong DB or missing tables.")
        print("Fix the DB connection and re-run, or use --force to override.")
        return 6

    now = datetime.now(timezone.utc).astimezone()
    md = render_markdown(now=now, summary=summary, rows=rows)
    AUDIT_MD_PATH.write_text(md, encoding="utf-8")

    print("Updated:", AUDIT_MD_PATH)
    print(
        f"Summary: models={summary.total_models}, empty={summary.empty_models}, records={summary.total_records:,}, fill={summary.fill_percent:.1f}%"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
