"""Tests for password validators."""

import pytest
from accounts.validators import (
    LowercaseValidator,
    NumberValidator,
    SpecialCharacterValidator,
    UppercaseValidator,
)
from django.core.exceptions import ValidationError


class TestPasswordValidators:
    """Tests for custom password validators."""

    def test_uppercase_validator_valid(self):
        """Test UppercaseValidator with valid password."""
        validator = UppercaseValidator()
        # Should not raise
        validator.validate("Password123!")

    def test_uppercase_validator_invalid(self):
        """Test UppercaseValidator with invalid password."""
        validator = UppercaseValidator()
        with pytest.raises(ValidationError, match="at least one uppercase letter"):
            validator.validate("password123!")

    def test_lowercase_validator_valid(self):
        """Test LowercaseValidator with valid password."""
        validator = LowercaseValidator()
        # Should not raise
        validator.validate("Password123!")

    def test_lowercase_validator_invalid(self):
        """Test LowercaseValidator with invalid password."""
        validator = LowercaseValidator()
        with pytest.raises(ValidationError, match="at least one lowercase letter"):
            validator.validate("PASSWORD123!")

    def test_number_validator_valid(self):
        """Test NumberValidator with valid password."""
        validator = NumberValidator()
        # Should not raise
        validator.validate("Password123!")

    def test_number_validator_invalid(self):
        """Test NumberValidator with invalid password."""
        validator = NumberValidator()
        with pytest.raises(ValidationError, match="at least one number"):
            validator.validate("Password!")

    def test_special_character_validator_valid(self):
        """Test SpecialCharacterValidator with valid password."""
        validator = SpecialCharacterValidator()
        # Should not raise
        validator.validate("Password123!")

    def test_special_character_validator_invalid(self):
        """Test SpecialCharacterValidator with invalid password."""
        validator = SpecialCharacterValidator()
        with pytest.raises(ValidationError, match="at least one special character"):
            validator.validate("Password123")

    def test_all_validators_with_strong_password(self):
        """Test all validators with a strong password."""
        password = "MyS3cur3P@ssw0rd!"
        validators = [
            UppercaseValidator(),
            LowercaseValidator(),
            NumberValidator(),
            SpecialCharacterValidator(),
        ]
        for validator in validators:
            validator.validate(password)  # Should not raise

    def test_all_validators_with_weak_password(self):
        """Test all validators with a weak password."""
        password = "weak"
        validators = [
            (UppercaseValidator(), "uppercase"),
            (LowercaseValidator(), "lowercase"),  # This one passes
            (NumberValidator(), "number"),
            (SpecialCharacterValidator(), "special"),
        ]
        errors = []
        for validator, name in validators:
            try:
                validator.validate(password)
            except ValidationError:
                errors.append(name)

        assert "uppercase" in errors
        assert "number" in errors
        assert "special" in errors
        assert "lowercase" not in errors

    def test_validator_get_help_text(self):
        """Test that validators provide help text."""
        validators = [
            UppercaseValidator(),
            LowercaseValidator(),
            NumberValidator(),
            SpecialCharacterValidator(),
        ]
        for validator in validators:
            help_text = validator.get_help_text()
            assert help_text is not None
            assert len(help_text) > 0
