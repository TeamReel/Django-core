"""Data structures for hierarchy nodes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    pass


@dataclass
class HierarchyNode:
    """
    Represents a single node in the hierarchy tree.

    Matches the OpenAPI schema defined in contracts/openapi.yaml.
    Used by hierarchy resolvers to build nested entity structures.
    """

    id: str
    type: str
    title: str
    url: str | None = None
    description: str | None = None
    children: list[HierarchyNode] = field(default_factory=list)

    # Internal field: store reference to model instance for recursion
    # (not serialized to API)
    instance: Any = field(default=None, repr=False, compare=False)

    def __post_init__(self) -> None:
        """Convert id to string if needed."""
        if not isinstance(self.id, str):
            self.id = str(self.id)
