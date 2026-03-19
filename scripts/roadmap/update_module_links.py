"""Update roadmap module links across docs.

Markdown links that reference module filenames with numeric prefixes (e.g. 039-B30-...)
will break when modules are renumbered. This script rewrites references by resolving
module filenames from their stable module code (e.g. B30, F13, D06).

Usage:
  python scripts/roadmap/update_module_links.py --dry-run
  python scripts/roadmap/update_module_links.py --write

Defaults assume this repository layout:
  documents/02-roadmap/modules/backlog
  documents/02-roadmap/modules/active
  documents/02-roadmap/modules/done
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


MODULE_FILENAME_RE = re.compile(r"^(?P<num>\d{3})-(?P<code>[A-Z]\d{2,3})-(?P<rest>.+)$")

# Matches links or inline code that contain a roadmap module filename.
# Examples:
#   ../modules/planned/039-B30-generic-activities.md
#   modules/done/030-F09-frontend-backend-integration-guides.md
#   `040-B31-content-templates-and-generation.md`
MODULE_REF_RE = re.compile(
    r"(?P<prefix>(?:\.{2}/)*modules/(?P<section>backlog|active|done)/)"
    r"(?P<num>\d{3})-(?P<code>[A-Z]\d{2,3})-[^\s\)\]`]+(?:\.md|/index\.md)"
)

INLINE_FILENAME_RE = re.compile(r"`(?P<num>\d{3})-(?P<code>[A-Z]\d{2,3})-[^`]+\.md`")


def read_text_with_encoding(path: Path) -> tuple[str, str] | None:
    """Read a text file using a small set of common encodings.

    Returns (content, encoding) on success, or None if decoding fails.
    """

    for encoding in ("utf-8", "utf-8-sig", "utf-16", "cp1252"):
        try:
            return path.read_text(encoding=encoding), encoding
        except UnicodeDecodeError:
            continue
        except OSError:
            return None
    return None


def build_index(modules_dir: Path) -> dict[str, str]:
    index: dict[str, str] = {}
    if not modules_dir.exists():
        return index

    for path in sorted(modules_dir.iterdir()):
        if not path.is_dir():
            continue
        match = MODULE_FILENAME_RE.match(path.name)
        if not match:
            continue
        code = match.group("code")
        index[code] = path.name

    return index


def rewrite_content(content: str, backlog_index: dict[str, str], active_index: dict[str, str], done_index: dict[str, str]) -> str:
    def replace_ref(match: re.Match[str]) -> str:
        prefix = match.group("prefix")
        section = match.group("section")
        code = match.group("code")

        if section == "backlog":
            filename = backlog_index.get(code)
        elif section == "active":
            filename = active_index.get(code)
        else:
            filename = done_index.get(code)

        if not filename:
            return match.group(0)

        return f"{prefix}{filename}/index.md"

    updated = MODULE_REF_RE.sub(replace_ref, content)

    # Also update inline backticked filenames when we can infer the destination.
    # We default to backlog if a code exists there; otherwise active, then done.
    def replace_inline(match: re.Match[str]) -> str:
        code = match.group("code")
        filename = backlog_index.get(code) or active_index.get(code) or done_index.get(code)
        if not filename:
            return match.group(0)
        return f"`{filename}/index.md`"

    updated = INLINE_FILENAME_RE.sub(replace_inline, updated)
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Rewrite docs to current roadmap module filenames")
    parser.add_argument(
        "--docs-root",
        type=Path,
        default=Path("documents"),
        help="Docs root (default: documents)",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="Write changes to files")
    mode.add_argument("--dry-run", action="store_true", help="Show what would change (default)")
    args = parser.parse_args()

    docs_root: Path = args.docs_root
    planned_dir = docs_root / "02-roadmap" / "modules" / "backlog"
    active_dir = docs_root / "02-roadmap" / "modules" / "active"
    done_dir = docs_root / "02-roadmap" / "modules" / "done"

    planned_index = build_index(planned_dir)
    active_index = build_index(active_dir)
    done_index = build_index(done_dir)

    if not planned_index and not done_index:
        print(f"No modules found under {planned_dir} or {done_dir}.")
        return 2

    should_write = args.write
    changed_files: list[Path] = []
    changed_files_encodings: dict[Path, str] = {}

    for md_file in sorted(docs_root.rglob("*.md")):
        # Skip archived copies to avoid churn.
        if "archive" in {p.lower() for p in md_file.parts}:
            continue

        read_result = read_text_with_encoding(md_file)
        if read_result is None:
            print(f"Skipping (unable to decode): {md_file.as_posix()}")
            continue

        original, encoding_used = read_result
        updated = rewrite_content(original, planned_index, active_index, done_index)

        if updated != original:
            changed_files.append(md_file)
            if should_write:
                md_file.write_text(updated, encoding=encoding_used)
            changed_files_encodings[md_file] = encoding_used

    if not changed_files:
        print("No changes needed.")
        return 0

    if should_write:
        print(f"Updated {len(changed_files)} file(s).")
    else:
        print(f"Would update {len(changed_files)} file(s). Re-run with --write to apply.")

    # Print a small sample for visibility.
    for path in changed_files[:25]:
        print(f"- {path.as_posix()}")
    if len(changed_files) > 25:
        print(f"... (+{len(changed_files) - 25} more)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
