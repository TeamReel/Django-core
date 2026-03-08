"""
I4 — Replace hardcoded inline fontSize / fontWeight in TSX/TS with token references.

fontSize mapping (px → token):
  12      → 'var(--text-xs)'
  13, 14  → 'var(--text-sm)'
  15, 16  → 'var(--text-base)'
  18, 20  → 'var(--text-lg)'
  24      → 'var(--text-xl)'
  28+ (display sizes) → leave as-is

fontWeight mapping:
  500 → 'var(--font-medium)'
  600 → 'var(--font-semibold)'
  700 → 'var(--font-bold)'
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"

FONT_SIZE_MAP = {
    11: "var(--text-xs)",
    12: "var(--text-xs)",
    13: "var(--text-sm)",
    14: "var(--text-sm)",
    15: "var(--text-base)",
    16: "var(--text-base)",
    18: "var(--text-lg)",
    20: "var(--text-lg)",
    24: "var(--text-xl)",
}

FONT_WEIGHT_MAP = {
    500: "var(--font-medium)",
    600: "var(--font-semibold)",
    700: "var(--font-bold)",
}

SKIP_DIRS = {"_archive", "node_modules"}
changes_log = []


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def process_line(line: str, file_path: Path, line_num: int) -> str:
    original = line

    # Skip already-tokenized
    if "var(--text-" in line or "var(--font-" in line:
        # Still process other parts of the line that aren't tokenized
        pass

    # fontSize: <number>  (bare int)
    def replace_fs_num(m):
        num = int(m.group(1))
        if num in FONT_SIZE_MAP:
            return f"fontSize: '{FONT_SIZE_MAP[num]}'"
        return m.group(0)

    line = re.sub(r"fontSize:\s*(\d+)(?=[,\s\}])", replace_fs_num, line)

    # fontSize: '<number>px'  (string)
    def replace_fs_str(m):
        quote = m.group(1)
        num = int(m.group(2))
        if num in FONT_SIZE_MAP:
            return f"fontSize: {quote}{FONT_SIZE_MAP[num]}{quote}"
        return m.group(0)

    line = re.sub(r"fontSize:\s*(['\"])(\d+)px\1", replace_fs_str, line)

    # fontWeight: <number>  (bare int)
    def replace_fw_num(m):
        num = int(m.group(1))
        if num in FONT_WEIGHT_MAP:
            return f"fontWeight: '{FONT_WEIGHT_MAP[num]}'"
        return m.group(0)

    # Don't replace fontWeight that's already a string-token
    if "fontWeight:" in line and "var(--font-" not in line.split("fontWeight:")[1].split(",")[0]:
        line = re.sub(r"fontWeight:\s*(\d+)(?=[,\s\}])", replace_fw_num, line)

    # fontWeight: '<number>'  (string number)
    def replace_fw_str(m):
        quote = m.group(1)
        num = int(m.group(2))
        if num in FONT_WEIGHT_MAP:
            return f"fontWeight: {quote}{FONT_WEIGHT_MAP[num]}{quote}"
        return m.group(0)

    line = re.sub(r"fontWeight:\s*(['\"])(\d+)\1", replace_fw_str, line)

    if line != original:
        rel = file_path.relative_to(DEMO_SRC)
        changes_log.append(f"  {rel}:{line_num}")

    return line


def process_file(path: Path) -> int:
    if should_skip(path):
        return 0
    text = path.read_text(encoding="utf-8")
    if "fontSize" not in text and "fontWeight" not in text:
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

    print(f"\n✅ I4 Complete: {total} typography values replaced in {file_count} files\n")
    if changes_log:
        print("Changes:")
        for c in changes_log:
            print(c)


if __name__ == "__main__":
    main()
