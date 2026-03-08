"""
D1 — Replace hardcoded light-mode-only colors in CSS modules with semantic tokens.

Safe replacements (semantic tokens auto-switch in dark mode):
  #fff, #ffffff, white  → var(--app-surface)
  #fafafa, #f5f5f5, #f8f9fa, #f8fafc, #f0f0f0, #f0f4f8  → var(--app-surface-2)
  #333, #333333  → var(--app-text)
  #666, #666666  → var(--app-muted-text)

Skip:
  - tokens.css, theme.css (definitions)
  - _archive/ files
  - Values inside var() fallbacks
  - Values in background gradients (complex)
  - rgb(255,...) patterns in rgba() with opacity (intentional transparency)
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"

SKIP_FILES = {"tokens.css", "theme.css"}
SKIP_DIRS = {"_archive", "node_modules"}

# Replacements: (pattern, replacement, description)
# Order matters - longer patterns first
REPLACEMENTS = [
    # Surface backgrounds
    (r"(?<!var\()#ffffff\b", "var(--app-surface)", "white hex 6"),
    (r"(?<!var\()#fff\b(?![\da-fA-F])", "var(--app-surface)", "white hex 3"),
    (r"(?<![a-zA-Z-])white\b(?!\s*[-:])", "var(--app-surface)", "white keyword"),
    # Surface-2 (off-white)
    (r"(?<!var\()#fafafa\b", "var(--app-surface-2)", "fafafa"),
    (r"(?<!var\()#f5f5f5\b", "var(--app-surface-2)", "f5f5f5"),
    (r"(?<!var\()#f8f9fa\b", "var(--app-surface-2)", "f8f9fa"),
    (r"(?<!var\()#f8fafc\b", "var(--app-surface-2)", "f8fafc"),
    (r"(?<!var\()#f0f0f0\b", "var(--app-surface-2)", "f0f0f0"),
    (r"(?<!var\()#f3f4f6\b", "var(--app-surface-2)", "f3f4f6"),
    # Text colors
    (r"(?<!var\()#333333\b", "var(--app-text)", "333333"),
    (r"(?<!var\()#333\b(?![\da-fA-F])", "var(--app-text)", "333"),
]

changes_log = []


def should_skip(path: Path) -> bool:
    if path.name in SKIP_FILES:
        return True
    return any(d in path.parts for d in SKIP_DIRS)


def is_safe_to_replace(line: str, match_start: int) -> bool:
    """Check if the match is safe to replace (not inside var() fallback, gradient, or comment)."""
    prefix = line[:match_start]

    # Inside a var() fallback?
    # Count unmatched "var(" before this position
    open_vars = prefix.count("var(")
    close_parens = prefix.count(")")
    if open_vars > close_parens:
        return False

    # Inside a CSS comment?
    if "/*" in prefix and "*/" not in prefix[prefix.rfind("/*"):]:
        return False

    # Inside a gradient?
    grad_patterns = ["linear-gradient", "radial-gradient", "conic-gradient"]
    for gp in grad_patterns:
        idx = prefix.rfind(gp)
        if idx >= 0:
            # Check if we're still inside the gradient parens
            after_grad = prefix[idx:]
            if after_grad.count("(") > after_grad.count(")"):
                return False

    return True


def process_file(path: Path) -> int:
    if should_skip(path):
        return 0

    text = path.read_text(encoding="utf-8")
    original = text
    count = 0

    for pattern, replacement, desc in REPLACEMENTS:
        def safe_replace(m):
            nonlocal count
            # Find position in current text
            if is_safe_to_replace(text[:m.start()] if hasattr(m, 'start') else "", m.start()):
                count += 1
                rel = path.relative_to(DEMO_SRC)
                # Find line number
                line_num = text[:m.start()].count("\n") + 1
                changes_log.append(f"  {rel}:{line_num} ({desc})")
                return replacement
            return m.group(0)

        text = re.sub(pattern, safe_replace, text)

    if text != original:
        path.write_text(text, encoding="utf-8")

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

    print(f"\n✅ D1 Complete: {total} light-mode colors replaced in {file_count} files\n")
    if changes_log:
        print("Changes:")
        for c in sorted(changes_log):
            print(c)


if __name__ == "__main__":
    main()
