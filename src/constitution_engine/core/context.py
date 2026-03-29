"""
Repository context builder for the Constitutional Enforcement Engine.

This module implements the RepositoryContextBuilder that inspects filesystem
and optionally Git metadata to build RepositoryContext instances as specified in WP02 T012.
"""

import logging
import os
import subprocess
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, Optional, Set

from constitution_engine.core.models import RepositoryContext

# Import GitAdapter if available (WP06)
if TYPE_CHECKING:
    from constitution_engine.adapters.git import GitAdapter as GitAdapterType
    from constitution_engine.adapters.git import GitNotAvailableError as GitNotAvailableErrorType
else:
    GitAdapterType = None  # type: ignore[assignment, misc]
    GitNotAvailableErrorType = Exception  # type: ignore[assignment, misc]

try:
    from constitution_engine.adapters.git import GitAdapter, GitNotAvailableError

    _GIT_ADAPTER_AVAILABLE = True
except ImportError:
    _GIT_ADAPTER_AVAILABLE = False
    GitAdapter = None  # type: ignore[assignment, misc]
    GitNotAvailableError = Exception  # type: ignore[assignment, misc]

__all__ = [
    "RepositoryContextBuilder",
    "GitMetadata",
    "LanguageDetector",
]

logger = logging.getLogger(__name__)


class GitMetadata:
    """Helper class for extracting Git metadata."""

    def __init__(self, repo_path: Path) -> None:
        """Initialize with repository path."""
        self.repo_path = repo_path
        self._git_available: Optional[bool] = None

    def is_git_available(self) -> bool:
        """Check if Git is available and repo is a Git repository."""
        if self._git_available is not None:
            return self._git_available

        try:
            result = subprocess.run(
                ["git", "rev-parse", "--git-dir"],  # noqa: S603, S607
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5,
            )
            self._git_available = result.returncode == 0
        except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError):
            self._git_available = False

        return self._git_available

    def get_current_branch(self) -> Optional[str]:
        """Get current Git branch name."""
        if not self.is_git_available():
            return None

        try:
            result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],  # noqa: S603, S607
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                branch = result.stdout.strip()
                return branch if branch != "HEAD" else None
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            logger.debug("Failed to get Git branch")

        return None

    def get_current_commit(self) -> Optional[str]:
        """Get current Git commit hash."""
        if not self.is_git_available():
            return None

        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],  # noqa: S603, S607
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            logger.debug("Failed to get Git commit")

        return None

    def get_changed_files(self, base_ref: str = "HEAD~1") -> Set[Path]:
        """Get files changed compared to base reference."""
        if not self.is_git_available():
            return set()

        try:
            result = subprocess.run(
                ["git", "diff", "--name-only", base_ref],  # noqa: S603, S607
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                changed_files = set()
                for line in result.stdout.strip().split("\n"):
                    if line.strip():
                        changed_files.add(self.repo_path / line.strip())
                return changed_files
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            logger.debug("Failed to get changed files")

        return set()


class LanguageDetector:
    """Helper class for detecting programming languages in a repository."""

    # Language detection patterns based on file extensions
    LANGUAGE_PATTERNS = {
        "python": {".py", ".pyx", ".pyi", ".pyw"},
        "javascript": {".js", ".jsx", ".mjs", ".cjs"},
        "typescript": {".ts", ".tsx", ".d.ts"},
        "java": {".java"},
        "csharp": {".cs", ".csx"},
        "cpp": {".cpp", ".cxx", ".cc", ".c++", ".hpp", ".hxx", ".h++"},
        "c": {".c", ".h"},
        "go": {".go"},
        "rust": {".rs"},
        "ruby": {".rb", ".rbw"},
        "php": {".php", ".phtml", ".php3", ".php4", ".php5"},
        "swift": {".swift"},
        "kotlin": {".kt", ".kts"},
        "scala": {".scala", ".sc"},
        "shell": {".sh", ".bash", ".zsh", ".fish"},
        "powershell": {".ps1", ".psm1", ".psd1"},
        "yaml": {".yaml", ".yml"},
        "json": {".json"},
        "toml": {".toml"},
        "xml": {".xml", ".xsd", ".xsl"},
        "html": {".html", ".htm", ".xhtml"},
        "css": {".css", ".scss", ".sass", ".less"},
        "sql": {".sql"},
        "markdown": {".md", ".markdown", ".mdown", ".mkd"},
        "dockerfile": {"Dockerfile", ".dockerfile"},
    }

    # Special filename patterns
    SPECIAL_FILES = {
        "python": {"setup.py", "pyproject.toml", "requirements.txt", "Pipfile", "poetry.lock"},
        "javascript": {"package.json", "package-lock.json", "yarn.lock", "bower.json"},
        "typescript": {"tsconfig.json", "tslint.json"},
        "java": {"pom.xml", "build.gradle", "gradle.properties"},
        "csharp": {"*.csproj", "*.sln", "packages.config"},
        "go": {"go.mod", "go.sum", "Gopkg.toml", "Gopkg.lock"},
        "rust": {"Cargo.toml", "Cargo.lock"},
        "ruby": {"Gemfile", "Gemfile.lock", "Rakefile"},
        "php": {"composer.json", "composer.lock"},
        "dockerfile": {"docker-compose.yml", "docker-compose.yaml"},
    }

    def __init__(self, repo_path: Path, exclude_patterns: Optional[Set[str]] = None) -> None:
        """
        Initialize language detector.

        Args:
            repo_path: Path to repository root
            exclude_patterns: Patterns to exclude from detection
        """
        self.repo_path = repo_path
        self.exclude_patterns = exclude_patterns or {
            "node_modules",
            ".git",
            ".svn",
            ".hg",
            "__pycache__",
            ".pytest_cache",
            ".mypy_cache",
            ".ruff_cache",
            "venv",
            ".venv",
            "env",
            "_build",
            "build",
            "dist",
            ".tox",
        }

    def detect_languages(self) -> Set[str]:
        """
        Detect programming languages used in the repository.

        Returns:
            Set of detected language names
        """
        detected_languages = set()

        # Walk through repository files
        for root, dirs, files in os.walk(self.repo_path):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in self.exclude_patterns]

            root_path = Path(root)

            for file in files:
                root_path / file

                # Check for language by extension
                for language, extensions in self.LANGUAGE_PATTERNS.items():
                    if any(file.endswith(ext) for ext in extensions) or file in extensions:
                        detected_languages.add(language)

                # Check special files
                for language, special_files in self.SPECIAL_FILES.items():
                    if file in special_files:
                        detected_languages.add(language)

        logger.debug(f"Detected languages: {detected_languages}")
        return detected_languages

    def get_file_count_by_language(self) -> Dict[str, int]:
        """Get count of files per detected language."""
        language_counts = {}

        for root, dirs, files in os.walk(self.repo_path):
            dirs[:] = [d for d in dirs if d not in self.exclude_patterns]
            Path(root)

            for file in files:
                for language, extensions in self.LANGUAGE_PATTERNS.items():
                    if any(file.endswith(ext) for ext in extensions):
                        language_counts[language] = language_counts.get(language, 0) + 1

        return language_counts


class RepositoryContextBuilder:
    """
    Builder for RepositoryContext instances.

    Inspects filesystem and optionally Git metadata to construct
    comprehensive repository context information.
    """

    def __init__(self, include_git_metadata: bool = True) -> None:
        """
        Initialize the context builder.

        Args:
            include_git_metadata: Whether to include Git metadata in context
        """
        self.include_git_metadata = include_git_metadata

    def build_context(
        self,
        repo_path: Path,
        constitution_path: Optional[Path] = None,
        exclude_patterns: Optional[Set[str]] = None,
    ) -> RepositoryContext:
        """
        Build RepositoryContext for the given repository.

        Args:
            repo_path: Path to repository root
            constitution_path: Optional explicit path to constitution file
            exclude_patterns: Patterns to exclude from analysis

        Returns:
            Complete RepositoryContext instance
        """
        if not repo_path.exists():
            raise ValueError(f"Repository path does not exist: {repo_path}")

        if not repo_path.is_dir():
            raise ValueError(f"Repository path is not a directory: {repo_path}")

        # Ensure absolute path
        repo_path = repo_path.absolute()

        logger.info(f"Building repository context for: {repo_path}")

        # Detect programming languages
        language_detector = LanguageDetector(repo_path, exclude_patterns)
        detected_languages = language_detector.detect_languages()

        # Find constitution file if not explicitly provided
        if constitution_path is None:
            constitution_path = self._find_constitution_file(repo_path)

        # Collect Git metadata if enabled
        git_branch: str | None = None
        git_commit: str | None = None
        git_metadata: dict[str, Any] = {}

        if self.include_git_metadata:
            # Try to use the new GitAdapter (WP06) if available
            if _GIT_ADAPTER_AVAILABLE:
                try:
                    git_adapter = GitAdapter(repo_path)  # type: ignore[unreachable]
                    git_info = git_adapter.get_info()

                    git_branch = git_info.branch
                    git_commit = git_info.commit_hash_full
                    git_metadata["changed_files"] = [str(p) for p in git_info.changed_files]
                    git_metadata["is_dirty"] = git_info.is_dirty
                    git_metadata["remote_url"] = git_info.remote_url

                    logger.debug("Using GitAdapter for Git metadata")
                except Exception as e:  # GitNotAvailableError or any other error
                    logger.debug(f"GitAdapter not available, falling back to GitMetadata: {e}")
                    # Fall back to original GitMetadata
                    git = GitMetadata(repo_path)
                    git_branch = git.get_current_branch()
                    git_commit = git.get_current_commit()

                    if git.is_git_available():
                        git_metadata["changed_files"] = [str(p) for p in git.get_changed_files()]
            else:
                # Use original GitMetadata implementation
                logger.debug("Using legacy GitMetadata")
                git = GitMetadata(repo_path)
                git_branch = git.get_current_branch()
                git_commit = git.get_current_commit()

                if git.is_git_available():
                    git_metadata["changed_files"] = [str(p) for p in git.get_changed_files()]

        # Detect repository tags/characteristics
        tags = self._detect_repository_tags(repo_path, detected_languages)

        # Build metadata
        metadata = {
            "language_file_counts": language_detector.get_file_count_by_language(),
            "git_metadata": git_metadata,
            "total_files": self._count_total_files(repo_path, exclude_patterns or set()),
        }

        # Create and return context
        context = RepositoryContext(
            root_path=repo_path,
            constitution_path=constitution_path,
            detected_languages=detected_languages,
            git_branch=git_branch,
            git_commit=git_commit,
            tags=tags,
            metadata=metadata,
        )

        logger.info(f"Built context: {len(detected_languages)} languages, {len(tags)} tags")
        return context

    def _find_constitution_file(self, repo_path: Path) -> Optional[Path]:
        """Find constitution file in the repository."""
        constitution_filenames = [
            "CONSTITUTION.md",
            "constitution.md",
            "Constitution.md",
            "CONSTITUTION.txt",
            "constitution.txt",
            ".constitution",
            "docs/CONSTITUTION.md",
            "docs/constitution.md",
        ]

        for filename in constitution_filenames:
            constitution_path = repo_path / filename
            if constitution_path.exists() and constitution_path.is_file():
                logger.debug(f"Found constitution file: {constitution_path}")
                return constitution_path

        return None

    def _detect_repository_tags(self, repo_path: Path, detected_languages: Set[str]) -> Set[str]:
        """Detect repository tags/characteristics."""
        tags = set()

        # Language-based tags
        if "python" in detected_languages:
            tags.add("python-project")

            # Check for specific Python project types
            if (repo_path / "manage.py").exists():
                tags.add("django-project")
            if (repo_path / "app.py").exists() or (repo_path / "wsgi.py").exists():
                tags.add("flask-project")
            if (repo_path / "pyproject.toml").exists():
                tags.add("modern-python")

        if "javascript" in detected_languages or "typescript" in detected_languages:
            tags.add("js-project")

            # Check for specific JS frameworks
            if (repo_path / "package.json").exists():
                try:
                    import json

                    with open(repo_path / "package.json") as f:
                        package_data = json.load(f)
                        deps = {
                            **package_data.get("dependencies", {}),
                            **package_data.get("devDependencies", {}),
                        }

                        if "react" in deps:
                            tags.add("react-project")
                        if "vue" in deps:
                            tags.add("vue-project")
                        if "angular" in deps or "@angular/core" in deps:
                            tags.add("angular-project")
                        if "next" in deps:
                            tags.add("nextjs-project")
                except (json.JSONDecodeError, OSError):
                    pass

        # Project structure tags
        if (repo_path / "Dockerfile").exists():
            tags.add("containerized")

        if (repo_path / ".github").exists():
            tags.add("github-actions")

        if any(
            (repo_path / ci_file).exists()
            for ci_file in [".gitlab-ci.yml", ".circleci", "azure-pipelines.yml"]
        ):
            tags.add("ci-enabled")

        if (repo_path / "tests").exists() or (repo_path / "test").exists():
            tags.add("has-tests")

        # Constitution tags
        if self._find_constitution_file(repo_path):
            tags.add("constitutional")

        return tags

    def _count_total_files(self, repo_path: Path, exclude_patterns: Set[str]) -> int:
        """Count total files in repository (excluding excluded patterns)."""
        count = 0
        for _root, dirs, files in os.walk(repo_path):
            dirs[:] = [d for d in dirs if d not in exclude_patterns]
            count += len(files)
        return count
