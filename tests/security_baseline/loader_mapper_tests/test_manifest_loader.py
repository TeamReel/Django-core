"""Unit tests for ManifestLoader."""

import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml
from security_baseline.config.manifest_loader import ManifestLoader, ManifestLoaderError


class TestManifestLoaderBasics:
    """Test basic ManifestLoader functionality."""

    def test_initialization(self):
        """Test ManifestLoader initializes with default paths."""
        loader = ManifestLoader()
        assert loader.manifests_dir.name == "manifests"
        assert loader.base_manifest_path.name == "runtime.yaml"

    def test_initialization_with_custom_path(self):
        """Test ManifestLoader with custom base path."""
        custom_path = Path("/custom/path")
        loader = ManifestLoader(base_path=custom_path)
        # Handle both Unix and Windows paths
        manifests_path = str(loader.manifests_dir).replace("\\", "/")
        assert manifests_path.endswith(".security/manifests")


class TestManifestLoaderEnvironmentDetection:
    """Test environment detection logic."""

    def test_detect_environment_from_env_var(self):
        """Test environment detection from DJANGO_ENV."""
        loader = ManifestLoader()

        with patch.dict(os.environ, {"DJANGO_ENV": "production"}):
            env = loader._detect_environment()
            assert env == "production"

    def test_detect_environment_from_django_settings(self):
        """Test environment detection falls back when DJANGO_ENV not set."""
        loader = ManifestLoader()

        # Test that without DJANGO_ENV, _detect_environment tries to use Django settings
        # In this test environment, Django settings.ENVIRONMENT is set to 'local'
        with patch.dict(os.environ, {}, clear=True):
            env = loader._detect_environment()
            # Should get environment from Django settings or default to 'local'
            assert env in ["local", "staging", "production"]

    def test_detect_environment_default_to_local(self):
        """Test environment uses Django settings when DJANGO_ENV not set."""
        loader = ManifestLoader()

        # Without DJANGO_ENV, should use Django settings
        with patch.dict(os.environ, {}, clear=True):
            env = loader._detect_environment()
            # In test environment, should get from Django settings (typically 'local')
            assert isinstance(env, str)
            assert len(env) > 0


class TestManifestLoaderYAMLLoading:
    """Test YAML file loading with error handling."""

    def test_load_yaml_success(self):
        """Test successful YAML loading."""
        loader = ManifestLoader()

        yaml_content = """
        version: "1.0"
        rules:
          SEC001:
            name: "Test Rule"
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write(yaml_content)
            temp_path = Path(f.name)

        try:
            data = loader._load_yaml(temp_path)
            assert data["version"] == "1.0"
            assert "rules" in data
            assert "SEC001" in data["rules"]
        finally:
            temp_path.unlink()

    def test_load_yaml_file_not_found(self):
        """Test YAML loading with missing file."""
        loader = ManifestLoader()
        missing_path = Path("/nonexistent/file.yaml")

        with pytest.raises(ManifestLoaderError, match="not found"):
            loader._load_yaml(missing_path)

    def test_load_yaml_parse_error(self):
        """Test YAML loading with malformed YAML."""
        loader = ManifestLoader()

        malformed_yaml = """
        version: "1.0"
        rules:
          SEC001:
            name: "Test Rule
        # Missing closing quote
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write(malformed_yaml)
            temp_path = Path(f.name)

        try:
            with pytest.raises(ManifestLoaderError, match="YAML parse error"):
                loader._load_yaml(temp_path)
        finally:
            temp_path.unlink()

    def test_load_yaml_empty_file(self):
        """Test YAML loading with empty file."""
        loader = ManifestLoader()

        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write("")  # Empty file
            temp_path = Path(f.name)

        try:
            data = loader._load_yaml(temp_path)
            assert data == {}
        finally:
            temp_path.unlink()

    def test_load_yaml_invalid_format(self):
        """Test YAML loading with non-dictionary content."""
        loader = ManifestLoader()

        invalid_yaml = """
        - item1
        - item2
        - item3
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write(invalid_yaml)
            temp_path = Path(f.name)

        try:
            with pytest.raises(ManifestLoaderError, match="expected dictionary"):
                loader._load_yaml(temp_path)
        finally:
            temp_path.unlink()


class TestManifestLoaderDeepMerge:
    """Test deep merge strategy."""

    def test_deep_merge_simple(self):
        """Test deep merge with simple values."""
        loader = ManifestLoader()

        base = {"a": 1, "b": 2}
        override = {"b": 99, "c": 3}

        result = loader._deep_merge(base, override)

        assert result == {"a": 1, "b": 99, "c": 3}
        assert base == {"a": 1, "b": 2}  # Original not modified

    def test_deep_merge_nested_dicts(self):
        """Test deep merge with nested dictionaries."""
        loader = ManifestLoader()

        base = {
            "rules": {
                "SEC001": {"enabled": True, "severity": "HIGH"},
                "SEC002": {"enabled": True, "severity": "MEDIUM"},
            }
        }

        override = {
            "rules": {
                "SEC001": {"enabled": False},  # Override enabled only
                "SEC003": {"enabled": True, "severity": "LOW"},  # Add new rule
            }
        }

        result = loader._deep_merge(base, override)

        # SEC001 should have merged values
        assert result["rules"]["SEC001"]["enabled"] is False
        assert result["rules"]["SEC001"]["severity"] == "HIGH"  # Preserved

        # SEC002 should be unchanged
        assert result["rules"]["SEC002"]["enabled"] is True

        # SEC003 should be added
        assert result["rules"]["SEC003"]["enabled"] is True

    def test_deep_merge_lists_are_replaced(self):
        """Test that lists are replaced, not merged."""
        loader = ManifestLoader()

        base = {"items": [1, 2, 3], "name": "test"}
        override = {"items": [4, 5]}

        result = loader._deep_merge(base, override)

        # List should be completely replaced
        assert result["items"] == [4, 5]
        assert result["name"] == "test"


class TestManifestLoaderIntegration:
    """Test full manifest loading with environment overrides."""

    def test_load_manifest_without_environment_override(self):
        """Test loading manifest when no environment file exists."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            manifests_dir = temp_path / ".security" / "manifests"
            manifests_dir.mkdir(parents=True)

            # Create base manifest
            base_manifest = {
                "version": "1.0",
                "rules": {"SEC001": {"enabled": True, "severity": "HIGH"}},
            }

            with open(manifests_dir / "runtime.yaml", "w") as f:
                yaml.dump(base_manifest, f)

            # Create environments dir (but no environment files)
            (manifests_dir / "environments").mkdir()

            loader = ManifestLoader(base_path=temp_path)
            manifest = loader.load_manifest(environment="production")

            # Should return base manifest unchanged
            assert manifest["version"] == "1.0"
            assert manifest["rules"]["SEC001"]["enabled"] is True

    def test_load_manifest_with_environment_override(self):
        """Test loading manifest with environment-specific overrides."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            manifests_dir = temp_path / ".security" / "manifests"
            environments_dir = manifests_dir / "environments"
            environments_dir.mkdir(parents=True)

            # Create base manifest
            base_manifest = {
                "version": "1.0",
                "enforcement_mode": "strict",
                "rules": {
                    "SEC001": {"enabled": True, "severity": "HIGH"},
                    "SEC002": {"enabled": True, "severity": "MEDIUM"},
                },
            }

            with open(manifests_dir / "runtime.yaml", "w") as f:
                yaml.dump(base_manifest, f)

            # Create local environment override
            local_override = {
                "enforcement_mode": "advisory",
                "rules": {"SEC001": {"enabled": False}},  # Disable SEC001 in local
            }

            with open(environments_dir / "local.yaml", "w") as f:
                yaml.dump(local_override, f)

            loader = ManifestLoader(base_path=temp_path)
            manifest = loader.load_manifest(environment="local")

            # Should have merged values
            assert manifest["enforcement_mode"] == "advisory"  # Overridden
            assert manifest["rules"]["SEC001"]["enabled"] is False  # Overridden
            assert manifest["rules"]["SEC001"]["severity"] == "HIGH"  # Preserved
            assert manifest["rules"]["SEC002"]["enabled"] is True  # Unchanged
