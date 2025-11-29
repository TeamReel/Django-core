"""Preference resolution service for i18n preferences."""

from dataclasses import dataclass
from typing import Literal, Optional

from django.conf import settings
from django.contrib.auth import get_user_model

from organisations.models import Organisation
from settings.models import ScopeType, Setting

User = get_user_model()


@dataclass
class EffectivePreferences:
    """
    Resolved i18n preferences with source attribution.

    Attributes:
        language: ISO 639-1 language code (e.g., "en", "nl")
        locale: BCP 47 locale code (e.g., "en-US", "nl-NL")
        timezone: IANA timezone name (e.g., "UTC", "Europe/Amsterdam")
        language_source: Where language preference came from
        locale_source: Where locale preference came from
        timezone_source: Where timezone preference came from
    """

    language: str
    locale: str
    timezone: str
    language_source: Literal["user", "organisation", "global"]
    locale_source: Literal["user", "organisation", "global"]
    timezone_source: Literal["user", "organisation", "global"]


class PreferenceResolutionService:
    """
    Service for resolving user and organisation i18n preferences.

    Implements precedence hierarchy: user > organisation > global
    with independent fallback per field.
    """

    KEY = "i18n.preferences"

    @classmethod
    def get_effective_preferences(
        cls,
        user: Optional[User] = None,
        organisation: Optional[Organisation] = None,
    ) -> EffectivePreferences:
        """
        Resolve effective i18n preferences for user and organisation.

        Args:
            user: User instance (optional for anonymous users)
            organisation: Organisation instance (optional)

        Returns:
            EffectivePreferences with resolved values + source attribution
        """
        # Fetch preferences from B10 (will use cache if available)
        user_prefs = cls._get_user_preferences(user) if user else {}
        org_prefs = cls._get_org_preferences(organisation) if organisation else {}
        global_prefs = cls._get_global_preferences()

        # Independent fallback per field
        language, lang_source = cls._resolve_field("language", user_prefs, org_prefs, global_prefs)
        locale, locale_source = cls._resolve_field("locale", user_prefs, org_prefs, global_prefs)
        timezone, tz_source = cls._resolve_field("timezone", user_prefs, org_prefs, global_prefs)

        return EffectivePreferences(
            language=language,
            locale=locale,
            timezone=timezone,
            language_source=lang_source,
            locale_source=locale_source,
            timezone_source=tz_source,
        )

    @classmethod
    def _get_user_preferences(cls, user: User) -> dict:
        """Fetch user-scoped preferences from B10."""
        try:
            setting = Setting.objects.get(
                key=cls.KEY,
                scope_type=ScopeType.USER,
                user=user,
            )
            return setting.value  # JSON dict
        except Setting.DoesNotExist:
            return {}

    @classmethod
    def _get_org_preferences(cls, organisation: Organisation) -> dict:
        """Fetch org-scoped preferences from B10."""
        try:
            setting = Setting.objects.get(
                key=cls.KEY,
                scope_type=ScopeType.ORGANISATION,
                organisation=organisation,
            )
            return setting.value
        except Setting.DoesNotExist:
            return {}

    @classmethod
    def _get_global_preferences(cls) -> dict:
        """Fetch global preferences from B10 or Django settings."""
        try:
            setting = Setting.objects.get(
                key=cls.KEY,
                scope_type=ScopeType.GLOBAL,
            )
            return setting.value
        except Setting.DoesNotExist:
            # Fall back to Django settings
            return {
                "language": settings.LANGUAGE_CODE,
                "locale": settings.LANGUAGE_CODE,  # or settings.LOCALE if exists
                "timezone": settings.TIME_ZONE,
            }

    @classmethod
    def _resolve_field(
        cls, field: str, user: dict, org: dict, global_: dict
    ) -> tuple[str, Literal["user", "organisation", "global"]]:
        """Resolve single field with precedence: user > org > global."""
        if field in user and user[field]:
            return user[field], "user"
        if field in org and org[field]:
            return org[field], "organisation"
        return global_[field], "global"
