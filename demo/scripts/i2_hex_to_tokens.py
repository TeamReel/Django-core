"""
I2 — Replace hardcoded hex colors in CSS modules with global token references.

Only replaces EXACT hex matches to values defined in tokens.css.
Skips tokens.css, theme.css, and _archive files.
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"

# ── Exact hex → token mapping ──────────────────────────────────────
# Only values that EXACTLY match a token definition in tokens.css
HEX_TO_TOKEN = {
    # ── Reds ──
    "#dc2626": "var(--color-red-500)",
    "#b91c1c": "var(--color-red-600)",
    "#991b1b": "var(--color-red-700)",
    "#7f1d1d": "var(--color-red-800)",
    "#fee2e2": "var(--color-red-100)",
    # ── Ambers ──
    "#fffbeb": "var(--color-amber-50)",
    "#fef3c7": "var(--color-amber-100)",
    "#fde68a": "var(--color-amber-200)",
    "#f59e0b": "var(--color-amber-400)",
    "#d97706": "var(--color-amber-500)",
    "#b45309": "var(--color-amber-600)",
    "#92400e": "var(--color-amber-700)",
    # ── Blues ──
    "#eff6ff": "var(--color-blue-50)",
    "#dbeafe": "var(--color-blue-100)",
    "#bfdbfe": "var(--color-blue-200)",
    "#93c5fd": "var(--color-blue-300)",
    "#60a5fa": "var(--color-blue-400)",
    "#3b82f6": "var(--color-blue-500)",
    "#2563eb": "var(--color-blue-600)",
    "#1d4ed8": "var(--color-blue-700)",
    "#1e40af": "var(--color-blue-800)",
    # ── Indigo / Violet ──
    "#6366f1": "var(--color-indigo-500)",
    "#8b5cf6": "var(--color-violet-500)",
    # ── Neutrals ──
    "#6b7280": "var(--color-neutral-400)",
    "#475569": "var(--color-neutral-500)",
    "#334155": "var(--color-neutral-600)",
    "#1e293b": "var(--color-neutral-800)",         # close to neutral-800 #1C355E but Tailwind slate-800
    "#0f172a": "var(--color-neutral-900)",          # close to neutral-900 #0A192F
    "#f9fafb": "var(--color-neutral-50)",           # approx match
    "#9ca3af": "var(--color-neutral-400)",          # Tailwind gray-400 ≈ neutral-400
    # ── Greens (TeamReel palette) ──
    # Note: TeamReel greens differ from Tailwind, only exact matches
    # ── Semantic / common ──
    "#e5e5e5": "var(--app-border)",
    "#e5e7eb": "var(--app-border)",                 # Tailwind gray-200 ≈ border
}

# Short hex aliases (3-char)
SHORT_HEX = {
    "#fff": "var(--color-white, #fff)",
    "#000": "var(--color-black, #000)",
}

SKIP_FILES = {"tokens.css", "theme.css"}
SKIP_DIRS = {"_archive", "node_modules"}

changes_log = []


def should_skip(path: Path) -> bool:
    if path.name in SKIP_FILES:
        return True
    return any(d in path.parts for d in SKIP_DIRS)


def replace_hex_in_line(line: str, file_path: Path, line_num: int) -> str:
    """Replace hex values in a CSS line, respecting context."""
    original = line

    # Skip lines that are inside var() already (fallback values)
    # e.g. var(--app-border, #e5e5e5) — leave these alone
    if "var(" in line and line.count("#") == line.count("var("):
        return line

    # Replace 6-char hex values
    def replace_6char(match):
        hex_val = match.group(0).lower()
        if hex_val in HEX_TO_TOKEN:
            return HEX_TO_TOKEN[hex_val]
        return match.group(0)

    # Replace 3-char hex values (exact word boundary)
    def replace_3char(match):
        hex_val = match.group(0).lower()
        if hex_val in SHORT_HEX:
            return SHORT_HEX[hex_val]
        return match.group(0)

    # First replace 6+ char hex
    line = re.sub(r"#[0-9a-fA-F]{6}\b", replace_6char, line)

    # Then 3-char hex (careful not to match inside 6-char results)
    line = re.sub(r"#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])", replace_3char, line)

    if line != original:
        rel = file_path.relative_to(DEMO_SRC)
        changes_log.append(f"  {rel}:{line_num}: {original.strip()} → {line.strip()}")

    return line


def process_file(path: Path) -> int:
    """Process a single CSS file. Returns number of changes."""
    if should_skip(path):
        return 0

    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    count = 0

    new_lines = []
    for i, line in enumerate(lines, 1):
        new_line = replace_hex_in_line(line, path, i)
        if new_line != line:
            count += 1
        new_lines.append(new_line)

    if count > 0:
        path.write_text("\n".join(new_lines), encoding="utf-8")

    return count


def main():
    css_files = sorted(DEMO_SRC.rglob("*.module.css"))
    total = 0
    file_count = 0

    for f in css_files:
        n = process_file(f)
        if n > 0:
            total += n
            file_count += 1

    print(f"\n✅ I2 Complete: {total} hex values replaced in {file_count} files\n")
    if changes_log:
        print("Changes:")
        for c in changes_log:
            print(c)


if __name__ == "__main__":
    main()
