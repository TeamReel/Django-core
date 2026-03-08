"""
D2 — Add role="button" and tabIndex={0} to clickable div/span elements.

Finds <div onClick=... or <span onClick=... without role="button",
and adds role="button" tabIndex={0}.
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"
SKIP_DIRS = {"_archive", "node_modules"}

changes_log = []


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def process_line(line: str, file_path: Path, line_num: int) -> str:
    """Add role='button' tabIndex={0} to clickable div/span missing role."""
    original = line

    # Match <div or <span with onClick but without role=
    # Pattern: <div ... onClick ... > where no role= exists
    pattern = r'(<(?:div|span)\s)([^>]*onClick[^>]*)(>)'

    def add_a11y(m):
        tag_open = m.group(1)
        attrs = m.group(2)
        tag_close = m.group(3)

        # Skip if already has role=
        if 'role=' in attrs:
            return m.group(0)

        # Skip if it's a self-closing tag
        if attrs.rstrip().endswith('/'):
            return m.group(0)

        # Add role and tabIndex
        new_attrs = attrs.rstrip()
        if 'tabIndex' not in new_attrs:
            new_attrs += ' role="button" tabIndex={0}'
        else:
            new_attrs += ' role="button"'

        return f"{tag_open}{new_attrs}{tag_close}"

    line = re.sub(pattern, add_a11y, line)

    if line != original:
        rel = file_path.relative_to(DEMO_SRC)
        changes_log.append(f"  {rel}:{line_num}")

    return line


def process_file(path: Path) -> int:
    if should_skip(path):
        return 0
    text = path.read_text(encoding="utf-8")
    if "onClick" not in text:
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
    files = sorted(f for f in DEMO_SRC.rglob("*.tsx") if f.suffix == ".tsx")
    total = 0
    file_count = 0
    for f in files:
        n = process_file(f)
        if n > 0:
            total += n
            file_count += 1

    print(f"\n✅ D2a Complete: {total} clickable div/span fixed in {file_count} files\n")
    if changes_log:
        print("Changes:")
        for c in changes_log:
            print(c)


if __name__ == "__main__":
    main()
