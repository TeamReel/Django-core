"""
I3 — Replace hardcoded inline borderRadius in TSX/TS with token references.

Mapping:
  2, 3, 4, '2px', '3px', '4px'  → 'var(--radius-sm)'
  6, 8, '6px', '8px'             → 'var(--radius-md)'
  10, 12, '10px', '12px'         → 'var(--radius-lg)'
  16, '16px'                     → 'var(--radius-lg)'
  999, 1000, 9999, '999px'       → 'var(--radius-full)'
  '50%'                          → keep as-is (circle)
  compound '8px 8px 0 0'         → 'var(--radius-md) var(--radius-md) 0 0'

Skips _archive, already-tokenized values (var(--radius-*)), and Avatar.tsx (done).
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"

# ── Simple value mapping ──
NUM_MAP = {
    2: "var(--radius-sm)",
    3: "var(--radius-sm)",
    4: "var(--radius-sm)",
    6: "var(--radius-md)",
    8: "var(--radius-md)",
    10: "var(--radius-lg)",
    12: "var(--radius-lg)",
    16: "var(--radius-lg)",
    999: "var(--radius-full)",
    1000: "var(--radius-full)",
    9999: "var(--radius-full)",
}

PX_MAP = {
    "2px": "var(--radius-sm)",
    "3px": "var(--radius-sm)",
    "4px": "var(--radius-sm)",
    "6px": "var(--radius-md)",
    "8px": "var(--radius-md)",
    "10px": "var(--radius-lg)",
    "12px": "var(--radius-lg)",
    "16px": "var(--radius-lg)",
    "999px": "var(--radius-full)",
    "1000px": "var(--radius-full)",
}

SKIP_DIRS = {"_archive", "node_modules"}
changes_log = []


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def replace_compound(val: str) -> str:
    """Replace compound borderRadius values like '8px 8px 0 0'."""
    parts = val.split()
    new_parts = []
    for p in parts:
        if p in PX_MAP:
            new_parts.append(PX_MAP[p])
        elif p in ("0", "0px"):
            new_parts.append("0")
        else:
            return val  # can't map, leave as-is
    return " ".join(new_parts)


def process_line(line: str, file_path: Path, line_num: int) -> str:
    """Process a single line for borderRadius replacements."""
    if "borderRadius" not in line:
        return line
    if "var(--radius" in line:
        return line  # already tokenized

    original = line

    # Pattern 1: borderRadius: <number> (no quotes, bare integer)
    def replace_bare_num(m):
        num = int(m.group(1))
        if num in NUM_MAP:
            return f"borderRadius: '{NUM_MAP[num]}'"
        return m.group(0)

    line = re.sub(r"borderRadius:\s*(\d+)(?=[,\s\}])", replace_bare_num, line)

    # Pattern 2: borderRadius: '<value>px' (single-quoted string with px)
    def replace_sq_px(m):
        val = m.group(1)
        if val in PX_MAP:
            return f"borderRadius: '{PX_MAP[val]}'"
        # Try compound
        new_val = replace_compound(val)
        if new_val != val:
            return f"borderRadius: '{new_val}'"
        return m.group(0)

    line = re.sub(r"borderRadius:\s*'([^']+)'", replace_sq_px, line)

    # Pattern 3: borderRadius: "<value>px" (double-quoted string)
    def replace_dq_px(m):
        val = m.group(1)
        if val in PX_MAP:
            return f'borderRadius: "{PX_MAP[val]}"'
        new_val = replace_compound(val)
        if new_val != val:
            return f'borderRadius: "{new_val}"'
        return m.group(0)

    line = re.sub(r'borderRadius:\s*"([^"]+)"', replace_dq_px, line)

    if line != original:
        rel = file_path.relative_to(DEMO_SRC)
        changes_log.append(f"  {rel}:{line_num}")

    return line


def process_file(path: Path) -> int:
    if should_skip(path):
        return 0
    text = path.read_text(encoding="utf-8")
    if "borderRadius" not in text:
        return 0

    lines = text.split("\n")
    count = 0
    new_lines = []
    for i, line in enumerate(lines, 1):
        new_line = process_line(line, path, i)
        if new_line != line:
            count += 1
        new_lines.append(new_line)

    if count > 0:
        path.write_text("\n".join(new_lines), encoding="utf-8")
    return count


def main():
    files = sorted(
        f for f in DEMO_SRC.rglob("*.ts*")
        if f.suffix in (".ts", ".tsx")
    )
    total = 0
    file_count = 0
    for f in files:
        n = process_file(f)
        if n > 0:
            total += n
            file_count += 1

    print(f"\n✅ I3 Complete: {total} borderRadius values replaced in {file_count} files\n")
    if changes_log:
        print("Changes:")
        for c in changes_log:
            print(c)


if __name__ == "__main__":
    main()
