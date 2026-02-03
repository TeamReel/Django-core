"""Resolver registry for loading hierarchy resolvers from settings."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.utils.module_loading import import_string

if TYPE_CHECKING:
    from django.http import HttpRequest

    from .base import BaseHierarchyResolver

logger = logging.getLogger(__name__)


def get_resolver_class(content_type_label: str) -> type[BaseHierarchyResolver] | None:
    """
    Get resolver class for the given ContentType label.

    Loads the resolver from SEARCH_HIERARCHY_RESOLVERS setting
    using Django's import_string for dynamic class loading.

    Args:
        content_type_label: String like 'projects.project' or 'organisations.organisation'

    Returns:
        Resolver class if registered, None otherwise

    Example:
        # In settings:
        SEARCH_HIERARCHY_RESOLVERS = {
            'projects.project': 'myapp.resolvers.ProjectResolver'
        }

        # In code:
        resolver_class = get_resolver_class('projects.project')
        if resolver_class:
            resolver = resolver_class(request)
    """
    resolvers = getattr(settings, "SEARCH_HIERARCHY_RESOLVERS", {})
    resolver_path = resolvers.get(content_type_label)

    if not resolver_path:
        return None

    try:
        resolver_class = import_string(resolver_path)
        return resolver_class
    except (ImportError, AttributeError) as e:
        # Log error but don't crash - graceful degradation
        logger.error(
            f"Failed to import resolver '{resolver_path}' " f"for '{content_type_label}': {e}"
        )
        return None


def get_resolver(instance: Any, request: HttpRequest) -> BaseHierarchyResolver | None:
    """
    Get initialized resolver for the given instance.

    Uses ContentType to determine the instance's type label,
    then loads and initializes the appropriate resolver.

    Args:
        instance: Django model instance
        request: HttpRequest for resolver initialization

    Returns:
        Initialized resolver instance or None if no resolver registered

    Example:
        project = Project.objects.get(pk=1)
        resolver = get_resolver(project, request)
        if resolver:
            tree = resolver.build_tree(project)
    """
    # Get ContentType label (e.g., "projects.project")
    content_type = ContentType.objects.get_for_model(instance)
    label = f"{content_type.app_label}.{content_type.model}"

    # Load resolver class
    resolver_class = get_resolver_class(label)
    if not resolver_class:
        logger.debug(f"No resolver registered for content type: {label}")
        return None

    # Initialize and return
    return resolver_class(request)
