"""
Unit tests for template rendering engine.

Tests Jinja2 rendering with variable substitution, built-in variables,
file processing, error handling, and cross-platform paths.
"""

import sys
from pathlib import Path

import pytest

try:
    from jinja2 import TemplateError
    from scaffolding.rendering.engine import (
        TemplateRenderer,
        create_jinja_env,
        get_builtin_variables,
    )
except ImportError:
    TemplateError = None
    TemplateRenderer = None
    create_jinja_env = None
    get_builtin_variables = None

if TemplateRenderer is None:
    pytest.skip("Skipping due to missing scaffolding dependencies", allow_module_level=True)


class TestJinja2Environment:
    """Test Jinja2 environment configuration."""

    def test_create_jinja_env(self, tmp_path):
        """Test Jinja2 environment creation with correct settings."""
        # Setup template directory
        template_dir = tmp_path / "templates"
        template_dir.mkdir()

        # Create environment
        env = create_jinja_env(template_dir)

        # Verify configuration
        assert env.autoescape is False  # Not HTML
        assert env.trim_blocks is True  # Clean whitespace
        assert env.lstrip_blocks is True  # Clean whitespace

        # Verify custom filters
        assert "snake_case" in env.filters
        assert "pascal_case" in env.filters
        assert "kebab_case" in env.filters

    def test_snake_case_filter(self, tmp_path):
        """Test snake_case filter converts names correctly."""
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        env = create_jinja_env(template_dir)

        # Test filter
        assert env.filters["snake_case"]("MyApp") == "myapp"
        assert env.filters["snake_case"]("my-app") == "my_app"
        assert env.filters["snake_case"]("my app") == "my_app"
        assert env.filters["snake_case"]("My-App Name") == "my_app_name"

    def test_pascal_case_filter(self, tmp_path):
        """Test pascal_case filter converts names correctly."""
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        env = create_jinja_env(template_dir)

        # Test filter
        assert env.filters["pascal_case"]("my_app") == "MyApp"
        assert env.filters["pascal_case"]("my-app") == "MyApp"
        assert env.filters["pascal_case"]("my app") == "MyApp"
        assert env.filters["pascal_case"]("my_app_name") == "MyAppName"

    def test_kebab_case_filter(self, tmp_path):
        """Test kebab_case filter converts names correctly."""
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        env = create_jinja_env(template_dir)

        # Test filter
        assert env.filters["kebab_case"]("MyApp") == "myapp"
        assert env.filters["kebab_case"]("my_app") == "my-app"
        assert env.filters["kebab_case"]("my app") == "my-app"
        assert env.filters["kebab_case"]("My_App Name") == "my-app-name"


class TestBuiltinVariables:
    """Test built-in template variables."""

    def test_get_builtin_variables_keys(self):
        """Test built-in variables contain expected keys."""
        builtin_vars = get_builtin_variables()

        # Verify all required keys present
        assert "timestamp" in builtin_vars
        assert "author" in builtin_vars
        assert "python_version" in builtin_vars
        assert "core_version" in builtin_vars
        assert "year" in builtin_vars

    def test_builtin_variables_types(self):
        """Test built-in variables have correct types."""
        builtin_vars = get_builtin_variables()

        # Verify types
        assert isinstance(builtin_vars["timestamp"], str)
        assert isinstance(builtin_vars["author"], str)
        assert isinstance(builtin_vars["python_version"], str)
        assert isinstance(builtin_vars["core_version"], str)
        assert isinstance(builtin_vars["year"], int)

    def test_builtin_variables_values(self):
        """Test built-in variables have reasonable values."""
        builtin_vars = get_builtin_variables()

        # Verify values
        assert len(builtin_vars["timestamp"]) > 0
        assert len(builtin_vars["author"]) > 0  # May be "Unknown"
        assert builtin_vars["python_version"].startswith(
            f"{sys.version_info.major}.{sys.version_info.minor}"
        )
        assert builtin_vars["core_version"] == "0.1.0"
        assert builtin_vars["year"] >= 2025


class TestTemplateRenderer:
    """Test TemplateRenderer class."""

    def test_renderer_initialization(self, tmp_path):
        """Test renderer initialization with variables."""
        template_dir = tmp_path / "templates"
        template_dir.mkdir()

        # Initialize renderer
        renderer = TemplateRenderer(template_dir, {"app_name": "payments"})

        # Verify attributes
        assert renderer.template_dir == template_dir
        assert "app_name" in renderer.variables
        assert renderer.variables["app_name"] == "payments"

        # Verify built-in variables merged
        assert "timestamp" in renderer.variables
        assert "author" in renderer.variables

    def test_render_simple_variable_substitution(self, tmp_path):
        """Test simple variable substitution in template."""
        # Setup template
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "test.py.j2").write_text('app_name = "{{ app_name }}"')

        # Render
        renderer = TemplateRenderer(template_dir, {"app_name": "payments"})
        output = renderer.render("test.py.j2")

        # Verify
        assert output == 'app_name = "payments"'

    def test_render_multiple_variables(self, tmp_path):
        """Test multiple variable substitution in template."""
        # Setup template
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        template_content = """
# {{ project_name }} / {{ app_name }}
class {{ app_name|pascal_case }}Config:
    name = '{{ app_name }}'
"""
        (template_dir / "apps.py.j2").write_text(template_content)

        # Render
        renderer = TemplateRenderer(template_dir, {"project_name": "core", "app_name": "payments"})
        output = renderer.render("apps.py.j2")

        # Verify
        assert "# core / payments" in output
        assert "class PaymentsConfig:" in output
        assert "name = 'payments'" in output

    def test_render_with_builtin_variables(self, tmp_path):
        """Test built-in variables available in templates."""
        # Setup template
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        template_content = """
# Generated on {{ timestamp }}
# Author: {{ author }}
# Python {{ python_version }}
# Core {{ core_version }}
# Copyright {{ year }}
"""
        (template_dir / "header.py.j2").write_text(template_content)

        # Render
        renderer = TemplateRenderer(template_dir, {})
        output = renderer.render("header.py.j2")

        # Verify built-in variables present
        assert "Generated on" in output
        assert "Author:" in output
        assert "Python" in output
        assert "Core 0.1.0" in output
        assert "Copyright" in output

    def test_render_with_jinja2_filters(self, tmp_path):
        """Test Jinja2 custom filters work correctly."""
        # Setup template
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        template_content = """
snake: {{ name|snake_case }}
pascal: {{ name|pascal_case }}
kebab: {{ name|kebab_case }}
"""
        (template_dir / "filters.txt.j2").write_text(template_content)

        # Render
        renderer = TemplateRenderer(template_dir, {"name": "My-App Name"})
        output = renderer.render("filters.txt.j2")

        # Verify filters applied
        assert "snake: my_app_name" in output
        assert "pascal: MyAppName" in output
        assert "kebab: my-app-name" in output

    def test_render_directory_with_j2_files(self, tmp_path):
        """Test rendering directory with .j2 template files."""
        # Setup templates
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "models.py.j2").write_text("# {{ app_name }} models")
        (template_dir / "views.py.j2").write_text("# {{ app_name }} views")

        # Render
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        renderer = TemplateRenderer(template_dir, {"app_name": "payments"})
        created_files = renderer.render_directory(output_dir)

        # Verify
        assert len(created_files) == 2
        assert (output_dir / "models.py").exists()
        assert (output_dir / "views.py").exists()
        assert (output_dir / "models.py").read_text() == "# payments models"
        assert (output_dir / "views.py").read_text() == "# payments views"

        # Verify .j2 suffix removed
        assert not (output_dir / "models.py.j2").exists()

    def test_render_directory_with_non_template_files(self, tmp_path):
        """Test non-template files copied unchanged."""
        # Setup templates
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "README.md").write_text("# README\n{{ app_name }}")  # No .j2

        # Render
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        renderer = TemplateRenderer(template_dir, {"app_name": "payments"})
        created_files = renderer.render_directory(output_dir)

        # Verify file copied unchanged (not rendered)
        assert len(created_files) == 1
        assert (output_dir / "README.md").exists()
        assert (output_dir / "README.md").read_text() == "# README\n{{ app_name }}"

    def test_render_directory_with_nested_structure(self, tmp_path):
        """Test directory rendering preserves nested structure."""
        # Setup templates
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "src").mkdir()
        (template_dir / "src" / "models.py.j2").write_text("# models")
        (template_dir / "tests").mkdir()
        (template_dir / "tests" / "test_models.py.j2").write_text("# tests")

        # Render
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        renderer = TemplateRenderer(template_dir, {})
        created_files = renderer.render_directory(output_dir)

        # Verify structure preserved
        assert len(created_files) == 2
        assert (output_dir / "src" / "models.py").exists()
        assert (output_dir / "tests" / "test_models.py").exists()

    def test_render_directory_skips_manifest(self, tmp_path):
        """Test __template__.yaml manifest file skipped."""
        # Setup templates
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "__template__.yaml").write_text("name: test")
        (template_dir / "models.py.j2").write_text("# models")

        # Render
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        renderer = TemplateRenderer(template_dir, {})
        created_files = renderer.render_directory(output_dir)

        # Verify manifest skipped
        assert len(created_files) == 1
        assert not (output_dir / "__template__.yaml").exists()
        assert (output_dir / "models.py").exists()

    def test_render_syntax_error_handling(self, tmp_path):
        """Test error handling for Jinja2 syntax errors."""
        # Setup template with syntax error (unclosed block)
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "bad.py.j2").write_text(
            "{% for item in items %}\n{{ item }}"
        )  # Missing {% endfor %}

        # Attempt render
        renderer = TemplateRenderer(template_dir, {"items": ["a", "b"]})

        with pytest.raises(TemplateError, match="Template syntax error"):
            renderer.render("bad.py.j2")

    def test_render_undefined_variable_error(self, tmp_path):
        """Test error handling for undefined variables."""
        # Setup template with undefined variable
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "test.py.j2").write_text("name = {{ undefined_var }}")

        # Attempt render
        renderer = TemplateRenderer(template_dir, {})

        with pytest.raises(TemplateError, match="Undefined variable"):
            renderer.render("test.py.j2")

    def test_render_directory_continues_on_error(self, tmp_path):
        """Test directory rendering continues after per-file errors."""
        # Setup templates (one good, one bad)
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "good.py.j2").write_text("# good")
        (template_dir / "bad.py.j2").write_text("{{ undefined }}")  # Error

        # Render
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        renderer = TemplateRenderer(template_dir, {})
        created_files = renderer.render_directory(output_dir)

        # Verify good file created, bad file skipped
        assert len(created_files) == 1
        assert (output_dir / "good.py").exists()
        assert not (output_dir / "bad.py").exists()

    def test_cross_platform_paths(self, tmp_path):
        """Test pathlib handles cross-platform paths correctly."""
        # Setup templates
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "test.py.j2").write_text("# test")

        # Render
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        renderer = TemplateRenderer(template_dir, {})
        created_files = renderer.render_directory(output_dir)

        # Verify Path objects used (cross-platform)
        assert len(created_files) == 1
        assert isinstance(created_files[0], Path)

        # Verify output path uses forward slashes (POSIX style)
        output_path_str = created_files[0].as_posix()
        assert "/" in output_path_str or "\\" not in output_path_str  # Unix or no path


class TestRenderWithInheritance:
    """Test template inheritance rendering."""

    def test_render_with_inheritance_uses_directory_render(self, tmp_path):
        """Test inheritance rendering delegates to render_directory."""
        # Setup templates
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        (template_dir / "models.py.j2").write_text("# models")

        # Create mock manifest (not used in current implementation)
        from scaffolding.templates.manifest import TemplateManifest

        manifest = TemplateManifest(
            name="test",
            version="1.0.0",
            description="Test template",
            files=["models.py.j2"],
        )

        # Render
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        renderer = TemplateRenderer(template_dir, {})
        created_files = renderer.render_with_inheritance(manifest, output_dir)

        # Verify files created (inheritance already resolved in WP02)
        assert len(created_files) == 1
        assert (output_dir / "models.py").exists()


class TestGoldenFiles:
    """Test rendering against golden files (expected output)."""

    def test_golden_file_django_app(self, tmp_path):
        """Test rendering Django app config against golden file."""
        # Setup template
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        template_content = """# {{ app_name|pascal_case }} App Configuration
# Generated on {{ timestamp }}

from django.apps import AppConfig


class {{ app_name|pascal_case }}Config(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = '{{ app_name }}'
"""
        (template_dir / "apps.py.j2").write_text(template_content)

        # Render
        renderer = TemplateRenderer(
            template_dir, {"app_name": "payments", "timestamp": "2025-12-04T12:00:00"}
        )
        output = renderer.render("apps.py.j2")

        # Golden file expectation
        expected = """# Payments App Configuration
# Generated on 2025-12-04T12:00:00

from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payments'
"""

        # Verify exact match
        assert output == expected

    def test_golden_file_django_model(self, tmp_path):
        """Test rendering Django model against golden file."""
        # Setup template
        template_dir = tmp_path / "templates"
        template_dir.mkdir()
        template_content = """# {{ app_name|pascal_case }} Models

from django.db import models


class {{ model_name|pascal_case }}(models.Model):
    \"\"\"{{ model_description }}\"\"\"
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = '{{ app_name }}'
"""
        (template_dir / "models.py.j2").write_text(template_content)

        # Render
        renderer = TemplateRenderer(
            template_dir,
            {
                "app_name": "payments",
                "model_name": "transaction",
                "model_description": "Payment transaction record",
            },
        )
        output = renderer.render("models.py.j2")

        # Golden file expectation
        expected = """# Payments Models

from django.db import models


class Transaction(models.Model):
    \"\"\"Payment transaction record\"\"\"
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'payments'
"""

        # Verify exact match
        assert output == expected
