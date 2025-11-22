"""Tests for Django Core-App adapter."""

from __future__ import annotations

from pathlib import Path

import pytest
from constitution_engine.adapters.django_core import DjangoAdapter, DjangoAdapterConfig


@pytest.fixture
def django_fixture_path(tmp_path: Path) -> Path:
    """Get path to the Django test fixture."""
    # Use the fixture in tests/fixtures/django_project
    fixture_path = Path(__file__).parent.parent.parent / "fixtures" / "django_project"
    assert fixture_path.exists(), f"Django fixture not found at {fixture_path}"
    return fixture_path


@pytest.fixture
def django_config(django_fixture_path: Path) -> DjangoAdapterConfig:
    """Create a DjangoAdapterConfig for testing."""
    return DjangoAdapterConfig(
        project_root=django_fixture_path,
        src_dir="src",
        settings_module="config.settings.base",
        test_dir="tests",
        manage_py_path="manage.py",
    )


@pytest.fixture
def django_adapter(django_config: DjangoAdapterConfig) -> DjangoAdapter:
    """Create a DjangoAdapter for testing."""
    return DjangoAdapter(django_config)


class TestDjangoAdapterConfig:
    """Tests for DjangoAdapterConfig."""

    def test_config_initialization(self, django_fixture_path: Path):
        """Test basic config initialization."""
        config = DjangoAdapterConfig(
            project_root=django_fixture_path,
            src_dir="src",
        )

        assert config.project_root == django_fixture_path
        assert config.src_dir == "src"
        assert config.settings_module == "config.settings.base"

    def test_config_paths(self, django_config: DjangoAdapterConfig, django_fixture_path: Path):
        """Test path properties."""
        assert django_config.apps_path == django_fixture_path / "src"
        assert django_config.tests_path == django_fixture_path / "tests"
        assert django_config.manage_py_full_path == django_fixture_path / "manage.py"

    def test_config_validation_missing_root(self, tmp_path: Path):
        """Test that config validation catches missing project root."""
        missing_path = tmp_path / "nonexistent"

        with pytest.raises(ValueError, match="Project root does not exist"):
            DjangoAdapterConfig(project_root=missing_path)

    def test_config_validation_missing_src(self, tmp_path: Path):
        """Test that config validation catches missing src directory."""
        # Create project root but not src
        project_root = tmp_path / "project"
        project_root.mkdir()

        with pytest.raises(ValueError, match="Source directory does not exist"):
            DjangoAdapterConfig(project_root=project_root, src_dir="src")

    def test_is_excluded_dir(self, django_config: DjangoAdapterConfig):
        """Test directory exclusion checking."""
        assert django_config.is_excluded_dir("__pycache__")
        assert django_config.is_excluded_dir(".pytest_cache")
        assert django_config.is_excluded_dir("my_app.egg-info")
        assert not django_config.is_excluded_dir("myapp")

    def test_is_excluded_app(self, django_config: DjangoAdapterConfig):
        """Test app exclusion checking."""
        assert django_config.is_excluded_app("migrations")
        assert not django_config.is_excluded_app("testapp")

    def test_from_project_root(self, django_fixture_path: Path):
        """Test convenience constructor."""
        config = DjangoAdapterConfig.from_project_root(
            django_fixture_path,
            settings_module="config.settings.production",
        )

        assert config.project_root == django_fixture_path
        assert config.settings_module == "config.settings.production"


class TestDjangoAdapter:
    """Tests for DjangoAdapter."""

    def test_adapter_initialization(self, django_config: DjangoAdapterConfig):
        """Test adapter initialization."""
        adapter = DjangoAdapter(django_config)
        assert adapter.config == django_config

    def test_build_context(self, django_adapter: DjangoAdapter, django_fixture_path: Path):
        """Test building repository context."""
        context = django_adapter.build_context()

        assert context.root_path == django_fixture_path
        assert "python" in context.detected_languages
        assert "django" in context.tags
        assert "django-core-app" in context.tags
        assert context.metadata["adapter"] == "django_core"
        assert context.metadata["settings_module"] == "config.settings.base"
        assert context.metadata["has_manage_py"] is True

    def test_discover_apps(self, django_adapter: DjangoAdapter):
        """Test Django app discovery."""
        apps = django_adapter._discover_apps()

        # Should find testapp and otherapp
        app_names = [app["name"] for app in apps]
        assert "testapp" in app_names
        assert "otherapp" in app_names
        assert "config" in app_names

        # Check testapp details
        testapp = next(app for app in apps if app["name"] == "testapp")
        assert testapp["has_models"] is True
        assert testapp["has_views"] is True
        assert testapp["has_tests"] is True
        assert testapp["has_migrations"] is True

    def test_get_app_paths(self, django_adapter: DjangoAdapter):
        """Test getting app paths."""
        app_paths = django_adapter.get_app_paths()

        assert len(app_paths) > 0
        app_names = [path.name for path in app_paths]
        assert "testapp" in app_names
        assert "otherapp" in app_names

    def test_get_test_paths(self, django_adapter: DjangoAdapter):
        """Test getting test paths."""
        test_paths = django_adapter.get_test_paths()

        assert len(test_paths) > 0
        # Should include main tests directory
        assert any(path.name == "tests" for path in test_paths)
        # Should include app-level tests
        assert any("testapp" in str(path) and path.name == "tests.py" for path in test_paths)

    def test_get_settings_files(self, django_adapter: DjangoAdapter):
        """Test getting settings files."""
        settings_files = django_adapter.get_settings_files()

        assert len(settings_files) > 0
        assert any(path.name == "base.py" for path in settings_files)

    def test_get_project_structure(self, django_adapter: DjangoAdapter):
        """Test getting complete project structure."""
        structure = django_adapter.get_project_structure()

        assert "apps" in structure
        assert "tests" in structure
        assert "settings" in structure
        assert "manage_py" in structure

        assert len(structure["apps"]) > 0
        assert len(structure["tests"]) > 0
        assert len(structure["settings"]) > 0
        assert len(structure["manage_py"]) == 1

    def test_from_project_root(self, django_fixture_path: Path):
        """Test convenience constructor."""
        adapter = DjangoAdapter.from_project_root(
            django_fixture_path,
            settings_module="config.settings.local",
        )

        assert adapter.config.project_root == django_fixture_path
        assert adapter.config.settings_module == "config.settings.local"


class TestDjangoAdapterIntegration:
    """Integration tests for Django adapter."""

    def test_adapter_with_real_project(self):
        """Test adapter against the actual Django Core-App project."""
        # Get path to the actual django-core project
        project_root = Path(__file__).parent.parent.parent.parent.parent

        # Skip if not in the expected location
        if not (project_root / "manage.py").exists():
            pytest.skip("Not running in Django Core-App project")

        adapter = DjangoAdapter.from_project_root(project_root)
        context = adapter.build_context()

        assert context.root_path == project_root
        assert "python" in context.detected_languages
        assert "django" in context.tags

        # Should find at least common and constitution_engine apps
        apps = adapter._discover_apps()
        app_names = [app["name"] for app in apps]
        assert "common" in app_names or "constitution_engine" in app_names

    def test_adapter_excludes_migrations(self, django_adapter: DjangoAdapter):
        """Test that migrations directories are excluded."""
        apps = django_adapter._discover_apps()
        app_names = [app["name"] for app in apps]

        # "migrations" should not be discovered as an app
        assert "migrations" not in app_names

    def test_adapter_handles_missing_components(self, tmp_path: Path):
        """Test adapter gracefully handles missing optional components."""
        # Create minimal Django project structure
        project_root = tmp_path / "minimal_project"
        project_root.mkdir()

        src_dir = project_root / "src"
        src_dir.mkdir()

        config = DjangoAdapterConfig(
            project_root=project_root,
            src_dir="src",
        )

        adapter = DjangoAdapter(config)

        # Should not raise errors for missing components
        context = adapter.build_context()
        assert context.metadata["has_manage_py"] is False
        assert context.metadata["has_tests"] is False

        # Should return empty lists for missing components
        assert len(adapter.get_app_paths()) == 0
        assert len(adapter.get_settings_files()) == 0
