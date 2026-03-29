"""
Django app/project code generator with atomic rollback.

Implements staging directory generation, file building, atomic move operations,
and rollback mechanism as specified in ADR-022.
"""

import keyword
import logging
import re
import shutil
import tempfile
from pathlib import Path
from typing import List, Optional

import click
from scaffolding.generation.exceptions import (
    ConflictError,
    ValidationError,
    ValidationFailure,
)
from scaffolding.rendering.engine import TemplateRenderer
from scaffolding.validation.formatter import format_validation_report
from scaffolding.validation.runner import ValidationRunner

logger = logging.getLogger(__name__)


class CodeGenerator:
    """
    Generate Django apps/projects with atomic rollback.

    Implements ADR-022 staging directory pattern:
    1. Create staging directory (mkdtemp)
    2. Render templates to staging
    3. Validate generated code (optional)
    4. Atomic move staging → target
    5. Rollback (cleanup staging) on any failure
    """

    def __init__(self, renderer: TemplateRenderer):
        """
        Initialize code generator.

        Args:
            renderer: Template renderer from WP03
        """
        self.renderer = renderer

    def generate_app(
        self,
        name: str,
        template: str,
        project_root: Path,
        validate: bool = True,
        force: bool = False,
    ) -> None:
        """
        Generate Django app with atomic rollback.

        Steps:
        1. Validate app name (T032)
        2. Check for conflicts (T031)
        3. Create staging directory (T026)
        4. Build files in staging (T027)
        5. Validate generated code if requested (WP05 integration point)
        6. Atomic move staging → target (T028)
        7. Rollback on failure (T029)

        Args:
            name: App name (must be snake_case)
            template: Template name (e.g., 'minimal', 'api-first')
            project_root: Project root directory
            validate: Whether to run constitutional validation (default: True)
            force: Bypass validation failures with warning (default: False)

        Raises:
            ValidationError: If app name is invalid
            ConflictError: If target directory already exists
            ValidationFailure: If constitutional validation fails and force=False
            OSError: If file operations fail
        """
        # Pre-generation validation (T032)
        self._validate_app_name(name)

        # Pre-generation conflict detection (T031)
        target_dir = project_root / "src" / name
        if target_dir.exists():
            raise ConflictError(
                f"App '{name}' already exists at {target_dir}. "
                "Choose a different name or remove the existing directory."
            )

        # Create staging directory (T026)
        staging_dir = self._create_staging_dir(name)
        logger.debug(f"Created staging directory: {staging_dir}")

        moved_to_target = False

        try:
            # Build files in staging (T027)
            created_files = self._build_files(staging_dir)
            logger.info(f"Rendered {len(created_files)} files to staging")

            # Atomic move staging → target (T028)
            self._atomic_move(staging_dir, target_dir)
            moved_to_target = True
            logger.info(f"Generated app '{name}' at {target_dir}")

            # Validate generated code if requested (WP05 integration)
            if validate:
                # Stash context so tests can monkeypatch _validate_generated_code(target_dir)
                self._validation_project_root = project_root
                self._validation_force = force
                # Backward compatible with tests that monkeypatch this method
                self._validate_generated_code(target_dir)

        except Exception as exc:
            # Rollback: cleanup staging on any failure (T029)
            if staging_dir.exists():
                shutil.rmtree(staging_dir, ignore_errors=True)
                logger.debug(f"Rolled back: removed staging directory {staging_dir}")

            # If we already moved into place, remove target as well
            # for non-constitutional failures (ValidationFailure keeps files for inspection).
            if moved_to_target and target_dir.exists() and not isinstance(exc, ValidationFailure):
                shutil.rmtree(target_dir, ignore_errors=True)
                logger.debug(f"Rolled back: removed target directory {target_dir}")
            raise

    def generate_project(
        self,
        name: str,
        display_name: Optional[str] = None,
        parent_dir: Optional[Path] = None,
    ) -> None:
        """
        Bootstrap new downstream project (scaffold init).

        Args:
            name: Project directory name (will be sanitized)
            display_name: Human-readable project name (optional)
            parent_dir: Parent directory for project (default: current directory)

        Raises:
            ValidationError: If project name is invalid
            ConflictError: If target directory already exists
        """
        # Validate and sanitize project name (T033)
        sanitized_name = self._validate_project_name(name)

        # Default parent directory to current working directory
        if parent_dir is None:
            parent_dir = Path.cwd()

        target_dir = parent_dir / sanitized_name

        # Check for conflicts
        if target_dir.exists():
            raise ConflictError(
                f"Project directory '{target_dir}' already exists. "
                "Choose a different name or remove the existing directory."
            )

        # Create staging directory
        staging_dir = self._create_staging_dir(sanitized_name)

        try:
            # Build project files in staging
            created_files = self._build_files(staging_dir)
            logger.info(f"Rendered {len(created_files)} project files to staging")

            # Atomic move staging → target
            self._atomic_move(staging_dir, target_dir)
            logger.info(f"Bootstrapped project '{sanitized_name}' at {target_dir}")

        except Exception:
            # Rollback: cleanup staging on failure
            if staging_dir.exists():
                shutil.rmtree(staging_dir, ignore_errors=True)
                logger.debug(f"Rolled back: removed staging directory {staging_dir}")
            raise

    def _create_staging_dir(self, name: str) -> Path:
        """
        Create staging directory for generation (T026).

        Uses tempfile.mkdtemp() to create isolated temporary directory.

        Args:
            name: App/project name for suffix

        Returns:
            Path to staging directory
        """
        staging_dir = Path(tempfile.mkdtemp(prefix="scaffold_", suffix=f"_{name}"))
        return staging_dir

    def _build_files(self, staging_dir: Path) -> List[Path]:
        """
        Build files in staging directory (T027).

        Delegates to TemplateRenderer from WP03 to render templates.

        Args:
            staging_dir: Path to staging directory

        Returns:
            List of created file paths

        Raises:
            TemplateError: If rendering fails
        """
        created_files = self.renderer.render_directory(staging_dir)
        return created_files

    def _atomic_move(self, staging_dir: Path, target_dir: Path) -> None:
        """
        Atomically move staging directory to target (T028).

        Uses shutil.move() which is atomic on same filesystem.

        Args:
            staging_dir: Path to staging directory
            target_dir: Path to target directory

        Raises:
            OSError: If move fails
        """
        shutil.move(str(staging_dir), str(target_dir))

        # Verify target created successfully
        if not target_dir.exists():
            raise OSError(f"Atomic move failed: {target_dir} not created after move")

    def _validate_generated_code(
        self,
        target_dir: Path,
        project_root: Optional[Path] = None,
        force: bool = False,
    ) -> None:
        """
        Validate generated code using check_policy.py (WP05 integration).

        Executes constitutional validation on generated code. If validation
        fails and force=False, raises ValidationFailure. If force=True,
        logs warning and continues.

        Args:
            target_dir: Path to generated code directory
            project_root: Project root directory (location of check_policy.py)
            force: Bypass validation failures with warning (default: False)

        Raises:
            ValidationFailure: If validation fails and force=False
            FileNotFoundError: If check_policy.py not found
            TimeoutError: If validation times out
        """
        effective_force = getattr(self, "_validation_force", force)

        if project_root is None:
            project_root = getattr(self, "_validation_project_root", None)

        if project_root is None:
            # target_dir is usually <project_root>/src/<app_name>
            project_root = target_dir.parent.parent

        check_policy_path = project_root / "check_policy.py"

        if not check_policy_path.exists():
            logger.warning(f"check_policy.py not found at {check_policy_path}, skipping validation")
            click.secho(
                f"⚠ Warning: check_policy.py not found at {check_policy_path}. "
                "Skipping constitutional validation.",
                fg="yellow",
            )
            return

        try:
            runner = ValidationRunner(check_policy_path)
            report = runner.validate_directory(target_dir)

            if report["passed"]:
                logger.info("Constitutional validation passed")
                return

            # Validation failed - format and display report
            error_msg = format_validation_report(report)
            click.echo(error_msg, err=True)

            if effective_force:
                # Warning but continue
                click.secho(
                    "\n⚠ Validation failed but continuing due to --force flag",
                    fg="yellow",
                    bold=True,
                )
                logger.warning("Constitutional validation failed but continuing with --force")
            else:
                # Exit with validation failure
                logger.error("Constitutional validation failed, aborting")
                raise ValidationFailure(
                    f"Constitutional validation failed with "
                    f"{len(report['violations'])} violations"
                )

        except (FileNotFoundError, TimeoutError):
            # Re-raise these specific errors
            raise

        except Exception as e:
            logger.error(f"Unexpected error during validation: {e}")
            if effective_force:
                click.secho(
                    f"\n⚠ Validation error ({e}) but continuing due to --force flag",
                    fg="yellow",
                )
            else:
                raise

    def _validate_app_name(self, name: str) -> None:
        """
        Validate app name follows Django conventions (T032).

        Rules:
        - Must be snake_case (lowercase with underscores)
        - No hyphens, spaces, or special characters
        - Cannot start with number
        - Cannot be Python keyword
        - Cannot be Django reserved name

        Args:
            name: App name to validate

        Raises:
            ValidationError: If name is invalid
        """
        if not name:
            raise ValidationError("Invalid app name: cannot be empty")

        # Check not starting with number (must run before snake_case regex)
        if name[0].isdigit():
            raise ValidationError(f"Invalid app name '{name}': cannot start with number")

        # Check snake_case pattern
        if not re.match(r"^[a-z][a-z0-9_]*$", name):
            raise ValidationError(
                f"Invalid app name '{name}': must be lowercase with underscores "
                "only (snake_case). Examples: payments, user_auth, api_v2"
            )

        # Check not Python keyword
        if keyword.iskeyword(name):
            raise ValidationError(
                f"Invalid app name '{name}': cannot be Python keyword (e.g., import, class, def)"
            )

        # Check not Django reserved name
        reserved = [
            "admin",
            "auth",
            "contenttypes",
            "sessions",
            "messages",
            "staticfiles",
            "sites",
        ]
        if name in reserved:
            raise ValidationError(
                f"Invalid app name '{name}': reserved by Django. "
                f"Reserved names: {', '.join(reserved)}"
            )

    def _validate_project_name(self, name: str) -> str:
        """
        Validate and sanitize project name (T033).

        Slugifies name: lowercase, hyphens, removes special characters.

        Args:
            name: Project name to sanitize

        Returns:
            Sanitized project name (slugified)

        Raises:
            ValidationError: If name is invalid (empty after sanitization)
        """
        # Slugify: lowercase, replace spaces with hyphens, remove special chars
        sanitized = re.sub(r"[^a-z0-9-]", "", name.lower().replace(" ", "-"))

        if not sanitized:
            raise ValidationError(
                f"Invalid project name '{name}': no valid characters remain after "
                "sanitization. Use alphanumeric characters and hyphens."
            )

        return sanitized
