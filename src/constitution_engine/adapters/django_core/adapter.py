"""Django Core-App adapter implementation.

This adapter analyzes Django Core-App style projects using only filesystem structure,
without importing Django or the target project.
"""

from __future__ import annotations

from pathlib import Path

from constitution_engine.core.models import RepositoryContext

from .config import DjangoAdapterConfig


class DjangoAdapter:
    """Adapter for analyzing Django Core-App style projects.

    This adapter inspects a Django project's filesystem structure to build
    a RepositoryContext without importing Django or the target project.
    """

    def __init__(self, config: DjangoAdapterConfig) -> None:
        """Initialize the Django adapter.

        Args:
            config: Configuration for the adapter
        """
        self.config = config

    def build_context(self) -> RepositoryContext:
        """Build a RepositoryContext from the Django project structure.

        Returns:
            RepositoryContext with detected Django project information
        """
        context = RepositoryContext(
            root_path=self.config.project_root,
            detected_languages={"python"},
            tags={"django", "django-core-app"},
            metadata={
                "adapter": "django_core",
                "settings_module": self.config.settings_module,
                "apps": self._discover_apps(),
                "has_manage_py": self.config.manage_py_full_path.exists(),
                "has_tests": self.config.tests_path.exists(),
            },
        )

        return context

    def _discover_apps(self) -> list[dict[str, str | Path | bool]]:
        """Discover Django apps in the project.

        Returns:
            List of app info dicts with name and path
        """
        apps: list[dict[str, str | Path | bool]] = []
        apps_path = self.config.apps_path

        if not apps_path.exists():
            return apps

        for item in apps_path.iterdir():
            if not item.is_dir():
                continue

            if self.config.is_excluded_dir(item.name):
                continue

            if self.config.is_excluded_app(item.name):
                continue

            # Check if it looks like a Django app (has __init__.py)
            if (item / "__init__.py").exists():
                apps.append(
                    {
                        "name": item.name,
                        "path": item,
                        "has_models": (item / "models.py").exists(),
                        "has_views": (item / "views.py").exists(),
                        "has_urls": (item / "urls.py").exists(),
                        "has_tests": (item / "tests.py").exists() or (item / "tests").exists(),
                        "has_migrations": (item / "migrations").exists(),
                    }
                )

        return apps

    def get_app_paths(self) -> list[Path]:
        """Get paths to all discovered Django apps.

        Returns:
            List of app directory paths
        """
        apps = self._discover_apps()
        return [
            app["path"] if isinstance(app["path"], Path) else Path(str(app["path"])) for app in apps
        ]

    def get_test_paths(self) -> list[Path]:
        """Get paths to test directories and files.

        Returns:
            List of test paths (directories and files)
        """
        test_paths = []

        # Main tests directory
        if self.config.tests_path.exists():
            test_paths.append(self.config.tests_path)

        # App-level tests
        for app in self._discover_apps():
            app_path = app["path"] if isinstance(app["path"], Path) else Path(str(app["path"]))

            # tests.py file
            if (app_path / "tests.py").exists():
                test_paths.append(app_path / "tests.py")

            # tests/ directory
            if (app_path / "tests").exists():
                test_paths.append(app_path / "tests")

        return test_paths

    def get_settings_files(self) -> list[Path]:
        """Get paths to Django settings files.

        Returns:
            List of settings file paths
        """
        settings_paths = []

        # Parse settings module path (e.g., "config.settings.base")
        parts = self.config.settings_module.split(".")

        # Build path from module parts
        settings_dir = self.config.project_root / self.config.src_dir
        for part in parts[:-1]:  # All but the last part (filename)
            settings_dir = settings_dir / part

        # Check for settings file or directory
        settings_file = settings_dir / f"{parts[-1]}.py"
        if settings_file.exists():
            settings_paths.append(settings_file)

        # Check for settings package
        if settings_dir.exists() and (settings_dir / "__init__.py").exists():
            for item in settings_dir.iterdir():
                if item.is_file() and item.suffix == ".py" and item.name != "__init__.py":
                    settings_paths.append(item)

        return settings_paths

    def get_project_structure(self) -> dict[str, list[Path]]:
        """Get a structured view of the Django project.

        Returns:
            Dict mapping component types to their paths
        """
        return {
            "apps": self.get_app_paths(),
            "tests": self.get_test_paths(),
            "settings": self.get_settings_files(),
            "manage_py": (
                [self.config.manage_py_full_path]
                if self.config.manage_py_full_path.exists()
                else []
            ),
        }

    @classmethod
    def from_project_root(
        cls, project_root: Path | str, **config_overrides: object
    ) -> DjangoAdapter:
        """Create a Django adapter from a project root.

        Args:
            project_root: Root directory of the Django project
            **config_overrides: Optional configuration overrides

        Returns:
            Configured DjangoAdapter instance
        """
        config = DjangoAdapterConfig.from_project_root(project_root, **config_overrides)
        return cls(config)
