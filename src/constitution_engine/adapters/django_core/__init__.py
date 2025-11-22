"""Django Core-App adapter for Constitutional Enforcement Engine.

This adapter provides filesystem-based analysis of Django Core-App style projects
without importing Django itself.
"""

from __future__ import annotations

from .adapter import DjangoAdapter
from .config import DjangoAdapterConfig

__all__ = ["DjangoAdapter", "DjangoAdapterConfig"]
