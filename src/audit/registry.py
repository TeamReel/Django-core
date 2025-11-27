"""
Event type registry for audit system.

Provides centralized management of event types with format validation
and metadata tracking. Event types must be registered before use.
"""

from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Optional


@dataclass(frozen=True)
class EventTypeMetadata:
    """Metadata for a registered event type."""

    name: str
    category: str  # e.g., 'auth', 'permission', 'role', 'config', 'resource'
    description: str
    required_metadata_keys: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        # Validate format: category.action (e.g., 'auth.login')
        if "." not in self.name:
            raise ValueError(f"Event type must be 'category.action' format: {self.name}")


class EventTypeRegistry:
    """
    Thread-safe registry of audit event types.

    Singleton pattern ensures single source of truth for event types.
    """

    _instance: Optional["EventTypeRegistry"] = None
    _lock: Lock = Lock()

    def __new__(cls) -> "EventTypeRegistry":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        # Initialize instance attributes only once
        if not hasattr(self, "_registry"):
            self._registry: Dict[str, EventTypeMetadata] = {}
            self._registry_lock = Lock()

    def register(self, event_type: EventTypeMetadata) -> None:
        """Register a new event type."""
        with self._registry_lock:
            if event_type.name in self._registry:
                # Idempotent: re-registration with same metadata is OK
                existing = self._registry[event_type.name]
                if existing.description != event_type.description:
                    raise ValueError(
                        f"Event type {event_type.name} already registered "
                        f"with different description"
                    )
            else:
                self._registry[event_type.name] = event_type

    def get(self, name: str) -> Optional[EventTypeMetadata]:
        """Get metadata for an event type."""
        return self._registry.get(name)

    def is_registered(self, name: str) -> bool:
        """Check if event type is registered."""
        return name in self._registry

    def list_all(self) -> List[EventTypeMetadata]:
        """List all registered event types."""
        return list(self._registry.values())


# Global registry instance
_registry = EventTypeRegistry()


def register_event_type(
    name: str,
    category: str,
    description: str,
    required_metadata_keys: Optional[List[str]] = None,
) -> None:
    """
    Register an event type.

    Args:
        name: Event type name in 'category.action' format
        category: Event category (e.g., 'auth', 'permission')
        description: Human-readable description
        required_metadata_keys: Required metadata keys (optional)

    Example:
        register_event_type(
            'auth.login',
            'auth',
            'User successfully logged in',
            required_metadata_keys=['ip']
        )
    """
    metadata = EventTypeMetadata(
        name=name,
        category=category,
        description=description,
        required_metadata_keys=required_metadata_keys or [],
    )
    _registry.register(metadata)


def get_event_type(name: str) -> Optional[EventTypeMetadata]:
    """Get metadata for an event type."""
    return _registry.get(name)


def is_event_type_registered(name: str) -> bool:
    """Check if event type is registered."""
    return _registry.is_registered(name)


def list_event_types() -> List[EventTypeMetadata]:
    """List all registered event types."""
    return _registry.list_all()
