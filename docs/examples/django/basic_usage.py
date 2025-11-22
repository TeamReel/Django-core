"""Example: Using Django adapter with the Constitutional Enforcement Engine.

This example shows how to use the Django Core-App adapter to analyze
a Django project without importing Django itself.
"""

from pathlib import Path

from constitution_engine.adapters.django_core import DjangoAdapter, DjangoAdapterConfig
from constitution_engine.core.engine import Engine


def main():
    """Run the engine against a Django Core-App project."""
    # Configure the Django adapter
    django_config = DjangoAdapterConfig(
        project_root=Path("/path/to/django-project"),
        src_dir="src",
        settings_module="config.settings.base",
        test_dir="tests",
        manage_py_path="manage.py",
    )

    # Create adapter and build context
    adapter = DjangoAdapter(django_config)
    context = adapter.build_context()

    print(f"Project root: {context.root_path}")
    print(f"Detected languages: {context.detected_languages}")
    print(f"Tags: {context.tags}")
    print(f"Apps discovered: {len(context.metadata.get('apps', []))}")

    # Get project structure
    structure = adapter.get_project_structure()
    print(f"\nProject structure:")
    print(f"  Apps: {len(structure['apps'])}")
    print(f"  Settings files: {len(structure['settings'])}")
    print(f"  Test paths: {len(structure['tests'])}")

    # Run the engine with the context
    engine = Engine()
    # results = engine.run(context)  # Uncomment when engine is configured

    print("\nDjango adapter example completed!")


if __name__ == "__main__":
    main()
