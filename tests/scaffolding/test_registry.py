"""
Unit tests for template discovery system.

Tests TemplateRegistry, loaders, manifest parsing, inheritance resolution,
and conflict detection with mock filesystem.
"""

import logging
from pathlib import Path

import pytest
import yaml

from scaffolding.templates.loaders import FilesystemLoader, PluginLoader
from scaffolding.templates.manifest import TemplateManifest
from scaffolding.templates.registry import TemplateRegistry


# Fixtures


@pytest.fixture
def clean_registry():
    """Reset registry singleton between tests."""
    TemplateRegistry._instance = None
    yield
    TemplateRegistry._instance = None


@pytest.fixture
def minimal_manifest_data():
    """Minimal valid manifest data."""
    return {
        "name": "minimal",
        "description": "Minimal Django app",
        "variables": {
            "app_name": {
                "type": "string",
                "description": "App name",
                "required": True,
            }
        },
        "files": ["models.py", "apps.py"],
    }


@pytest.fixture
def create_template_dir(tmp_path):
    """Factory to create template directories with manifests."""

    def _create(name: str, manifest_data: dict, files: list[str] = None):
        template_dir = tmp_path / name
        template_dir.mkdir(parents=True)

        # Write manifest
        manifest_path = template_dir / "__template__.yaml"
        with open(manifest_path, "w") as f:
            yaml.safe_dump(manifest_data, f)

        # Create template files
        if files:
            for file_name in files:
                (template_dir / file_name).write_text(f"# {file_name}\n")

        return template_dir

    return _create


# Test TemplateManifest


def test_manifest_from_yaml_valid(tmp_path, minimal_manifest_data):
    """Test loading valid manifest from YAML."""
    manifest_path = tmp_path / "__template__.yaml"
    with open(manifest_path, "w") as f:
        yaml.safe_dump(minimal_manifest_data, f)

    manifest = TemplateManifest.from_yaml(manifest_path)

    assert manifest.name == "minimal"
    assert manifest.description == "Minimal Django app"
    assert "app_name" in manifest.variables
    assert manifest.files == ["models.py", "apps.py"]
    assert manifest.template_dir == tmp_path
    assert manifest.extends is None


def test_manifest_from_yaml_with_extends(tmp_path, minimal_manifest_data):
    """Test loading manifest with inheritance."""
    minimal_manifest_data["extends"] = "base"
    manifest_path = tmp_path / "__template__.yaml"
    with open(manifest_path, "w") as f:
        yaml.safe_dump(minimal_manifest_data, f)

    manifest = TemplateManifest.from_yaml(manifest_path)

    assert manifest.extends == "base"


def test_manifest_from_yaml_missing_required_field(tmp_path):
    """Test error on missing required field."""
    manifest_path = tmp_path / "__template__.yaml"
    with open(manifest_path, "w") as f:
        yaml.safe_dump({"name": "test"}, f)

    with pytest.raises(ValueError, match="Missing required fields"):
        TemplateManifest.from_yaml(manifest_path)


def test_manifest_from_yaml_invalid_type(tmp_path):
    """Test error on invalid field type."""
    manifest_path = tmp_path / "__template__.yaml"
    data = {
        "name": 123,  # Should be string
        "description": "Test",
        "variables": {},
        "files": [],
    }
    with open(manifest_path, "w") as f:
        yaml.safe_dump(data, f)

    with pytest.raises(ValueError, match="Field 'name' must be string"):
        TemplateManifest.from_yaml(manifest_path)


def test_manifest_validate_missing_file(
    tmp_path, minimal_manifest_data, create_template_dir
):
    """Test validation detects missing files."""
    # Create template but don't create the files
    create_template_dir("minimal", minimal_manifest_data, files=[])

    manifest_path = tmp_path / "minimal" / "__template__.yaml"
    manifest = TemplateManifest.from_yaml(manifest_path)

    errors = manifest.validate()

    assert len(errors) == 2  # models.py and apps.py missing
    assert any("models.py" in error for error in errors)
    assert any("apps.py" in error for error in errors)


def test_manifest_validate_missing_variable_fields(
    tmp_path, minimal_manifest_data
):
    """Test validation detects incomplete variable definitions."""
    # Remove required field from variable
    minimal_manifest_data["variables"]["app_name"] = {
        "type": "string"
        # Missing 'description' and 'required'
    }

    manifest_path = tmp_path / "__template__.yaml"
    with open(manifest_path, "w") as f:
        yaml.safe_dump(minimal_manifest_data, f)

    manifest = TemplateManifest.from_yaml(manifest_path)
    errors = manifest.validate()

    assert len(errors) == 4  # 2 missing variable fields + 2 missing files
    assert any("'app_name' missing 'description'" in error for error in errors)
    assert any("'app_name' missing 'required'" in error for error in errors)


def test_manifest_validate_circular_inheritance(
    tmp_path, minimal_manifest_data
):
    """Test validation detects circular inheritance."""
    minimal_manifest_data["extends"] = "minimal"  # Extends itself

    manifest_path = tmp_path / "__template__.yaml"
    with open(manifest_path, "w") as f:
        yaml.safe_dump(minimal_manifest_data, f)

    manifest = TemplateManifest.from_yaml(manifest_path)
    errors = manifest.validate()

    assert any("circular inheritance" in error for error in errors)


# Test FilesystemLoader


def test_filesystem_loader_load_from_directory(
    tmp_path, minimal_manifest_data, create_template_dir
):
    """Test loading templates from directory."""
    create_template_dir("minimal", minimal_manifest_data, ["models.py", "apps.py"])

    templates = FilesystemLoader.load_from_directory(tmp_path)

    assert len(templates) == 1
    assert "minimal" in templates
    assert templates["minimal"].name == "minimal"


def test_filesystem_loader_missing_directory(tmp_path):
    """Test loading from non-existent directory returns empty dict."""
    missing_dir = tmp_path / "does_not_exist"

    templates = FilesystemLoader.load_from_directory(missing_dir)

    assert templates == {}


def test_filesystem_loader_skip_invalid_manifest(tmp_path):
    """Test loader skips templates with invalid manifests."""
    # Create valid template
    valid_dir = tmp_path / "valid"
    valid_dir.mkdir()
    (valid_dir / "__template__.yaml").write_text(
        """
name: valid
description: Valid template
variables: {}
files: []
"""
    )

    # Create invalid template (malformed YAML)
    invalid_dir = tmp_path / "invalid"
    invalid_dir.mkdir()
    (invalid_dir / "__template__.yaml").write_text("name: invalid\n  bad: yaml: syntax")

    templates = FilesystemLoader.load_from_directory(tmp_path)

    # Only valid template should be loaded
    assert len(templates) == 1
    assert "valid" in templates


def test_filesystem_loader_skip_directories_without_manifest(tmp_path):
    """Test loader skips directories without __template__.yaml."""
    no_manifest_dir = tmp_path / "no_manifest"
    no_manifest_dir.mkdir()
    (no_manifest_dir / "some_file.txt").write_text("content")

    templates = FilesystemLoader.load_from_directory(tmp_path)

    assert templates == {}


# Test TemplateRegistry


def test_registry_singleton(clean_registry):
    """Test registry is singleton."""
    registry1 = TemplateRegistry()
    registry2 = TemplateRegistry()

    assert registry1 is registry2


def test_registry_discover_builtin_templates(
    clean_registry, tmp_path, monkeypatch, minimal_manifest_data, create_template_dir
):
    """Test discovery of built-in templates."""
    # Create mock built-in templates directory
    builtin_dir = tmp_path / "built_in_templates"
    builtin_dir.mkdir()

    create_template_dir(
        "minimal",
        minimal_manifest_data,
        ["models.py", "apps.py"],
    )

    # Move created template to builtin_dir
    (tmp_path / "minimal").rename(builtin_dir / "minimal")

    # Monkeypatch builtin templates path
    def mock_builtin_discovery(self):
        templates = FilesystemLoader.load_from_directory(builtin_dir)
        for template in templates.values():
            self._add_template(template, "Core built-in")

    monkeypatch.setattr(
        TemplateRegistry,
        "_discover_builtin_templates",
        mock_builtin_discovery,
    )

    registry = TemplateRegistry()
    registry.discover()

    templates = registry.list_templates()
    assert len(templates) == 1
    assert templates[0].name == "minimal"


def test_registry_template_precedence_override(
    clean_registry, tmp_path, monkeypatch, caplog, create_template_dir
):
    """Test project-local template overrides Core template."""
    caplog.set_level(logging.WARNING)

    # Create Core template
    core_manifest = {
        "name": "test",
        "description": "Core template",
        "variables": {},
        "files": [],
    }

    # Create project template with same name
    project_manifest = {
        "name": "test",
        "description": "Project template",
        "variables": {},
        "files": [],
    }

    core_dir = tmp_path / "core"
    core_dir.mkdir()
    create_template_dir("test", core_manifest)
    (tmp_path / "test").rename(core_dir / "test")

    project_dir = tmp_path / "project"
    project_dir.mkdir()
    create_template_dir("test", project_manifest)
    (tmp_path / "test").rename(project_dir / "test")

    # Monkeypatch discovery methods
    def mock_builtin_discovery(self):
        templates = FilesystemLoader.load_from_directory(core_dir)
        for template in templates.values():
            self._add_template(template, "Core built-in")

    def mock_project_discovery(self):
        templates = FilesystemLoader.load_from_directory(project_dir)
        for template in templates.values():
            self._add_template(template, "project-local")

    monkeypatch.setattr(
        TemplateRegistry,
        "_discover_builtin_templates",
        mock_builtin_discovery,
    )
    monkeypatch.setattr(
        TemplateRegistry,
        "_discover_project_templates",
        mock_project_discovery,
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_plugin_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_configured_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_validate_all_templates", lambda self: None
    )

    registry = TemplateRegistry()
    registry.discover()

    # Project template should override Core template
    template = registry.get_template("test")
    assert template.description == "Project template"

    # Warning should be logged
    assert "overrides" in caplog.text


def test_registry_resolve_inheritance_simple(
    clean_registry, tmp_path, monkeypatch, create_template_dir
):
    """Test simple template inheritance (1 level)."""
    # Create base template
    base_manifest = {
        "name": "base",
        "description": "Base template",
        "variables": {"var1": {"type": "string", "description": "Var 1", "required": True}},
        "files": ["base_file.py"],
    }

    # Create child template extending base
    child_manifest = {
        "name": "child",
        "description": "Child template",
        "extends": "base",
        "variables": {"var2": {"type": "string", "description": "Var 2", "required": True}},
        "files": ["child_file.py"],
    }

    create_template_dir("base", base_manifest, ["base_file.py"])
    create_template_dir("child", child_manifest, ["child_file.py"])

    # Mock discovery
    def mock_discovery(self):
        templates = FilesystemLoader.load_from_directory(tmp_path)
        for template in templates.values():
            self._add_template(template, "test")

    monkeypatch.setattr(
        TemplateRegistry,
        "_discover_builtin_templates",
        mock_discovery,
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_plugin_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_configured_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_project_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_validate_all_templates", lambda self: None
    )

    registry = TemplateRegistry()
    registry.discover()

    # Resolve inheritance
    resolved = registry.resolve_inheritance("child")

    # Should have files from both base and child
    assert "base_file.py" in resolved.files
    assert "child_file.py" in resolved.files

    # Should have variables from both
    assert "var1" in resolved.variables
    assert "var2" in resolved.variables


def test_registry_resolve_inheritance_depth_limit(
    clean_registry, tmp_path, monkeypatch, create_template_dir
):
    """Test error on inheritance depth > 2."""
    # Create 4-level chain: grandgrandparent → grandparent → parent → child
    create_template_dir(
        "level0",
        {
            "name": "level0",
            "description": "Level 0",
            "variables": {},
            "files": [],
        },
    )
    create_template_dir(
        "level1",
        {
            "name": "level1",
            "description": "Level 1",
            "extends": "level0",
            "variables": {},
            "files": [],
        },
    )
    create_template_dir(
        "level2",
        {
            "name": "level2",
            "description": "Level 2",
            "extends": "level1",
            "variables": {},
            "files": [],
        },
    )
    create_template_dir(
        "level3",
        {
            "name": "level3",
            "description": "Level 3",
            "extends": "level2",
            "variables": {},
            "files": [],
        },
    )

    # Mock discovery
    def mock_discovery(self):
        templates = FilesystemLoader.load_from_directory(tmp_path)
        for template in templates.values():
            self._add_template(template, "test")

    monkeypatch.setattr(
        TemplateRegistry,
        "_discover_builtin_templates",
        mock_discovery,
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_plugin_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_configured_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_project_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_validate_all_templates", lambda self: None
    )

    registry = TemplateRegistry()
    registry.discover()

    # Attempting to resolve level3 should fail (depth > 2)
    with pytest.raises(ValueError, match="inheritance depth > 2"):
        registry.resolve_inheritance("level3")


def test_registry_get_template_not_found(clean_registry):
    """Test error when template not found."""
    registry = TemplateRegistry()
    registry._discovered = True  # Skip discovery

    with pytest.raises(KeyError, match="Template 'missing' not found"):
        registry.get_template("missing")


def test_registry_list_templates_sorted(
    clean_registry, tmp_path, monkeypatch, create_template_dir
):
    """Test list_templates returns templates sorted by name."""
    create_template_dir(
        "zebra",
        {
            "name": "zebra",
            "description": "Z template",
            "variables": {},
            "files": [],
        },
    )
    create_template_dir(
        "alpha",
        {
            "name": "alpha",
            "description": "A template",
            "variables": {},
            "files": [],
        },
    )
    create_template_dir(
        "beta",
        {
            "name": "beta",
            "description": "B template",
            "variables": {},
            "files": [],
        },
    )

    # Mock discovery
    def mock_discovery(self):
        templates = FilesystemLoader.load_from_directory(tmp_path)
        for template in templates.values():
            self._add_template(template, "test")

    monkeypatch.setattr(
        TemplateRegistry,
        "_discover_builtin_templates",
        mock_discovery,
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_plugin_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_configured_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_discover_project_templates", lambda self: None
    )
    monkeypatch.setattr(
        TemplateRegistry, "_validate_all_templates", lambda self: None
    )

    registry = TemplateRegistry()
    registry.discover()

    templates = registry.list_templates()

    # Should be sorted alphabetically
    assert len(templates) == 3
    assert templates[0].name == "alpha"
    assert templates[1].name == "beta"
    assert templates[2].name == "zebra"
