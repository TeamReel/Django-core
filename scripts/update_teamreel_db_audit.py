"""Update TeamReel DB audit markdown from live DB counts.

This is a convenience wrapper around the existing management command
`python manage.py audit_production_db`.

It parses the command output and updates:
- documents/05-demo/teamreel-db-audit.md table counts (by db_table)
- Executive summary metrics (models scanned / empty models / total records / fill)
- Last Updated timestamp

Usage (PowerShell):
  $env:DATABASE_URL="postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/<DB>"
  python scripts/update_teamreel_db_audit.py

Safety:
- Read-only. Does not write to the database.
"""

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIT_MD_PATH = REPO_ROOT / "documents" / "05-demo" / "teamreel-db-audit.md"


@dataclass(frozen=True)
class AuditSummary:
    total_models: int
    empty_models: int
    total_records: int
    fill_percent: float


def _run_audit_command() -> str:
    # Use the venv/python on PATH; rely on Django settings in manage.py.
    proc = subprocess.run(
        [sys.executable, str(REPO_ROOT / "manage.py"), "audit_production_db"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "audit_production_db failed")
    return proc.stdout


def _parse_int(s: str) -> int:
    s = s.strip().replace(",", "")
    return int(s)


def parse_audit_output(stdout: str) -> Tuple[Dict[str, int], AuditSummary]:
    """Return (table_name->count, summary)."""

    table_counts: Dict[str, int] = {}

    # Rows look like:
    # activities.Participation                  | activities_participation              |        0 EMPTY
    for line in stdout.splitlines():
        if "|" not in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) != 3:
            continue

        _full_name, table_name, count_and_status = parts
        # Skip header separator rows
        if table_name.lower() == "table" or table_name.startswith("="):
            continue

        match = re.match(r"^(?P<count>[0-9,]+)\s+(?P<status>[A-Z_]+)$", count_and_status)
        if not match:
            continue

        table_counts[table_name] = _parse_int(match.group("count"))

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

    return table_counts, AuditSummary(
        total_models=total_models,
        empty_models=empty_models,
        total_records=total_records,
        fill_percent=fill_percent,
    )


def _replace_summary(md: str, summary: AuditSummary) -> str:
    md = re.sub(
        r"(^- \*\*Total Models Scanned:\*\* )\d+",
        rf"\\1{summary.total_models}",
        md,
        flags=re.MULTILINE,
    )
    md = re.sub(
        r"(^- \*\*Empty Models:\*\* )\d+",
        rf"\\1{summary.empty_models}",
        md,
        flags=re.MULTILINE,
    )
    md = re.sub(
        r"(^- \*\*Total Records:\*\* )[0-9,]+",
        rf"\\1{summary.total_records:,}",
        md,
        flags=re.MULTILINE,
    )
    md = re.sub(
        r"(^- \*\*Database Fill:\*\* )[0-9.]+%",
        rf"\\1{summary.fill_percent:.1f}%",
        md,
        flags=re.MULTILINE,
    )
    return md


def _replace_last_updated(md: str) -> str:
    now = datetime.now(timezone.utc).astimezone()
    stamp = now.strftime("%Y-%m-%d %H:%M")
    return re.sub(
        r"(^\*\*Last Updated:\*\* )\d{4}-\d{2}-\d{2} \d{2}:\d{2}",
        rf"\\1{stamp}",
        md,
        flags=re.MULTILINE,
    )


def _replace_table_counts(md: str, table_counts: Dict[str, int]) -> str:
    """Update markdown table rows by matching the `db_table` column.

    Matches rows like:
      | **activities.Activity** | `activities_activity` | 852 | ✅ READY | ... |

    Only replaces the numeric count column.
    """

    def repl(match: re.Match[str]) -> str:
        table_name = match.group("table")
        if table_name not in table_counts:
            return match.group(0)
        count = table_counts[table_name]
        return f"| {match.group('before')} | `{table_name}` | {count:,} | {match.group('after')}|"

    pattern = re.compile(
        r"^\|\s*(?P<before>\*\*[^|]+\*\*)\s*\|\s*`(?P<table>[^`]+)`\s*\|\s*(?P<count>[0-9,]+)\s*\|\s*(?P<after>.*)\|\s*$",
        flags=re.MULTILINE,
    )
    return pattern.sub(repl, md)


def main() -> int:
    if not AUDIT_MD_PATH.exists():
        print(f"ERROR: Missing audit markdown: {AUDIT_MD_PATH}")
        return 2

    stdout = _run_audit_command()
    table_counts, summary = parse_audit_output(stdout)

    md = AUDIT_MD_PATH.read_text(encoding="utf-8")
    md = _replace_last_updated(md)
    md = _replace_summary(md, summary)
    md = _replace_table_counts(md, table_counts)

    AUDIT_MD_PATH.write_text(md, encoding="utf-8")

    print("Updated:", AUDIT_MD_PATH)
    print(
        f"Summary: models={summary.total_models}, empty={summary.empty_models}, records={summary.total_records:,}, fill={summary.fill_percent:.1f}%"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
