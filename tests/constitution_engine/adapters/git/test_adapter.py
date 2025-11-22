"""
Unit tests for Git adapter.

These tests create temporary Git repositories to test the GitAdapter
functionality in a controlled, isolated environment.
"""

import subprocess
from pathlib import Path

import pytest
from constitution_engine.adapters.git import GitAdapter, GitInfo, GitNotAvailableError


class TestGitAdapter:
    """Test suite for GitAdapter."""

    @pytest.fixture
    def temp_git_repo(self, tmp_path: Path) -> Path:
        """
        Create a temporary Git repository for testing.

        Args:
            tmp_path: pytest temporary directory fixture

        Returns:
            Path to the temporary Git repository
        """
        repo_path = tmp_path / "test_repo"
        repo_path.mkdir()

        # Initialize Git repo
        subprocess.run(
            ["git", "init"],  # noqa: S603, S607
            cwd=repo_path,
            check=True,
            capture_output=True,
        )

        # Configure Git user (required for commits)
        subprocess.run(
            ["git", "config", "user.email", "test@example.com"],  # noqa: S603, S607
            cwd=repo_path,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Test User"],  # noqa: S603, S607
            cwd=repo_path,
            check=True,
            capture_output=True,
        )

        # Create initial commit
        test_file = repo_path / "README.md"
        test_file.write_text("# Test Repository\n")

        subprocess.run(
            ["git", "add", "README.md"],  # noqa: S603, S607
            cwd=repo_path,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "commit", "-m", "Initial commit"],  # noqa: S603, S607
            cwd=repo_path,
            check=True,
            capture_output=True,
        )

        return repo_path

    @pytest.fixture
    def temp_git_repo_with_changes(self, temp_git_repo: Path) -> Path:
        """
        Create a temporary Git repository with uncommitted changes.

        Args:
            temp_git_repo: Base Git repository fixture

        Returns:
            Path to the repository with changes
        """
        # Modify existing file
        readme = temp_git_repo / "README.md"
        readme.write_text("# Modified Test Repository\n")

        # Add new file
        new_file = temp_git_repo / "new_file.txt"
        new_file.write_text("New content\n")

        # Stage one change
        subprocess.run(
            ["git", "add", "new_file.txt"],  # noqa: S603, S607
            cwd=temp_git_repo,
            check=True,
            capture_output=True,
        )

        return temp_git_repo

    def test_init_valid_repository(self, temp_git_repo: Path) -> None:
        """Test GitAdapter initialization with a valid Git repository."""
        adapter = GitAdapter(temp_git_repo)
        assert adapter.repo_path == temp_git_repo.absolute()

    def test_init_non_git_directory(self, tmp_path: Path) -> None:
        """Test GitAdapter initialization with a non-Git directory."""
        non_git_dir = tmp_path / "not_a_repo"
        non_git_dir.mkdir()

        with pytest.raises(GitNotAvailableError, match="not a Git repository"):
            GitAdapter(non_git_dir)

    def test_get_current_branch(self, temp_git_repo: Path) -> None:
        """Test getting the current branch name."""
        adapter = GitAdapter(temp_git_repo)
        branch = adapter.get_current_branch()

        # Default branch varies by Git version (master or main)
        assert branch in ("master", "main")

    def test_get_current_branch_detached_head(self, temp_git_repo: Path) -> None:
        """Test getting branch name when in detached HEAD state."""
        adapter = GitAdapter(temp_git_repo)

        # Get commit hash and checkout detached HEAD
        commit_hash = adapter.get_commit_hash(short=False)
        subprocess.run(
            ["git", "checkout", commit_hash],  # noqa: S603, S607
            cwd=temp_git_repo,
            check=True,
            capture_output=True,
        )

        # Reinitialize adapter to detect new state
        adapter = GitAdapter(temp_git_repo)
        branch = adapter.get_current_branch()

        assert branch is None

    def test_get_commit_hash_short(self, temp_git_repo: Path) -> None:
        """Test getting short commit hash."""
        adapter = GitAdapter(temp_git_repo)
        short_hash = adapter.get_commit_hash(short=True)

        assert len(short_hash) == 7
        assert short_hash.isalnum()

    def test_get_commit_hash_full(self, temp_git_repo: Path) -> None:
        """Test getting full commit hash."""
        adapter = GitAdapter(temp_git_repo)
        full_hash = adapter.get_commit_hash(short=False)

        assert len(full_hash) == 40
        assert full_hash.isalnum()

    def test_get_changed_files_clean_repo(self, temp_git_repo: Path) -> None:
        """Test getting changed files in a clean repository."""
        adapter = GitAdapter(temp_git_repo)
        changed_files = adapter.get_changed_files()

        assert changed_files == []

    def test_get_changed_files_with_modifications(self, temp_git_repo_with_changes: Path) -> None:
        """Test getting changed files with uncommitted changes."""
        adapter = GitAdapter(temp_git_repo_with_changes)
        changed_files = adapter.get_changed_files()

        # Should detect both staged and unstaged changes
        changed_paths = {f.name for f in changed_files}
        assert "README.md" in changed_paths  # Modified (unstaged)
        assert "new_file.txt" in changed_paths  # New (staged)

    def test_is_dirty_clean_repo(self, temp_git_repo: Path) -> None:
        """Test is_dirty on a clean repository."""
        adapter = GitAdapter(temp_git_repo)
        assert adapter.is_dirty() is False

    def test_is_dirty_with_changes(self, temp_git_repo_with_changes: Path) -> None:
        """Test is_dirty with uncommitted changes."""
        adapter = GitAdapter(temp_git_repo_with_changes)
        assert adapter.is_dirty() is True

    def test_get_remote_url_no_remote(self, temp_git_repo: Path) -> None:
        """Test getting remote URL when no remote is configured."""
        adapter = GitAdapter(temp_git_repo)
        remote_url = adapter.get_remote_url()

        assert remote_url is None

    def test_get_remote_url_with_remote(self, temp_git_repo: Path) -> None:
        """Test getting remote URL when remote is configured."""
        # Add a remote
        test_url = "https://github.com/test/repo.git"
        subprocess.run(
            ["git", "remote", "add", "origin", test_url],  # noqa: S603, S607
            cwd=temp_git_repo,
            check=True,
            capture_output=True,
        )

        adapter = GitAdapter(temp_git_repo)
        remote_url = adapter.get_remote_url()

        assert remote_url == test_url

    def test_get_info_comprehensive(self, temp_git_repo: Path) -> None:
        """Test getting comprehensive repository information."""
        # Add a remote for testing
        test_url = "https://github.com/test/repo.git"
        subprocess.run(
            ["git", "remote", "add", "origin", test_url],  # noqa: S603, S607
            cwd=temp_git_repo,
            check=True,
            capture_output=True,
        )

        adapter = GitAdapter(temp_git_repo)
        git_info = adapter.get_info()

        assert isinstance(git_info, GitInfo)
        assert git_info.branch in ("master", "main")
        assert len(git_info.commit_hash) == 7
        assert len(git_info.commit_hash_full) == 40
        assert git_info.changed_files == []
        assert git_info.is_dirty is False
        assert git_info.remote_url == test_url

    def test_get_info_with_changes(self, temp_git_repo_with_changes: Path) -> None:
        """Test getting info from a repository with changes."""
        adapter = GitAdapter(temp_git_repo_with_changes)
        git_info = adapter.get_info()

        assert git_info.is_dirty is True
        assert len(git_info.changed_files) > 0

    def test_timeout_configuration(self, temp_git_repo: Path) -> None:
        """Test that timeout parameter is accepted."""
        adapter = GitAdapter(temp_git_repo, timeout=5)
        assert adapter.timeout == 5

        # Should still work with custom timeout
        branch = adapter.get_current_branch()
        assert branch in ("master", "main")

    def test_changed_files_with_deleted_file(self, temp_git_repo: Path) -> None:
        """Test detection of deleted files."""
        # Delete the README file
        readme = temp_git_repo / "README.md"
        readme.unlink()

        adapter = GitAdapter(temp_git_repo)
        changed_files = adapter.get_changed_files()

        changed_names = {f.name for f in changed_files}
        assert "README.md" in changed_names

    def test_changed_files_with_renamed_file(self, temp_git_repo: Path) -> None:
        """Test detection of renamed files."""
        # Rename the README file
        subprocess.run(
            ["git", "mv", "README.md", "NEW_README.md"],  # noqa: S603, S607
            cwd=temp_git_repo,
            check=True,
            capture_output=True,
        )

        adapter = GitAdapter(temp_git_repo)
        changed_files = adapter.get_changed_files()

        # Should only see the new name in changed files
        changed_names = {f.name for f in changed_files}
        assert "NEW_README.md" in changed_names

    def test_adapter_with_subdirectories(self, temp_git_repo: Path) -> None:
        """Test adapter works correctly with files in subdirectories."""
        # Create a subdirectory with a file
        subdir = temp_git_repo / "src"
        subdir.mkdir()
        test_file = subdir / "code.py"
        test_file.write_text("print('hello')\n")

        adapter = GitAdapter(temp_git_repo)
        changed_files = adapter.get_changed_files()

        # Git reports untracked directories, not individual files within them
        # So we should see 'src' in the changed files list
        assert len(changed_files) > 0, "Should detect new directories"

        # Check that we have the directory or file in our changed list
        file_names = [f.name for f in changed_files]
        # Git may report either 'src' (directory) or 'src/code.py' (file)
        # depending on the status format
        assert "src" in file_names or "code.py" in file_names

    def test_get_info_frozen_dataclass(self, temp_git_repo: Path) -> None:
        """Test that GitInfo is immutable (frozen dataclass)."""
        adapter = GitAdapter(temp_git_repo)
        git_info = adapter.get_info()

        with pytest.raises((AttributeError, TypeError)):  # FrozenInstanceError variations
            git_info.branch = "new-branch"  # type: ignore[misc]

    def test_absolute_path_normalization(self, temp_git_repo: Path) -> None:
        """Test that adapter normalizes paths to absolute."""
        # Create adapter with absolute path
        adapter = GitAdapter(temp_git_repo)
        assert adapter.repo_path.is_absolute()

        # Verify the path is correctly normalized
        assert adapter.repo_path == temp_git_repo.absolute()


class TestGitNotAvailableError:
    """Test suite for GitNotAvailableError exception."""

    def test_exception_message(self) -> None:
        """Test exception can be created with a custom message."""
        error = GitNotAvailableError("Custom error message")
        assert str(error) == "Custom error message"

    def test_exception_inheritance(self) -> None:
        """Test exception inherits from Exception."""
        error = GitNotAvailableError("Test")
        assert isinstance(error, Exception)
