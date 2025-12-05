"""Smoke tests for the scaffolding-demo example.

These tests verify that the scaffolding demo example has all required
components and follows project conventions.
"""
import ast
from pathlib import Path

import pytest

try:
    import yaml
except ImportError:
    yaml = None


EXAMPLE_DIR = Path(__file__).parent.parent.parent / "examples" / "scaffolding-demo"
TEMPLATE_DIR = EXAMPLE_DIR / "templates" / "custom-module"


class TestExampleStructure:
    """Tests for example directory structure."""

    def test_example_directory_exists(self):
        """Scaffolding demo example directory should exist."""
        assert EXAMPLE_DIR.exists(), "scaffolding-demo directory not found"

    def test_readme_exists(self):
        """README.md should exist."""
        readme = EXAMPLE_DIR / "README.md"
        assert readme.exists(), "README.md not found"

    def test_demo_script_exists(self):
        """Demo script should exist."""
        demo_script = EXAMPLE_DIR / "demo_scaffold.py"
        assert demo_script.exists(), "demo_scaffold.py not found"

    def test_tests_directory_exists(self):
        """Tests directory should exist."""
        tests_dir = EXAMPLE_DIR / "tests"
        assert tests_dir.exists(), "tests/ directory not found"

    def test_output_directory_exists(self):
        """Output directory should exist."""
        output_dir = EXAMPLE_DIR / "output"
        assert output_dir.exists(), "output/ directory not found"

    def test_template_directory_exists(self):
        """Template directory should exist."""
        assert TEMPLATE_DIR.exists(), "templates/custom-module directory not found"


class TestManifestFile:
    """Tests for manifest.yaml."""

    def test_manifest_exists(self):
        """manifest.yaml should exist."""
        manifest = TEMPLATE_DIR / "manifest.yaml"
        assert manifest.exists(), "manifest.yaml not found"

    @pytest.mark.skipif(yaml is None, reason="PyYAML not installed")
    def test_manifest_is_valid_yaml(self):
        """manifest.yaml should be valid YAML."""
        manifest = TEMPLATE_DIR / "manifest.yaml"
        content = manifest.read_text(encoding="utf-8")
        data = yaml.safe_load(content)
        assert isinstance(data, dict)

    @pytest.mark.skipif(yaml is None, reason="PyYAML not installed")
    def test_manifest_has_name(self):
        """manifest.yaml should have a name field."""
        manifest = TEMPLATE_DIR / "manifest.yaml"
        content = manifest.read_text(encoding="utf-8")
        data = yaml.safe_load(content)
        assert "name" in data

    @pytest.mark.skipif(yaml is None, reason="PyYAML not installed")
    def test_manifest_has_variables(self):
        """manifest.yaml should define variables."""
        manifest = TEMPLATE_DIR / "manifest.yaml"
        content = manifest.read_text(encoding="utf-8")
        data = yaml.safe_load(content)
        assert "variables" in data
        assert len(data["variables"]) > 0

    @pytest.mark.skipif(yaml is None, reason="PyYAML not installed")
    def test_manifest_has_files(self):
        """manifest.yaml should define file mappings."""
        manifest = TEMPLATE_DIR / "manifest.yaml"
        content = manifest.read_text(encoding="utf-8")
        data = yaml.safe_load(content)
        assert "files" in data
        assert len(data["files"]) > 0


class TestTemplateFiles:
    """Tests for Jinja2 template files."""

    EXPECTED_TEMPLATES = [
        "__init__.py.j2",
        "apps.py.j2",
        "models.py.j2",
        "views.py.j2",
        "serializers.py.j2",
        "urls.py.j2",
        "admin.py.j2",
        "tests.py.j2",
    ]

    @pytest.mark.parametrize("template_name", EXPECTED_TEMPLATES)
    def test_template_exists(self, template_name):
        """Template file should exist."""
        template = TEMPLATE_DIR / template_name
        assert template.exists(), f"{template_name} not found"

    @pytest.mark.parametrize("template_name", EXPECTED_TEMPLATES)
    def test_template_has_content(self, template_name):
        """Template file should have content."""
        template = TEMPLATE_DIR / template_name
        content = template.read_text(encoding="utf-8")
        assert len(content.strip()) > 0, f"{template_name} is empty"

    @pytest.mark.parametrize("template_name", EXPECTED_TEMPLATES)
    def test_template_uses_jinja2_syntax(self, template_name):
        """Template file should use Jinja2 syntax (has {{ or {%)."""
        template = TEMPLATE_DIR / template_name
        content = template.read_text(encoding="utf-8")
        has_variable = "{{" in content
        has_block = "{%" in content
        assert has_variable or has_block, f"{template_name} has no Jinja2 syntax"


class TestDemoScript:
    """Tests for demo_scaffold.py."""

    def test_demo_script_is_valid_python(self):
        """Demo script should be valid Python."""
        demo_script = EXAMPLE_DIR / "demo_scaffold.py"
        content = demo_script.read_text(encoding="utf-8")
        try:
            ast.parse(content)
        except SyntaxError as e:
            pytest.fail(f"demo_scaffold.py has syntax error: {e}")

    def test_demo_script_has_main_function(self):
        """Demo script should have a main function."""
        demo_script = EXAMPLE_DIR / "demo_scaffold.py"
        content = demo_script.read_text(encoding="utf-8")
        assert "def main(" in content, "main() function not found"

    def test_demo_script_has_docstring(self):
        """Demo script should have a module docstring."""
        demo_script = EXAMPLE_DIR / "demo_scaffold.py"
        content = demo_script.read_text(encoding="utf-8")
        tree = ast.parse(content)
        docstring = ast.get_docstring(tree)
        assert docstring is not None, "Module docstring not found"

    def test_demo_script_has_shebang(self):
        """Demo script should have a shebang line."""
        demo_script = EXAMPLE_DIR / "demo_scaffold.py"
        content = demo_script.read_text(encoding="utf-8")
        assert content.startswith("#!/usr/bin/env python"), "Shebang not found"

    def test_demo_script_has_render_function(self):
        """Demo script should have a render function."""
        demo_script = EXAMPLE_DIR / "demo_scaffold.py"
        content = demo_script.read_text(encoding="utf-8")
        assert "def render_templates(" in content, "render_templates() not found"


class TestExampleTests:
    """Tests for the example's own tests."""

    def test_test_file_exists(self):
        """Test file should exist."""
        test_file = EXAMPLE_DIR / "tests" / "test_scaffolding.py"
        assert test_file.exists(), "test_scaffolding.py not found"

    def test_test_file_is_valid_python(self):
        """Test file should be valid Python."""
        test_file = EXAMPLE_DIR / "tests" / "test_scaffolding.py"
        content = test_file.read_text(encoding="utf-8")
        try:
            ast.parse(content)
        except SyntaxError as e:
            pytest.fail(f"test_scaffolding.py has syntax error: {e}")

    def test_test_file_has_test_classes(self):
        """Test file should have test classes."""
        test_file = EXAMPLE_DIR / "tests" / "test_scaffolding.py"
        content = test_file.read_text(encoding="utf-8")
        assert "class TestManifestStructure:" in content
        assert "class TestTemplateValidity:" in content


class TestReadmeContent:
    """Tests for README.md content."""

    def test_readme_has_title(self):
        """README should have a title."""
        readme = EXAMPLE_DIR / "README.md"
        content = readme.read_text(encoding="utf-8")
        assert "# Scaffolding Demo Example" in content

    def test_readme_has_quick_start(self):
        """README should have a quick start section."""
        readme = EXAMPLE_DIR / "README.md"
        content = readme.read_text(encoding="utf-8")
        assert "Quick Start" in content or "## Quick" in content

    def test_readme_has_template_structure(self):
        """README should document template structure."""
        readme = EXAMPLE_DIR / "README.md"
        content = readme.read_text(encoding="utf-8")
        assert "manifest.yaml" in content

    def test_readme_has_variables_documentation(self):
        """README should document variables."""
        readme = EXAMPLE_DIR / "README.md"
        content = readme.read_text(encoding="utf-8")
        assert "Variables" in content
        assert "app_name" in content
        assert "model_name" in content

    def test_readme_has_best_practices(self):
        """README should have best practices section."""
        readme = EXAMPLE_DIR / "README.md"
        content = readme.read_text(encoding="utf-8")
        assert "Best Practices" in content or "best practices" in content
