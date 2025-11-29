"""Explicit locale activation helpers for background jobs and API endpoints."""

import logging
from contextlib import contextmanager

import pytz
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone, translation
from src.organisations.models import Organisation

from .services import PreferenceResolutionService

logger = logging.getLogger(__name__)
User = get_user_model()


def activate_user_locale(user_id: int | str) -> None:
    """Explicitly activate a user's effective locale (language + timezone).

    Use in background jobs, API endpoints, or anywhere middleware doesn't apply.

    Args:
        user_id: User's primary key

    Raises:
        User.DoesNotExist: If user not found (caller should handle)

    Example:
        >>> activate_user_locale(123)
        >>> translation.get_language()  # Returns user's language
        'nl'
    """
    user = User.objects.get(pk=user_id)

    # Resolve effective preferences
    prefs = PreferenceResolutionService.get_effective_preferences(
        user=user, organisation=getattr(user, "organisation", None)
    )

    # Activate language
    translation.activate(prefs.language)

    # Activate timezone
    tzinfo = pytz.timezone(prefs.timezone)
    timezone.activate(tzinfo)

    logger.debug(
        f"Activated user {user_id} locale: " f"language={prefs.language}, timezone={prefs.timezone}"
    )


def activate_org_locale(org_id: int | str) -> None:
    """Explicitly activate an organisation's default locale.

    Use when processing org-wide operations (reports, exports) without user context.

    Args:
        org_id: Organisation's primary key

    Raises:
        Organisation.DoesNotExist: If org not found (caller should handle)

    Example:
        >>> activate_org_locale(456)
        >>> translation.get_language()  # Returns org's default language
        'de'
    """
    org = Organisation.objects.get(pk=org_id)

    # Resolve org preferences (no user)
    prefs = PreferenceResolutionService.get_effective_preferences(user=None, organisation=org)

    # Activate language + timezone
    translation.activate(prefs.language)
    tzinfo = pytz.timezone(prefs.timezone)
    timezone.activate(tzinfo)

    logger.debug(
        f"Activated org {org_id} locale: " f"language={prefs.language}, timezone={prefs.timezone}"
    )


@contextmanager
def user_locale_context(user_id: int | str):
    """Context manager for temporarily activating a user's locale.

    Automatically restores previous locale on exit (important for shared workers).

    Usage:
        with user_locale_context(user_id):
            # Code here runs with user's locale
            message = _("Translated string")
            timestamp = timezone.localtime(timezone.now())

    Args:
        user_id: User's primary key

    Yields:
        EffectivePreferences: The activated preferences

    Example:
        >>> with user_locale_context(123) as prefs:
        ...     print(translation.get_language())  # User's language
        'nl'
        >>> # Outside context, locale is restored
    """
    # Save current locale
    previous_language = translation.get_language()
    previous_timezone = timezone.get_current_timezone()

    try:
        # Activate user locale
        user = User.objects.get(pk=user_id)
        prefs = PreferenceResolutionService.get_effective_preferences(
            user=user, organisation=getattr(user, "organisation", None)
        )

        translation.activate(prefs.language)
        tzinfo = pytz.timezone(prefs.timezone)
        timezone.activate(tzinfo)

        logger.debug(
            f"Entered user_locale_context for user {user_id}: "
            f"language={prefs.language}, timezone={prefs.timezone}"
        )

        yield prefs  # Return prefs to caller

    finally:
        # Restore previous locale (critical for worker processes)
        translation.activate(previous_language)
        timezone.activate(previous_timezone)

        logger.debug(
            f"Exited user_locale_context, restored: "
            f"language={previous_language}, timezone={previous_timezone}"
        )


@contextmanager
def org_locale_context(org_id: int | str):
    """Context manager for temporarily activating an organisation's locale.

    Automatically restores previous locale on exit.

    Usage:
        with org_locale_context(org_id):
            # Code here runs with org's default locale
            report_title = _("Monthly Report")

    Args:
        org_id: Organisation's primary key

    Yields:
        EffectivePreferences: The activated preferences

    Example:
        >>> with org_locale_context(456) as prefs:
        ...     print(prefs.language)
        'de'
    """
    # Save current locale
    previous_language = translation.get_language()
    previous_timezone = timezone.get_current_timezone()

    try:
        # Activate org locale
        org = Organisation.objects.get(pk=org_id)
        prefs = PreferenceResolutionService.get_effective_preferences(user=None, organisation=org)

        translation.activate(prefs.language)
        tzinfo = pytz.timezone(prefs.timezone)
        timezone.activate(tzinfo)

        logger.debug(
            f"Entered org_locale_context for org {org_id}: "
            f"language={prefs.language}, timezone={prefs.timezone}"
        )

        yield prefs

    finally:
        # Restore previous locale
        translation.activate(previous_language)
        timezone.activate(previous_timezone)

        logger.debug(
            f"Exited org_locale_context, restored: "
            f"language={previous_language}, timezone={previous_timezone}"
        )


def activate_user_locale_safe(user_id: int | str) -> bool:
    """Activate user locale with fallback to global if user not found.

    Use when you want safe activation (no exceptions).

    Args:
        user_id: User's primary key

    Returns:
        bool: True if user locale activated, False if fell back to global

    Example:
        >>> activate_user_locale_safe(999999)  # Non-existent user
        False  # Falls back to global settings
    """
    try:
        activate_user_locale(user_id)
        return True
    except User.DoesNotExist:
        logger.warning(f"User {user_id} not found, using global defaults")
        # Fall back to global settings
        translation.activate(settings.LANGUAGE_CODE)
        timezone.activate(pytz.timezone(settings.TIME_ZONE))
        return False


def activate_org_locale_safe(org_id: int | str) -> bool:
    """Activate org locale with fallback to global if org not found.

    Use when you want safe activation (no exceptions).

    Args:
        org_id: Organisation's primary key

    Returns:
        bool: True if org locale activated, False if fell back to global

    Example:
        >>> activate_org_locale_safe(999999)  # Non-existent org
        False  # Falls back to global settings
    """
    try:
        activate_org_locale(org_id)
        return True
    except Organisation.DoesNotExist:
        logger.warning(f"Organisation {org_id} not found, using global defaults")
        # Fall back to global settings
        translation.activate(settings.LANGUAGE_CODE)
        timezone.activate(pytz.timezone(settings.TIME_ZONE))
        return False
