"""
Builtin reporters module - registers core reporters with plugin system.
"""

from constitution_engine.reporters import ConsoleReporter, JsonReporter

# Re-export reporters so they can be discovered by plugin system
__all__ = ["ConsoleReporter", "JsonReporter"]
