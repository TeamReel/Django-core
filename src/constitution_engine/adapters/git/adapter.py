"""
Git adapter for reading repository state.

This module provides a thin wrapper around Git operations, using subprocess
calls to read repository metadata like current branch, commit hash, and
changed files. The adapter is designed to be:

- Lightweight: No heavy dependencies, just subprocess calls
- Cross-platform: Works on Windows, Linux, and macOS
- Optional: Gracefully degrades when Git is unavailable
- Testable: Easy to mock in tests

Usage:
    >>> adapter = GitAdapter(repo_path=Path("/path/to/repo"))
    >>> git_info = adapter.get_info()
    >>> print(f"Branch: {git_info.branch}, Commit: {git_info.commit_hash}")
"""

import subprocess
from dataclasses import dataclass
from pathlib import Path

__all__ = ["GitAdapter", "GitInfo", "GitNotAvailableError"]


class GitNotAvailableError(Exception):
    """Raised when Git is not available or repo is not a Git repository."""

    pass


@dataclass(frozen=True)
class GitInfo:
    """
    Information about the current Git repository state.

    Attributes:
        branch: Current branch name (None if detached HEAD or unavailable)
        commit_hash: Current commit SHA (short form)
        commit_hash_full: Full commit SHA
        changed_files: List of paths with uncommitted changes
        is_dirty: Whether there are uncommitted changes
        remote_url: Primary remote URL (if available)
    """

    branch: str | None
    commit_hash: str
    commit_hash_full: str
    changed_files: list[Path]
    is_dirty: bool
    remote_url: str | None = None


class GitAdapter:
    """
    Adapter for reading Git repository state.

    This adapter uses subprocess calls to interact with Git, making it
    lightweight and avoiding heavy dependencies. All operations are read-only;
    no modifications are made to the repository.

    Args:
        repo_path: Path to the repository root
        timeout: Timeout in seconds for Git operations (default: 10)

    Raises:
        GitNotAvailableError: If Git is not installed or path is not a Git repo
    """

    def __init__(self, repo_path: Path, timeout: int = 10) -> None:
        """Initialize the Git adapter."""
        self.repo_path = repo_path.absolute()
        self.timeout = timeout

        # Verify Git is available and path is a Git repository
        if not self._is_git_available():
            raise GitNotAvailableError("Git executable not found in PATH")

        if not self._is_git_repository():
            raise GitNotAvailableError(f"Path is not a Git repository: {self.repo_path}")

    def get_info(self) -> GitInfo:
        """
        Get comprehensive Git repository information.

        Returns:
            GitInfo object with current repository state

        Raises:
            GitNotAvailableError: If Git operations fail
        """
        return GitInfo(
            branch=self.get_current_branch(),
            commit_hash=self.get_commit_hash(short=True),
            commit_hash_full=self.get_commit_hash(short=False),
            changed_files=self.get_changed_files(),
            is_dirty=self.is_dirty(),
            remote_url=self.get_remote_url(),
        )

    def get_current_branch(self) -> str | None:
        """
        Get the current branch name.

        Returns:
            Branch name, or None if in detached HEAD state

        Raises:
            GitNotAvailableError: If Git command fails
        """
        try:
            result = self._run_git_command(["rev-parse", "--abbrev-ref", "HEAD"])
            branch = result.strip()
            # Git returns 'HEAD' for detached HEAD state
            return None if branch == "HEAD" else branch
        except subprocess.CalledProcessError as e:
            raise GitNotAvailableError(f"Failed to get current branch: {e}") from e

    def get_commit_hash(self, short: bool = True) -> str:
        """
        Get the current commit hash.

        Args:
            short: If True, return short (7-char) hash; otherwise full hash

        Returns:
            Commit hash string

        Raises:
            GitNotAvailableError: If Git command fails
        """
        try:
            cmd = ["rev-parse", "--short", "HEAD"] if short else ["rev-parse", "HEAD"]
            result = self._run_git_command(cmd)
            return result.strip()
        except subprocess.CalledProcessError as e:
            raise GitNotAvailableError(f"Failed to get commit hash: {e}") from e

    def get_changed_files(self) -> list[Path]:
        """
        Get list of files with uncommitted changes.

        This includes:
        - Modified files (staged and unstaged)
        - New files (staged and untracked)
        - Deleted files

        Returns:
            List of Path objects for changed files (relative to repo root)

        Raises:
            GitNotAvailableError: If Git command fails
        """
        try:
            # Get staged and unstaged changes
            result = self._run_git_command(["status", "--porcelain"])

            changed = []
            for line in result.splitlines():
                if not line.strip():
                    continue

                # Format is: XY filename
                # Where X is staged status, Y is unstaged status
                # We want the filename (everything after position 3)
                if len(line) > 3:
                    filepath = line[3:].strip()
                    # Handle renamed files (format: "old -> new")
                    if " -> " in filepath:
                        filepath = filepath.split(" -> ")[1]
                    changed.append(Path(filepath))

            return changed
        except subprocess.CalledProcessError as e:
            raise GitNotAvailableError(f"Failed to get changed files: {e}") from e

    def is_dirty(self) -> bool:
        """
        Check if the repository has uncommitted changes.

        Returns:
            True if there are uncommitted changes, False otherwise

        Raises:
            GitNotAvailableError: If Git command fails
        """
        return len(self.get_changed_files()) > 0

    def get_remote_url(self, remote_name: str = "origin") -> str | None:
        """
        Get the URL of the specified remote.

        Args:
            remote_name: Name of the remote (default: "origin")

        Returns:
            Remote URL, or None if remote doesn't exist

        Raises:
            GitNotAvailableError: If Git command fails unexpectedly
        """
        try:
            result = self._run_git_command(["remote", "get-url", remote_name])
            return result.strip() or None
        except subprocess.CalledProcessError:
            # Remote doesn't exist - this is not an error condition
            return None

    def _is_git_available(self) -> bool:
        """Check if Git is available on the system."""
        try:
            subprocess.run(
                ["git", "--version"],  # noqa: S603, S607
                capture_output=True,
                timeout=self.timeout,
                check=True,
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def _is_git_repository(self) -> bool:
        """Check if the path is a Git repository."""
        try:
            self._run_git_command(["rev-parse", "--git-dir"])
            return True
        except subprocess.CalledProcessError:
            return False

    def _run_git_command(self, args: list[str]) -> str:
        """
        Run a Git command in the repository.

        Args:
            args: Git command arguments (without 'git' prefix)

        Returns:
            Command output as string

        Raises:
            subprocess.CalledProcessError: If command fails
        """
        result = subprocess.run(
            ["git"] + args,  # noqa: S603
            cwd=self.repo_path,
            capture_output=True,
            text=True,
            timeout=self.timeout,
            check=True,
        )
        return result.stdout
