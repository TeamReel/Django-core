"""Tests for scaffolding demo templates.

These tests validate that:
1. The manifest.yaml is valid YAML and has required fields
2. All templates are valid Jinja2
3. Templates render correctly with example variables
4. Generated code has expected patterns
"""
import pytest
from pathlib import Path

try:
    from jinja2 import Environment, FileSystemLoader, TemplateSyntaxError
    import yaml
except ImportError:
    pytest.skip("jinja2 and pyyaml required", allow_module_level=True)


# Paths
EXAMPLE_DIR = Path(__file__).parent.parent
TEMPLATE_DIR = EXAMPLE_DIR / "templates" / "custom-module"
MANIFEST_PATH = TEMPLATE_DIR / "manifest.yaml"


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def manifest() -> dict:
    """Load the template manifest."""
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


@pytest.fixture
def jinja_env() -> Environment:
    """Create a Jinja2 environment for the templates."""
    return Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        keep_trailing_newline=True,
    )


@pytest.fixture
def example_variables() -> dict:
    """Provide example variables for template rendering."""
    return {
        "app_name": "inventory",
        "model_name": "Product",
        "model_name_plural": "Products",
        "include_tests": True,
        "include_serializers": True,
        "include_urls": True,
        "author": "Test Author",
    }


# ============================================================================
# Manifest Tests
# ============================================================================


class TestManifestStructure:
    """Tests for manifest.yaml structure."""

    def test_manifest_exists(self):
        """Manifest file should exist."""
        assert MANIFEST_PATH.exists(), "manifest.yaml not found"

    def test_manifest_is_valid_yaml(self):
        """Manifest should be valid YAML."""
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        assert isinstance(data, dict)

    def test_manifest_has_required_metadata(self, manifest):
        """Manifest should have required metadata fields."""
        required_fields = ["name", "description", "version"]
        for field in required_fields:
            assert field in manifest, f"Missing required field: {field}"

    def test_manifest_has_variables(self, manifest):
        """Manifest should define variables."""
        assert "variables" in manifest
        assert isinstance(manifest["variables"], list)
        assert len(manifest["variables"]) > 0

    def test_manifest_has_files(self, manifest):
        """Manifest should define files."""
        assert "files" in manifest
        assert isinstance(manifest["files"], list)
        assert len(manifest["files"]) > 0

    def test_variables_have_required_fields(self, manifest):
        """Each variable should have name and description."""
        for var in manifest["variables"]:
            assert "name" in var, f"Variable missing 'name': {var}"
            assert "description" in var, f"Variable missing 'description': {var}"

    def test_files_have_required_fields(self, manifest):
        """Each file entry should have source and destination."""
        for file_spec in manifest["files"]:
            assert "source" in file_spec, f"File missing 'source': {file_spec}"
            assert "destination" in file_spec, f"File missing 'destination': {file_spec}"


# ============================================================================
# Template Tests
# ============================================================================


class TestTemplateValidity:
    """Tests for Jinja2 template validity."""

    def test_all_templates_exist(self, manifest):
        """All template files referenced in manifest should exist."""
        for file_spec in manifest["files"]:
            source = file_spec["source"]
            template_path = TEMPLATE_DIR / source
            assert template_path.exists(), f"Template not found: {source}"

    def test_all_templates_are_valid_jinja2(self, manifest, jinja_env):
        """All templates should be valid Jinja2 syntax."""
        for file_spec in manifest["files"]:
            source = file_spec["source"]
            try:
                jinja_env.get_template(source)
            except TemplateSyntaxError as e:
                pytest.fail(f"Invalid Jinja2 syntax in {source}: {e}")

    def test_templates_render_without_errors(
        self, manifest, jinja_env, example_variables
    ):
        """All templates should render without errors."""
        for file_spec in manifest["files"]:
            source = file_spec["source"]
            template = jinja_env.get_template(source)
            try:
                template.render(**example_variables)
            except Exception as e:
                pytest.fail(f"Error rendering {source}: {e}")


# ============================================================================
# Rendered Output Tests
# ============================================================================


class TestRenderedOutput:
    """Tests for rendered template content."""

    def test_models_contains_model_class(self, jinja_env, example_variables):
        """Rendered models.py should contain the model class."""
        template = jinja_env.get_template("models.py.j2")
        content = template.render(**example_variables)

        assert "class Product(models.Model):" in content
        assert "class Meta:" in content
        assert 'verbose_name = "product"' in content

    def test_views_contains_viewset(self, jinja_env, example_variables):
        """Rendered views.py should contain ViewSet."""
        template = jinja_env.get_template("views.py.j2")
        content = template.render(**example_variables)

        assert "class ProductViewSet(" in content
        assert "queryset" in content

    def test_serializers_contains_serializer_class(self, jinja_env, example_variables):
        """Rendered serializers.py should contain serializer class."""
        template = jinja_env.get_template("serializers.py.j2")
        content = template.render(**example_variables)

        assert "class ProductSerializer(" in content
        assert "class Meta:" in content

    def test_urls_contains_router(self, jinja_env, example_variables):
        """Rendered urls.py should contain router configuration."""
        template = jinja_env.get_template("urls.py.j2")
        content = template.render(**example_variables)

        assert "router" in content
        assert "urlpatterns" in content

    def test_admin_contains_admin_class(self, jinja_env, example_variables):
        """Rendered admin.py should contain admin class."""
        template = jinja_env.get_template("admin.py.j2")
        content = template.render(**example_variables)

        assert "class ProductAdmin(" in content
        assert "@admin.register" in content

    def test_apps_contains_config_class(self, jinja_env, example_variables):
        """Rendered apps.py should contain AppConfig class."""
        template = jinja_env.get_template("apps.py.j2")
        content = template.render(**example_variables)

        assert "class InventoryConfig(AppConfig):" in content
        assert "name = 'inventory'" in content

    def test_tests_contains_test_classes(self, jinja_env, example_variables):
        """Rendered tests.py should contain test classes."""
        template = jinja_env.get_template("tests.py.j2")
        content = template.render(**example_variables)

        assert "class TestProductModel:" in content
        assert "class TestProductAPI:" in content
        assert "pytest" in content


# ============================================================================
# Variable Substitution Tests
# ============================================================================


class TestVariableSubstitution:
    """Tests for variable substitution in templates."""

    @pytest.mark.parametrize(
        "model_name",
        [
            "Product",
            "Order",
            "Customer",
            "Invoice",
        ],
    )
    def test_model_name_substitution(self, jinja_env, example_variables, model_name):
        """Model name should be correctly substituted."""
        variables = {**example_variables, "model_name": model_name}
        template = jinja_env.get_template("models.py.j2")
        content = template.render(**variables)

        assert f"class {model_name}(models.Model):" in content

    @pytest.mark.parametrize(
        "app_name",
        [
            "inventory",
            "billing",
            "orders",
            "reports",
        ],
    )
    def test_app_name_substitution(self, jinja_env, example_variables, app_name):
        """App name should be correctly substituted."""
        variables = {**example_variables, "app_name": app_name}
        template = jinja_env.get_template("apps.py.j2")
        content = template.render(**variables)

        expected_class = f"class {app_name.capitalize()}Config(AppConfig):"
        assert expected_class in content
        assert f"name = '{app_name}'" in content


# ============================================================================
# Conditional File Generation Tests
# ============================================================================


class TestConditionalGeneration:
    """Tests for conditional file generation."""

    def test_tests_template_respects_condition(self, manifest):
        """Tests template should have a condition."""
        tests_file = next(
            (f for f in manifest["files"] if f["source"] == "tests.py.j2"),
            None,
        )
        assert tests_file is not None
        assert "condition" in tests_file

    def test_serializers_template_respects_condition(self, manifest):
        """Serializers template should have a condition."""
        serializers_file = next(
            (f for f in manifest["files"] if f["source"] == "serializers.py.j2"),
            None,
        )
        assert serializers_file is not None
        assert "condition" in serializers_file

    def test_urls_template_respects_condition(self, manifest):
        """URLs template should have a condition."""
        urls_file = next(
            (f for f in manifest["files"] if f["source"] == "urls.py.j2"),
            None,
        )
        assert urls_file is not None
        assert "condition" in urls_file
