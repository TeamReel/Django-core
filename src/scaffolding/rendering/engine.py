"""
Jinja2-based template rendering engine for scaffolding.

Provides template rendering with variable substitution, built-in variables,
file processing, and cross-platform path handling.
"""

import logging
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from jinja2 import (
    Environment,
    FileSystemLoader,
    StrictUndefined,
    TemplateError,
    TemplateSyntaxError,
    UndefinedError,
)
from scaffolding import __version__
from scaffolding.templates.manifest import TemplateManifest
from scaffolding.utils.errors import format_user_error

logger = logging.getLogger(__name__)


def create_jinja_env(template_dir: Path) -> Environment:
    """
    Create Jinja2 environment for template rendering.

    Configured for Python code generation with:
    - Autoescape disabled (not generating HTML)
    - StrictUndefined (fail on undefined variables to catch typos)
    - Whitespace trimming for clean output

    Args:
        template_dir: Path to template directory

    Returns:
        Configured Jinja2 environment
    """
    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=False,  # Generating Python code, not HTML
        undefined=StrictUndefined,  # Fail on undefined variables
        trim_blocks=True,  # Remove first newline after block
        lstrip_blocks=True,  # Strip leading spaces before block
        keep_trailing_newline=True,  # Preserve final newline for golden-file stability
    )

    # Add custom filters for naming conventions
    env.filters["snake_case"] = lambda s: (s.lower().replace("-", "_").replace(" ", "_"))
    env.filters["pascal_case"] = lambda s: "".join(
        word.capitalize() for word in s.replace("_", " ").replace("-", " ").split()
    )
    env.filters["kebab_case"] = lambda s: (s.lower().replace("_", "-").replace(" ", "-"))

    return env


def get_builtin_variables() -> Dict[str, Any]:
    """
    Get built-in template variables available in all templates.

    Provides automatic variables without user input:
    - timestamp: Current datetime in ISO format
    - author: Git user.name from git config
    - python_version: Python version (e.g., "3.12.0")
    - core_version: Core-App scaffolding version
    - year: Current year

    Returns:
        Dict of built-in variables
    """
    # Get git author (graceful fallback if git not configured)
    try:
        result = subprocess.run(
            ["git", "config", "user.name"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        author = result.stdout.strip() if result.returncode == 0 else "Unknown"
    except Exception:
        author = "Unknown"

    return {
        "timestamp": datetime.now().isoformat(),
        "author": author,
        "python_version": (
            f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        ),
        "core_version": __version__,
        "year": datetime.now().year,
    }


class TemplateRenderer:
    """
    Render templates with variable substitution and file processing.

    Handles:
    - Jinja2 variable substitution from user inputs + built-in variables
    - .j2 template file rendering
    - Non-template file copying (preserve unchanged)
    - Binary file copying (preserve metadata)
    - Cross-platform path handling
    - Error handling with line numbers
    """

    def __init__(self, template_dir: Path | None = None, variables: Dict[str, Any] | None = None):
        """
        Initialize template renderer.

        Args:
            template_dir: Path to template directory
            variables: User-provided variables for substitution
        """
        self.template_dir = template_dir
        self.variables = self._merge_with_builtin_variables(variables or {})
        self.env = self._create_env(template_dir)

    def render(self, template: str, variables: Dict[str, Any] | None = None) -> str:
        """Render a template.

        Supports two modes (for backward compatibility with tests):
        - File mode: when initialized with template_dir and variables is None,
          `template` is a relative file path.
        - String mode: when variables is provided OR template_dir is None,
          `template` is a raw Jinja2 template string.
        """
        try:
            if variables is None and self.template_dir is not None:
                # File mode: normalize Windows separators for Jinja2
                template_file = template.replace("\\", "/")
                jinja_template = self.env.get_template(template_file)
                return jinja_template.render(**self.variables)

            # String mode
            merged_vars = self._merge_with_builtin_variables(variables or {})
            jinja_template = self.env.from_string(template)
            return jinja_template.render(**merged_vars)
        except TemplateSyntaxError as e:
            error_msg = format_user_error(
                f"Template syntax error in {template}, line {e.lineno}: {e.message}",
                "Check template syntax, ensure all blocks are closed",
            )
            raise TemplateError(error_msg) from e
        except UndefinedError as e:
            error_msg = format_user_error(
                f"Undefined variable in {template}: {e}",
                "Check variable names match CLI inputs or built-in variables",
            )
            raise TemplateError(error_msg) from e
        except TemplateError as e:
            # Re-raise other template errors with context
            raise TemplateError(f"Failed to render {template}: {e}") from e

    def render_directory(self, output_dir: Path) -> List[Path]:
        """
        Render all templates in template directory to output directory.

        Processes files:
        - .j2 files: Rendered via Jinja2, output without .j2 suffix
        - Binary files: Copied unchanged (preserves metadata)
        - Other files: Copied unchanged

        Args:
            output_dir: Path to output directory

        Returns:
            List of created file paths

        Raises:
            TemplateError: If critical rendering error occurs
        """
        created_files: List[Path] = []

        for template_file in self.template_dir.rglob("*"):
            if template_file.is_dir():
                continue

            # Calculate relative path and output path
            rel_path = template_file.relative_to(self.template_dir)

            # Skip __template__.yaml manifest (internal metadata)
            if rel_path.name == "__template__.yaml":
                continue

            # Determine output filename (remove .j2 suffix if present)
            if rel_path.suffix == ".j2":
                output_rel_path = rel_path.with_suffix("")  # Remove .j2
                output_path = output_dir / output_rel_path

                # Render template
                try:
                    content = self.render(rel_path.as_posix())
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    output_path.write_text(content, encoding="utf-8")
                    created_files.append(output_path)
                    logger.debug(f"Rendered template: {rel_path} → {output_path}")
                except TemplateError as e:
                    logger.error(f"Failed to render {rel_path}: {e}")
                    # Continue processing other files
                    continue
            else:
                # Copy non-template file unchanged
                output_path = output_dir / rel_path
                output_path.parent.mkdir(parents=True, exist_ok=True)

                # Use copy2 to preserve file metadata (timestamps, permissions)
                shutil.copy2(template_file, output_path)
                created_files.append(output_path)
                logger.debug(f"Copied file: {rel_path} → {output_path}")

        return created_files

    def render_with_inheritance(
        self, template_manifest: TemplateManifest, output_dir: Path
    ) -> List[Path]:
        """
        Render template with inheritance (base + child files).

        Template inheritance is resolved in WP02 (TemplateRegistry.resolve_inheritance).
        This method renders the resolved file list with file-level override:
        if child has same filename as base, child replaces base entirely.

        Args:
            template_manifest: Resolved template manifest (from TemplateRegistry)
            output_dir: Path to output directory

        Returns:
            List of created file paths

        Note:
            Template manifest is already resolved (inheritance merged in WP02).
            This method just renders all files from the resolved template.
        """
        # Template manifest is already resolved (inheritance merged in WP02)
        # Just render all files from the manifest's template directory
        return self.render_directory(output_dir)

    def _merge_with_builtin_variables(self, user_vars: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge user variables with built-in variables.

        Built-in variables are added first, then user variables overlay.
        User variables can override built-in variables if needed.

        Args:
            user_vars: User-provided variables

        Returns:
            Merged dict with built-in + user variables
        """
        merged = get_builtin_variables()
        merged.update(user_vars)
        return merged

    def _create_env(self, template_dir: Path | None) -> Environment:
        if template_dir is not None:
            return create_jinja_env(template_dir)

        # In-memory env (no loader), used by placeholder/golden tests
        env = Environment(
            autoescape=False,
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True,
        )
        env.filters["snake_case"] = lambda s: (s.lower().replace("-", "_").replace(" ", "_"))
        env.filters["pascal_case"] = lambda s: "".join(
            word.capitalize() for word in s.replace("_", " ").replace("-", " ").split()
        )
        env.filters["kebab_case"] = lambda s: (s.lower().replace("_", "-").replace(" ", "-"))
        return env
