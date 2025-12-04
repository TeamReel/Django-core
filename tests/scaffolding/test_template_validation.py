"""
Validation smoke tests for built-in templates.

Tests verify that generated code passes all validation checks:
- Ruff (linting)
- mypy (type checking)
- check_policy.py (constitutional validation)
"""

import subprocess
import tempfile
from pathlib import Path

import pytest

from scaffolding.discovery.registry import TemplateRegistry
from scaffolding.generation.generator import CodeGenerator


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


def run_ruff_check(app_dir: Path) -> tuple[int, str]:
    """Run Ruff check on generated app directory."""
    result = subprocess.run(
        ["ruff", "check", str(app_dir)],
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout + result.stderr


def run_mypy_check(app_dir: Path) -> tuple[int, str]:
    """Run mypy check on generated app directory."""
    result = subprocess.run(
        ["mypy", str(app_dir), "--ignore-missing-imports"],
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout + result.stderr


def run_constitutional_check(app_dir: Path) -> tuple[int, str]:
    """Run check_policy.py on generated app directory."""
    # Assuming check_policy.py is in project root
    check_policy = Path(__file__).parents[2] / "check_policy.py"
    if not check_policy.exists():
        pytest.skip("check_policy.py not found")

    result = subprocess.run(
        ["python", str(check_policy), str(app_dir)],
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout + result.stderr


class TestMinimalTemplateValidation:
    """Validation tests for minimal template."""

    def test_minimal_passes_ruff(self, template_registry, temp_output_dir):
        """Test minimal template generates Ruff-compliant code."""
        template = template_registry.get_template("minimal")
        variables = {"app_name": "test_minimal"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="test_minimal",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "test_minimal"
        exit_code, output = run_ruff_check(app_dir)

        assert exit_code == 0, f"Ruff check failed:\n{output}"

    def test_minimal_passes_mypy(self, template_registry, temp_output_dir):
        """Test minimal template generates mypy-compliant code."""
        template = template_registry.get_template("minimal")
        variables = {"app_name": "test_minimal_mypy"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="test_minimal_mypy",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "test_minimal_mypy"
        exit_code, output = run_mypy_check(app_dir)

        assert exit_code == 0, f"mypy check failed:\n{output}"

    def test_minimal_passes_constitutional(
        self, template_registry, temp_output_dir
    ):
        """Test minimal template passes constitutional validation."""
        template = template_registry.get_template("minimal")
        variables = {"app_name": "test_minimal_const"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="test_minimal_const",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "test_minimal_const"
        exit_code, output = run_constitutional_check(app_dir)

        # Note: check_policy.py may have different exit codes
        # Adjust assertion based on actual implementation
        assert exit_code == 0, f"Constitutional check failed:\n{output}"


class TestAPIFirstTemplateValidation:
    """Validation tests for api-first template."""

    def test_api_first_passes_ruff(self, template_registry, temp_output_dir):
        """Test api-first template generates Ruff-compliant code."""
        template = template_registry.get_template("api-first")
        variables = {"app_name": "test_api", "model_name": "Product"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="test_api",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "test_api"
        exit_code, output = run_ruff_check(app_dir)

        assert exit_code == 0, f"Ruff check failed:\n{output}"

    def test_api_first_passes_mypy(self, template_registry, temp_output_dir):
        """Test api-first template generates mypy-compliant code."""
        template = template_registry.get_template("api-first")
        variables = {"app_name": "test_api_mypy", "model_name": "Item"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="test_api_mypy",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "test_api_mypy"
        exit_code, output = run_mypy_check(app_dir)

        assert exit_code == 0, f"mypy check failed:\n{output}"


class TestServiceTemplateValidation:
    """Validation tests for service template."""

    def test_service_passes_ruff(self, template_registry, temp_output_dir):
        """Test service template generates Ruff-compliant code."""
        template = template_registry.get_template("service")
        variables = {"app_name": "test_service", "service_name": "TestService"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="test_service",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "test_service"
        exit_code, output = run_ruff_check(app_dir)

        assert exit_code == 0, f"Ruff check failed:\n{output}"

    def test_service_passes_mypy(self, template_registry, temp_output_dir):
        """Test service template generates mypy-compliant code."""
        template = template_registry.get_template("service")
        variables = {"app_name": "test_srv_mypy", "service_name": "SrvService"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="test_srv_mypy",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "test_srv_mypy"
        exit_code, output = run_mypy_check(app_dir)

        assert exit_code == 0, f"mypy check failed:\n{output}"


class TestUIBackedTemplateValidation:
    """Validation tests for ui-backed template."""

    def test_ui_backed_passes_ruff(self, template_registry, temp_output_dir):
        """Test ui-backed template generates Ruff-compliant code."""
        template = template_registry.get_template("ui-backed")
        variables = {"app_name": "test_ui", "model_name": "Widget"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="test_ui",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "test_ui"
        exit_code, output = run_ruff_check(app_dir)

        assert exit_code == 0, f"Ruff check failed:\n{output}"

    def test_ui_backed_passes_mypy(self, template_registry, temp_output_dir):
        """Test ui-backed template generates mypy-compliant code."""
        template = template_registry.get_template("ui-backed")
        variables = {"app_name": "test_ui_mypy", "model_name": "Item"}

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name="test_ui_mypy",
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / "test_ui_mypy"
        exit_code, output = run_mypy_check(app_dir)

        assert exit_code == 0, f"mypy check failed:\n{output}"


class TestAllTemplatesIntegration:
    """Integration tests for all templates together."""

    @pytest.mark.parametrize(
        "template_name,variables",
        [
            ("minimal", {"app_name": "integration_minimal"}),
            ("api-first", {"app_name": "integration_api", "model_name": "Item"}),
            ("service", {"app_name": "integration_srv", "service_name": "ItemService"}),
            ("ui-backed", {"app_name": "integration_ui", "model_name": "Widget"}),
        ],
    )
    def test_all_templates_pass_ruff(
        self, template_registry, temp_output_dir, template_name, variables
    ):
        """Test all templates generate Ruff-compliant code."""
        template = template_registry.get_template(template_name)

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name=variables["app_name"],
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / variables["app_name"]
        exit_code, output = run_ruff_check(app_dir)

        assert exit_code == 0, (
            f"Ruff check failed for {template_name}:\n{output}"
        )

    @pytest.mark.parametrize(
        "template_name,variables",
        [
            ("minimal", {"app_name": "mypy_minimal"}),
            ("api-first", {"app_name": "mypy_api", "model_name": "Product"}),
            ("service", {"app_name": "mypy_srv", "service_name": "ProductService"}),
            ("ui-backed", {"app_name": "mypy_ui", "model_name": "Item"}),
        ],
    )
    def test_all_templates_pass_mypy(
        self, template_registry, temp_output_dir, template_name, variables
    ):
        """Test all templates generate mypy-compliant code."""
        template = template_registry.get_template(template_name)

        generator = CodeGenerator()
        generator.generate_app(
            template=template,
            app_name=variables["app_name"],
            output_dir=temp_output_dir,
            variables=variables,
            validate=False,
        )

        app_dir = temp_output_dir / variables["app_name"]
        exit_code, output = run_mypy_check(app_dir)

        assert exit_code == 0, (
            f"mypy check failed for {template_name}:\n{output}"
        )
