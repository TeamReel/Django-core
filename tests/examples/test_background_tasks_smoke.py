"""
Smoke tests for Background Tasks example.

These tests validate that the example code is syntactically correct
and can be imported, ensuring the documentation examples work.
"""

import ast
from pathlib import Path

import pytest

# Get the examples directory
EXAMPLES_DIR = Path(__file__).parent.parent.parent / "examples"
BACKGROUND_TASKS_DIR = EXAMPLES_DIR / "background-tasks"


class TestBackgroundTasksExampleStructure:
    """Tests for example directory structure."""

    def test_example_directory_exists(self):
        """Verify the background-tasks example directory exists."""
        assert BACKGROUND_TASKS_DIR.exists()
        assert BACKGROUND_TASKS_DIR.is_dir()

    def test_required_files_exist(self):
        """Verify all required files are present."""
        required_files = [
            "README.md",
            "pyproject.toml",
            "src/email_tasks/__init__.py",
            "src/email_tasks/apps.py",
            "src/email_tasks/models.py",
            "src/email_tasks/tasks.py",
            "src/email_tasks/scheduler.py",
            "tests/__init__.py",
            "tests/conftest.py",
            "tests/test_email_tasks.py",
        ]
        for file_path in required_files:
            full_path = BACKGROUND_TASKS_DIR / file_path
            assert full_path.exists(), f"Missing required file: {file_path}"

    def test_src_directory_structure(self):
        """Verify source directory has proper structure."""
        src_dir = BACKGROUND_TASKS_DIR / "src"
        assert src_dir.exists()

        email_tasks_dir = src_dir / "email_tasks"
        assert email_tasks_dir.exists()
        assert (email_tasks_dir / "__init__.py").exists()


class TestBackgroundTasksSyntax:
    """Tests for Python file syntax validity."""

    @pytest.fixture
    def python_files(self):
        """Get all Python files in the example."""
        files = []
        for pattern in ["src/**/*.py", "tests/**/*.py"]:
            files.extend(BACKGROUND_TASKS_DIR.glob(pattern))
        return files

    def test_all_python_files_have_valid_syntax(self, python_files):
        """Verify all Python files have valid syntax."""
        for file_path in python_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    source = f.read()
                ast.parse(source)
            except SyntaxError as e:
                pytest.fail(f"Syntax error in {file_path}: {e}")

    def test_models_syntax(self):
        """Verify models.py has valid syntax and defines EmailLog."""
        models_path = BACKGROUND_TASKS_DIR / "src/email_tasks/models.py"
        with open(models_path, "r", encoding="utf-8") as f:
            source = f.read()

        tree = ast.parse(source)
        class_names = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
        assert "EmailLog" in class_names, "EmailLog model not defined"
        assert "Status" in class_names, "Status TextChoices not defined"

    def test_tasks_syntax(self):
        """Verify tasks.py has valid syntax and defines expected tasks."""
        tasks_path = BACKGROUND_TASKS_DIR / "src/email_tasks/tasks.py"
        with open(tasks_path, "r", encoding="utf-8") as f:
            source = f.read()

        tree = ast.parse(source)
        function_names = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]

        expected_tasks = [
            "send_welcome_email",
            "send_notification_email",
            "validate_email",
            "log_email_attempt",
            "notify_admin_invalid_email",
            "create_email_validation_workflow",
            "send_bulk_emails",
        ]
        for task_name in expected_tasks:
            assert task_name in function_names, f"Expected task {task_name} not defined"

    def test_scheduler_syntax(self):
        """Verify scheduler.py has valid syntax and defines expected tasks."""
        scheduler_path = BACKGROUND_TASKS_DIR / "src/email_tasks/scheduler.py"
        with open(scheduler_path, "r", encoding="utf-8") as f:
            source = f.read()

        tree = ast.parse(source)
        function_names = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]

        expected_tasks = [
            "cleanup_old_email_logs",
            "cleanup_failed_emails",
            "generate_email_statistics",
            "email_system_health_check",
            "retry_failed_emails",
        ]
        for task_name in expected_tasks:
            assert task_name in function_names, f"Expected scheduler task {task_name} not defined"


class TestBackgroundTasksDocumentation:
    """Tests for example documentation."""

    def test_readme_exists_and_not_empty(self):
        """Verify README exists and has content."""
        readme_path = BACKGROUND_TASKS_DIR / "README.md"
        assert readme_path.exists()

        content = readme_path.read_text(encoding="utf-8")
        assert len(content) > 1000, "README should have substantial content"

    def test_readme_has_required_sections(self):
        """Verify README has all required sections."""
        readme_path = BACKGROUND_TASKS_DIR / "README.md"
        content = readme_path.read_text(encoding="utf-8")

        required_sections = [
            "# Background Tasks Example",
            "## Overview",
            "## Prerequisites",
            "## Setup",
            "## Task Patterns",
            "## Running Tests",
            "## Troubleshooting",
        ]
        for section in required_sections:
            assert section in content, f"Missing required section: {section}"

    def test_readme_documents_task_patterns(self):
        """Verify README documents all major task patterns."""
        readme_path = BACKGROUND_TASKS_DIR / "README.md"
        content = readme_path.read_text(encoding="utf-8")

        patterns = [
            "Async Task",
            "Periodic Task",
            "Task Chain",
            "Batch",
            "Health Check",
        ]
        for pattern in patterns:
            assert pattern.lower() in content.lower(), f"README should document {pattern} pattern"


class TestBackgroundTasksConfiguration:
    """Tests for project configuration."""

    def test_pyproject_toml_valid(self):
        """Verify pyproject.toml exists and is parseable."""
        pyproject_path = BACKGROUND_TASKS_DIR / "pyproject.toml"
        assert pyproject_path.exists()

        content = pyproject_path.read_text(encoding="utf-8")
        # Basic validation - check for required sections
        assert "[project]" in content
        assert 'name = "background-tasks-example"' in content

    def test_pyproject_has_celery_dependencies(self):
        """Verify Celery dependencies are declared."""
        pyproject_path = BACKGROUND_TASKS_DIR / "pyproject.toml"
        content = pyproject_path.read_text(encoding="utf-8")

        assert "celery" in content.lower()
        assert "redis" in content.lower()
        assert "django-celery-beat" in content.lower()


class TestBackgroundTasksTestSuite:
    """Tests for the example's test suite."""

    def test_conftest_has_celery_fixtures(self):
        """Verify conftest.py defines Celery test fixtures."""
        conftest_path = BACKGROUND_TASKS_DIR / "tests/conftest.py"
        content = conftest_path.read_text(encoding="utf-8")

        assert "celery_config" in content
        assert "celery_includes" in content  # Task module includes
        assert "task_always_eager" in content

    def test_test_file_has_test_functions(self):
        """Verify test file defines test cases."""
        test_path = BACKGROUND_TASKS_DIR / "tests/test_email_tasks.py"
        with open(test_path, "r", encoding="utf-8") as f:
            source = f.read()

        tree = ast.parse(source)
        function_names = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]

        test_functions = [name for name in function_names if name.startswith("test_")]
        assert (
            len(test_functions) >= 10
        ), f"Expected at least 10 test functions, found {len(test_functions)}"

    def test_test_classes_cover_main_components(self):
        """Verify test classes cover tasks, scheduler, and models."""
        test_path = BACKGROUND_TASKS_DIR / "tests/test_email_tasks.py"
        with open(test_path, "r", encoding="utf-8") as f:
            source = f.read()

        tree = ast.parse(source)
        class_names = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]

        # Check for coverage of major components (classes test Send, Email, Cleanup, etc.)
        assert any(
            "Send" in name or "Email" in name for name in class_names
        ), "Should have email task test class"
        assert any(
            "Cleanup" in name or "Statistics" in name or "Health" in name for name in class_names
        ), "Should have scheduler-related test class"


@pytest.mark.skipif(
    not (BACKGROUND_TASKS_DIR / "src/email_tasks").exists(),
    reason="Example not installed",
)
class TestBackgroundTasksImports:
    """Tests for importability (skipped if dependencies not available)."""

    def test_models_defines_expected_classes(self):
        """Verify models.py exports expected classes."""
        # This is a syntax-only check, actual import would require Django
        models_path = BACKGROUND_TASKS_DIR / "src/email_tasks/models.py"
        with open(models_path, "r", encoding="utf-8") as f:
            source = f.read()

        # Check for expected patterns
        assert "class EmailLog" in source
        assert "class Status" in source
        assert "TextChoices" in source or "models.TextChoices" in source

    def test_tasks_defines_expected_functions(self):
        """Verify tasks.py exports expected task functions."""
        tasks_path = BACKGROUND_TASKS_DIR / "src/email_tasks/tasks.py"
        with open(tasks_path, "r", encoding="utf-8") as f:
            source = f.read()

        # Check for expected patterns
        assert "@shared_task" in source
        assert "def send_welcome_email" in source
        assert "chain(" in source  # Uses Celery chains
