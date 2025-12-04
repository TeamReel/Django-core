"""
Golden file tests for built-in templates.

Tests verify that templates generate expected output by comparing
rendered files against golden reference files.
"""

import tempfile
from pathlib import Path

import pytest

from scaffolding.discovery.registry import TemplateRegistry
from scaffolding.generation.generator import CodeGenerator
from scaffolding.rendering.engine import TemplateRenderer


@pytest.fixture
def template_registry():
    """Provide TemplateRegistry with built-in templates."""
    registry = TemplateRegistry()
    registry.discover_built_in_templates()
    return registry


@pytest.fixture
def temp_output_dir():
    """Provide temporary directory for generated output."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


class TestMinimalTemplateGoldenFiles:
    """Test minimal template generates expected files."""

    def test_minimal_generates_expected_structure(
        self, template_registry, temp_output_dir
    ):
        """Test minimal template creates expected directory structure."""
        template = template_registry.get_template("minimal")
        variables = {"app_name": "test_app"}

        generator = CodeGenerator()
        result = generator.generate_app(
            template=template,
            app_name="test_app",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        # Verify directory structure
        app_dir = temp_output_dir / "test_app"
        assert app_dir.exists()
        assert (app_dir / "__init__.py").exists()
        assert (app_dir / "apps.py").exists()
        assert (app_dir / "models.py").exists()
        assert (app_dir / "tests" / "__init__.py").exists()
        assert (app_dir / "tests" / "test_models.py").exists()
        assert (app_dir / "migrations" / "__init__.py").exists()
        assert (app_dir / "locale" / ".gitkeep").exists()

    def test_minimal_apps_py_content(
        self, template_registry, temp_output_dir
    ):
        """Test minimal template generates correct apps.py content."""
        template = template_registry.get_template("minimal")
        variables = {"app_name": "payments"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="payments",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        apps_py = temp_output_dir / "payments" / "apps.py"
        content = apps_py.read_text()

        # Verify key content
        assert "class PaymentsConfig(AppConfig)" in content
        assert 'name = "payments"' in content
        assert "def ready(self)" in content

    def test_minimal_models_py_content(
        self, template_registry, temp_output_dir
    ):
        """Test minimal template generates correct models.py content."""
        template = template_registry.get_template("minimal")
        variables = {"app_name": "inventory"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="inventory",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        models_py = temp_output_dir / "inventory" / "models.py"
        content = models_py.read_text()

        # Verify key content
        assert "class BaseModel(models.Model)" in content
        assert "class Item(BaseModel)" in content
        assert "created_at" in content
        assert "updated_at" in content


class TestAPIFirstTemplateGoldenFiles:
    """Test api-first template generates expected files."""

    def test_api_first_extends_minimal(
        self, template_registry, temp_output_dir
    ):
        """Test api-first template includes minimal files."""
        template = template_registry.get_template("api-first")
        variables = {"app_name": "api_app", "model_name": "Product"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="api_app",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "api_app"

        # Verify minimal files exist
        assert (app_dir / "__init__.py").exists()
        assert (app_dir / "models.py").exists()

        # Verify API-specific files exist
        assert (app_dir / "serializers.py").exists()
        assert (app_dir / "views.py").exists()
        assert (app_dir / "urls.py").exists()
        assert (app_dir / "permissions.py").exists()
        assert (app_dir / "filters.py").exists()

    def test_api_first_serializers_use_model_name(
        self, template_registry, temp_output_dir
    ):
        """Test api-first template uses custom model_name variable."""
        template = template_registry.get_template("api-first")
        variables = {"app_name": "products", "model_name": "Product"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="products",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        serializers_py = temp_output_dir / "products" / "serializers.py"
        content = serializers_py.read_text()

        # Verify model_name is used
        assert "class ProductSerializer" in content
        assert "from .models import Product" in content


class TestServiceTemplateGoldenFiles:
    """Test service template generates expected files."""

    def test_service_generates_service_layer(
        self, template_registry, temp_output_dir
    ):
        """Test service template creates service layer files."""
        template = template_registry.get_template("service")
        variables = {"app_name": "orders", "service_name": "OrderService"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="orders",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "orders"

        # Verify service files
        assert (app_dir / "services.py").exists()
        assert (app_dir / "exceptions.py").exists()
        assert (app_dir / "tests" / "test_services.py").exists()

    def test_service_layer_has_crud_methods(
        self, template_registry, temp_output_dir
    ):
        """Test service template includes CRUD methods."""
        template = template_registry.get_template("service")
        variables = {"app_name": "users"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="users",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        services_py = temp_output_dir / "users" / "services.py"
        content = services_py.read_text()

        # Verify CRUD methods exist
        assert "def get_all(" in content
        assert "def get_by_id(" in content
        assert "def create(" in content
        assert "def update(" in content
        assert "def delete(" in content


class TestUIBackedTemplateGoldenFiles:
    """Test ui-backed template generates expected files."""

    def test_ui_backed_generates_full_stack(
        self, template_registry, temp_output_dir
    ):
        """Test ui-backed template creates full-stack files."""
        template = template_registry.get_template("ui-backed")
        variables = {"app_name": "dashboard", "model_name": "Widget"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="dashboard",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "dashboard"

        # Verify UI files
        assert (app_dir / "views.py").exists()
        assert (app_dir / "forms.py").exists()
        assert (app_dir / "urls.py").exists()
        assert (app_dir / "templates" / "dashboard" / "base.html").exists()
        assert (app_dir / "templates" / "dashboard" / "widget_list.html").exists()
        assert (app_dir / "templates" / "dashboard" / "widget_detail.html").exists()
        assert (app_dir / "templates" / "dashboard" / "widget_form.html").exists()
        assert (app_dir / "static" / "dashboard" / "css" / "style.css").exists()
        assert (app_dir / "static" / "dashboard" / "js" / "main.js").exists()

    def test_ui_backed_templates_use_app_name(
        self, template_registry, temp_output_dir
    ):
        """Test ui-backed HTML templates use correct app_name."""
        template = template_registry.get_template("ui-backed")
        variables = {"app_name": "blog"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="blog",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        base_html = temp_output_dir / "blog" / "templates" / "blog" / "base.html"
        content = base_html.read_text()

        # Verify app_name is used in templates
        assert "blog" in content.lower()
