"""
I5 — Replace hardcoded inline padding/margin/gap in TSX/TS with spacing tokens.

Token scale: 0=0, 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64

Single values:
  0       → leave (0 is 0)
  2, 3, 4 → 'var(--space-1)'  (4px)
  6, 8    → 'var(--space-2)'  (8px)
  10, 12  → 'var(--space-3)'  (12px)
  14, 16  → 'var(--space-4)'  (16px)
  20      → 'var(--space-5)'  (20px)
  24      → 'var(--space-6)'  (24px)
  32      → 'var(--space-8)'  (32px)
  48      → 'var(--space-12)' (48px)

Compound values like '12px 16px' → 'var(--space-3) var(--space-4)'
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"

PX_TO_TOKEN = {
    0: "0",
    2: "var(--space-1)",
    3: "var(--space-1)",
    4: "var(--space-1)",
    5: "var(--space-1)",
    6: "var(--space-2)",
    8: "var(--space-2)",
    10: "var(--space-3)",
    12: "var(--space-3)",
    14: "var(--space-4)",
    16: "var(--space-4)",
    20: "var(--space-5)",
    24: "var(--space-6)",
    32: "var(--space-8)",
    40: "var(--space-10)",
    48: "var(--space-12)",
    64: "var(--space-16)",
}

SPACING_PROPS = r"(?:padding|margin|gap|paddingTop|paddingBottom|paddingLeft|paddingRight|marginTop|marginBottom|marginLeft|marginRight|paddingBlock|paddingInline|marginBlock|marginInline)"

SKIP_DIRS = {"_archive", "node_modules"}
changes_log = []


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def map_single_value(val_str: str) -> str | None:
    """Map a single px value like '12' or '12px' to a token."""
    val_str = val_str.strip()
    if val_str.endswith("px"):
        val_str = val_str[:-2]
    try:
        num = int(val_str)
    except ValueError:
        return None
    return PX_TO_TOKEN.get(num)


def map_compound_value(val: str) -> str | None:
    """Map compound values like '12px 16px' to tokens."""
    parts = val.strip().split()
    mapped = []
    for p in parts:
        token = map_single_value(p)
        if token is None:
            return None  # can't map one part, abort
        mapped.append(token)
    return " ".join(mapped)


def process_line(line: str, file_path: Path, line_num: int) -> str:
    if "var(--space-" in line:
        return line  # already tokenized

    original = line

    # Pattern 1: prop: <bare number>  (e.g., padding: 12)
    def replace_bare(m):
        prop = m.group(1)
        num = int(m.group(2))
        if num == 0:
            return m.group(0)  # leave 0 as 0
        if num in PX_TO_TOKEN:
            return f"{prop}: '{PX_TO_TOKEN[num]}'"
        return m.group(0)

    line = re.sub(
        rf"({SPACING_PROPS}):\s*(\d+)(?=[,\s\}}])",
        replace_bare,
        line,
    )

    # Pattern 2: prop: '<value>px' or prop: '<compound>'  (string)
    def replace_str(m):
        prop = m.group(1)
        quote = m.group(2)
        val = m.group(3)

        # Skip if already has var()
        if "var(" in val:
            return m.group(0)

        # Single value
        if re.match(r"^\d+px$", val):
            token = map_single_value(val)
            if token and token != "0":
                return f"{prop}: {quote}{token}{quote}"
        # Compound value
        elif re.match(r"^[\d\s]+px(\s+\d+px)*$", val) or re.match(r"^\d+px\s+\d+px(\s+\d+px)*$", val):
            mapped = map_compound_value(val)
            if mapped:
                return f"{prop}: {quote}{mapped}{quote}"

        return m.group(0)

    line = re.sub(
        rf"({SPACING_PROPS}):\s*(['\"])([^'\"]+)\2",
        replace_str,
        line,
    )

    if line != original:
        rel = file_path.relative_to(DEMO_SRC)
        changes_log.append(f"  {rel}:{line_num}")

    return line


def process_file(path: Path) -> int:
    if should_skip(path):
        return 0
    text = path.read_text(encoding="utf-8")
    if not any(kw in text for kw in ["padding", "margin", "gap"]):
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
    files = sorted(f for f in DEMO_SRC.rglob("*.ts*") if f.suffix in (".ts", ".tsx"))
    total = 0
    file_count = 0
    for f in files:
        n = process_file(f)
        if n > 0:
            total += n
            file_count += 1

    print(f"\n✅ I5 Complete: {total} spacing values replaced in {file_count} files\n")
    if changes_log:
        print("Changes:")
        for c in changes_log:
            print(c)


if __name__ == "__main__":
    main()
