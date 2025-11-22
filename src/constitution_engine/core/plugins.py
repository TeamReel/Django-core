"""
Plugin discovery and registration system for the Constitutional Enforcement Engine.

This module provides a safe, deterministic mechanism for discovering and loading
rule, validator, and reporter plugins from built-in modules and (optionally)
external sources.
"""

import importlib
import importlib.metadata
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from constitution_engine.core.interfaces import (
    ModuleProtocol,
    ReporterProtocol,
    RuleProtocol,
    ValidatorProtocol,
)

__all__ = [
    "PluginRegistry",
    "PluginMetadata",
    "discover_builtin_plugins",
    "discover_entry_point_plugins",
    "get_global_registry",
]

logger = logging.getLogger(__name__)


@dataclass
class PluginMetadata:
    """Metadata about a discovered plugin."""

    identifier: str
    plugin_type: str  # "rule", "validator", "reporter", "module"
    module_path: str
    class_name: str
    description: str = ""
    enabled: bool = True
    is_builtin: bool = True
    tags: list[str] = field(default_factory=list)


class PluginRegistry:
    """
    Central registry for discovering, registering, and resolving plugins.

    Supports:
    - Built-in plugin discovery from `modules/python/builtin/`
    - Safe, whitelisted loading of external plugins
    - Configuration-driven plugin selection
    - Constitutional compliance checks
    """

    def __init__(self):
        self._rules: dict[str, PluginMetadata] = {}
        self._validators: dict[str, PluginMetadata] = {}
        self._reporters: dict[str, PluginMetadata] = {}
        self._modules: dict[str, PluginMetadata] = {}
        self._loaded_instances: dict[str, Any] = {}
        self._whitelist: set[str] = set()

    def register_rule(self, metadata: PluginMetadata) -> None:
        """Register a rule plugin."""
        if metadata.plugin_type != "rule":
            raise ValueError(f"Expected plugin_type='rule', got '{metadata.plugin_type}'")
        self._rules[metadata.identifier] = metadata
        logger.debug(f"Registered rule: {metadata.identifier}")

    def register_validator(self, metadata: PluginMetadata) -> None:
        """Register a validator plugin."""
        if metadata.plugin_type != "validator":
            raise ValueError(f"Expected plugin_type='validator', got '{metadata.plugin_type}'")
        self._validators[metadata.identifier] = metadata
        logger.debug(f"Registered validator: {metadata.identifier}")

    def register_reporter(self, metadata: PluginMetadata) -> None:
        """Register a reporter plugin."""
        if metadata.plugin_type != "reporter":
            raise ValueError(f"Expected plugin_type='reporter', got '{metadata.plugin_type}'")
        self._reporters[metadata.identifier] = metadata
        logger.debug(f"Registered reporter: {metadata.identifier}")

    def register_module(self, metadata: PluginMetadata) -> None:
        """Register a module plugin."""
        if metadata.plugin_type != "module":
            raise ValueError(f"Expected plugin_type='module', got '{metadata.plugin_type}'")
        self._modules[metadata.identifier] = metadata
        logger.debug(f"Registered module: {metadata.identifier}")

    def get_rule(self, identifier: str) -> RuleProtocol | None:
        """Get a rule instance by identifier."""
        if identifier not in self._rules:
            logger.warning(f"Rule not found: {identifier}")
            return None

        return self._load_plugin(self._rules[identifier], RuleProtocol)

    def get_validator(self, identifier: str) -> ValidatorProtocol | None:
        """Get a validator instance by identifier."""
        if identifier not in self._validators:
            logger.warning(f"Validator not found: {identifier}")
            return None

        return self._load_plugin(self._validators[identifier], ValidatorProtocol)

    def get_reporter(self, name: str) -> ReporterProtocol | None:
        """Get a reporter instance by name."""
        if name not in self._reporters:
            logger.warning(f"Reporter not found: {name}")
            return None

        return self._load_plugin(self._reporters[name], ReporterProtocol)

    def get_module(self, identifier: str) -> ModuleProtocol | None:
        """Get a module instance by identifier."""
        if identifier not in self._modules:
            logger.warning(f"Module not found: {identifier}")
            return None

        return self._load_plugin(self._modules[identifier], ModuleProtocol)

    def list_rules(self, enabled_only: bool = False) -> list[PluginMetadata]:
        """List all registered rules."""
        rules = list(self._rules.values())
        if enabled_only:
            rules = [r for r in rules if r.enabled]
        return rules

    def list_validators(self, enabled_only: bool = False) -> list[PluginMetadata]:
        """List all registered validators."""
        validators = list(self._validators.values())
        if enabled_only:
            validators = [v for v in validators if v.enabled]
        return validators

    def list_reporters(self, enabled_only: bool = False) -> list[PluginMetadata]:
        """List all registered reporters."""
        reporters = list(self._reporters.values())
        if enabled_only:
            reporters = [r for r in reporters if r.enabled]
        return reporters

    def list_modules(self, enabled_only: bool = False) -> list[PluginMetadata]:
        """List all registered modules."""
        modules = list(self._modules.values())
        if enabled_only:
            modules = [m for m in modules if m.enabled]
        return modules

    def add_to_whitelist(self, module_path: str) -> None:
        """Add a module path to the safety whitelist."""
        self._whitelist.add(module_path)
        logger.debug(f"Added to whitelist: {module_path}")

    def is_whitelisted(self, module_path: str) -> bool:
        """Check if a module path is whitelisted for loading."""
        # Built-in modules are always allowed
        if module_path.startswith("constitution_engine."):
            return True
        return module_path in self._whitelist

    def _load_plugin(self, metadata: PluginMetadata, expected_protocol: type) -> Any | None:
        """
        Load a plugin instance from metadata.

        Args:
            metadata: Plugin metadata containing module path and class name
            expected_protocol: Protocol the plugin should implement

        Returns:
            Plugin instance or None if loading fails
        """
        cache_key = f"{metadata.module_path}.{metadata.class_name}"

        # Return cached instance if available
        if cache_key in self._loaded_instances:
            return self._loaded_instances[cache_key]

        # Safety check: only load whitelisted modules
        if not self.is_whitelisted(metadata.module_path):
            logger.error(f"Attempted to load non-whitelisted module: {metadata.module_path}")
            return None

        try:
            # Import the module
            module = importlib.import_module(metadata.module_path)

            # Get the class
            plugin_class = getattr(module, metadata.class_name)

            # Instantiate
            instance = plugin_class()

            # Verify protocol compliance
            if not isinstance(instance, expected_protocol):
                logger.error(f"Plugin {cache_key} does not implement {expected_protocol.__name__}")
                return None

            # Cache and return
            self._loaded_instances[cache_key] = instance
            logger.info(f"Loaded plugin: {cache_key}")
            return instance

        except (ImportError, AttributeError, TypeError) as e:
            logger.error(f"Failed to load plugin {cache_key}: {e}")
            return None

    def clear_cache(self) -> None:
        """Clear the loaded plugin instance cache."""
        self._loaded_instances.clear()
        logger.debug("Cleared plugin instance cache")


# Global registry instance
_global_registry: PluginRegistry | None = None


def get_global_registry() -> PluginRegistry:
    """Get or create the global plugin registry."""
    global _global_registry
    if _global_registry is None:
        _global_registry = PluginRegistry()
    return _global_registry


def discover_builtin_plugins() -> None:
    """
    Discover and register all built-in plugins.

    This scans the `modules/python/builtin/` directory for plugin modules
    and registers them with the global registry.
    """
    registry = get_global_registry()

    # Get the builtin plugins directory
    builtin_path = Path(__file__).parent.parent / "modules" / "python" / "builtin"

    if not builtin_path.exists():
        logger.warning(f"Built-in plugins directory not found: {builtin_path}")
        return

    logger.info(f"Discovering built-in plugins from: {builtin_path}")

    # Discover all Python modules in the builtin directory
    for module_file in builtin_path.glob("*.py"):
        if module_file.name.startswith("_"):
            continue  # Skip __init__.py and private modules

        module_name = module_file.stem
        module_path = f"constitution_engine.modules.python.builtin.{module_name}"

        try:
            # Import the module
            module = importlib.import_module(module_path)

            # Inspect the module for plugin classes
            for attr_name in dir(module):
                if attr_name.startswith("_"):
                    continue

                attr = getattr(module, attr_name)

                # Check if it's a class (not an instance)
                if not isinstance(attr, type):
                    continue

                # Try to determine plugin type by checking protocols
                plugin_type = None
                identifier = getattr(attr, "identifier", None)
                description = getattr(attr, "description", "")

                if identifier is None:
                    continue  # Skip classes without identifier

                # Check which protocol this class implements
                if hasattr(attr, "execute") and hasattr(attr, "enabled"):
                    plugin_type = "rule"
                elif hasattr(attr, "validate"):
                    plugin_type = "validator"
                elif hasattr(attr, "report") and hasattr(attr, "name"):
                    plugin_type = "reporter"
                elif hasattr(attr, "initialize"):
                    plugin_type = "module"

                if plugin_type:
                    metadata = PluginMetadata(
                        identifier=identifier,
                        plugin_type=plugin_type,
                        module_path=module_path,
                        class_name=attr_name,
                        description=description,
                        enabled=getattr(attr, "enabled", True),
                        is_builtin=True,
                    )

                    # Register based on type
                    if plugin_type == "rule":
                        registry.register_rule(metadata)
                    elif plugin_type == "validator":
                        registry.register_validator(metadata)
                    elif plugin_type == "reporter":
                        registry.register_reporter(metadata)
                    elif plugin_type == "module":
                        registry.register_module(metadata)

                    logger.debug(
                        f"Discovered built-in {plugin_type}: {identifier} from {module_name}"
                    )

        except Exception as e:
            logger.error(f"Failed to discover plugins from {module_name}: {e}")
            continue

    logger.info(
        f"Built-in plugin discovery complete: "
        f"{len(registry.list_rules())} rules, "
        f"{len(registry.list_validators())} validators, "
        f"{len(registry.list_reporters())} reporters, "
        f"{len(registry.list_modules())} modules"
    )


def discover_entry_point_plugins(group: str = "constitution_engine.plugins") -> None:
    """
    Discover and register plugins via Python entry points.

    This allows external packages to register plugins by declaring entry points
    in their package metadata. Only whitelisted entry points will be loaded.

    Args:
        group: Entry point group name to discover

    Example entry point declaration in pyproject.toml:
        [project.entry-points."constitution_engine.plugins"]
        my_custom_rule = "my_package.rules:MyCustomRule"
    """
    registry = get_global_registry()

    try:
        entry_points = importlib.metadata.entry_points()

        # Handle both Python 3.10+ and 3.12+ API
        if hasattr(entry_points, "select"):
            # Python 3.10+
            plugin_eps = entry_points.select(group=group)
        else:
            # Python 3.9 and earlier (fallback)
            plugin_eps = entry_points.get(group, [])

        for ep in plugin_eps:
            try:
                # Load the entry point
                plugin_class = ep.load()

                # Extract metadata
                identifier = getattr(plugin_class, "identifier", ep.name)
                description = getattr(plugin_class, "description", "")
                module_path = ep.value.split(":")[0]
                class_name = ep.value.split(":")[1] if ":" in ep.value else ep.name

                # Only load if whitelisted
                if not registry.is_whitelisted(module_path):
                    logger.warning(
                        f"Skipping non-whitelisted entry point plugin: {ep.name} from {module_path}"
                    )
                    continue

                # Determine plugin type
                plugin_type = None
                if hasattr(plugin_class, "execute") and hasattr(plugin_class, "enabled"):
                    plugin_type = "rule"
                elif hasattr(plugin_class, "validate"):
                    plugin_type = "validator"
                elif hasattr(plugin_class, "report") and hasattr(plugin_class, "name"):
                    plugin_type = "reporter"
                elif hasattr(plugin_class, "initialize"):
                    plugin_type = "module"

                if not plugin_type:
                    logger.warning(
                        f"Entry point plugin {ep.name} does not implement a recognized protocol"
                    )
                    continue

                metadata = PluginMetadata(
                    identifier=identifier,
                    plugin_type=plugin_type,
                    module_path=module_path,
                    class_name=class_name,
                    description=description,
                    enabled=getattr(plugin_class, "enabled", True),
                    is_builtin=False,
                )

                # Register based on type
                if plugin_type == "rule":
                    registry.register_rule(metadata)
                elif plugin_type == "validator":
                    registry.register_validator(metadata)
                elif plugin_type == "reporter":
                    registry.register_reporter(metadata)
                elif plugin_type == "module":
                    registry.register_module(metadata)

                logger.info(f"Discovered entry point {plugin_type}: {identifier}")

            except Exception as e:
                logger.error(f"Failed to load entry point {ep.name}: {e}")
                continue

    except Exception as e:
        logger.error(f"Failed to discover entry point plugins: {e}")
