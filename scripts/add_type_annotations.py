#!/usr/bin/env python
"""Add type annotations to Django model fields to fix mypy errors."""
import re
from pathlib import Path

def add_type_annotations(file_path: Path):
    """Add type annotations to model fields in a file."""
    content = file_path.read_text(encoding="utf-8")

    # Pattern to match Django model field declarations without type annotations
    # Example: workflow = models.ForeignKey(
    pattern = r'^(\s+)([a-z_]+)\s*=\s*(models\.[A-Za-z]+)'

    def replace_field(match):
        indent = match.group(1)
        field_name = match.group(2)
        field_type = match.group(3)
        return f"{indent}{field_name}: {field_type} = {field_type}"

    new_content = re.sub(pattern, replace_field, content, flags=re.MULTILINE)

    if new_content != content:
        file_path.write_text(new_content, encoding="utf-8")
        print(f"✓ Updated {file_path}")
        return True
    else:
        print(f"- No changes needed for {file_path}")
        return False

if __name__ == "__main__":
    # List of model files to update
    model_files = [
        Path("src/workflows/models/instance.py"),
        Path("src/workflows/models/history.py"),
    ]

    updated_count = 0
    for file_path in model_files:
        if file_path.exists():
            if add_type_annotations(file_path):
                updated_count += 1
        else:
            print(f"✗ File not found: {file_path}")

    print(f"\n{updated_count} file(s) updated")
