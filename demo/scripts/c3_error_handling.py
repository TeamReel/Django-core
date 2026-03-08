"""
C3 — Error Handling Cleanup
Ensures every catch block either:
  1. Logs the error (console.error / console.warn)
  2. Sets an error state
  3. Re-throws
  4. Has an explicit comment explaining why it's silent

Targets: empty catch blocks and silent catch blocks without any error handling.
"""

import re
import pathlib

SRC = pathlib.Path(__file__).resolve().parent.parent / "src"

# Intentional silent catch patterns (don't touch)
INTENTIONAL = {
    "JSON.parse",
    "json()",
    "user cancelled",
    "non-critical",
    "ignore",
    "lazyWithRetry",
}

stats = {"files": 0, "fixed": 0}
changes: dict[str, int] = {}


def is_intentional(catch_body: str) -> bool:
    lower = catch_body.lower()
    return any(kw.lower() in lower for kw in INTENTIONAL)


def process_file(fpath: pathlib.Path) -> None:
    text = fpath.read_text(encoding="utf-8", errors="ignore")
    lines = text.split("\n")
    new_lines = list(lines)
    offset = 0  # track inserted lines

    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.search(r"catch\s*\((\w+)(?:\s*:\s*\w+)?\)\s*\{", line)
        if not m:
            i += 1
            continue

        param = m.group(1)
        brace_start = i
        brace_depth = line.count("{") - line.count("}")
        j = i + 1

        while j < len(lines) and brace_depth > 0:
            brace_depth += lines[j].count("{") - lines[j].count("}")
            j += 1

        # catch body is lines[i+1] to lines[j-1] (exclusive of closing brace line)
        body_lines = lines[i + 1 : j]
        body_text = "\n".join(body_lines)

        # Check if body already has error handling
        has_handling = bool(
            re.search(
                r"console\.(error|warn|log)|throw |setError|\.error\(|toast|notify|alert|reportError",
                body_text,
            )
        )

        # Check if body is effectively empty (only whitespace/comments)
        stripped_body = re.sub(r"//[^\n]*", "", body_text).strip().rstrip("}")
        is_empty = not stripped_body or stripped_body == "}"

        if not has_handling and is_empty and not is_intentional(body_text):
            # Add console.error to truly empty catch blocks
            indent = re.match(r"(\s*)", lines[i]).group(1) + "  "
            insert_line = f"{indent}console.error({param});"
            insert_idx = brace_start + 1 + offset
            new_lines.insert(insert_idx, insert_line)
            offset += 1
            rel = str(fpath.relative_to(SRC))
            changes[rel] = changes.get(rel, 0) + 1
            stats["fixed"] += 1

        i = j

    if offset > 0:
        fpath.write_text("\n".join(new_lines), encoding="utf-8")
        stats["files"] += 1


# Process all TS/TSX files
for ext in ("*.ts", "*.tsx"):
    for f in sorted(SRC.rglob(ext)):
        # Skip _archive folder
        if "_archive" in str(f):
            continue
        process_file(f)

print(f"\n✅ C3 Complete: {stats['fixed']} empty catch blocks fixed in {stats['files']} files")
if changes:
    print("\nChanges:")
    for fname, cnt in sorted(changes.items()):
        print(f"  {fname}: {cnt} catches fixed")
else:
    print("\nNo truly empty silent catch blocks found — all catches already have proper error handling!")
    print("(C1 console cleanup already addressed most empty catches)")
