"""
Tests for middleware integration - automatic activation of user/org i18n preferences.

Tests verify that PreferenceLocaleMiddleware and PreferenceTimezoneMiddleware
correctly activate preferences for authenticated users while preserving Django's
standard fallback chain for anonymous users.
"""

import pytest
import pytz
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone, translation

from src.organisations.models import Organisation
from src.settings.models import Setting, SettingType, ScopeType
from i18n_preferences.middleware import PreferenceLocaleMiddleware, PreferenceTimezoneMiddleware

User = get_user_model()


def create_test_user(email="test@example.com", password="testpass123"):
    """Helper to create a test user."""
    return User.objects.create_user(email=email, password=password)


def create_test_org(name="Test Org", creator=None):
    """Helper to create a test organisation."""
    if creator is None:
        creator = create_test_user(email=f"{name.lower().replace(' ', '')}@example.com")
    return Organisation.objects.create(name=name, creator=creator)


@pytest.mark.django_db
class TestPreferenceLocaleMiddleware(TestCase):
    """
    Tests for PreferenceLocaleMiddleware.

    Verifies language preference activation for authenticated users.
    """

    def setUp(self):
        """Set up test fixtures."""
        self.factory = RequestFactory()
        self.middleware = PreferenceLocaleMiddleware(get_response=lambda r: None)
        self.user = create_test_user()
        self.org = create_test_org(creator=self.user)
        self.user.organisation = self.org
        self.user.save()

    def test_authenticated_user_with_language(self):
        """User's language preference is activated in request."""
        # Create user preference
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "nl", "locale": "nl-NL", "timezone": "Europe/Amsterdam"},
            scope_type=ScopeType.USER,
            user=self.user,
            value_type=SettingType.JSON,
            default_value={},
        )

        # Simulate authenticated request
        request = self.factory.get("/")
        request.user = self.user
        self.middleware.process_request(request)

        # Verify language activated
        assert translation.get_language() == "nl"
        assert request.LANGUAGE_CODE == "nl"

    def test_authenticated_user_partial_prefs(self):
        """User has language only, timezone falls back."""
        # Create user preference with language only
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "fr"},
            scope_type=ScopeType.USER,
            user=self.user,
            value_type=SettingType.JSON,
            default_value={},
        )

        # Simulate authenticated request
        request = self.factory.get("/")
        request.user = self.user
        self.middleware.process_request(request)

        # Verify language activated
        assert translation.get_language() == "fr"

    def test_anonymous_user_uses_django_fallback(self):
        """Anonymous request uses Django's standard resolution."""
        # Create anonymous request
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.get("/", HTTP_ACCEPT_LANGUAGE="de")
        request.user = AnonymousUser()

        # Process request
        self.middleware.process_request(request)

        # Verify Django's fallback is used (Accept-Language header)
        # Note: LocaleMiddleware processes Accept-Language in parent
        # We can't directly test the fallback here, but we verify no errors

    def test_accept_language_fallback(self):
        """Authenticated user without prefs uses Accept-Language."""
        # No user preferences created
        request = self.factory.get("/", HTTP_ACCEPT_LANGUAGE="es")
        request.user = self.user
        self.middleware.process_request(request)

        # Verify no errors (Django fallback handles Accept-Language)

    @override_settings(LANGUAGE_COOKIE_NAME="django_language")
    def test_locale_cookie_fallback(self):
        """Authenticated user without prefs uses locale cookie."""
        # No user preferences created
        request = self.factory.get("/")
        request.user = self.user
        request.COOKIES = {"django_language": "it"}
        self.middleware.process_request(request)

        # Verify no errors (Django fallback handles cookie)

    def test_preference_resolution_error(self):
        """Resolution service raises error, request continues."""
        # Create invalid preference data
        Setting.objects.create(
            key="i18n.preferences",
            value="not a dict",  # Invalid: should be dict
            scope_type=ScopeType.USER,
            user=self.user,
            value_type=SettingType.JSON,
            default_value={},
        )

        # Simulate authenticated request
        request = self.factory.get("/")
        request.user = self.user

        # Should not raise exception
        self.middleware.process_request(request)

    def test_language_activated_in_view(self):
        """View can access translation.get_language() = user's preference."""
        # Create user preference
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "pt", "locale": "pt-BR", "timezone": "America/Sao_Paulo"},
            scope_type=ScopeType.USER,
            user=self.user,
            value_type=SettingType.JSON,
            default_value={},
        )

        # Simulate request
        request = self.factory.get("/")
        request.user = self.user
        self.middleware.process_request(request)

        # Verify language is accessible
        assert translation.get_language() == "pt"


@pytest.mark.django_db
class TestPreferenceTimezoneMiddleware(TestCase):
    """
    Tests for PreferenceTimezoneMiddleware.

    Verifies timezone preference activation for authenticated users.
    """

    def setUp(self):
        """Set up test fixtures."""
        self.factory = RequestFactory()
        self.middleware = PreferenceTimezoneMiddleware(get_response=lambda r: None)
        self.user = create_test_user(email="tz@example.com")
        self.org = create_test_org(name="TZ Org", creator=self.user)
        self.user.organisation = self.org
        self.user.save()

    def test_authenticated_user_with_timezone(self):
        """User's timezone preference is activated in request."""
        # Create user preference
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "en", "locale": "en-US", "timezone": "America/New_York"},
            scope_type=ScopeType.USER,
            user=self.user,
            value_type=SettingType.JSON,
            default_value={},
        )

        # Simulate authenticated request
        request = self.factory.get("/")
        request.user = self.user
        self.middleware.process_request(request)

        # Verify timezone activated
        current_tz = timezone.get_current_timezone()
        assert str(current_tz) == "America/New_York"

    def test_timezone_activated_in_view(self):
        """View can access timezone.get_current_timezone() = user's timezone."""
        # Create user preference
        Setting.objects.create(
            key="i18n.preferences",
            value={"language": "en", "locale": "en-GB", "timezone": "Europe/London"},
            scope_type=ScopeType.USER,
            user=self.user,
            value_type=SettingType.JSON,
            default_value={},
        )

        # Simulate request
        request = self.factory.get("/")
        request.user = self.user
        self.middleware.process_request(request)

        # Verify timezone is accessible
        current_tz = timezone.get_current_timezone()
        assert str(current_tz) == "Europe/London"

    def test_anonymous_user_timezone_fallback(self):
        """Anonymous user uses Django's TIME_ZONE setting."""
        # Create anonymous request
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.get("/")
        request.user = AnonymousUser()

        # Process request
        self.middleware.process_request(request)

        # Verify no errors (Django fallback handles TIME_ZONE)


@pytest.mark.django_db
class TestMiddlewareOrdering(TestCase):
    """
    Tests for middleware ordering requirements.

    Verifies that middleware runs after AuthenticationMiddleware.
    """

    def test_middleware_ordering(self):
        """Verify middleware runs after AuthenticationMiddleware."""
        from django.conf import settings

        middleware_list = settings.MIDDLEWARE

        # Find positions
        auth_index = middleware_list.index(
            "django.contrib.auth.middleware.AuthenticationMiddleware"
        )
        locale_index = middleware_list.index(
            "i18n_preferences.middleware.PreferenceLocaleMiddleware"
        )
        tz_index = middleware_list.index("i18n_preferences.middleware.PreferenceTimezoneMiddleware")

        # Verify ordering
        assert (
            auth_index < locale_index
        ), "PreferenceLocaleMiddleware must come after AuthenticationMiddleware"
        assert (
            auth_index < tz_index
        ), "PreferenceTimezoneMiddleware must come after AuthenticationMiddleware"
        assert (
            locale_index < tz_index
        ), "PreferenceLocaleMiddleware should come before PreferenceTimezoneMiddleware"
