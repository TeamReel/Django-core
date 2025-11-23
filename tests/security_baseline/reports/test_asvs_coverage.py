"""
Unit tests for OWASP ASVS coverage calculation.
"""

from datetime import datetime
from unittest.mock import Mock

import pytest
from security_baseline.reports.asvs_coverage import ASVSCoverageCalculator
from security_baseline.rules.base import SecurityRuleViolation


class TestASVSCoverageCalculator:
    """Test ASVS coverage calculation functionality."""

    @pytest.fixture
    def calculator(self):
        """Create ASVSCoverageCalculator instance."""
        return ASVSCoverageCalculator()

    @pytest.fixture
    def mock_rules(self):
        """Create mock security rules with ASVS references."""
        rules = []

        # V14 - Configuration rules
        rule1 = Mock()
        rule1.rule_id = "SEC001-DEBUG-MODE"
        rule1.owasp_asvs_refs = ["V14.2.1"]
        rules.append(rule1)

        rule2 = Mock()
        rule2.rule_id = "SEC002-SECRET-KEY"
        rule2.owasp_asvs_refs = ["V14.2.2"]
        rules.append(rule2)

        # V3 - Session Management rules
        rule3 = Mock()
        rule3.rule_id = "SEC003-SESSION-SECURE"
        rule3.owasp_asvs_refs = ["V3.4.1"]
        rules.append(rule3)

        # V4 - Access Control rules
        rule4 = Mock()
        rule4.rule_id = "SEC004-CSRF-COOKIE"
        rule4.owasp_asvs_refs = ["V4.2.2"]
        rules.append(rule4)

        # Rule without ASVS refs
        rule5 = Mock()
        rule5.rule_id = "SEC005-CUSTOM"
        rule5.owasp_asvs_refs = []
        rules.append(rule5)

        return rules

    @pytest.fixture
    def sample_violations(self):
        """Create sample violations for testing."""
        violations = []

        # V14 violation
        violation1 = SecurityRuleViolation(
            rule_id="SEC001-DEBUG-MODE",
            rule_name="Debug Mode Check",
            message="DEBUG should be False",
            severity="CRITICAL",
            violated_setting="DEBUG",
            current_value="True",
            expected_value="False",
            owasp_asvs_refs=["V14.2.1"],
            remediation="Set DEBUG = False",
            timestamp=datetime.utcnow(),
            environment="production",
        )
        violations.append(violation1)

        # V3 violation
        violation2 = SecurityRuleViolation(
            rule_id="SEC003-SESSION-SECURE",
            rule_name="Session Cookie Security",
            message="SESSION_COOKIE_SECURE should be True",
            severity="HIGH",
            violated_setting="SESSION_COOKIE_SECURE",
            current_value="False",
            expected_value="True",
            owasp_asvs_refs=["V3.4.1"],
            remediation="Set SESSION_COOKIE_SECURE = True",
            timestamp=datetime.utcnow(),
            environment="production",
        )
        violations.append(violation2)

        return violations

    def test_calculate_coverage_basic(self, calculator, mock_rules, sample_violations):
        """Test basic coverage calculation."""
        coverage = calculator.calculate_coverage(mock_rules, sample_violations)

        # Should have 3 categories + "Other"
        assert len(coverage) == 4
        assert "V14 - Configuration" in coverage
        assert "V3 - Session Management" in coverage
        assert "V4 - Access Control" in coverage
        assert "Other" in coverage

        # V14 category (2 rules, 1 violation)
        v14_coverage = coverage["V14 - Configuration"]
        assert v14_coverage.total_rules == 2
        assert v14_coverage.failed_rules == 1
        assert v14_coverage.passed_rules == 1
        assert v14_coverage.coverage_percentage == 50.0

        # V3 category (1 rule, 1 violation)
        v3_coverage = coverage["V3 - Session Management"]
        assert v3_coverage.total_rules == 1
        assert v3_coverage.failed_rules == 1
        assert v3_coverage.passed_rules == 0
        assert v3_coverage.coverage_percentage == 0.0

        # V4 category (1 rule, 0 violations)
        v4_coverage = coverage["V4 - Access Control"]
        assert v4_coverage.total_rules == 1
        assert v4_coverage.failed_rules == 0
        assert v4_coverage.passed_rules == 1
        assert v4_coverage.coverage_percentage == 100.0

        # Other category (1 rule, 0 violations)
        other_coverage = coverage["Other"]
        assert other_coverage.total_rules == 1
        assert other_coverage.failed_rules == 0
        assert other_coverage.passed_rules == 1
        assert other_coverage.coverage_percentage == 100.0

    def test_extract_asvs_category_v14(self, calculator):
        """Test ASVS category extraction for V14."""
        category = calculator._extract_asvs_category("V14.2.1")
        assert category == "V14 - Configuration"

    def test_extract_asvs_category_v3(self, calculator):
        """Test ASVS category extraction for V3."""
        category = calculator._extract_asvs_category("V3.4.1")
        assert category == "V3 - Session Management"

    def test_extract_asvs_category_v1(self, calculator):
        """Test ASVS category extraction for V1."""
        category = calculator._extract_asvs_category("V1.2.2")
        assert category == "V1 - Architecture, Design and Threat Modeling"

    def test_extract_asvs_category_invalid(self, calculator):
        """Test ASVS category extraction for invalid format."""
        category = calculator._extract_asvs_category("INVALID")
        assert category == "Other"

        category = calculator._extract_asvs_category("")
        assert category == "Other"

        category = calculator._extract_asvs_category(None)
        assert category == "Other"

    def test_extract_asvs_category_unknown_version(self, calculator):
        """Test ASVS category extraction for unknown version number."""
        category = calculator._extract_asvs_category("V99.1.1")
        assert category == "V99 - Unknown Category"

    def test_group_rules_by_category(self, calculator, mock_rules):
        """Test grouping rules by ASVS category."""
        categories = calculator._group_rules_by_asvs_category(mock_rules)

        assert len(categories) == 4
        assert len(categories["V14 - Configuration"]) == 2
        assert len(categories["V3 - Session Management"]) == 1
        assert len(categories["V4 - Access Control"]) == 1
        assert len(categories["Other"]) == 1

    def test_group_violations_by_category(self, calculator, sample_violations):
        """Test grouping violations by ASVS category."""
        categories = calculator._group_violations_by_asvs_category(sample_violations)

        assert len(categories) == 2
        assert len(categories["V14 - Configuration"]) == 1
        assert len(categories["V3 - Session Management"]) == 1

        # Check violation assignment
        v14_violation = categories["V14 - Configuration"][0]
        assert v14_violation.rule_id == "SEC001-DEBUG-MODE"

        v3_violation = categories["V3 - Session Management"][0]
        assert v3_violation.rule_id == "SEC003-SESSION-SECURE"

    def test_coverage_with_no_violations(self, calculator, mock_rules):
        """Test coverage calculation with no violations."""
        coverage = calculator.calculate_coverage(mock_rules, [])

        # All categories should have 100% coverage
        for category_name, category_coverage in coverage.items():
            assert category_coverage.failed_rules == 0
            assert category_coverage.passed_rules == category_coverage.total_rules
            assert category_coverage.coverage_percentage == 100.0
            assert len(category_coverage.violations) == 0

    def test_coverage_with_all_violations(self, calculator, mock_rules):
        """Test coverage calculation with violations for all rules."""
        violations = []

        # Create violation for each rule
        for rule in mock_rules:
            if rule.owasp_asvs_refs:
                violation = SecurityRuleViolation(
                    rule_id=rule.rule_id,
                    rule_name=rule.rule_id,
                    message="Test violation",
                    severity="MEDIUM",
                    violated_setting="TEST_SETTING",
                    current_value="wrong",
                    expected_value="correct",
                    owasp_asvs_refs=rule.owasp_asvs_refs,
                    remediation="Fix it",
                    timestamp=datetime.utcnow(),
                    environment="test",
                )
                violations.append(violation)

        coverage = calculator.calculate_coverage(mock_rules, violations)

        # Categories with violations should have reduced coverage
        v14_coverage = coverage["V14 - Configuration"]
        assert v14_coverage.failed_rules == 2
        assert v14_coverage.passed_rules == 0
        assert v14_coverage.coverage_percentage == 0.0

        # Other category (no ASVS refs) should still have 100% coverage
        other_coverage = coverage["Other"]
        assert other_coverage.coverage_percentage == 100.0

    def test_coverage_percentage_rounding(self, calculator):
        """Test that coverage percentages are properly rounded."""
        # Create 3 rules, 1 violation = 66.67% coverage
        rules = []
        for i in range(3):
            rule = Mock()
            rule.rule_id = f"SEC00{i}"
            rule.owasp_asvs_refs = ["V1.1.1"]
            rules.append(rule)

        violations = [
            SecurityRuleViolation(
                rule_id="SEC000",
                rule_name="Test Rule",
                message="Test violation",
                severity="MEDIUM",
                violated_setting="TEST",
                current_value="wrong",
                expected_value="correct",
                owasp_asvs_refs=["V1.1.1"],
                remediation="Fix it",
                timestamp=datetime.utcnow(),
                environment="test",
            )
        ]

        coverage = calculator.calculate_coverage(rules, violations)
        v1_coverage = coverage["V1 - Architecture, Design and Threat Modeling"]

        # Should be rounded to 2 decimal places
        assert v1_coverage.coverage_percentage == 66.67
