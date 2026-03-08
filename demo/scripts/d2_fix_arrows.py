"""
D2-fix — Repair arrow functions broken by the D2 accessibility script.

The D2 script incorrectly matched `onClick={(e) =>` as a div with onClick,
inserting `role="button" tabIndex={0}` inside the arrow function syntax.

Patterns to fix:
  onClick={(e) = role="button" tabIndex={0}> e.stopPropagation()}
  → onClick={(e) => e.stopPropagation()} role="button" tabIndex={0}

  onClick={e = role="button" tabIndex={0}> e.stopPropagation()}
  → onClick={e => e.stopPropagation()} role="button" tabIndex={0}

  onClick={() = role="button" tabIndex={0}> ...}
  → onClick={() => ...} role="button" tabIndex={0}
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"
SKIP_DIRS = {"_archive", "node_modules"}

fixes = 0


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def fix_line(line: str) -> str:
    global fixes

    # Pattern: ... = role="button" tabIndex={0}> ...
    # This was originally: ... => ...
    # The script split `=>` into `= role="button" tabIndex={0}>`

    # Fix pattern: restore => and move role/tabIndex to after the closing }> or )>
    pattern = r'= role="button" tabIndex=\{0\}>'
    if pattern.replace("\\{", "{").replace("\\}", "}") not in line:
        return line

    # Strategy: find the broken pattern, reconstruct the arrow function
    # Replace `= role="button" tabIndex={0}>` back to `=>`
    new_line = line.replace('= role="button" tabIndex={0}>', '=>')

    # Now we need to add role="button" tabIndex={0} to the enclosing element
    # The element tag is the <div or <span that contains the onClick
    # It should already have role="button" tabIndex={0} from the first line's match
    # OR the parent overlay div already got it. Let's check if it needs it.

    # Check if this element already has role="button" tabIndex={0}
    if 'role="button"' not in new_line:
        # Find the closing > of the JSX element and add before it
        # This is the > that closes the opening tag
        # Look for the last > that would close a JSX tag
        # The pattern: ...onClick={...}> or ...onClick={...} className=...>
        # We need to add before the final >
        last_gt = new_line.rstrip().rstrip('>')
        if last_gt != new_line.rstrip():
            new_line = new_line.rstrip()
            # Remove the trailing >
            if new_line.endswith('>'):
                new_line = new_line[:-1] + ' role="button" tabIndex={0}>'
    elif 'tabIndex={0}' not in new_line:
        # Has role but no tabIndex
        pass  # unlikely

    fixes += 1
    return new_line


def process_file(path: Path) -> int:
    if should_skip(path):
        return 0
    text = path.read_text(encoding="utf-8")
    if '= role="button" tabIndex={0}>' not in text:
        return 0

    lines = text.split("\n")
    count = 0
    new_lines = []
    for line in lines:
        new_line = fix_line(line)
        if new_line != line:
            count += 1
        new_lines.append(new_line)

    if count > 0:
        path.write_text("\n".join(new_lines), encoding="utf-8")
    return count


def main():
    files = sorted(f for f in DEMO_SRC.rglob("*.tsx"))
    total = 0
    file_count = 0
    for f in files:
        n = process_file(f)
        if n > 0:
            total += n
            file_count += 1
            rel = f.relative_to(DEMO_SRC)
            print(f"  Fixed {n} in {rel}")

    print(f"\n✅ D2-fix: {total} broken arrow functions repaired in {file_count} files")


if __name__ == "__main__":
    main()
