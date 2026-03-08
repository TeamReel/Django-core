"""
I6 — Replace hardcoded inline color / backgroundColor hex values in TSX/TS
with semantic or palette token references.

Covers: color, backgroundColor, background, bgColor, hoverBgColor, pointBorderColor
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"

# ── Hex → token map (exact matches) ──
HEX_TO_TOKEN = {
    # Whites / blacks
    "#fff": "var(--color-white, #fff)",
    "#ffffff": "var(--color-white, #fff)",
    "#000": "var(--color-black, #000)",
    "#000000": "var(--color-black, #000)",
    # Reds
    "#dc2626": "var(--color-red-500)",
    "#b91c1c": "var(--color-red-600)",
    "#fee2e2": "var(--color-red-100)",
    "#fee": "var(--color-red-100)",  # shorthand for #ffeeee ≈ red-100
    "#c00": "var(--color-red-500)",  # shorthand for #cc0000 ≈ red-500
    # Greens
    "#059669": "var(--color-green-600)",
    "#047857": "var(--color-green-600)",  # approx green-700
    "#d1fae5": "var(--color-green-100)",  # approx - green tint bg
    "#198754": "var(--color-green-600)",  # Bootstrap success ≈ green-600
    # Ambers
    "#d97706": "var(--color-amber-500)",
    "#b45309": "var(--color-amber-600)",
    "#fef3c7": "var(--color-amber-100)",
    # Blues
    "#60a5fa": "var(--color-blue-400)",
    "#dbeafe": "var(--color-blue-100)",
    "#3b82f6": "var(--color-blue-500)",
    "#1d4ed8": "var(--color-blue-700)",
    # Violets / Indigo
    "#8b5cf6": "var(--color-violet-500)",
    "#6366f1": "var(--color-indigo-500)",
    # Neutrals
    "#9ca3af": "var(--color-neutral-400)",
    "#6c757d": "var(--color-neutral-400)",
    "#666": "var(--app-muted-text)",
    "#666666": "var(--app-muted-text)",
    "#555": "var(--app-muted-text)",
    "#555555": "var(--app-muted-text)",
    "#e5e7eb": "var(--app-border)",
    "#f3f4f6": "var(--app-surface-2)",
    "#f9fafb": "var(--app-surface-2)",
    "#4b5563": "var(--color-neutral-500)",
}

SKIP_DIRS = {"_archive", "node_modules"}
# Color-related properties in inline styles
COLOR_PROPS = r"(?:color|backgroundColor|background|bgColor|hoverBgColor|pointBorderColor|borderColor)"

changes_log = []


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def replace_hex_in_prop(line: str, file_path: Path, line_num: int) -> str:
    """Replace hex values that appear as values for color properties in inline styles."""
    original = line

    # Pattern: propertyName: '#hexvalue'  or  propertyName: "#hexvalue"
    def replacer(m):
        quote = m.group(1)  # ' or "
        hex_val = m.group(2).lower()
        if hex_val in HEX_TO_TOKEN:
            return f"{quote}{HEX_TO_TOKEN[hex_val]}{quote}"
        return m.group(0)

    # Match hex values in quoted strings on color property lines
    # We look for '#...' or "#..." patterns
    line = re.sub(r"(['\"])(#[0-9a-fA-F]{3,8})\1", replacer, line)

    # Also handle: color: 'white' → leave, but handle named colors if needed

    if line != original:
        rel = file_path.relative_to(DEMO_SRC)
        changes_log.append(f"  {rel}:{line_num}")

    return line


def process_file(path: Path) -> int:
    if should_skip(path):
        return 0
    text = path.read_text(encoding="utf-8")
    if "#" not in text:
        return 0

    lines = text.split("\n")
    count = 0
    new_lines = []
    for i, line in enumerate(lines, 1):
        # Only process lines that have a color-ish property with a hex value
        if re.search(COLOR_PROPS, line) and re.search(r"['\"]#[0-9a-fA-F]", line):
            new_line = replace_hex_in_prop(line, path, i)
        else:
            new_line = line

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

    print(f"\n✅ I6 Complete: {total} inline color hex values replaced in {file_count} files\n")
    if changes_log:
        print("Changes:")
        for c in changes_log:
            print(c)


if __name__ == "__main__":
    main()
