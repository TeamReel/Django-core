"""
I7 — Replace hardcoded inline zIndex and boxShadow in TSX/TS with tokens.

zIndex mapping:
  1000  → 'var(--z-modal)'
  1100  → 'var(--z-toast)'
  9000  → 'var(--z-max)'
  9999  → 'var(--z-max)'

boxShadow mapping (approximate by shadow size):
  0 2px ... → 'var(--shadow-xs)' / 'var(--shadow-sm)'
  0 4px ... → 'var(--shadow-md)'
  0 8-10px ... → 'var(--shadow-lg)'
  0 20px ... → 'var(--shadow-xl)'
  'none' → keep
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"

ZINDEX_MAP = {
    1000: "var(--z-modal)",
    1100: "var(--z-toast)",
    9000: "var(--z-max)",
    9999: "var(--z-max)",
}

# Shadow matching by blur radius (the 3rd value in box-shadow)
# We classify by the blur size
SHADOW_PATTERNS = [
    # (pattern, token) - ordered from specific to general
    (r"0\s+1px\s+2px", "var(--shadow-xs)"),
    (r"0\s+2px\s+4px", "var(--shadow-xs)"),
    (r"0\s+2px\s+8px", "var(--shadow-sm)"),
    (r"0\s+4px\s+6px", "var(--shadow-md)"),
    (r"0\s+4px\s+12px", "var(--shadow-md)"),
    (r"0\s+4px\s+16px", "var(--shadow-md)"),
    (r"0\s+8px\s+32px", "var(--shadow-lg)"),
    (r"0\s+10px\s+15px", "var(--shadow-lg)"),
    (r"0\s+10px\s+25px", "var(--shadow-lg)"),
    (r"0\s+20px\s+25px", "var(--shadow-xl)"),
    (r"0\s+20px\s+60px", "var(--shadow-xl)"),
]

SKIP_DIRS = {"_archive", "node_modules"}
changes_log = []


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def map_shadow(val: str) -> str | None:
    """Map a boxShadow string value to a token."""
    if val == "none":
        return None  # keep as-is
    if "var(--shadow" in val:
        return None  # already tokenized
    # Skip shadows with negative offsets (special cases)
    if val.startswith("0 -"):
        return None

    for pattern, token in SHADOW_PATTERNS:
        if re.search(pattern, val):
            return token
    return None


def process_line(line: str, file_path: Path, line_num: int) -> str:
    original = line

    # zIndex: <number>
    if "zIndex:" in line and "var(--z-" not in line:
        def replace_z(m):
            num = int(m.group(1))
            if num in ZINDEX_MAP:
                return f"zIndex: '{ZINDEX_MAP[num]}'"
            return m.group(0)
        line = re.sub(r"zIndex:\s*(\d+)", replace_z, line)

    # boxShadow: '<value>'
    if "boxShadow:" in line and "var(--shadow" not in line:
        def replace_shadow(m):
            quote = m.group(1)
            val = m.group(2)
            token = map_shadow(val)
            if token:
                return f"boxShadow: {quote}{token}{quote}"
            return m.group(0)
        line = re.sub(r"boxShadow:\s*(['\"])([^'\"]+)\1", replace_shadow, line)

    if line != original:
        rel = file_path.relative_to(DEMO_SRC)
        changes_log.append(f"  {rel}:{line_num}")

    return line


def process_file(path: Path) -> int:
    if should_skip(path):
        return 0
    text = path.read_text(encoding="utf-8")
    if "zIndex" not in text and "boxShadow" not in text:
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

    print(f"\n✅ I7 Complete: {total} shadow/zIndex values replaced in {file_count} files\n")
    if changes_log:
        print("Changes:")
        for c in changes_log:
            print(c)


if __name__ == "__main__":
    main()
