"""
Template registry with singleton pattern and hybrid discovery.

Manages template discovery from multiple sources following ADR-021 precedence:
1. Project-local templates/scaffold/
2. SCAFFOLD_TEMPLATE_DIRS from Django settings
3. Core built-in templates
4. Plugin packages

Implements template inheritance resolution (max depth 2) and conflict detection.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from .loaders import FilesystemLoader, PluginLoader
from .manifest import TemplateManifest

logger = logging.getLogger(__name__)


class TemplateRegistry:
    """
    Singleton registry for scaffolding templates.

    Discovers templates from multiple sources in precedence order, handles
    template inheritance, and provides unified access to all templates.
    """

    _instance: Optional[TemplateRegistry] = None

    def __new__(cls) -> TemplateRegistry:
        """
        Create or return singleton instance.

        Returns:
            Singleton TemplateRegistry instance
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._templates: dict[str, TemplateManifest] = {}
            cls._instance._discovered = False
        return cls._instance

    def discover(self, force: bool = False) -> None:
        """
        Discover templates from all sources.

        Discovery order (reverse precedence, so later sources override earlier):
        1. Core built-in templates (lowest precedence)
        2. Plugin packages
        3. Configured template directories (SCAFFOLD_TEMPLATE_DIRS)
        4. Project-local templates/scaffold/ (highest precedence)

        Args:
            force: If True, rediscover even if already discovered
        """
        if self._discovered and not force:
            return

        # Clear existing templates
        self._templates.clear()

        # Discover in reverse precedence order (so later sources override)
        self._discover_builtin_templates()
        self._discover_plugin_templates()
        self._discover_configured_templates()
        self._discover_project_templates()

        # Validate all templates
        self._validate_all_templates()

        self._discovered = True
        logger.info(f"Template discovery complete: {len(self._templates)} template(s) found")

    def get_template(self, name: str) -> TemplateManifest:
        """
        Get template by name.

        Args:
            name: Template name

        Returns:
            Template manifest

        Raises:
            KeyError: If template not found
        """
        if not self._discovered:
            self.discover()

        if name not in self._templates:
            available = ", ".join(sorted(self._templates.keys()))
            raise KeyError(f"Template '{name}' not found. Available templates: {available}")

        return self._templates[name]

    def list_templates(self) -> list[TemplateManifest]:
        """
        List all discovered templates.

        Returns:
            List of template manifests, sorted by name
        """
        if not self._discovered:
            self.discover()

        return sorted(self._templates.values(), key=lambda t: t.name)

    def resolve_inheritance(self, template_name: str) -> TemplateManifest:
        """
        Resolve template inheritance chain.

        Merges base template files and variables into child template following
        ADR-021 file-level override strategy. Maximum inheritance depth is 2.

        Args:
            template_name: Template name

        Returns:
            Resolved template manifest with merged files/variables

        Raises:
            KeyError: If template or base template not found
            ValueError: If inheritance depth > 2
        """
        template = self.get_template(template_name)

        if not template.extends:
            return template  # No inheritance

        # Resolve base template
        if template.extends not in self._templates:
            raise ValueError(
                f"Base template '{template.extends}' not found for template '{template_name}'"
            )

        base = self.get_template(template.extends)

        # Check depth limit (max 2 levels: template → base → grandparent)
        if base.extends:
            # Depth = 2, resolve grandparent
            if base.extends not in self._templates:
                raise ValueError(
                    f"Base template '{base.extends}' not found for template '{base.name}'"
                )

            grandparent = self.get_template(base.extends)

            if grandparent.extends:
                raise ValueError(
                    f"Template inheritance depth > 2: {template_name}"
                    f" → {base.name} → {grandparent.name}"
                    f" → {grandparent.extends}"
                )

            # Merge grandparent + base
            base = self._merge_templates(grandparent, base)

        # Merge base + template
        return self._merge_templates(base, template)

    def _merge_templates(self, base: TemplateManifest, child: TemplateManifest) -> TemplateManifest:
        """
        Merge base and child templates (file-level override).

        Child files override base files by filename. Child variables override
        base variables by name.

        Args:
            base: Base template
            child: Child template (overrides base)

        Returns:
            Merged template manifest
        """
        # Merge files (child files override base files by filename)
        base_files = {Path(f).name: f for f in base.files}
        child_files = {Path(f).name: f for f in child.files}
        merged_files_dict = {**base_files, **child_files}
        merged_files = list(merged_files_dict.values())

        # Merge variables (child variables override base variables by name)
        merged_variables = {**base.variables, **child.variables}

        return TemplateManifest(
            name=child.name,
            description=child.description,
            variables=merged_variables,
            files=merged_files,
            template_dir=child.template_dir,
            extends=child.extends,
            _source=child._source,
        )

    def _add_template(self, template: TemplateManifest, source: str) -> None:
        """
        Add template to registry with conflict detection.

        Logs warning if template overrides existing template from lower
        precedence source (ADR-021, FR-013).

        Args:
            template: Template manifest
            source: Source description (e.g., "Core built-in", "project-local")
        """
        if template.name in self._templates:
            existing_source = self._templates[template.name]._source
            logger.warning(
                f"Template '{template.name}' from {source} overrides {existing_source} template"
            )

        template._source = source
        self._templates[template.name] = template
        logger.debug(f"Registered template '{template.name}' from {source}")

    def _discover_builtin_templates(self) -> None:
        """
        Discover Core built-in templates.

        Loads templates from src/scaffolding/built_in_templates/ directory.
        """
        # Path to built-in templates relative to this module
        module_dir = Path(__file__).parent.parent
        builtin_dir = module_dir / "built_in_templates"

        templates = FilesystemLoader.load_from_directory(builtin_dir)
        for template in templates.values():
            self._add_template(template, "Core built-in")

        logger.debug(f"Discovered {len(templates)} Core built-in template(s)")

    def _discover_plugin_templates(self) -> None:
        """
        Discover templates from plugin packages.

        Loads templates from installed packages with scaffold_templates module.
        """
        templates = PluginLoader.load_from_plugins()
        for template in templates.values():
            self._add_template(template, f"plugin ({template.template_dir})")

        logger.debug(f"Discovered {len(templates)} plugin template(s)")

    def _discover_configured_templates(self) -> None:
        """
        Discover templates from configured directories.

        Loads templates from SCAFFOLD_TEMPLATE_DIRS setting (if Django available).
        Falls back to empty list if Django not available or setting not configured.
        """
        template_dirs = self._get_configured_template_dirs()

        total_templates = 0
        for directory in template_dirs:
            templates = FilesystemLoader.load_from_directory(Path(directory))
            for template in templates.values():
                self._add_template(template, f"configured ({directory})")
            total_templates += len(templates)

        logger.debug(
            f"Discovered {total_templates} template(s) from"
            f" {len(template_dirs)} configured director(ies)"
        )

    def _discover_project_templates(self) -> None:
        """
        Discover project-local templates.

        Loads templates from templates/scaffold/ directory relative to project root.
        """
        project_dir = self._get_project_root()
        if project_dir is None:
            logger.debug("Could not determine project root, skipping project-local templates")
            return

        templates_dir = project_dir / "templates" / "scaffold"
        templates = FilesystemLoader.load_from_directory(templates_dir)
        for template in templates.values():
            self._add_template(template, "project-local")

        logger.debug(f"Discovered {len(templates)} project-local template(s)")

    def _validate_all_templates(self) -> None:
        """
        Validate all discovered templates.

        Logs validation errors but does not remove invalid templates from registry.
        """
        for template in self._templates.values():
            errors = template.validate()
            if errors:
                logger.error(
                    f"Template '{template.name}' validation failed:\n"
                    + "\n".join(f"  - {error}" for error in errors)
                )

    def _get_configured_template_dirs(self) -> list[str]:
        """
        Get template directories from Django settings.

        Returns:
            List of template directory paths from SCAFFOLD_TEMPLATE_DIRS setting
        """
        try:
            from django.conf import settings

            return getattr(settings, "SCAFFOLD_TEMPLATE_DIRS", [])
        except (ImportError, RuntimeError):
            # Django not available or settings not configured
            return []

    def _get_project_root(self) -> Optional[Path]:
        """
        Get project root directory.

        Searches for manage.py or pyproject.toml to identify project root.

        Returns:
            Path to project root or None if not found
        """
        # Start from current working directory
        current = Path.cwd()

        # Search up directory tree for project markers
        for parent in [current] + list(current.parents):
            if (parent / "manage.py").exists() or (parent / "pyproject.toml").exists():
                return parent

        return None
