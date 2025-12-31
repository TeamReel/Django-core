"""
Integration tests for code generation with atomic rollback.

Tests CodeGenerator class for success paths, rollback scenarios,
validation, and conflict detection.
"""

import tempfile
from pathlib import Path

import pytest

try:
    from scaffolding.generation.exceptions import ConflictError, ValidationError
    from scaffolding.generation.generator import CodeGenerator
except ImportError:
    ConflictError = None
    ValidationError = None
    CodeGenerator = None

if CodeGenerator is None:
    pytest.skip("Skipping due to missing scaffolding dependencies", allow_module_level=True)


class MockRenderer:
    """Mock renderer for testing."""

    def __init__(self, should_fail: bool = False):
        """
        Initialize mock renderer.

        Args:
            should_fail: Whether render_directory should raise exception
        """
        self.should_fail = should_fail
        self.render_calls = []

    def render_directory(self, output_dir: Path) -> list[Path]:
        """
        Mock render_directory.

        Args:
            output_dir: Output directory

        Returns:
            List of mock file paths

        Raises:
            RuntimeError: If should_fail is True
        """
        self.render_calls.append(output_dir)

        if self.should_fail:
            raise RuntimeError("Mock render error")

        # Create mock files
        (output_dir / "models.py").write_text("# models")
        (output_dir / "apps.py").write_text("# apps")
        (output_dir / "views.py").write_text("# views")

        return [
            output_dir / "models.py",
            output_dir / "apps.py",
            output_dir / "views.py",
        ]


class TestCodeGeneratorSuccess:
    """Test successful code generation."""

    def test_generate_app_success(self, tmp_path):
        """Test successful app generation."""
        # Setup project structure
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        # Setup generator
        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Generate app
        generator.generate_app("payments", "minimal", project_root, validate=False)

        # Verify app created
        app_dir = project_root / "src" / "payments"
        assert app_dir.exists()
        assert (app_dir / "models.py").exists()
        assert (app_dir / "apps.py").exists()
        assert (app_dir / "views.py").exists()

        # Verify renderer called
        assert len(renderer.render_calls) == 1

    def test_generate_app_creates_files(self, tmp_path):
        """Test that generated files have correct content."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        generator.generate_app("payments", "minimal", project_root, validate=False)

        # Verify file contents
        app_dir = project_root / "src" / "payments"
        assert (app_dir / "models.py").read_text() == "# models"
        assert (app_dir / "apps.py").read_text() == "# apps"
        assert (app_dir / "views.py").read_text() == "# views"

    def test_generate_project_success(self, tmp_path):
        """Test successful project bootstrapping."""
        # Setup generator
        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Generate project
        generator.generate_project("my-new-project", parent_dir=tmp_path)

        # Verify project created
        project_dir = tmp_path / "my-new-project"
        assert project_dir.exists()
        assert (project_dir / "models.py").exists()  # Mock files


class TestCodeGeneratorRollback:
    """Test rollback mechanism on failures."""

    def test_rollback_on_render_error(self, tmp_path):
        """Test staging cleanup on render error."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        # Setup renderer that raises error
        renderer = MockRenderer(should_fail=True)
        generator = CodeGenerator(renderer)

        # Attempt generation (should fail and rollback)
        with pytest.raises(RuntimeError, match="Mock render error"):
            generator.generate_app("payments", "minimal", project_root, validate=False)

        # Verify app NOT created
        app_dir = project_root / "src" / "payments"
        assert not app_dir.exists()

        # Verify no staging directories left in /tmp
        tmp_dir = Path(tempfile.gettempdir())
        staging_dirs = list(tmp_dir.glob("scaffold_*_payments"))
        assert len(staging_dirs) == 0

    def test_rollback_on_validation_error(self, tmp_path):
        """Test staging cleanup when validation fails."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Mock validation to fail
        def mock_validate(staging_dir):
            raise ValidationError("Mock validation failure")

        generator._validate_generated_code = mock_validate

        # Attempt generation (should fail and rollback)
        with pytest.raises(ValidationError, match="Mock validation failure"):
            generator.generate_app("payments", "minimal", project_root, validate=True)

        # Verify app NOT created
        app_dir = project_root / "src" / "payments"
        assert not app_dir.exists()

        # Verify no staging directories left
        tmp_dir = Path(tempfile.gettempdir())
        staging_dirs = list(tmp_dir.glob("scaffold_*_payments"))
        assert len(staging_dirs) == 0


class TestConflictDetection:
    """Test pre-generation conflict detection (T031)."""

    def test_conflict_when_app_exists(self, tmp_path):
        """Test error when app already exists."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        src_dir = project_root / "src"
        src_dir.mkdir()

        # Create existing app
        existing_app = src_dir / "payments"
        existing_app.mkdir()

        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Attempt to generate same app
        with pytest.raises(ConflictError, match="already exists"):
            generator.generate_app("payments", "minimal", project_root, validate=False)

        # Verify no staging created
        tmp_dir = Path(tempfile.gettempdir())
        staging_dirs = list(tmp_dir.glob("scaffold_*_payments"))
        assert len(staging_dirs) == 0

    def test_conflict_when_project_exists(self, tmp_path):
        """Test error when project directory already exists."""
        # Create existing project directory
        existing_project = tmp_path / "my-project"
        existing_project.mkdir()

        renderer = MockRenderer()
        generator = CodeGenerator(renderer)

        # Attempt to generate same project
        with pytest.raises(ConflictError, match="already exists"):
            generator.generate_project("my-project", parent_dir=tmp_path)


class TestAppNameValidation:
    """Test app name validation (T032)."""

    def test_valid_app_names(self, tmp_path):
        """Test valid app names pass validation."""
        generator = CodeGenerator(MockRenderer())

        # These should not raise
        valid_names = [
            "payments",
            "user_auth",
            "api_v2",
            "my_app_name",
            "a",
            "abc123",
        ]

        for name in valid_names:
            generator._validate_app_name(name)  # Should not raise

    def test_invalid_app_name_pascal_case(self):
        """Test PascalCase app name rejected."""
        generator = CodeGenerator(MockRenderer())

        with pytest.raises(ValidationError, match="snake_case"):
            generator._validate_app_name("MyApp")

    def test_invalid_app_name_with_hyphens(self):
        """Test app name with hyphens rejected."""
        generator = CodeGenerator(MockRenderer())

        with pytest.raises(ValidationError, match="snake_case"):
            generator._validate_app_name("my-app")

    def test_invalid_app_name_with_spaces(self):
        """Test app name with spaces rejected."""
        generator = CodeGenerator(MockRenderer())

        with pytest.raises(ValidationError, match="snake_case"):
            generator._validate_app_name("my app")

    def test_invalid_app_name_starts_with_number(self):
        """Test app name starting with number rejected."""
        generator = CodeGenerator(MockRenderer())

        with pytest.raises(ValidationError, match="cannot start with number"):
            generator._validate_app_name("123app")

    def test_invalid_app_name_python_keyword(self):
        """Test Python keywords rejected."""
        generator = CodeGenerator(MockRenderer())

        keywords = ["import", "class", "def", "if", "for", "while"]
        for kw in keywords:
            with pytest.raises(ValidationError, match="Python keyword"):
                generator._validate_app_name(kw)

    def test_invalid_app_name_django_reserved(self):
        """Test Django reserved names rejected."""
        generator = CodeGenerator(MockRenderer())

        reserved = ["admin", "auth", "contenttypes", "sessions", "messages"]
        for name in reserved:
            with pytest.raises(ValidationError, match="reserved by Django"):
                generator._validate_app_name(name)


class TestProjectNameValidation:
    """Test project name validation (T033)."""

    def test_valid_project_names(self):
        """Test valid project names are sanitized correctly."""
        generator = CodeGenerator(MockRenderer())

        # Test sanitization
        assert generator._validate_project_name("MyProject") == "myproject"
        assert generator._validate_project_name("my-project") == "my-project"
        assert generator._validate_project_name("my project") == "my-project"
        assert generator._validate_project_name("My Project 123") == "my-project-123"

    def test_invalid_project_name_empty(self):
        """Test empty project name rejected."""
        generator = CodeGenerator(MockRenderer())

        with pytest.raises(ValidationError, match="no valid characters"):
            generator._validate_project_name("!!!@@@###")

    def test_project_name_sanitizes_special_chars(self):
        """Test special characters removed during sanitization."""
        generator = CodeGenerator(MockRenderer())

        sanitized = generator._validate_project_name("my_project!@#$%")
        assert sanitized == "myproject"  # Underscores removed, special chars removed


class TestFilePermissions:
    """Test file permission preservation (T030)."""

    def test_executable_permissions_preserved(self, tmp_path):
        """Test executable permissions preserved during generation."""
        project_root = tmp_path / "myproject"
        project_root.mkdir()
        (project_root / "src").mkdir()

        # Create mock renderer that creates executable file
        class ExecutableRenderer:
            def render_directory(self, output_dir: Path) -> list[Path]:
                # Create executable file
                script = output_dir / "manage.py"
                script.write_text("#!/usr/bin/env python\n# manage.py")
                script.chmod(0o755)  # Make executable

                return [script]

        renderer = ExecutableRenderer()
        generator = CodeGenerator(renderer)

        generator.generate_app("payments", "minimal", project_root, validate=False)

        # Verify executable permissions preserved
        script_path = project_root / "src" / "payments" / "manage.py"
        assert script_path.exists()

        # Check if executable (on Unix systems)
        import os

        if os.name != "nt":  # Skip on Windows
            assert os.access(script_path, os.X_OK)


class TestAtomicMove:
    """Test atomic move operation (T028)."""

    def test_atomic_move_verifies_target_created(self, tmp_path):
        """Test atomic move verifies target directory created."""
        staging_dir = tmp_path / "staging"
        staging_dir.mkdir()
        (staging_dir / "test.txt").write_text("test")

        target_dir = tmp_path / "target"

        generator = CodeGenerator(MockRenderer())

        # Move should succeed and verify target exists
        generator._atomic_move(staging_dir, target_dir)

        assert target_dir.exists()
        assert (target_dir / "test.txt").exists()
        assert not staging_dir.exists()  # Staging moved (not copied)


class TestStagingDirectory:
    """Test staging directory creation (T026)."""

    def test_staging_dir_uses_mkdtemp(self):
        """Test staging directory created with mkdtemp."""
        generator = CodeGenerator(MockRenderer())

        staging_dir = generator._create_staging_dir("testapp")

        # Verify staging directory created
        assert staging_dir.exists()
        assert staging_dir.is_dir()

        # Verify naming pattern
        assert "scaffold_" in staging_dir.name
        assert "_testapp" in staging_dir.name

        # Verify in system temp directory
        temp_dir = Path(tempfile.gettempdir())
        assert staging_dir.parent == temp_dir

        # Cleanup
        staging_dir.rmdir()

    def test_staging_dir_unique_per_call(self):
        """Test each staging directory is unique."""
        generator = CodeGenerator(MockRenderer())

        staging_dir1 = generator._create_staging_dir("app1")
        staging_dir2 = generator._create_staging_dir("app1")

        assert staging_dir1 != staging_dir2
        assert staging_dir1.exists()
        assert staging_dir2.exists()

        # Cleanup
        staging_dir1.rmdir()
        staging_dir2.rmdir()
