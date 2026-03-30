#!/usr/bin/env python
"""Demonstration of scaffolding template rendering.

This script demonstrates how Jinja2 templates work by rendering
the custom-module template with example variables.

Run this script to see scaffolding in action:
    python demo_scaffold.py

The script will:
1. Load the custom-module template files
2. Render them with example variables
3. Save the output to the output/ directory
4. Display what was generated

This is a standalone demo - the real scaffolding CLI is at:
    python -m scaffolding scaffold custom-module
"""
import shutil
import sys
from pathlib import Path

try:
    from jinja2 import Environment, FileSystemLoader
    import yaml
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install jinja2 pyyaml")
    sys.exit(1)


# Paths
EXAMPLE_DIR = Path(__file__).parent
TEMPLATE_DIR = EXAMPLE_DIR / "templates" / "custom-module"
OUTPUT_DIR = EXAMPLE_DIR / "output"


def clean_output_dir():
    """Clean the output directory before generating."""
    print("🧹 Cleaning output directory...")
    for item in OUTPUT_DIR.iterdir():
        if item.name == ".gitkeep":
            continue
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()


def load_manifest() -> dict:
    """Load the template manifest."""
    manifest_path = TEMPLATE_DIR / "manifest.yaml"
    with open(manifest_path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def render_templates(variables: dict) -> dict[str, str]:
    """Render all templates with given variables.

    Args:
        variables: Template variables to use.

    Returns:
        dict mapping output paths to rendered content.
    """
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        keep_trailing_newline=True,
    )

    manifest = load_manifest()
    rendered_files = {}

    for file_spec in manifest.get("files", []):
        source = file_spec["source"]
        dest_template = file_spec["destination"]

        # Check condition if present
        if "condition" in file_spec:
            condition_var = file_spec["condition"].strip("{ }").strip()
            if not variables.get(condition_var, True):
                continue

        # Render destination path
        dest_env = Environment()
        dest = dest_env.from_string(dest_template).render(**variables)

        # Render template content
        try:
            template = env.get_template(source)
            content = template.render(**variables)
            rendered_files[dest] = content
        except Exception as e:
            print(f"  ⚠️ Warning: Could not render {source}: {e}")

    return rendered_files


def save_output(rendered_files: dict[str, str]):
    """Save rendered files to the output directory.

    Args:
        rendered_files: dict mapping paths to content.
    """
    for path, content in rendered_files.items():
        output_path = OUTPUT_DIR / path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8")


def display_file_tree(base_path: Path, prefix: str = ""):
    """Display a tree of generated files.

    Args:
        base_path: The base directory.
        prefix: Prefix for tree lines.
    """
    items = sorted(base_path.iterdir())
    for i, item in enumerate(items):
        if item.name == ".gitkeep":
            continue
        is_last = i == len(items) - 1
        connector = "└── " if is_last else "├── "
        print(f"{prefix}{connector}{item.name}")
        if item.is_dir():
            extension = "    " if is_last else "│   "
            display_file_tree(item, prefix + extension)


def display_file_preview(path: Path, max_lines: int = 20):
    """Display a preview of a generated file.

    Args:
        path: Path to the file.
        max_lines: Maximum lines to show.
    """
    content = path.read_text(encoding="utf-8")
    lines = content.split("\n")
    preview_lines = lines[:max_lines]

    print(f"\n{'=' * 60}")
    print(f"📄 {path.name}")
    print("=" * 60)
    for line in preview_lines:
        print(line)
    if len(lines) > max_lines:
        print(f"... ({len(lines) - max_lines} more lines)")


def main():
    """Run the scaffolding demo."""
    print("=" * 60)
    print("🚀 Scaffolding Demo")
    print("=" * 60)
    print()

    # Define example variables
    variables = {
        "app_name": "inventory",
        "model_name": "Product",
        "model_name_plural": "Products",
        "include_tests": True,
        "include_serializers": True,
        "include_urls": True,
        "author": "Demo User",
    }

    print("📋 Template Variables:")
    for key, value in variables.items():
        print(f"   {key}: {value}")
    print()

    # Clean output directory
    clean_output_dir()
    print()

    # Load and display manifest info
    manifest = load_manifest()
    print(f"📦 Template: {manifest['name']} v{manifest['version']}")
    print(f"   {manifest['description']}")
    print()

    # Render templates
    print("🔨 Rendering templates...")
    rendered_files = render_templates(variables)
    print(f"   Generated {len(rendered_files)} files")
    print()

    # Save output
    print("💾 Saving to output directory...")
    save_output(rendered_files)
    print()

    # Display generated file tree
    print("📁 Generated files:")
    display_file_tree(OUTPUT_DIR)
    print()

    # Show preview of key files
    for filename in ["models.py", "views.py"]:
        preview_path = OUTPUT_DIR / "inventory" / filename
        if preview_path.exists():
            display_file_preview(preview_path, max_lines=30)

    # Display post-generation messages
    print("\n" + "=" * 60)
    print("✅ Scaffolding Complete!")
    print("=" * 60)
    for msg in manifest.get("post_generate", []):
        if "message" in msg:
            print(msg["message"])

    return 0


if __name__ == "__main__":
    sys.exit(main())
