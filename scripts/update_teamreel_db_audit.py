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
        check=False,
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
    def replace_in_executive_summary(section_md: str) -> str:
        section_md = re.sub(
            r"(^- \*\*Total Models Scanned:\*\* )\d+",
            rf"\g<1>{summary.total_models}",
            section_md,
            flags=re.MULTILINE,
        )
        section_md = re.sub(
            r"(^- \*\*Empty Models:\*\* )\d+",
            rf"\g<1>{summary.empty_models}",
            section_md,
            flags=re.MULTILINE,
        )
        section_md = re.sub(
            r"(^- \*\*Total Records:\*\* )[0-9,]+",
            rf"\g<1>{summary.total_records:,}",
            section_md,
            flags=re.MULTILINE,
        )
        section_md = re.sub(
            r"(^- \*\*Database Fill:\*\* )[0-9.]+%",
            rf"\g<1>{summary.fill_percent:.1f}%",
            section_md,
            flags=re.MULTILINE,
        )

        non_empty = summary.total_models - summary.empty_models
        section_md = re.sub(
            r"\(\d+/\d+ = [0-9.]+%\)",
            f"({non_empty}/{summary.total_models} = {summary.fill_percent:.1f}%)",
            section_md,
        )
        return section_md

    return _replace_in_section(md, "Executive Summary", replace_in_executive_summary)


def _replace_last_updated(md: str) -> str:
    now = datetime.now(timezone.utc).astimezone()
    stamp = now.strftime("%Y-%m-%d %H:%M")
    return re.sub(
        r"(^\*\*Last Updated:\*\* )\d{4}-\d{2}-\d{2} \d{2}:\d{2}",
        rf"\g<1>{stamp}",
        md,
        flags=re.MULTILINE,
    )


def _replace_in_section(md: str, heading_text: str, replacer) -> str:
    """Apply a replacer function to a markdown section only.

    Section is defined as:
      "## ...{heading_text}..." up to the next "## " heading or EOF.
    """

    heading_re = re.compile(rf"^##\s+.*{re.escape(heading_text)}.*$", flags=re.MULTILINE)
    match = heading_re.search(md)
    if not match:
        return md

    start = match.start()
    next_heading = re.compile(r"^##\s+", flags=re.MULTILINE)
    next_match = next_heading.search(md, match.end())
    end = next_match.start() if next_match else len(md)

    before = md[:start]
    section = md[start:end]
    after = md[end:]
    return before + replacer(section) + after


def _replace_scanned_models_line(md: str, total_models: int) -> str:
    return re.sub(
        r"(^- ✅ Scans all )\d+( Django models)$",
        rf"\g<1>{total_models}\g<2>",
        md,
        flags=re.MULTILINE,
    )


def _replace_seeding_progress(md: str, table_counts: Dict[str, int]) -> str:
    # Keep this narrowly targeted to the numbered list under "Completed Levels".
    # We match by the db_table names already present in the markdown.

    def repl_single(table: str, line_re: str) -> None:
        nonlocal md
        if table not in table_counts:
            return
        md = re.sub(
            line_re,
            rf"\g<1>{table_counts[table]:,}\g<2>",
            md,
            flags=re.MULTILINE,
        )

    repl_single(
        "accounts_user",
        r"^(1\. \*\*Users\*\* - )[0-9,]+( \(`accounts_user`\))$",
    )
    repl_single(
        "organisations_organisation",
        r"^(2\. \*\*Organisations\*\* - )[0-9,]+( \(`organisations_organisation`\).*)$",
    )
    repl_single(
        "projects_project",
        r"^(3\. \*\*Projects \(Clubs/Teams\)\*\* - )[0-9,]+( \(`projects_project`\))$",
    )
    repl_single(
        "activities_period",
        r"^(4\. \*\*Periods \(Seasons/Competitions\)\*\* - )[0-9,]+( \(`activities_period`\))$",
    )
    repl_single(
        "activities_activity",
        r"^(5\. \*\*Activities \(Matches/Events\)\*\* - )[0-9,]+( \(`activities_activity`\))$",
    )
    repl_single(
        "projects_membership",
        r"^(6\. \*\*Project Memberships \(Players/Staff\)\*\* - )[0-9,]+( \(`projects_membership`\))$",
    )

    if "permissions_role" in table_counts and "permissions_roleassignment" in table_counts:
        md = re.sub(
            r"^(7\. \*\*RBAC Roles/Assignments\*\* - )\d+( roles, )\d+( assignments \(`permissions_role`, `permissions_roleassignment`\))$",
            rf"\g<1>{table_counts['permissions_role']:,}\g<2>{table_counts['permissions_roleassignment']:,}\g<3>",
            md,
            flags=re.MULTILINE,
        )

    return md


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
    md = _replace_scanned_models_line(md, summary.total_models)
    md = _replace_table_counts(md, table_counts)
    md = _replace_seeding_progress(md, table_counts)

    AUDIT_MD_PATH.write_text(md, encoding="utf-8")

    print("Updated:", AUDIT_MD_PATH)
    print(
        f"Summary: models={summary.total_models}, empty={summary.empty_models}, records={summary.total_records:,}, fill={summary.fill_percent:.1f}%"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
