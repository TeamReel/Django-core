"""Validation functions for i18n preferences."""
import pytz
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import translation


def validate_language_code(language: str) -> None:
    """
    Validate language code against settings.LANGUAGES.

    Args:
        language: ISO 639-1 language code (e.g., "en", "nl")

    Raises:
        ValidationError: If language is not in settings.LANGUAGES
    """
    valid_languages = [code for code, _ in settings.LANGUAGES]
    if language not in valid_languages:
        raise ValidationError(
            f"Invalid language code '{language}'. " f"Must be one of: {', '.join(valid_languages)}"
        )


def validate_locale_code(locale: str) -> None:
    """
    Validate locale code by attempting activation.

    Args:
        locale: BCP 47 locale code (e.g., "en-US", "nl-NL")

    Raises:
        ValidationError: If locale cannot be activated
    """
    try:
        # Django's activate() will raise if locale is invalid
        translation.activate(locale)
    except Exception as e:
        raise ValidationError(
            f"Invalid locale code '{locale}'. Must be a valid Django locale."
        ) from e


def validate_timezone(timezone: str) -> None:
    """
    Validate timezone against pytz.all_timezones.

    Args:
        timezone: IANA timezone name (e.g., "UTC", "Europe/Amsterdam")

    Raises:
        ValidationError: If timezone is not a valid IANA timezone
    """
    if timezone not in pytz.all_timezones:
        raise ValidationError(f"Invalid timezone '{timezone}'. Must be a valid IANA timezone name.")
