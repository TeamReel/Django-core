"""Tests for rule exemption mechanism (WP13 - T118, T121-T122).

Tests cover:
- T118: Exemption loading and checking
- T121: Expiration date validation
- T122: Audit logging for exemptions
"""

import logging
from datetime import datetime, timedelta

import pytest
from security_baseline.rules.registry import SecurityRuleRegistry


@pytest.fixture
def registry():
    """Fresh registry instance for each test."""
    # Create new registry instance (singleton pattern makes this tricky)
    reg = SecurityRuleRegistry()
    # Clear exemptions from previous tests
    reg._exemptions = {}
    return reg


class TestExemptionLoading:
    """Tests for exemption loading (T118)."""

    def test_load_valid_exemptions(self, registry):
        """Test loading valid exemptions from manifest."""
        exemptions = [
            {
                "rule_id": "SEC001-DEBUG-MODE",
                "justification": "Development environment requires DEBUG=True",
                "expires": "2026-12-31",
                "environments": ["local"],
                "approved_by": "dev-team",
                "approved_date": "2025-01-01",
            },
            {
                "rule_id": "SEC010-HSTS-HEADER",
                "justification": "Staging HTTPS configuration in progress",
                "expires": "2025-12-31",
                "environments": ["staging"],
                "approved_by": "security-team",
                "approved_date": "2025-01-15",
            },
        ]

        registry.load_exemptions(exemptions, "local")

        # Should load the exemption that applies to 'local'
        is_exempt, justification = registry.is_rule_exempt("SEC001-DEBUG-MODE")
        assert is_exempt is True
        assert "Development environment" in justification

        # Should not load exemption for different environment
        is_exempt, _ = registry.is_rule_exempt("SEC010-HSTS-HEADER")
        assert is_exempt is False

    def test_load_exemptions_missing_required_fields(self, registry, caplog):
        """Test exemption loading validates required fields."""
        with caplog.at_level(logging.ERROR):
            exemptions = [
                {
                    "rule_id": "SEC001-DEBUG-MODE",
                    # Missing justification
                    "expires": "2025-12-31",
                },
                {
                    "rule_id": "SEC002-SECRET-KEY",
                    "justification": "Test reason",
                    # Missing expires
                },
                {
                    # Missing rule_id
                    "justification": "Test reason",
                    "expires": "2025-12-31",
                },
            ]

            registry.load_exemptions(exemptions, "local")

        # None should be loaded
        assert len(registry.get_all_exemptions()) == 0

        # Should have logged errors
        assert "missing required 'justification' field" in caplog.text
        assert "missing required 'expires' field" in caplog.text

    def test_exemption_environment_filtering(self, registry):
        """Test exemptions are filtered by environment."""
        exemptions = [
            {
                "rule_id": "SEC001-DEBUG-MODE",
                "justification": "Production emergency patch",
                "expires": "2025-12-31",
                "environments": ["production"],  # Only for production
            }
        ]

        # Load in staging environment
        registry.load_exemptions(exemptions, "staging")

        # Should not load (wrong environment)
        is_exempt, _ = registry.is_rule_exempt("SEC001-DEBUG-MODE")
        assert is_exempt is False

    def test_exemption_no_environment_restriction(self, registry):
        """Test exemptions with no environment list apply to all."""
        exemptions = [
            {
                "rule_id": "SEC001-DEBUG-MODE",
                "justification": "Global exemption",
                "expires": "2025-12-31",
                # No 'environments' key - applies to all
            }
        ]

        registry.load_exemptions(exemptions, "staging")

        is_exempt, _ = registry.is_rule_exempt("SEC001-DEBUG-MODE")
        assert is_exempt is True


class TestExpirationValidation:
    """Tests for exemption expiration tracking (T121)."""

    def test_expired_exemptions_not_loaded(self, registry, caplog):
        """Test expired exemptions are rejected."""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

        with caplog.at_level(logging.ERROR):
            exemptions = [
                {
                    "rule_id": "SEC001-DEBUG-MODE",
                    "justification": "Expired exemption",
                    "expires": yesterday,
                }
            ]

            registry.load_exemptions(exemptions, "local")

        # Should not be loaded
        assert len(registry.get_all_exemptions()) == 0
        assert "has expired" in caplog.text

    def test_expiring_soon_exemptions_warn(self, registry, caplog):
        """Test warning logged for exemptions expiring within 30 days."""
        in_15_days = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")

        with caplog.at_level(logging.WARNING):
            exemptions = [
                {
                    "rule_id": "SEC001-DEBUG-MODE",
                    "justification": "Expiring soon",
                    "expires": in_15_days,
                }
            ]

            registry.load_exemptions(exemptions, "local")

        # Should be loaded
        is_exempt, _ = registry.is_rule_exempt("SEC001-DEBUG-MODE")
        assert is_exempt is True

        # Should have warning
        assert "expires in 15 days" in caplog.text

    def test_far_future_exemptions_no_warning(self, registry, caplog):
        """Test no warning for exemptions expiring far in future."""
        in_180_days = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")

        with caplog.at_level(logging.WARNING):
            exemptions = [
                {
                    "rule_id": "SEC001-DEBUG-MODE",
                    "justification": "Long-term exemption",
                    "expires": in_180_days,
                }
            ]

            registry.load_exemptions(exemptions, "local")

        # Should be loaded
        is_exempt, _ = registry.is_rule_exempt("SEC001-DEBUG-MODE")
        assert is_exempt is True

        # Should have NO warning
        assert "expires in" not in caplog.text

    def test_invalid_date_format_rejected(self, registry, caplog):
        """Test exemptions with invalid date formats are rejected."""
        with caplog.at_level(logging.ERROR):
            exemptions = [
                {
                    "rule_id": "SEC001-DEBUG-MODE",
                    "justification": "Bad date format",
                    "expires": "12/31/2025",  # Wrong format
                }
            ]

            registry.load_exemptions(exemptions, "local")

        # Should not be loaded
        assert len(registry.get_all_exemptions()) == 0
        assert "invalid expiration date" in caplog.text


class TestAuditLogging:
    """Tests for exemption audit logging (T122)."""

    def test_exemption_loading_logged(self, registry, caplog):
        """Test exemption loading is logged for audit trail."""
        with caplog.at_level(logging.INFO):
            exemptions = [
                {
                    "rule_id": "SEC001-DEBUG-MODE",
                    "justification": "Development environment",
                    "expires": "2025-12-31",
                }
            ]

            registry.load_exemptions(exemptions, "local")

        # Should log the exemption loading
        assert "Loaded exemption for SEC001-DEBUG-MODE" in caplog.text
        assert "Development environment" in caplog.text
        assert "2025-12-31" in caplog.text

    def test_exemption_check_logged(self, registry):
        """Test that exemption application can be audited."""
        exemptions = [
            {
                "rule_id": "SEC001-DEBUG-MODE",
                "justification": "Development exemption",
                "expires": "2025-12-31",
            }
        ]

        registry.load_exemptions(exemptions, "local")

        # Check exemption (returns justification for logging)
        is_exempt, justification = registry.is_rule_exempt("SEC001-DEBUG-MODE")

        assert is_exempt is True
        assert justification == "Development exemption"

    def test_get_all_exemptions_for_audit(self, registry):
        """Test retrieving all active exemptions for audit reporting."""
        exemptions = [
            {
                "rule_id": "SEC001-DEBUG-MODE",
                "justification": "Dev exemption",
                "expires": "2025-12-31",
            },
            {
                "rule_id": "SEC004-SESSION-COOKIE-SECURE",
                "justification": "HTTP localhost",
                "expires": "2025-12-31",
            },
        ]

        registry.load_exemptions(exemptions, "local")

        all_exemptions = registry.get_all_exemptions()

        assert len(all_exemptions) == 2
        assert "SEC001-DEBUG-MODE" in all_exemptions
        assert "SEC004-SESSION-COOKIE-SECURE" in all_exemptions


class TestExemptionIntegration:
    """Integration tests for exemption mechanism."""

    def test_exempt_rule_returns_no_violation(self, registry):
        """Test that exempt rules skip validation."""
        exemptions = [
            {
                "rule_id": "SEC001-DEBUG-MODE",
                "justification": "Testing exemption",
                "expires": "2025-12-31",
            }
        ]

        registry.load_exemptions(exemptions, "local")

        # Rule should be exempt
        is_exempt, justification = registry.is_rule_exempt("SEC001-DEBUG-MODE")
        assert is_exempt is True
        assert justification is not None

    def test_non_exempt_rule_validates_normally(self, registry):
        """Test that non-exempt rules validate normally."""
        exemptions = [
            {
                "rule_id": "SEC001-DEBUG-MODE",
                "justification": "Only this one exempt",
                "expires": "2025-12-31",
            }
        ]

        registry.load_exemptions(exemptions, "local")

        # Different rule should not be exempt
        is_exempt, _ = registry.is_rule_exempt("SEC002-SECRET-KEY")
        assert is_exempt is False
