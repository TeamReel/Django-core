"""Unit tests for password validation rules."""

import pytest
from unittest.mock import Mock

from security_baseline.rules.password_validation import (
    PasswordLengthRule,
    PasswordComplexityRule,
    PasswordSimilarityRule,
    PasswordBreachRule,
)


class TestPasswordLengthRule:
    """Test PasswordLengthRule validation logic."""

    def test_missing_validator_fails(self):
        """Test that missing MinimumLengthValidator fails."""
        rule = PasswordLengthRule()
        settings = Mock(AUTH_PASSWORD_VALIDATORS=[])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC017-PASSWORD-LENGTH"
        assert "12" in violation.message

    def test_too_short_min_length_fails(self):
        """Test that min_length < 12 fails."""
        rule = PasswordLengthRule()
        settings = Mock(
            AUTH_PASSWORD_VALIDATORS=[
                {
                    "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
                    "OPTIONS": {"min_length": 8},
                }
            ]
        )
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_minimum_length_passes(self):
        """Test that min_length = 12 passes."""
        rule = PasswordLengthRule()
        settings = Mock(
            AUTH_PASSWORD_VALIDATORS=[
                {
                    "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
                    "OPTIONS": {"min_length": 12},
                }
            ]
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_longer_length_passes(self):
        """Test that min_length > 12 passes."""
        rule = PasswordLengthRule()
        settings = Mock(
            AUTH_PASSWORD_VALIDATORS=[
                {
                    "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
                    "OPTIONS": {"min_length": 16},
                }
            ]
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_applies_in_all_environments(self):
        """Test that rule applies in all environments."""
        rule = PasswordLengthRule()
        settings = Mock(AUTH_PASSWORD_VALIDATORS=[])

        for env in ["local", "staging", "production"]:
            context = {"settings": settings, "environment": env}
            violation = rule.validate(context)
            assert violation is not None, f"Should fail in {env}"


class TestPasswordComplexityRule:
    """Test PasswordComplexityRule validation logic."""

    def test_missing_validator_fails(self):
        """Test that missing CommonPasswordValidator fails."""
        rule = PasswordComplexityRule()
        settings = Mock(AUTH_PASSWORD_VALIDATORS=[])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC018-PASSWORD-COMPLEXITY"
        assert "CommonPasswordValidator" in violation.current_value

    def test_validator_present_passes(self):
        """Test that CommonPasswordValidator present passes."""
        rule = PasswordComplexityRule()
        settings = Mock(
            AUTH_PASSWORD_VALIDATORS=[
                {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"}
            ]
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_partial_name_match(self):
        """Test that partial name match works."""
        rule = PasswordComplexityRule()
        settings = Mock(
            AUTH_PASSWORD_VALIDATORS=[{"NAME": "custom.validators.CommonPasswordValidator"}]
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_applies_in_all_environments(self):
        """Test that rule applies in all environments."""
        rule = PasswordComplexityRule()
        settings = Mock(AUTH_PASSWORD_VALIDATORS=[])

        for env in ["local", "staging", "production"]:
            context = {"settings": settings, "environment": env}
            violation = rule.validate(context)
            assert violation is not None, f"Should fail in {env}"


class TestPasswordSimilarityRule:
    """Test PasswordSimilarityRule validation logic."""

    def test_missing_validator_fails(self):
        """Test that missing UserAttributeSimilarityValidator fails."""
        rule = PasswordSimilarityRule()
        settings = Mock(AUTH_PASSWORD_VALIDATORS=[])
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC019-PASSWORD-SIMILARITY"
        assert "UserAttributeSimilarityValidator" in violation.current_value

    def test_validator_present_passes(self):
        """Test that UserAttributeSimilarityValidator present passes."""
        rule = PasswordSimilarityRule()
        settings = Mock(
            AUTH_PASSWORD_VALIDATORS=[
                {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"}
            ]
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_partial_name_match(self):
        """Test that partial name match works."""
        rule = PasswordSimilarityRule()
        settings = Mock(
            AUTH_PASSWORD_VALIDATORS=[
                {"NAME": "custom.validators.UserAttributeSimilarityValidator"}
            ]
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_applies_in_all_environments(self):
        """Test that rule applies in all environments."""
        rule = PasswordSimilarityRule()
        settings = Mock(AUTH_PASSWORD_VALIDATORS=[])

        for env in ["local", "staging", "production"]:
            context = {"settings": settings, "environment": env}
            violation = rule.validate(context)
            assert violation is not None, f"Should fail in {env}"


class TestPasswordBreachRule:
    """Test PasswordBreachRule validation logic."""

    def test_bloom_filter_missing_fails(self):
        """Test that missing bloom filter fails."""
        rule = PasswordBreachRule()
        settings = Mock()
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        # Bloom filter won't exist in test environment
        assert violation is not None
        assert violation.rule_id == "SEC020-PASSWORD-BREACH"
        assert "bloom filter" in violation.message.lower()

    def test_applies_in_all_environments(self):
        """Test that rule applies in all environments."""
        rule = PasswordBreachRule()
        settings = Mock()

        for env in ["local", "staging", "production"]:
            context = {"settings": settings, "environment": env}
            violation = rule.validate(context)
            # Will fail in test environment (no bloom filter)
            assert violation is not None, f"Should check in {env}"
