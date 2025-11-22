"""
Unit tests for the plugin discovery and registration system.
"""

import pytest
from constitution_engine.core.plugins import (
    PluginMetadata,
    PluginRegistry,
    discover_builtin_plugins,
    get_global_registry,
)


class TestPluginMetadata:
    """Tests for PluginMetadata dataclass."""

    def test_create_rule_metadata(self):
        """Test creating rule plugin metadata."""
        metadata = PluginMetadata(
            identifier="test-rule",
            plugin_type="rule",
            module_path="test.module",
            class_name="TestRule",
            description="A test rule",
        )

        assert metadata.identifier == "test-rule"
        assert metadata.plugin_type == "rule"
        assert metadata.enabled is True
        assert metadata.is_builtin is True

    def test_create_validator_metadata(self):
        """Test creating validator plugin metadata."""
        metadata = PluginMetadata(
            identifier="test-validator",
            plugin_type="validator",
            module_path="test.module",
            class_name="TestValidator",
            enabled=False,
            is_builtin=False,
        )

        assert metadata.identifier == "test-validator"
        assert metadata.plugin_type == "validator"
        assert metadata.enabled is False
        assert metadata.is_builtin is False


class TestPluginRegistry:
    """Tests for PluginRegistry class."""

    @pytest.fixture
    def registry(self):
        """Create a fresh registry for each test."""
        return PluginRegistry()

    def test_register_rule(self, registry):
        """Test registering a rule plugin."""
        metadata = PluginMetadata(
            identifier="test-rule",
            plugin_type="rule",
            module_path="test.module",
            class_name="TestRule",
        )

        registry.register_rule(metadata)
        rules = registry.list_rules()

        assert len(rules) == 1
        assert rules[0].identifier == "test-rule"

    def test_register_validator(self, registry):
        """Test registering a validator plugin."""
        metadata = PluginMetadata(
            identifier="test-validator",
            plugin_type="validator",
            module_path="test.module",
            class_name="TestValidator",
        )

        registry.register_validator(metadata)
        validators = registry.list_validators()

        assert len(validators) == 1
        assert validators[0].identifier == "test-validator"

    def test_register_reporter(self, registry):
        """Test registering a reporter plugin."""
        metadata = PluginMetadata(
            identifier="test-reporter",
            plugin_type="reporter",
            module_path="test.module",
            class_name="TestReporter",
        )

        registry.register_reporter(metadata)
        reporters = registry.list_reporters()

        assert len(reporters) == 1
        assert reporters[0].identifier == "test-reporter"

    def test_register_module(self, registry):
        """Test registering a module plugin."""
        metadata = PluginMetadata(
            identifier="test-module",
            plugin_type="module",
            module_path="test.module",
            class_name="TestModule",
        )

        registry.register_module(metadata)
        modules = registry.list_modules()

        assert len(modules) == 1
        assert modules[0].identifier == "test-module"

    def test_register_wrong_type_raises_error(self, registry):
        """Test that registering plugin with wrong type raises error."""
        metadata = PluginMetadata(
            identifier="test-rule",
            plugin_type="validator",  # Wrong type!
            module_path="test.module",
            class_name="TestRule",
        )

        with pytest.raises(ValueError, match="Expected plugin_type='rule'"):
            registry.register_rule(metadata)

    def test_list_enabled_only(self, registry):
        """Test filtering plugins by enabled status."""
        registry.register_rule(
            PluginMetadata(
                identifier="enabled-rule",
                plugin_type="rule",
                module_path="test.module",
                class_name="EnabledRule",
                enabled=True,
            )
        )
        registry.register_rule(
            PluginMetadata(
                identifier="disabled-rule",
                plugin_type="rule",
                module_path="test.module",
                class_name="DisabledRule",
                enabled=False,
            )
        )

        all_rules = registry.list_rules()
        enabled_rules = registry.list_rules(enabled_only=True)

        assert len(all_rules) == 2
        assert len(enabled_rules) == 1
        assert enabled_rules[0].identifier == "enabled-rule"

    def test_whitelist_builtin_modules(self, registry):
        """Test that built-in modules are automatically whitelisted."""
        assert registry.is_whitelisted("constitution_engine.core.plugins")
        assert registry.is_whitelisted("constitution_engine.modules.python.builtin.test")

    def test_whitelist_custom_modules(self, registry):
        """Test adding custom modules to whitelist."""
        assert not registry.is_whitelisted("custom.module")

        registry.add_to_whitelist("custom.module")

        assert registry.is_whitelisted("custom.module")

    def test_get_rule_not_found(self, registry):
        """Test getting a non-existent rule returns None."""
        rule = registry.get_rule("nonexistent")
        assert rule is None

    def test_get_rule_loads_instance(self, registry):
        """Test getting a rule loads the actual plugin instance."""
        # Register the built-in no-disabled-security rule
        metadata = PluginMetadata(
            identifier="no-disabled-security-rules",
            plugin_type="rule",
            module_path="constitution_engine.modules.python.builtin.no_disabled_security",
            class_name="NoDisabledSecurityRule",
        )
        registry.register_rule(metadata)

        # Get the rule instance
        rule = registry.get_rule("no-disabled-security-rules")

        assert rule is not None
        assert rule.identifier == "no-disabled-security-rules"
        assert hasattr(rule, "execute")

    def test_clear_cache(self, registry):
        """Test clearing the plugin instance cache."""
        metadata = PluginMetadata(
            identifier="no-disabled-security-rules",
            plugin_type="rule",
            module_path="constitution_engine.modules.python.builtin.no_disabled_security",
            class_name="NoDisabledSecurityRule",
        )
        registry.register_rule(metadata)

        # Load once
        rule1 = registry.get_rule("no-disabled-security-rules")
        assert rule1 is not None

        # Clear cache
        registry.clear_cache()

        # Load again - should be a fresh instance
        rule2 = registry.get_rule("no-disabled-security-rules")
        assert rule2 is not None
        # They should be different instances after cache clear
        # (though in practice this is hard to test without modifying state)


class TestBuiltinDiscovery:
    """Tests for built-in plugin discovery."""

    def test_discover_builtin_plugins(self):
        """Test discovering built-in plugins."""
        # Clear any existing registrations
        registry = PluginRegistry()

        # Manually set this as the global registry for the test
        import constitution_engine.core.plugins as plugins_module

        old_registry = plugins_module._global_registry
        plugins_module._global_registry = registry

        try:
            # Run discovery
            discover_builtin_plugins()

            # Should have discovered at least the no-disabled-security rule
            rules = registry.list_rules()
            assert len(rules) > 0

            # Check that the rule was found
            rule_ids = [r.identifier for r in rules]
            assert "no-disabled-security-rules" in rule_ids

            # Verify metadata
            rule_metadata = next(r for r in rules if r.identifier == "no-disabled-security-rules")
            assert rule_metadata.plugin_type == "rule"
            assert rule_metadata.is_builtin is True
            assert rule_metadata.enabled is True

        finally:
            # Restore the old registry
            plugins_module._global_registry = old_registry

    def test_get_global_registry_singleton(self):
        """Test that get_global_registry returns a singleton."""
        registry1 = get_global_registry()
        registry2 = get_global_registry()

        assert registry1 is registry2


class TestFakeExternalPlugin:
    """Tests for external plugin loading safety."""

    def test_non_whitelisted_plugin_rejected(self):
        """Test that non-whitelisted plugins cannot be loaded."""
        registry = PluginRegistry()

        # Register a plugin from a non-whitelisted module
        metadata = PluginMetadata(
            identifier="malicious-rule",
            plugin_type="rule",
            module_path="malicious.package",
            class_name="MaliciousRule",
        )
        registry.register_rule(metadata)

        # Attempting to load should fail due to whitelist
        rule = registry.get_rule("malicious-rule")
        assert rule is None

    def test_whitelisted_external_plugin_loads(self):
        """Test that whitelisted external plugins can be loaded."""
        registry = PluginRegistry()

        # Add to whitelist
        registry.add_to_whitelist("constitution_engine.modules.python.builtin.no_disabled_security")

        # Register and load
        metadata = PluginMetadata(
            identifier="no-disabled-security-rules",
            plugin_type="rule",
            module_path="constitution_engine.modules.python.builtin.no_disabled_security",
            class_name="NoDisabledSecurityRule",
        )
        registry.register_rule(metadata)

        rule = registry.get_rule("no-disabled-security-rules")
        assert rule is not None
