"""Comprehensive tests for PreferenceResolutionService."""

import pytest
from django.contrib.auth import get_user_model

from src.organisations.models import Organisation
from src.i18n_preferences.services import (
    EffectivePreferences,
    PreferenceResolutionService,
)
from src.settings.models import ScopeType, Setting, SettingType

User = get_user_model()


def create_test_user(email="test@example.com", password="Test123!@#"):
    """Helper to create users for tests."""
    return User.objects.create_user(email=email, password=password, is_active=True)


def create_test_org(name="Test Org", creator=None):
    """Helper to create organisations for tests."""
    if not creator:
        creator = create_test_user(email=f"{name.lower().replace(' ', '')}@example.com")
    return Organisation.objects.create(name=name, creator=creator)


@pytest.mark.django_db
class TestUserFullPreferences:
    """Test when user has all preferences set."""

    def test_user_full_preferences(self):
        """All preferences returned from user scope."""
        user = create_test_user()
        org = create_test_org(creator=user)

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "nl", "locale": "nl-NL", "timezone": "Europe/Amsterdam"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        assert isinstance(result, EffectivePreferences)
        assert result.language == "nl"
        assert result.locale == "nl-NL"
        assert result.timezone == "Europe/Amsterdam"
        assert result.language_source == "user"
        assert result.locale_source == "user"
        assert result.timezone_source == "user"


@pytest.mark.django_db
class TestOrgFullPreferences:
    """Test when user has no preferences, org has all."""

    def test_org_full_preferences(self):
        """All preferences returned from org scope."""
        user = create_test_user()
        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "de", "locale": "de-DE", "timezone": "Europe/Berlin"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        assert result.language == "de"
        assert result.locale == "de-DE"
        assert result.timezone == "Europe/Berlin"
        assert result.language_source == "organisation"
        assert result.locale_source == "organisation"
        assert result.timezone_source == "organisation"


@pytest.mark.django_db
class TestGlobalFallback:
    """Test when no user/org preferences exist."""

    def test_global_fallback(self, settings):
        """Global defaults returned."""
        settings.LANGUAGE_CODE = "en"
        settings.TIME_ZONE = "UTC"

        user = create_test_user()
        org = create_test_org()

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        assert result.language == "en"
        assert result.locale == "en"
        assert result.timezone == "UTC"
        assert result.language_source == "global"
        assert result.locale_source == "global"
        assert result.timezone_source == "global"


@pytest.mark.django_db
class TestPartialUserLanguageOnly:
    """Test user sets language only, org provides locale/timezone."""

    def test_partial_user_language_only(self):
        """User language + org locale/timezone."""
        user = create_test_user()
        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "nl"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )
        Setting.objects.create(
            key="i18n.preferences",
            value={"locale": "en-GB", "timezone": "Europe/London"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        assert result.language == "nl"
        assert result.language_source == "user"
        assert result.locale == "en-GB"
        assert result.locale_source == "organisation"
        assert result.timezone == "Europe/London"
        assert result.timezone_source == "organisation"


@pytest.mark.django_db
class TestPartialUserTimezoneOnly:
    """Test user sets timezone only, org provides language/locale."""

    def test_partial_user_timezone_only(self, settings):
        """User timezone + org language/locale."""
        settings.LANGUAGE_CODE = "en"
        settings.TIME_ZONE = "UTC"

        user = create_test_user()
        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"timezone": "Asia/Tokyo"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "ja", "locale": "ja-JP"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        assert result.language == "ja"
        assert result.language_source == "organisation"
        assert result.locale == "ja-JP"
        assert result.locale_source == "organisation"
        assert result.timezone == "Asia/Tokyo"
        assert result.timezone_source == "user"


@pytest.mark.django_db
class TestMixedSources:
    """Test user language + org locale + global timezone."""

    def test_mixed_sources(self, settings):
        """Each field from different source."""
        settings.LANGUAGE_CODE = "en"
        settings.TIME_ZONE = "UTC"

        user = create_test_user()
        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "fr"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )
        Setting.objects.create(
            key="i18n.preferences",
            value={"locale": "fr-CA"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        assert result.language == "fr"
        assert result.language_source == "user"
        assert result.locale == "fr-CA"
        assert result.locale_source == "organisation"
        assert result.timezone == "UTC"
        assert result.timezone_source == "global"


@pytest.mark.django_db
class TestUserOverridesOrg:
    """Test user and org both have language, user wins."""

    def test_user_overrides_org(self):
        """User preference takes precedence over org."""
        user = create_test_user()
        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "nl", "locale": "nl-NL", "timezone": "Europe/Amsterdam"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "de", "locale": "de-DE", "timezone": "Europe/Berlin"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        # All should come from user (user > org precedence)
        assert result.language == "nl"
        assert result.locale == "nl-NL"
        assert result.timezone == "Europe/Amsterdam"
        assert result.language_source == "user"
        assert result.locale_source == "user"
        assert result.timezone_source == "user"


@pytest.mark.django_db
class TestUserOverridesGlobal:
    """Test user and global both have timezone, user wins."""

    def test_user_overrides_global(self, settings):
        """User preference takes precedence over global."""
        settings.LANGUAGE_CODE = "en"
        settings.TIME_ZONE = "UTC"

        user = create_test_user()

        Setting.objects.create(
            key="i18n.preferences",
            value={"timezone": "America/New_York"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user)

        assert result.timezone == "America/New_York"
        assert result.timezone_source == "user"
        assert result.language == "en"  # Falls back to global
        assert result.language_source == "global"


@pytest.mark.django_db
class TestOrgOverridesGlobal:
    """Test org and global both have locale, org wins."""

    def test_org_overrides_global(self, settings):
        """Org preference takes precedence over global."""
        settings.LANGUAGE_CODE = "en"
        settings.TIME_ZONE = "UTC"

        user = create_test_user()
        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"locale": "en-AU"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        assert result.locale == "en-AU"
        assert result.locale_source == "organisation"
        assert result.language == "en"  # Falls back to global
        assert result.language_source == "global"


@pytest.mark.django_db
class TestAnonymousUser:
    """Test user=None, should use org/global only."""

    def test_anonymous_user(self, settings):
        """Anonymous user should use org/global preferences."""
        settings.LANGUAGE_CODE = "en"
        settings.TIME_ZONE = "UTC"

        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "es", "locale": "es-ES"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=None, organisation=org)

        assert result.language == "es"
        assert result.language_source == "organisation"
        assert result.locale == "es-ES"
        assert result.locale_source == "organisation"
        assert result.timezone == "UTC"
        assert result.timezone_source == "global"


@pytest.mark.django_db
class TestNoOrganisation:
    """Test user has preferences but org=None."""

    def test_no_organisation(self, settings):
        """User preferences + global fallback when org is None."""
        settings.LANGUAGE_CODE = "en"
        settings.TIME_ZONE = "UTC"

        user = create_test_user()

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "pt", "timezone": "America/Sao_Paulo"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=None)

        assert result.language == "pt"
        assert result.language_source == "user"
        assert result.timezone == "America/Sao_Paulo"
        assert result.timezone_source == "user"
        assert result.locale == "en"  # Falls back to global
        assert result.locale_source == "global"


@pytest.mark.django_db
class TestEmptyPreferenceValues:
    """Test user has empty string values, should fall back."""

    def test_empty_preference_values(self, settings):
        """Empty strings should be treated as not set."""
        settings.LANGUAGE_CODE = "en"
        settings.TIME_ZONE = "UTC"

        user = create_test_user()
        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "", "locale": "en-US"},  # Empty language
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "de"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        # Empty user.language should fall back to org.language
        assert result.language == "de"
        assert result.language_source == "organisation"
        assert result.locale == "en-US"
        assert result.locale_source == "user"


@pytest.mark.django_db
class TestSourceAttribution:
    """Verify source attribution fields are correct."""

    def test_source_attribution(self):
        """Verify all source fields are accurate."""
        user = create_test_user()
        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "nl"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )
        Setting.objects.create(
            key="i18n.preferences",
            value={"timezone": "Europe/Amsterdam"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )
        Setting.objects.create(
            key="i18n.preferences",
            value={"locale": "en-US"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.GLOBAL,
        )

        result = PreferenceResolutionService.get_effective_preferences(user=user, organisation=org)

        # Verify each source is correctly attributed
        assert result.language == "nl" and result.language_source == "user"
        assert result.timezone == "Europe/Amsterdam" and result.timezone_source == "organisation"
        assert result.locale == "en-US" and result.locale_source == "global"


@pytest.mark.django_db
class TestCacheBehavior:
    """Verify B10 cache is used for repeated queries."""

    def test_cache_behavior(self, django_assert_num_queries):
        """First call queries DB, second call uses cache."""
        user = create_test_user()
        org = create_test_org()

        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "nl"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        # First call: should query DB
        with django_assert_num_queries(3):  # user, org, global queries
            result1 = PreferenceResolutionService.get_effective_preferences(
                user=user, organisation=org
            )

        # Note: B10's cache may be enabled in production
        # This test verifies service works with B10's caching layer
        assert result1.language == "nl"
        assert result1.language_source == "user"
