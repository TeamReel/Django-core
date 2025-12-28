"""
Golden file tests for built-in templates.

Tests verify that templates generate expected output by comparing
rendered files against golden reference files.

NOTE: These tests are placeholders until WP04 implements full
code generation. The rendering engine can be tested independently.
"""

import tempfile
from pathlib import Path

import pytest
from scaffolding.rendering.engine import TemplateRenderer
from scaffolding.templates.registry import TemplateRegistry


@pytest.fixture
def temp_output_dir():
    """Provide temporary directory for generated output."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


class TestTemplateRegistry:
    """Test template registry discovery and retrieval."""

    def test_registry_instantiation(self):
        """Test TemplateRegistry can be created."""
        registry = TemplateRegistry()
        assert registry is not None

    def test_registry_has_discover_method(self):
        """Test TemplateRegistry has discover method."""
        registry = TemplateRegistry()
        assert callable(getattr(registry, "discover", None))

    def test_registry_has_list_templates_method(self):
        """Test TemplateRegistry has list_templates method."""
        registry = TemplateRegistry()
        assert callable(getattr(registry, "list_templates", None))

    def test_registry_has_get_template_method(self):
        """Test TemplateRegistry has get_template method."""
        registry = TemplateRegistry()
        assert callable(getattr(registry, "get_template", None))


class TestTemplateRenderer:
    """Test template rendering engine."""

    def test_renderer_instantiation(self):
        """Test TemplateRenderer can be created."""
        renderer = TemplateRenderer()
        assert renderer is not None

    def test_renderer_has_render_method(self):
        """Test TemplateRenderer has render method."""
        renderer = TemplateRenderer()
        assert callable(getattr(renderer, "render", None))

    def test_render_simple_variable(self):
        """Test rendering a simple variable substitution."""
        renderer = TemplateRenderer()
        template_str = "Hello, {{ name }}!"
        result = renderer.render(template_str, {"name": "World"})
        assert result == "Hello, World!"

    def test_render_conditional(self):
        """Test rendering conditional template logic."""
        renderer = TemplateRenderer()
        template_str = "{% if show %}Visible{% endif %}"

        result_true = renderer.render(template_str, {"show": True})
        assert result_true == "Visible"

        result_false = renderer.render(template_str, {"show": False})
        assert result_false == ""

    def test_render_loop(self):
        """Test rendering loop template logic."""
        renderer = TemplateRenderer()
        template_str = "{% for item in items %}{{ item }}{% endfor %}"

        result = renderer.render(template_str, {"items": ["a", "b", "c"]})
        assert result == "abc"


class TestMinimalTemplateGoldenFiles:
    """Test minimal template generates expected files."""

    @pytest.mark.skip(reason="WP04 will implement full generation")
    def test_minimal_generates_expected_structure(self, temp_output_dir):
        """Test minimal template creates expected directory structure."""
        pass

    @pytest.mark.skip(reason="WP04 will implement full generation")
    def test_minimal_init_py_content(self, temp_output_dir):
        """Test minimal template __init__.py matches golden file."""
        pass


class TestApiFirstTemplateGoldenFiles:
    """Test api-first template generates expected files."""

    @pytest.mark.skip(reason="WP04 will implement full generation")
    def test_api_first_generates_serializers(self, temp_output_dir):
        """Test api-first template generates serializers.py."""
        pass

    @pytest.mark.skip(reason="WP04 will implement full generation")
    def test_api_first_generates_views(self, temp_output_dir):
        """Test api-first template generates views.py."""
        pass


class TestServiceTemplateGoldenFiles:
    """Test service template generates expected files."""

    @pytest.mark.skip(reason="WP04 will implement full generation")
    def test_service_generates_services_module(self, temp_output_dir):
        """Test service template generates services/__init__.py."""
        pass
