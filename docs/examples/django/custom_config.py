"""Example: Django adapter with custom configuration.

This example demonstrates advanced configuration options for the Django adapter.
"""

from pathlib import Path

from constitution_engine.adapters.django_core import DjangoAdapter, DjangoAdapterConfig


def main():
    """Demonstrate custom Django adapter configuration."""
    # Custom configuration with exclusions
    config = DjangoAdapterConfig(
        project_root=Path("/path/to/django-project"),
        src_dir="src",
        apps_dir=None,  # Apps are directly in src/
        settings_module="config.settings.production",
        test_dir="tests",
        manage_py_path="manage.py",
        excluded_apps=["migrations", "legacy_app"],
        excluded_dirs=[
            "__pycache__",
            ".pytest_cache",
            "*.egg-info",
            ".mypy_cache",
            ".ruff_cache",
            "node_modules",
        ],
    )

    # Alternative: Use the convenience method
    adapter = DjangoAdapter.from_project_root(
        "/path/to/django-project",
        settings_module="config.settings.production",
        excluded_apps=["migrations", "legacy_app"],
    )

    # Get detailed project structure
    structure = adapter.get_project_structure()

    print("Apps:")
    for app_path in structure["apps"]:
        print(f"  - {app_path.name}")

    print("\nSettings files:")
    for settings_path in structure["settings"]:
        print(f"  - {settings_path}")

    print("\nTest paths:")
    for test_path in structure["tests"]:
        print(f"  - {test_path}")

    # Build repository context
    context = adapter.build_context()

    print("\nRepository Context:")
    print(f"  Root: {context.root_path}")
    print(f"  Languages: {context.detected_languages}")
    print(f"  Tags: {context.tags}")
    print(f"  Apps: {context.metadata.get('apps', [])}")


if __name__ == "__main__":
    main()
