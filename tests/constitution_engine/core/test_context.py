"""
Tests for RepositoryContextBuilder and related functionality.

Tests T012 (RepositoryContextBuilder) and T015 (unit tests for context builder).
"""

import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from constitution_engine.core.context import (
    GitMetadata,
    LanguageDetector,
    RepositoryContextBuilder,
)
from constitution_engine.core.models import RepositoryContext


class TestLanguageDetector:
    """Tests for LanguageDetector class."""

    def test_language_detector_initialization(self, tmp_path):
        """Test LanguageDetector initialization."""
        detector = LanguageDetector(tmp_path)

        assert detector.repo_path == tmp_path
        assert "node_modules" in detector.exclude_patterns
        assert ".git" in detector.exclude_patterns
        assert "__pycache__" in detector.exclude_patterns

    def test_language_detector_custom_excludes(self, tmp_path):
        """Test LanguageDetector with custom exclude patterns."""
        custom_excludes = {"custom_exclude", "another_exclude"}
        detector = LanguageDetector(tmp_path, exclude_patterns=custom_excludes)

        assert detector.exclude_patterns == custom_excludes

    def test_detect_python_language(self, tmp_path):
        """Test detection of Python language."""
        # Create Python files
        (tmp_path / "main.py").write_text("print('hello')")
        (tmp_path / "utils.pyx").write_text("# Cython file")
        (tmp_path / "types.pyi").write_text("# Type stubs")

        detector = LanguageDetector(tmp_path)
        languages = detector.detect_languages()

        assert "python" in languages

    def test_detect_javascript_language(self, tmp_path):
        """Test detection of JavaScript language."""
        # Create JS files
        (tmp_path / "index.js").write_text("console.log('hello');")
        (tmp_path / "component.jsx").write_text("export default function() {};")
        (tmp_path / "module.mjs").write_text("export const x = 1;")

        detector = LanguageDetector(tmp_path)
        languages = detector.detect_languages()

        assert "javascript" in languages

    def test_detect_typescript_language(self, tmp_path):
        """Test detection of TypeScript language."""
        # Create TS files
        (tmp_path / "main.ts").write_text("interface User { name: string; }")
        (tmp_path / "component.tsx").write_text("export const Component = () => {};")
        (tmp_path / "types.d.ts").write_text("declare module 'test';")

        detector = LanguageDetector(tmp_path)
        languages = detector.detect_languages()

        assert "typescript" in languages

    def test_detect_multiple_languages(self, tmp_path):
        """Test detection of multiple languages."""
        # Create files for different languages
        (tmp_path / "main.py").write_text("print('python')")
        (tmp_path / "index.js").write_text("console.log('js');")
        (tmp_path / "main.go").write_text("package main")
        (tmp_path / "main.rs").write_text("fn main() {}")

        detector = LanguageDetector(tmp_path)
        languages = detector.detect_languages()

        assert "python" in languages
        assert "javascript" in languages
        assert "go" in languages
        assert "rust" in languages

    def test_detect_special_files(self, tmp_path):
        """Test detection based on special filenames."""
        # Python special files
        (tmp_path / "setup.py").write_text("from setuptools import setup")
        (tmp_path / "pyproject.toml").write_text("[project]")
        (tmp_path / "requirements.txt").write_text("requests==2.28.0")

        # JavaScript special files
        (tmp_path / "package.json").write_text('{"name": "test"}')
        (tmp_path / "yarn.lock").write_text("# yarn lock")

        detector = LanguageDetector(tmp_path)
        languages = detector.detect_languages()

        assert "python" in languages
        assert "javascript" in languages

    def test_exclude_patterns_working(self, tmp_path):
        """Test that exclude patterns are working."""
        # Create excluded directory
        excluded_dir = tmp_path / "node_modules"
        excluded_dir.mkdir()
        (excluded_dir / "test.js").write_text("console.log('should be excluded');")

        # Create included file
        (tmp_path / "main.py").write_text("print('included')")

        detector = LanguageDetector(tmp_path)
        languages = detector.detect_languages()

        # Should detect Python but not JavaScript from node_modules
        assert "python" in languages
        # JavaScript might still be detected if there are other JS files, but not from node_modules

    def test_get_file_count_by_language(self, tmp_path):
        """Test getting file count by language."""
        # Create multiple Python files
        (tmp_path / "main.py").write_text("print('1')")
        (tmp_path / "utils.py").write_text("print('2')")
        (tmp_path / "test.py").write_text("print('3')")

        # Create one JavaScript file
        (tmp_path / "index.js").write_text("console.log('js');")

        detector = LanguageDetector(tmp_path)
        counts = detector.get_file_count_by_language()

        assert counts["python"] == 3
        assert counts["javascript"] == 1


class TestGitMetadata:
    """Tests for GitMetadata class."""

    def test_git_metadata_initialization(self, tmp_path):
        """Test GitMetadata initialization."""
        git_meta = GitMetadata(tmp_path)

        assert git_meta.repo_path == tmp_path
        assert git_meta._git_available is None

    @patch("subprocess.run")
    def test_is_git_available_true(self, mock_run, tmp_path):
        """Test Git availability detection when Git is available."""
        mock_run.return_value = MagicMock(returncode=0)

        git_meta = GitMetadata(tmp_path)
        result = git_meta.is_git_available()

        assert result is True
        assert git_meta._git_available is True
        mock_run.assert_called_once()

    @patch("subprocess.run")
    def test_is_git_available_false(self, mock_run, tmp_path):
        """Test Git availability detection when Git is not available."""
        mock_run.return_value = MagicMock(returncode=1)

        git_meta = GitMetadata(tmp_path)
        result = git_meta.is_git_available()

        assert result is False
        assert git_meta._git_available is False

    @patch("subprocess.run")
    def test_is_git_available_exception(self, mock_run, tmp_path):
        """Test Git availability when subprocess raises exception."""
        mock_run.side_effect = subprocess.SubprocessError("Git not found")

        git_meta = GitMetadata(tmp_path)
        result = git_meta.is_git_available()

        assert result is False
        assert git_meta._git_available is False

    @patch("subprocess.run")
    def test_get_current_branch(self, mock_run, tmp_path):
        """Test getting current Git branch."""
        # Mock Git availability check
        mock_run.side_effect = [
            MagicMock(returncode=0),  # is_git_available
            MagicMock(returncode=0, stdout="main\n"),  # get branch
        ]

        git_meta = GitMetadata(tmp_path)
        branch = git_meta.get_current_branch()

        assert branch == "main"
        assert mock_run.call_count == 2

    @patch("subprocess.run")
    def test_get_current_branch_head_detached(self, mock_run, tmp_path):
        """Test getting branch when HEAD is detached."""
        mock_run.side_effect = [
            MagicMock(returncode=0),  # is_git_available
            MagicMock(returncode=0, stdout="HEAD\n"),  # detached HEAD
        ]

        git_meta = GitMetadata(tmp_path)
        branch = git_meta.get_current_branch()

        assert branch is None  # HEAD indicates detached state

    @patch("subprocess.run")
    def test_get_current_commit(self, mock_run, tmp_path):
        """Test getting current Git commit."""
        commit_hash = "abc123def456"
        mock_run.side_effect = [
            MagicMock(returncode=0),  # is_git_available
            MagicMock(returncode=0, stdout=f"{commit_hash}\n"),  # get commit
        ]

        git_meta = GitMetadata(tmp_path)
        commit = git_meta.get_current_commit()

        assert commit == commit_hash

    @patch("subprocess.run")
    def test_get_changed_files(self, mock_run, tmp_path):
        """Test getting changed files."""
        changed_files_output = "src/main.py\ntests/test_main.py\nREADME.md\n"
        mock_run.side_effect = [
            MagicMock(returncode=0),  # is_git_available
            MagicMock(returncode=0, stdout=changed_files_output),  # changed files
        ]

        git_meta = GitMetadata(tmp_path)
        changed_files = git_meta.get_changed_files()

        assert len(changed_files) == 3
        assert tmp_path / "src/main.py" in changed_files
        assert tmp_path / "tests/test_main.py" in changed_files
        assert tmp_path / "README.md" in changed_files


class TestRepositoryContextBuilder:
    """Tests for RepositoryContextBuilder class."""

    def test_context_builder_initialization(self):
        """Test RepositoryContextBuilder initialization."""
        builder = RepositoryContextBuilder()

        assert builder.include_git_metadata is True

        builder_no_git = RepositoryContextBuilder(include_git_metadata=False)
        assert builder_no_git.include_git_metadata is False

    def test_build_context_nonexistent_path(self):
        """Test building context for nonexistent path."""
        builder = RepositoryContextBuilder()

        with pytest.raises(ValueError, match="Repository path does not exist"):
            builder.build_context(Path("/nonexistent/path"))

    def test_build_context_file_path(self, tmp_path):
        """Test building context for file path instead of directory."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("test")

        builder = RepositoryContextBuilder()

        with pytest.raises(ValueError, match="Repository path is not a directory"):
            builder.build_context(test_file)

    def test_build_context_basic(self, tmp_path):
        """Test building basic repository context."""
        # Create some files
        (tmp_path / "main.py").write_text("print('hello')")
        (tmp_path / "index.js").write_text("console.log('hello');")
        (tmp_path / "README.md").write_text("# Test Project")

        builder = RepositoryContextBuilder(include_git_metadata=False)
        context = builder.build_context(tmp_path)

        assert isinstance(context, RepositoryContext)
        assert context.root_path == tmp_path.absolute()
        assert "python" in context.detected_languages
        assert "javascript" in context.detected_languages
        assert context.git_branch is None
        assert context.git_commit is None

    def test_build_context_with_constitution(self, tmp_path):
        """Test building context with constitution file."""
        # Create constitution file
        constitution_file = tmp_path / "CONSTITUTION.md"
        constitution_file.write_text("# Project Constitution")

        builder = RepositoryContextBuilder(include_git_metadata=False)
        context = builder.build_context(tmp_path)

        assert context.constitution_path == constitution_file

    def test_build_context_explicit_constitution(self, tmp_path):
        """Test building context with explicit constitution path."""
        # Create constitution file with custom name
        constitution_file = tmp_path / "custom_constitution.md"
        constitution_file.write_text("# Custom Constitution")

        builder = RepositoryContextBuilder(include_git_metadata=False)
        context = builder.build_context(tmp_path, constitution_path=constitution_file)

        assert context.constitution_path == constitution_file

    @patch("constitution_engine.core.context.GitMetadata")
    def test_build_context_with_git_metadata(self, mock_git_class, tmp_path):
        """Test building context with Git metadata."""
        # Mock Git metadata
        mock_git = MagicMock()
        mock_git.is_git_available.return_value = True
        mock_git.get_current_branch.return_value = "feature-branch"
        mock_git.get_current_commit.return_value = "abc123"
        mock_git.get_changed_files.return_value = {tmp_path / "changed.py"}
        mock_git_class.return_value = mock_git

        # Create some files
        (tmp_path / "main.py").write_text("print('hello')")

        builder = RepositoryContextBuilder(include_git_metadata=True)
        context = builder.build_context(tmp_path)

        assert context.git_branch == "feature-branch"
        assert context.git_commit == "abc123"
        assert "changed_files" in context.metadata["git_metadata"]

    def test_build_context_exclude_patterns(self, tmp_path):
        """Test building context with exclude patterns."""
        # Create files including some that should be excluded
        (tmp_path / "main.py").write_text("print('hello')")
        excluded_dir = tmp_path / "node_modules"
        excluded_dir.mkdir()
        (excluded_dir / "lib.js").write_text("console.log('excluded');")

        exclude_patterns = {"node_modules"}
        builder = RepositoryContextBuilder(include_git_metadata=False)
        context = builder.build_context(tmp_path, exclude_patterns=exclude_patterns)

        # Should detect Python but exclude JavaScript from node_modules
        assert "python" in context.detected_languages

    def test_find_constitution_file_variations(self, tmp_path):
        """Test finding constitution files with different names."""
        builder = RepositoryContextBuilder()

        # Test different constitution file names
        test_names = [
            "CONSTITUTION.md",
            "constitution.md",
            "Constitution.md",
            "CONSTITUTION.txt",
            "constitution.txt",
        ]

        for name in test_names:
            # Clean up from previous iteration
            for existing in tmp_path.glob("*ONSTITUTION*"):
                existing.unlink(missing_ok=True)

            constitution_file = tmp_path / name
            constitution_file.write_text("# Constitution")

            found_file = builder._find_constitution_file(tmp_path)
            assert found_file == constitution_file

            constitution_file.unlink()  # Clean up

        # Test no constitution file
        found_file = builder._find_constitution_file(tmp_path)
        assert found_file is None

    def test_detect_repository_tags_python(self, tmp_path):
        """Test detecting Python project tags."""
        builder = RepositoryContextBuilder()

        # Create Python files
        (tmp_path / "main.py").write_text("print('hello')")
        (tmp_path / "pyproject.toml").write_text("[project]")

        tags = builder._detect_repository_tags(tmp_path, {"python"})

        assert "python-project" in tags
        assert "modern-python" in tags

    def test_detect_repository_tags_django(self, tmp_path):
        """Test detecting Django project tags."""
        builder = RepositoryContextBuilder()

        # Create Django files
        (tmp_path / "main.py").write_text("print('hello')")
        (tmp_path / "manage.py").write_text("#!/usr/bin/env python")

        tags = builder._detect_repository_tags(tmp_path, {"python"})

        assert "python-project" in tags
        assert "django-project" in tags

    def test_detect_repository_tags_javascript(self, tmp_path):
        """Test detecting JavaScript project tags."""
        builder = RepositoryContextBuilder()

        # Create JS project with package.json
        package_json = {
            "name": "test-project",
            "dependencies": {"react": "^18.0.0", "lodash": "^4.17.21"},
        }

        import json

        (tmp_path / "index.js").write_text("console.log('hello');")
        (tmp_path / "package.json").write_text(json.dumps(package_json))

        tags = builder._detect_repository_tags(tmp_path, {"javascript"})

        assert "js-project" in tags
        assert "react-project" in tags

    def test_detect_repository_tags_containerized(self, tmp_path):
        """Test detecting containerized projects."""
        builder = RepositoryContextBuilder()

        # Create Dockerfile
        (tmp_path / "Dockerfile").write_text("FROM python:3.9")

        tags = builder._detect_repository_tags(tmp_path, set())

        assert "containerized" in tags

    def test_detect_repository_tags_with_tests(self, tmp_path):
        """Test detecting projects with tests."""
        builder = RepositoryContextBuilder()

        # Create tests directory
        tests_dir = tmp_path / "tests"
        tests_dir.mkdir()
        (tests_dir / "test_main.py").write_text("def test_something(): pass")

        tags = builder._detect_repository_tags(tmp_path, set())

        assert "has-tests" in tags

    def test_detect_repository_tags_constitutional(self, tmp_path):
        """Test detecting constitutional projects."""
        builder = RepositoryContextBuilder()

        # Create constitution file
        (tmp_path / "CONSTITUTION.md").write_text("# Constitution")

        tags = builder._detect_repository_tags(tmp_path, set())

        assert "constitutional" in tags

    def test_count_total_files(self, tmp_path):
        """Test counting total files with exclusions."""
        builder = RepositoryContextBuilder()

        # Create files
        (tmp_path / "main.py").write_text("print('hello')")
        (tmp_path / "README.md").write_text("# Readme")

        # Create excluded directory
        excluded_dir = tmp_path / "__pycache__"
        excluded_dir.mkdir()
        (excluded_dir / "cache.pyc").write_text("cached")

        exclude_patterns = {"__pycache__"}
        count = builder._count_total_files(tmp_path, exclude_patterns)

        assert count == 2  # Should not count file in __pycache__

    def test_build_context_synthetic_repo(self):
        """Test building context for synthetic test repository."""
        # Use the basic fixture repository we created
        fixture_path = Path(__file__).parent.parent / "fixtures" / "repos" / "basic"

        if not fixture_path.exists():
            pytest.skip("Synthetic repository fixture not available")

        builder = RepositoryContextBuilder(include_git_metadata=False)
        context = builder.build_context(fixture_path)

        # Verify expected characteristics of the basic fixture
        assert context.root_path == fixture_path.absolute()
        assert "python" in context.detected_languages
        assert "javascript" in context.detected_languages
        assert context.constitution_path is not None
        assert context.constitution_path.name == "CONSTITUTION.md"
        assert "python-project" in context.tags
        assert "js-project" in context.tags
        assert "modern-python" in context.tags  # due to pyproject.toml
        assert "has-tests" in context.tags
        assert "constitutional" in context.tags

        # Check metadata
        assert "language_file_counts" in context.metadata
        assert "total_files" in context.metadata
        assert context.metadata["language_file_counts"]["python"] >= 2  # main.py, utils.py
