"""
Middleware for automatic activation of user/organisation i18n preferences.

This module provides custom middleware classes that extend Django's built-in
LocaleMiddleware and provide timezone activation based on user/organisation
settings from B12 (i18n_preferences).
"""

import logging
import pytz
from django.middleware.locale import LocaleMiddleware
from django.utils import translation, timezone
from django.utils.deprecation import MiddlewareMixin

from .services import PreferenceResolutionService

logger = logging.getLogger(__name__)


class PreferenceLocaleMiddleware(LocaleMiddleware):
    """
    Extends Django's LocaleMiddleware to activate user/org language preferences.

    Precedence: user preference > org default > Django's standard resolution
    (Accept-Language header, locale cookie, settings.LANGUAGE_CODE)

    This middleware must be placed after AuthenticationMiddleware in MIDDLEWARE.
    """

    def process_request(self, request):
        """Inject user/org preference resolution before Django's fallback."""
        if request.user.is_authenticated:
            try:
                # Resolve effective preferences
                prefs = PreferenceResolutionService.get_effective_preferences(
                    user=request.user, organisation=getattr(request.user, "organisation", None)
                )

                # Activate language
                translation.activate(prefs.language)
                request.LANGUAGE_CODE = prefs.language

                # Log activation for debugging
                logger.debug(
                    f"Activated language '{prefs.language}' "
                    f"(source: {prefs.language_source}) for user {request.user.id}"
                )

                # Don't call parent - we've already set the language
                return None

            except Exception as e:
                logger.warning(
                    f"Failed to activate user preference for user {request.user.id}: {e}"
                )
                # Fall through to Django's standard resolution

        # Call parent implementation for fallback chain (anonymous users or error cases)
        return super().process_request(request)


class PreferenceTimezoneMiddleware(MiddlewareMixin):
    """
    Middleware to activate user/org timezone preferences.

    Precedence: user preference > org default > Django's standard resolution
    (TIME_ZONE setting)

    This middleware must be placed after AuthenticationMiddleware in MIDDLEWARE.
    """

    def process_request(self, request):
        """Inject user/org preference resolution for timezone activation."""
        if request.user.is_authenticated:
            try:
                # Resolve effective preferences
                prefs = PreferenceResolutionService.get_effective_preferences(
                    user=request.user, organisation=getattr(request.user, "organisation", None)
                )

                # Activate timezone
                tzinfo = pytz.timezone(prefs.timezone)
                timezone.activate(tzinfo)

                # Log activation for debugging
                logger.debug(
                    f"Activated timezone '{prefs.timezone}' "
                    f"(source: {prefs.timezone_source}) for user {request.user.id}"
                )

            except Exception as e:
                logger.warning(f"Failed to activate timezone for user {request.user.id}: {e}")
                # Continue without timezone activation (Django default remains)

        # No parent call needed - we're only activating timezone
