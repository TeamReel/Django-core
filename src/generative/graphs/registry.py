"""Registry for LangGraph workflow graphs.

This module provides a decorator-based registration system for custom
LangGraph workflows. Downstream products (like TeamReel) can register
their own graphs without modifying core code.

Example usage:
    from src.generative.graphs.registry import register_graph

    @register_graph("match_analysis_v2")
    def create_match_analysis_graph():
        from langgraph.graph import StateGraph
        # Build and return compiled graph
        return graph.compile()
"""

from collections.abc import Callable
from typing import Any

# Global registry of graph factories
_graph_registry: dict[str, Callable[[], Any]] = {}


def register_graph(graph_id: str) -> Callable[[Callable[[], Any]], Callable[[], Any]]:
    """Decorator to register a LangGraph workflow factory.

    Args:
        graph_id: Unique identifier for the graph (referenced in template.pipeline_config)

    Returns:
        Decorator function

    Example:
        @register_graph("simple_completion")
        def create_simple_completion_graph():
            # Build graph
            return graph.compile()
    """

    def decorator(factory_func: Callable[[], Any]) -> Callable[[], Any]:
        if graph_id in _graph_registry:
            raise ValueError(f"Graph '{graph_id}' already registered")
        _graph_registry[graph_id] = factory_func
        return factory_func

    return decorator


def get_graph(graph_id: str) -> Any:
    """Retrieve and compile a registered graph.

    Args:
        graph_id: The registered graph identifier

    Returns:
        Compiled LangGraph StateGraph

    Raises:
        KeyError: If graph_id is not registered
    """
    if graph_id not in _graph_registry:
        available = ", ".join(_graph_registry.keys()) if _graph_registry else "none"
        raise KeyError(f"Graph '{graph_id}' not found. Available graphs: {available}")
    return _graph_registry[graph_id]()


def list_graphs() -> list[str]:
    """List all registered graph identifiers."""
    return list(_graph_registry.keys())


def clear_registry() -> None:
    """Clear the graph registry. Primarily for testing."""
    _graph_registry.clear()
