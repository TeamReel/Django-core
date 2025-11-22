"""Git adapter for reading repository state."""

from .adapter import GitAdapter, GitInfo, GitNotAvailableError

__all__ = ["GitAdapter", "GitInfo", "GitNotAvailableError"]
