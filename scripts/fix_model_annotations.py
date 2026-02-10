#!/usr/bin/env python
"""Fix Django model field annotation syntax errors."""
import re
from pathlib import Path

def fix_field_annotations(file_path: Path):
    """Fix incorrect type annotations in model fields."""
    content = file_path.read_text(encoding="utf-8")

    # Pattern to match incorrectly annotated on_delete and other parameters
    # Example: on_delete: models.CASCADE = models.CASCADE
    content = re.sub(
        r'on_delete:\s*models\.(CASCADE|PROTECT|SET_NULL)\s*=\s*models\.(CASCADE|PROTECT|SET_NULL)',
        r'on_delete=models.\1',
        content
    )

    # Fix SET_NULL that might have been changed to SET
    content = re.sub(
        r'on_delete:\s*models\.SET\s*=\s*models\.SET_NULL',
        r'on_delete=models.SET_NULL',
        content
    )

    file_path.write_text(content, encoding="utf-8")
    print(f"✓ Fixed {file_path}")

if __name__ == "__main__":
    model_files = [
        Path("src/workflows/models/instance.py"),
        Path("src/workflows/models/history.py"),
    ]

    for file_path in model_files:
        if file_path.exists():
            fix_field_annotations(file_path)
        else:
            print(f"✗ File not found: {file_path}")
