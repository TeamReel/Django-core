"""
Template loaders for filesystem and plugin package discovery.

Provides FilesystemLoader for scanning directories and PluginLoader for
discovering templates from installed Python packages.
"""

from __future__ import annotations

import importlib.metadata
import importlib.util
import logging
from pathlib import Path

from .manifest import TemplateManifest

logger = logging.getLogger(__name__)


class FilesystemLoader:
    """Load templates from filesystem directories."""

    @staticmethod
    def load_from_directory(directory: Path) -> dict[str, TemplateManifest]:
        """
        Load templates from directory.

        Scans directory for subdirectories containing __template__.yaml files,
        parses manifests, and returns discovered templates.

        Args:
            directory: Path to directory containing template subdirectories

        Returns:
            Dict of {template_name: TemplateManifest}
        """
        templates: dict[str, TemplateManifest] = {}

        if not directory.exists():
            logger.debug(f"Template directory does not exist: {directory}")
            return templates

        if not directory.is_dir():
            logger.warning(f"Template path is not a directory: {directory}")
            return templates

        for template_dir in directory.iterdir():
            if not template_dir.is_dir():
                continue

            manifest_path = template_dir / "__template__.yaml"
            if not manifest_path.exists():
                logger.debug(f"Skipping {template_dir.name}: no __template__.yaml found")
                continue

            try:
                manifest = TemplateManifest.from_yaml(manifest_path)
                templates[manifest.name] = manifest
                logger.debug(f"Loaded template '{manifest.name}' from {template_dir}")
            except Exception as e:
                logger.error(f"Failed to load template from {template_dir}: {e}")
                continue

        return templates


class PluginLoader:
    """Load templates from installed plugin packages."""

    @staticmethod
    def load_from_plugins() -> dict[str, TemplateManifest]:
        """
        Load templates from plugin packages.

        Searches for installed packages with 'scaffold_templates' module
        and loads templates from those packages.

        Returns:
            Dict of {template_name: TemplateManifest}
        """
        templates: dict[str, TemplateManifest] = {}

        for dist in importlib.metadata.distributions():
            try:
                # Check if package has scaffold_templates module
                package_name = dist.name.replace("-", "_")
                module_name = f"{package_name}.scaffold_templates"

                spec = importlib.util.find_spec(module_name)
                if spec is None or spec.origin is None:
                    continue

                # Load templates from plugin package directory
                module_path = Path(spec.origin).parent
                logger.debug(f"Discovering templates from plugin: {dist.name}")

                plugin_templates = FilesystemLoader.load_from_directory(module_path)
                templates.update(plugin_templates)

                if plugin_templates:
                    logger.info(
                        f"Loaded {len(plugin_templates)} template(s) from plugin '{dist.name}'"
                    )

            except Exception as e:
                logger.warning(f"Failed to load templates from plugin '{dist.name}': {e}")
                continue

        return templates
