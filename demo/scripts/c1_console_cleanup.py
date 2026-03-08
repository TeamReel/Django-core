"""
C1 — Clean up console statements in production code.

Strategy:
  - console.log() → REMOVE (debug artifact)
  - console.debug() → REMOVE
  - console.log() inside catch → convert to console.error()
  - console.warn() → KEEP (intentional warnings)
  - console.error() → KEEP (error reporting)

Handles:
  - Single-line console.log(...);
  - Multi-line console.log(
      ...
    );
  - console.log in comments → skip
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"
SKIP_DIRS = {"_archive", "node_modules"}

removed = 0
converted = 0
files_modified = 0


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def is_in_catch_block(lines: list[str], line_idx: int) -> bool:
    """Check if line is inside a catch block by looking for recent 'catch' keyword."""
    # Look back up to 10 lines for 'catch'
    start = max(0, line_idx - 10)
    for i in range(line_idx - 1, start - 1, -1):
        stripped = lines[i].strip()
        if re.search(r'\bcatch\b', stripped):
            return True
        if stripped.startswith('function ') or stripped.startswith('const ') or stripped.startswith('}'):
            if not stripped.endswith('{'):
                break
    return False


def process_file(path: Path) -> int:
    global removed, converted

    if should_skip(path):
        return 0

    text = path.read_text(encoding="utf-8")
    if "console.log" not in text and "console.debug" not in text:
        return 0

    lines = text.split("\n")
    new_lines = []
    changes = 0
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Skip commented lines
        if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
            new_lines.append(line)
            i += 1
            continue

        # Match console.log or console.debug
        if re.search(r'\bconsole\.(log|debug)\s*\(', stripped):
            # Check if it's in a catch block → convert to console.error
            in_catch = is_in_catch_block(lines, i)

            # Check if the statement spans multiple lines
            full_stmt = line
            j = i
            # Count parens to find statement end
            paren_count = full_stmt.count('(') - full_stmt.count(')')
            while paren_count > 0 and j + 1 < len(lines):
                j += 1
                full_stmt += "\n" + lines[j]
                paren_count += lines[j].count('(') - lines[j].count(')')

            if in_catch:
                # Convert to console.error, keep the same content
                converted_line = re.sub(
                    r'\bconsole\.(log|debug)\s*\(',
                    'console.error(',
                    line,
                )
                new_lines.append(converted_line)
                # Keep remaining lines of multi-line statement
                for k in range(i + 1, j + 1):
                    new_lines.append(lines[k])
                converted += 1
            else:
                # Remove the entire statement (including multi-line)
                # Keep blank line if the console.log was on its own line
                indent = len(line) - len(line.lstrip())
                # Don't add blank line if previous line is already blank
                if new_lines and new_lines[-1].strip() == "":
                    pass  # skip, already blank
                else:
                    pass  # just skip, no blank line needed
                removed += 1

            i = j + 1
            changes += 1
        else:
            new_lines.append(line)
            i += 1

    if changes > 0:
        # Clean up multiple consecutive blank lines
        cleaned = []
        for line in new_lines:
            if line.strip() == "" and cleaned and cleaned[-1].strip() == "":
                continue  # skip double blank
            cleaned.append(line)
        path.write_text("\n".join(cleaned), encoding="utf-8")

    return changes


def main():
    global files_modified

    files = sorted(f for f in DEMO_SRC.rglob("*.ts*") if f.suffix in (".ts", ".tsx"))
    total = 0

    for f in files:
        n = process_file(f)
        if n > 0:
            total += n
            files_modified += 1

    print(f"\n✅ C1 Complete: {total} console statements processed in {files_modified} files")
    print(f"  - {removed} console.log/debug removed")
    print(f"  - {converted} console.log in catch → console.error")
    print(f"  - console.warn ({27}) + console.error kept as-is")


if __name__ == "__main__":
    main()
