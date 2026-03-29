"""
Registry patterns for validators and hooks.

This module provides decorator-based registration for pluggable validators
and lifecycle hooks, supporting dependency injection for test isolation.

Usage:
    from workflows.registry import ValidatorRegistry, HookRegistry

    @ValidatorRegistry.validator("budget_check")
    def validate_budget(instance, transition):
        if instance.context.get("amount", 0) > 10000:
            raise ValidationError("Amount exceeds budget limit")

    @HookRegistry.hook("on_enter", "approved")
    def on_approval_enter(instance, transition):
        notify_stakeholders(instance)
"""

import logging
from typing import Callable

logger = logging.getLogger(__name__)


class ValidatorRegistry:
    """
    Registry for custom workflow validators.

    Validators are synchronous functions that raise ValidationError on failure.
    Supports both class-level (global) and instance-level (test isolation) registration.

    Example:
        @ValidatorRegistry.validator("completeness_check")
        def validate_completeness(instance: WorkflowInstance, transition: dict) -> None:
            if not instance.context.get("required_field"):
                raise ValidationError("Required field missing")
    """

    _validators: dict[str, Callable] = {}

    def __init__(self) -> None:
        """Initialize an isolated registry instance for testing."""
        self._instance_validators: dict[str, Callable] = {}

    @classmethod
    def validator(cls, name: str) -> Callable:
        """
        Decorator to register a validator function.

        Args:
            name: Unique identifier for the validator

        Returns:
            Decorated function

        Example:
            @ValidatorRegistry.validator("budget_check")
            def validate_budget(instance, transition):
                ...
        """

        def decorator(func: Callable) -> Callable:
            cls._validators[name] = func
            logger.info(f"Registered validator: {name}")
            return func

        return decorator

    @classmethod
    def get(cls, name: str) -> Callable:
        """
        Retrieve a registered validator by name.

        Args:
            name: Validator identifier

        Returns:
            Validator function

        Raises:
            KeyError: If validator not found
        """
        if name not in cls._validators:
            raise KeyError(f"Validator '{name}' not registered")
        return cls._validators[name]

    def get_instance(self, name: str) -> Callable:
        """
        Retrieve a validator from this instance's isolated registry.

        Args:
            name: Validator identifier

        Returns:
            Validator function

        Raises:
            KeyError: If validator not found in instance registry
        """
        if name not in self._instance_validators:
            raise KeyError(f"Validator '{name}' not registered in this instance")
        return self._instance_validators[name]

    def register(self, name: str, func: Callable) -> None:
        """
        Register a validator in this instance's isolated registry.

        Args:
            name: Unique identifier for the validator
            func: Validator function

        Example:
            registry = ValidatorRegistry()
            registry.register("test_validator", my_validator_func)
        """
        self._instance_validators[name] = func
        logger.debug(f"Registered instance validator: {name}")

    @classmethod
    def clear(cls) -> None:
        """Clear all registered validators (for testing)."""
        cls._validators.clear()
        logger.debug("Cleared global validator registry")


class HookRegistry:
    """
    Registry for workflow lifecycle hooks.

    Hooks fire at transition lifecycle points:
    - on_exit: When leaving a state
    - on_transition: During the transition action
    - on_enter: When entering a new state

    Supports both class-level (global) and instance-level (test isolation) registration.

    Example:
        @HookRegistry.hook("on_enter", "approved")
        def on_approval_enter(instance: WorkflowInstance, transition: dict):
            notify_stakeholders(instance)
    """

    _hooks: dict[str, dict[str, list[Callable]]] = {
        "on_enter": {},
        "on_exit": {},
        "on_transition": {},
    }

    def __init__(self) -> None:
        """Initialize an isolated registry instance for testing."""
        self._instance_hooks: dict[str, dict[str, list[Callable]]] = {
            "on_enter": {},
            "on_exit": {},
            "on_transition": {},
        }

    @classmethod
    def hook(cls, hook_type: str, key: str) -> Callable:
        """
        Decorator to register a lifecycle hook.

        Args:
            hook_type: Type of hook ("on_enter", "on_exit", "on_transition")
            key: State name (for on_enter/on_exit) or action name (for on_transition)

        Returns:
            Decorated function

        Raises:
            ValueError: If hook_type is invalid

        Example:
            @HookRegistry.hook("on_enter", "approved")
            def on_approval_enter(instance, transition):
                send_notification(instance)
        """
        if hook_type not in cls._hooks:
            raise ValueError(
                f"Invalid hook_type '{hook_type}'. Must be one of: "
                f"{', '.join(cls._hooks.keys())}"
            )

        def decorator(func: Callable) -> Callable:
            if key not in cls._hooks[hook_type]:
                cls._hooks[hook_type][key] = []
            cls._hooks[hook_type][key].append(func)
            logger.info(f"Registered hook: {hook_type}/{key}")
            return func

        return decorator

    @classmethod
    def get_hooks(cls, hook_type: str, key: str) -> list[Callable]:
        """
        Retrieve all hooks for a specific lifecycle point.

        Args:
            hook_type: Type of hook ("on_enter", "on_exit", "on_transition")
            key: State name or action name

        Returns:
            List of hook functions (empty list if none registered)
        """
        return cls._hooks.get(hook_type, {}).get(key, [])

    def get_instance_hooks(self, hook_type: str, key: str) -> list[Callable]:
        """
        Retrieve hooks from this instance's isolated registry.

        Args:
            hook_type: Type of hook
            key: State name or action name

        Returns:
            List of hook functions (empty list if none registered)
        """
        return self._instance_hooks.get(hook_type, {}).get(key, [])

    def register(self, hook_type: str, key: str, func: Callable) -> None:
        """
        Register a hook in this instance's isolated registry.

        Args:
            hook_type: Type of hook ("on_enter", "on_exit", "on_transition")
            key: State name or action name
            func: Hook function

        Raises:
            ValueError: If hook_type is invalid

        Example:
            registry = HookRegistry()
            registry.register("on_enter", "approved", my_hook_func)
        """
        if hook_type not in self._instance_hooks:
            raise ValueError(
                f"Invalid hook_type '{hook_type}'. Must be one of: "
                f"{', '.join(self._instance_hooks.keys())}"
            )
        if key not in self._instance_hooks[hook_type]:
            self._instance_hooks[hook_type][key] = []
        self._instance_hooks[hook_type][key].append(func)
        logger.debug(f"Registered instance hook: {hook_type}/{key}")

    @classmethod
    def clear(cls) -> None:
        """Clear all registered hooks (for testing)."""
        for hook_type in cls._hooks:
            cls._hooks[hook_type].clear()
        logger.debug("Cleared global hook registry")


# Global registry instances for convenience
# Tests should create isolated instances using ValidatorRegistry() / HookRegistry()
validator_registry = ValidatorRegistry()
hook_registry = HookRegistry()


__all__ = [
    "ValidatorRegistry",
    "HookRegistry",
    "validator_registry",
    "hook_registry",
]
