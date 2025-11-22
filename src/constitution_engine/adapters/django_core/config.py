"""Configuration schema for Django Core-App adapter."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class DjangoAdapterConfig:
    """Configuration for Django Core-App adapter.

    This adapter analyzes Django projects using only filesystem structure,
    without importing Django or the target project.

    Attributes:
        project_root: Root directory of the Django project
        src_dir: Source directory containing Django apps (relative to project_root)
        apps_dir: Directory containing Django apps (relative to src_dir, or None for src_dir)
        settings_module: Python path to settings module (e.g. 'config.settings.base')
        test_dir: Directory containing tests (relative to project_root)
        manage_py_path: Path to manage.py (relative to project_root)
        excluded_apps: App names to exclude from analysis
        excluded_dirs: Directory patterns to exclude (e.g., migrations, __pycache__)
    """

    project_root: Path
    src_dir: str = "src"
    apps_dir: str | None = None
    settings_module: str = "config.settings.base"
    test_dir: str = "tests"
    manage_py_path: str = "manage.py"
    excluded_apps: list[str] = field(default_factory=lambda: ["migrations"])
    excluded_dirs: list[str] = field(
        default_factory=lambda: [
            "__pycache__",
            ".pytest_cache",
            "*.egg-info",
            ".mypy_cache",
            ".ruff_cache",
        ]
    )

    def __post_init__(self) -> None:
        """Validate configuration after initialization."""
        if not isinstance(self.project_root, Path):
            object.__setattr__(self, "project_root", Path(self.project_root))

        if not self.project_root.exists():
            raise ValueError(f"Project root does not exist: {self.project_root}")

        src_path = self.project_root / self.src_dir
        if not src_path.exists():
            raise ValueError(f"Source directory does not exist: {src_path}")

    @property
    def apps_path(self) -> Path:
        """Get the full path to the apps directory."""
        if self.apps_dir:
            return self.project_root / self.src_dir / self.apps_dir
        return self.project_root / self.src_dir

    @property
    def tests_path(self) -> Path:
        """Get the full path to the tests directory."""
        return self.project_root / self.test_dir

    @property
    def manage_py_full_path(self) -> Path:
        """Get the full path to manage.py."""
        return self.project_root / self.manage_py_path

    def is_excluded_dir(self, dir_name: str) -> bool:
        """Check if a directory should be excluded from analysis.

        Args:
            dir_name: Name of the directory to check

        Returns:
            True if the directory should be excluded
        """
        from fnmatch import fnmatch

        return any(fnmatch(dir_name, pattern) for pattern in self.excluded_dirs)

    def is_excluded_app(self, app_name: str) -> bool:
        """Check if an app should be excluded from analysis.

        Args:
            app_name: Name of the app to check

        Returns:
            True if the app should be excluded
        """
        return app_name in self.excluded_apps

    @classmethod
    def from_project_root(
        cls, project_root: Path | str, **overrides: object
    ) -> DjangoAdapterConfig:
        """Create configuration from a project root with optional overrides.

        Args:
            project_root: Root directory of the Django project
            **overrides: Optional configuration overrides

        Returns:
            Configured DjangoAdapterConfig instance
        """
        return cls(project_root=Path(project_root), **overrides)
