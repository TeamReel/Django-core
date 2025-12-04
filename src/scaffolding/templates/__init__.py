"""
Template discovery and management for scaffolding CLI.

Provides template registry with hybrid discovery from multiple sources:
- Project-local templates (templates/scaffold/)
- Configured template directories (SCAFFOLD_TEMPLATE_DIRS)
- Core built-in templates
- Installed plugin packages

Follows ADR-021 precedence order and conflict resolution strategy.
"""

from .manifest import TemplateManifest
from .registry import TemplateRegistry

__all__ = ["TemplateManifest", "TemplateRegistry"]
