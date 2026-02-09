"""
Unit tests for ValidatorRegistry and HookRegistry.

Tests cover:
- Decorator-based registration
- Retrieval of registered functions
- Error handling for missing registrations
- Isolated instance registries for test isolation
- Clearing registries
"""

import pytest
from django.core.exceptions import ValidationError

from src.workflows.registry import HookRegistry, ValidatorRegistry


class TestValidatorRegistry:
    """Test suite for ValidatorRegistry."""

    def setup_method(self):
        """Clear global registry before each test."""
        ValidatorRegistry.clear()

    def teardown_method(self):
        """Clear global registry after each test."""
        ValidatorRegistry.clear()

    def test_decorator_registration(self):
        """Test that @validator decorator registers functions."""

        @ValidatorRegistry.validator("test_validator")
        def my_validator(instance, transition):
            pass

        # Validator should be retrievable
        validator = ValidatorRegistry.get("test_validator")
        assert validator == my_validator

    def test_validator_execution(self):
        """Test that registered validators can be executed."""

        # Create a mock instance with just the context attribute we need
        class MockInstance:
            def __init__(self):
                self.context = {}

        instance = MockInstance()

        @ValidatorRegistry.validator("amount_check")
        def validate_amount(inst, trans):
            if inst.context.get("amount", 0) > 1000:
                raise ValidationError("Amount too high")

        validator = ValidatorRegistry.get("amount_check")

        # Should not raise for low amount
        instance.context = {"amount": 500}
        validator(instance, {})

        # Should raise for high amount
        instance.context = {"amount": 2000}
        with pytest.raises(ValidationError, match="Amount too high"):
            validator(instance, {})

    def test_get_nonexistent_validator_raises_key_error(self):
        """Test that retrieving unregistered validator raises KeyError."""
        with pytest.raises(KeyError, match="Validator 'nonexistent' not registered"):
            ValidatorRegistry.get("nonexistent")

    def test_multiple_validators(self):
        """Test registration of multiple validators."""

        @ValidatorRegistry.validator("validator_one")
        def validator_one(instance, transition):
            pass

        @ValidatorRegistry.validator("validator_two")
        def validator_two(instance, transition):
            pass

        # Both should be retrievable
        assert ValidatorRegistry.get("validator_one") == validator_one
        assert ValidatorRegistry.get("validator_two") == validator_two

    def test_validator_overwrite(self):
        """Test that registering same name twice overwrites."""

        @ValidatorRegistry.validator("overwrite")
        def first_validator(instance, transition):
            return "first"

        @ValidatorRegistry.validator("overwrite")
        def second_validator(instance, transition):
            return "second"

        # Should get the second (most recent) validator
        validator = ValidatorRegistry.get("overwrite")
        assert validator == second_validator

    def test_isolated_instance_registry(self):
        """Test that instance registries are isolated from global registry."""

        # Register in global registry
        @ValidatorRegistry.validator("global_validator")
        def global_validator(instance, transition):
            pass

        # Create isolated instance
        instance_registry = ValidatorRegistry()

        # Register in instance registry
        def instance_validator(inst, trans):
            pass

        instance_registry.register("instance_validator", instance_validator)

        # Instance registry should have its own validator
        assert instance_registry.get_instance("instance_validator") == instance_validator

        # Instance registry should NOT have global validator in instance storage
        with pytest.raises(KeyError, match="not registered in this instance"):
            instance_registry.get_instance("global_validator")

        # Global registry should NOT have instance validator
        with pytest.raises(KeyError, match="Validator 'instance_validator' not registered"):
            ValidatorRegistry.get("instance_validator")

    def test_clear_global_registry(self):
        """Test that clear() removes all validators from global registry."""

        @ValidatorRegistry.validator("to_be_cleared")
        def validator(instance, transition):
            pass

        # Validator should exist
        assert ValidatorRegistry.get("to_be_cleared") == validator

        # Clear registry
        ValidatorRegistry.clear()

        # Validator should no longer exist
        with pytest.raises(KeyError):
            ValidatorRegistry.get("to_be_cleared")


class TestHookRegistry:
    """Test suite for HookRegistry."""

    def setup_method(self):
        """Clear global registry before each test."""
        HookRegistry.clear()

    def teardown_method(self):
        """Clear global registry after each test."""
        HookRegistry.clear()

    def test_decorator_registration(self):
        """Test that @hook decorator registers functions."""

        @HookRegistry.hook("on_enter", "approved")
        def my_hook(instance, transition):
            pass

        hooks = HookRegistry.get_hooks("on_enter", "approved")
        assert len(hooks) == 1
        assert hooks[0] == my_hook

    def test_hook_execution(self):
        """Test that registered hooks can be executed."""

        # Create a mock instance with just the id attribute we need
        class MockInstance:
            def __init__(self):
                self.id = "test-instance-id"

        instance = MockInstance()
        executed = []

        @HookRegistry.hook("on_exit", "draft")
        def track_exit(inst, trans):
            executed.append(("exit", inst.id))

        hooks = HookRegistry.get_hooks("on_exit", "draft")
        assert len(hooks) == 1

        # Execute hook
        hooks[0](instance, {})
        assert ("exit", instance.id) in executed

    def test_multiple_hooks_same_key(self):
        """Test that multiple hooks can register for same key."""

        @HookRegistry.hook("on_enter", "approved")
        def first_hook(instance, transition):
            pass

        @HookRegistry.hook("on_enter", "approved")
        def second_hook(instance, transition):
            pass

        hooks = HookRegistry.get_hooks("on_enter", "approved")
        assert len(hooks) == 2
        assert first_hook in hooks
        assert second_hook in hooks

    def test_hooks_different_types(self):
        """Test registration across different hook types."""

        @HookRegistry.hook("on_enter", "approved")
        def enter_hook(instance, transition):
            pass

        @HookRegistry.hook("on_exit", "draft")
        def exit_hook(instance, transition):
            pass

        @HookRegistry.hook("on_transition", "submit")
        def transition_hook(instance, transition):
            pass

        # Each should be retrievable independently
        assert HookRegistry.get_hooks("on_enter", "approved") == [enter_hook]
        assert HookRegistry.get_hooks("on_exit", "draft") == [exit_hook]
        assert HookRegistry.get_hooks("on_transition", "submit") == [transition_hook]

    def test_get_nonexistent_hooks_returns_empty_list(self):
        """Test that retrieving unregistered hooks returns empty list."""
        hooks = HookRegistry.get_hooks("on_enter", "nonexistent_state")
        assert hooks == []

    def test_invalid_hook_type_raises_value_error(self):
        """Test that invalid hook_type raises ValueError."""
        with pytest.raises(ValueError, match="Invalid hook_type 'invalid_type'"):

            @HookRegistry.hook("invalid_type", "some_key")
            def bad_hook(instance, transition):
                pass

    def test_isolated_instance_registry(self):
        """Test that instance registries are isolated from global registry."""

        # Register in global registry
        @HookRegistry.hook("on_enter", "global_state")
        def global_hook(instance, transition):
            pass

        # Create isolated instance
        instance_registry = HookRegistry()

        # Register in instance registry
        def instance_hook(inst, trans):
            pass

        instance_registry.register("on_enter", "instance_state", instance_hook)

        # Instance registry should have its own hook
        instance_hooks = instance_registry.get_instance_hooks("on_enter", "instance_state")
        assert len(instance_hooks) == 1
        assert instance_hooks[0] == instance_hook

        # Instance registry should NOT have global hook in instance storage
        instance_global_hooks = instance_registry.get_instance_hooks("on_enter", "global_state")
        assert instance_global_hooks == []

        # Global registry should NOT have instance hook
        global_instance_hooks = HookRegistry.get_hooks("on_enter", "instance_state")
        assert global_instance_hooks == []

    def test_instance_register_invalid_hook_type_raises_value_error(self):
        """Test that registering invalid hook_type in instance raises ValueError."""
        registry = HookRegistry()

        with pytest.raises(ValueError, match="Invalid hook_type 'bad_type'"):
            registry.register("bad_type", "some_key", lambda i, t: None)

    def test_clear_global_registry(self):
        """Test that clear() removes all hooks from global registry."""

        @HookRegistry.hook("on_enter", "to_be_cleared")
        def hook(instance, transition):
            pass

        # Hook should exist
        hooks = HookRegistry.get_hooks("on_enter", "to_be_cleared")
        assert len(hooks) == 1

        # Clear registry
        HookRegistry.clear()

        # Hook should no longer exist
        hooks = HookRegistry.get_hooks("on_enter", "to_be_cleared")
        assert hooks == []

    def test_hook_execution_order(self):
        """Test that hooks execute in registration order."""

        # Create a mock instance
        class MockInstance:
            def __init__(self):
                self.id = "test-instance-id"

        instance = MockInstance()
        execution_order = []

        @HookRegistry.hook("on_enter", "ordered")
        def first_hook(inst, trans):
            execution_order.append("first")

        @HookRegistry.hook("on_enter", "ordered")
        def second_hook(inst, trans):
            execution_order.append("second")

        @HookRegistry.hook("on_enter", "ordered")
        def third_hook(inst, trans):
            execution_order.append("third")

        # Execute all hooks
        hooks = HookRegistry.get_hooks("on_enter", "ordered")
        for hook in hooks:
            hook(instance, {})

        # Verify execution order
        assert execution_order == ["first", "second", "third"]


class TestRegistryIntegration:
    """Integration tests for both registries working together."""

    def setup_method(self):
        """Clear both registries before each test."""
        ValidatorRegistry.clear()
        HookRegistry.clear()

    def teardown_method(self):
        """Clear both registries after each test."""
        ValidatorRegistry.clear()
        HookRegistry.clear()

    def test_validators_and_hooks_independent(self):
        """Test that validators and hooks don't interfere with each other."""

        @ValidatorRegistry.validator("independent_validator")
        def validator(instance, transition):
            pass

        @HookRegistry.hook("on_enter", "independent_state")
        def hook(instance, transition):
            pass

        # Both should be retrievable independently
        assert ValidatorRegistry.get("independent_validator") == validator
        assert HookRegistry.get_hooks("on_enter", "independent_state") == [hook]

    def test_clearing_one_registry_doesnt_affect_other(self):
        """Test that clearing one registry doesn't affect the other."""

        @ValidatorRegistry.validator("persist_validator")
        def validator(instance, transition):
            pass

        @HookRegistry.hook("on_enter", "persist_state")
        def hook(instance, transition):
            pass

        # Clear only validators
        ValidatorRegistry.clear()

        # Validator should be gone
        with pytest.raises(KeyError):
            ValidatorRegistry.get("persist_validator")

        # Hook should still exist
        assert HookRegistry.get_hooks("on_enter", "persist_state") == [hook]
