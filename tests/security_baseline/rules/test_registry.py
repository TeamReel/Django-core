"""Unit tests for SecurityRuleRegistry."""

import pytest
from security_baseline.rules.base import SecurityRule
from security_baseline.rules.registry import SecurityRuleRegistry, register


class SampleSecurityRule(SecurityRule):
    def __init__(self):
        super().__init__(
            rule_id="TEST001",
            name="Test Rule",
            category="test",
            severity="HIGH",
            owasp_asvs_refs=["V1.2.2"],
            description="Test",
            remediation="Test",
        )

    def validate(self, context: dict):
        return None


def test_registry_singleton():
    """Verify registry is singleton."""
    registry1 = SecurityRuleRegistry()
    registry2 = SecurityRuleRegistry()
    assert registry1 is registry2


def test_register_rule():
    """Verify rule registration."""
    registry = SecurityRuleRegistry()
    registry._rules.clear()  # Clear for isolated test

    registry.register(SampleSecurityRule)

    assert "TEST001" in registry._rules
    assert len(registry.get_all_rules()) == 1


def test_register_duplicate_raises_error():
    """Verify duplicate rule_id raises ValueError."""
    registry = SecurityRuleRegistry()
    registry._rules.clear()

    registry.register(SampleSecurityRule)

    with pytest.raises(ValueError, match="already registered"):
        registry.register(SampleSecurityRule)


def test_get_rule_by_id():
    """Verify get_rule retrieves correct rule."""
    registry = SecurityRuleRegistry()
    registry._rules.clear()
    registry.register(SampleSecurityRule)

    rule = registry.get_rule("TEST001")
    assert rule is not None
    assert rule.rule_id == "TEST001"


def test_get_nonexistent_rule():
    """Verify get_rule returns None for nonexistent ID."""
    registry = SecurityRuleRegistry()
    registry._rules.clear()

    rule = registry.get_rule("NONEXISTENT")
    assert rule is None


def test_get_rules_by_category():
    """Verify category filtering."""
    registry = SecurityRuleRegistry()
    registry._rules.clear()
    registry.register(SampleSecurityRule)

    rules = registry.get_rules_by_category("test")
    assert len(rules) == 1
    assert rules[0].category == "test"


def test_register_decorator():
    """Verify @register decorator works."""
    registry = SecurityRuleRegistry()
    registry._rules.clear()

    @register
    class DecoratorSampleSecurityRule(SecurityRule):
        def __init__(self):
            super().__init__(
                rule_id="DECORATOR001",
                name="Decorator Test",
                category="test",
                severity="LOW",
                owasp_asvs_refs=[],
                description="Test",
                remediation="Test",
            )

        def validate(self, context: dict):
            return None

    rule = registry.get_rule("DECORATOR001")
    assert rule is not None
    assert rule.name == "Decorator Test"
