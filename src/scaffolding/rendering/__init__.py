"""
Template rendering module for scaffolding CLI.

Provides Jinja2-based template rendering with variable substitution, built-in
variables, and cross-platform file processing.
"""

from scaffolding.rendering.engine import (
    TemplateRenderer,
    create_jinja_env,
    get_builtin_variables,
)

__all__ = [
    "TemplateRenderer",
    "create_jinja_env",
    "get_builtin_variables",
]
