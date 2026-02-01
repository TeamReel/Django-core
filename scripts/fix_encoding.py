#!/usr/bin/env python3
"""Fix UTF-8 mojibake in TypeScript files."""

import sys

def fix_file(path: str) -> int:
    """Fix common UTF-8 encoding issues in a file."""
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Common mojibake patterns (double-encoded UTF-8)
    replacements = [
        # Ellipsis
        ('â€¦', '…'),
        # En dash
        ('â€"', '–'),
        # Em dash
        ('â€"', '—'),
        # Apostrophe
        ('â€™', "'"),
        # Left single quote
        ('â€˜', "'"),
        # Left double quote
        ('â€œ', '"'),
        # Right double quote
        ('â€', '"'),
        # Camera emoji (📸)
        ('ðŸ"¸', '📸'),
        # Clapper emoji (🎬)
        ('ðŸŽ¬', '🎬'),
        # Party emoji (🎉)
        ('ðŸŽ‰', '🎉'),
        # Trophy (🏆)
        ('ðŸ†', '🏆'),
    ]

    for old, new in replacements:
        content = content.replace(old, new)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed encoding issues in {path}")
        return 1
    else:
        print(f"No encoding issues found in {path}")
        return 0


if __name__ == '__main__':
    if len(sys.argv) < 2:
        # Default file
        files = ['demo/src/pages/periods/ProjectSeasonDetailPage.tsx']
    else:
        files = sys.argv[1:]

    for f in files:
        fix_file(f)
