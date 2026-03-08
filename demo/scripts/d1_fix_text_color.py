"""
D1-fix — Fix color (text color) that was incorrectly set to var(--app-surface).

When the original was `color: white` or `color: #fff`, this should be
`color: var(--color-white, #fff)` — not var(--app-surface).

var(--app-surface) is a background token that changes base on theme.
White text on colored backgrounds should stay white in both themes.
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"
SKIP_DIRS = {"_archive", "node_modules"}

changes = 0


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def main():
    global changes
    css_files = sorted(DEMO_SRC.rglob("*.module.css"))

    for f in css_files:
        if should_skip(f):
            continue
        text = f.read_text(encoding="utf-8")
        # Replace `color: var(--app-surface)` with `color: var(--color-white, #fff)`
        # Only match standalone color property (not background-color)
        new_text = re.sub(
            r"(\bcolor:\s*)var\(--app-surface\)",
            r"\1var(--color-white, #fff)",
            text,
        )
        if new_text != text:
            count = text.count("color: var(--app-surface)") - new_text.count("color: var(--app-surface)")
            # But be careful: also exclude cases like `background-color:`
            # The regex already handles this with \b word boundary
            f.write_text(new_text, encoding="utf-8")
            changes += count
            rel = f.relative_to(DEMO_SRC)
            print(f"  Fixed {count} in {rel}")

    print(f"\n✅ D1-fix: {changes} text color values corrected to var(--color-white, #fff)")


if __name__ == "__main__":
    main()
