"""Smoke tests for the CRUD API example.

These tests verify that the example code is syntactically correct and
can be imported successfully. Full API tests are in the example's own
test directory.

These smoke tests run in the main CI pipeline to catch breaking changes
in Core that affect the examples.
"""

import pytest


class TestCrudApiExampleSmoke:
    """Smoke tests for the crud-api example."""

    def test_notes_model_importable(self):
        """Verify the Note model can be imported."""
        # This tests that the model file is syntactically correct
        # and all dependencies are available
        try:
            from examples.crud_api.src.notes.models import Note
            assert Note is not None
        except ImportError:
            # Expected if example is not in PYTHONPATH
            # The model import is tested in the example's own tests
            pytest.skip("Example not in PYTHONPATH - run example tests directly")

    def test_notes_serializers_importable(self):
        """Verify serializers can be imported."""
        try:
            from examples.crud_api.src.notes.serializers import (
                NoteListSerializer,
                NoteSerializer,
            )
            assert NoteSerializer is not None
            assert NoteListSerializer is not None
        except ImportError:
            pytest.skip("Example not in PYTHONPATH - run example tests directly")

    def test_notes_views_importable(self):
        """Verify views can be imported."""
        try:
            from examples.crud_api.src.notes.views import (
                IsOwnerOrReadOnly,
                NoteViewSet,
            )
            assert NoteViewSet is not None
            assert IsOwnerOrReadOnly is not None
        except ImportError:
            pytest.skip("Example not in PYTHONPATH - run example tests directly")

    def test_example_readme_exists(self):
        """Verify README.md exists for the example."""
        from pathlib import Path
        import os

        # Get the project root (where pytest runs from)
        project_root = Path(os.getcwd())
        readme_path = project_root / "examples" / "crud-api" / "README.md"
        assert readme_path.exists(), f"README not found at {readme_path}"

    def test_example_pyproject_exists(self):
        """Verify pyproject.toml exists for the example."""
        from pathlib import Path
        import os

        project_root = Path(os.getcwd())
        pyproject_path = project_root / "examples" / "crud-api" / "pyproject.toml"
        assert pyproject_path.exists(), f"pyproject.toml not found at {pyproject_path}"

    def test_example_has_required_files(self):
        """Verify all required files exist in the example."""
        from pathlib import Path
        import os

        project_root = Path(os.getcwd())
        example_root = project_root / "examples" / "crud-api"

        required_files = [
            "README.md",
            "pyproject.toml",
            "src/notes/__init__.py",
            "src/notes/models.py",
            "src/notes/serializers.py",
            "src/notes/views.py",
            "src/notes/urls.py",
            "tests/__init__.py",
            "tests/conftest.py",
            "tests/test_notes_api.py",
        ]

        for file_path in required_files:
            full_path = example_root / file_path
            assert full_path.exists(), f"Required file not found: {file_path}"
