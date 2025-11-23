"""Unit tests for SecurityRule base class and SecurityRuleViolation."""

from dataclasses import asdict
from datetime import datetime

import pytest
from security_baseline.rules.base import SecurityRule, SecurityRuleViolation


def test_security_rule_abstract_enforcement():
    """Verify SecurityRule cannot be instantiated directly."""
    with pytest.raises(TypeError, match="abstract"):
        SecurityRule(
            rule_id="TEST",
            name="Test",
            category="test",
            severity="HIGH",
            owasp_asvs_refs=[],
            description="Test",
            remediation="Test",
        )


def test_security_rule_subclass_requires_validate():
    """Verify subclass must implement validate() method."""

    class IncompleteRule(SecurityRule):
        pass

    with pytest.raises(TypeError, match="abstract"):
        IncompleteRule(
            rule_id="TEST",
            name="Test",
            category="test",
            severity="HIGH",
            owasp_asvs_refs=[],
            description="Test",
            remediation="Test",
        )


def test_security_rule_subclass_complete():
    """Verify complete subclass can be instantiated."""

    class CompleteRule(SecurityRule):
        def validate(self, context: dict):
            return None

    rule = CompleteRule(
        rule_id="TEST001",
        name="Test Rule",
        category="test",
        severity="HIGH",
        owasp_asvs_refs=["V1.2.2"],
        description="Test description",
        remediation="Test remediation",
    )

    assert rule.rule_id == "TEST001"
    assert rule.name == "Test Rule"
    assert rule.enabled is True
    assert rule.enforcement_mode == "strict"


def test_security_rule_violation_immutability():
    """Verify SecurityRuleViolation is immutable."""
    violation = SecurityRuleViolation(
        rule_id="TEST001",
        rule_name="Test Rule",
        message="Test violation",
        severity="HIGH",
        violated_setting="DEBUG",
        current_value="True",
        expected_value="False",
        owasp_asvs_refs=["V1.2.2"],
        remediation="Set DEBUG=False",
        timestamp=datetime.now(),
        environment="production",
    )

    with pytest.raises(AttributeError):  # FrozenInstanceError subclass
        violation.severity = "LOW"  # type: ignore


def test_security_rule_violation_serialization():
    """Verify violation can be converted to dict."""
    violation = SecurityRuleViolation(
        rule_id="TEST001",
        rule_name="Test Rule",
        message="Test violation",
        severity="HIGH",
        violated_setting="DEBUG",
        current_value="True",
        expected_value="False",
        owasp_asvs_refs=["V1.2.2"],
        remediation="Set DEBUG=False",
        timestamp=datetime.now(),
        environment="production",
    )

    data = asdict(violation)
    assert data["rule_id"] == "TEST001"
    assert data["severity"] == "HIGH"
