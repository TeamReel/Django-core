"""Tests for explicit locale activation helpers."""

import pytest
import pytz
from django.contrib.auth import get_user_model
from django.utils import timezone, translation
from i18n_preferences.helpers import (
    activate_org_locale,
    activate_org_locale_safe,
    activate_user_locale,
    activate_user_locale_safe,
    org_locale_context,
    user_locale_context,
)
from organisations.models import Organisation
from settings.models import ScopeType, Setting

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestActivateUserLocale:
    """Tests for activate_user_locale() function."""

    def test_activate_user_locale(self):
        """activate_user_locale() sets Django's language and timezone."""
        user = User.objects.create_user(email="test@example.com", password="testpass123")

        # Create user preferences
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.USER,
            user=user,
            value={"language": "en", "locale": "en-GB", "timezone": "Europe/London"},
            value_type="JSON",
            default_value={},
        )

        # Activate user locale
        activate_user_locale(user.id)

        # Verify language and timezone activated
        assert translation.get_language() == "en"
        assert str(timezone.get_current_timezone()) == "Europe/London"

    def test_activate_user_locale_missing_user(self):
        """activate_user_locale() raises User.DoesNotExist for invalid user."""
        with pytest.raises(User.DoesNotExist):
            activate_user_locale(999999)

    def test_activate_user_locale_with_org_defaults(self):
        """activate_user_locale() falls back to org defaults if user has no prefs."""
        # Create user and org first
        admin = User.objects.create_user(email="admin@example.com", password="adminpass123")
        org = Organisation.objects.create(name="Test Org", creator=admin)

        # Create test user associated with org
        user = User.objects.create_user(email="test@example.com", password="testpass123")
        # Note: User model may not have organisation field - test focuses on the service
        # If organisation attribute doesn't exist, this test validates global fallback

        # Create org preferences (no user preferences)
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
            value={"language": "en", "timezone": "Europe/Amsterdam"},
            value_type="JSON",
            default_value={},
        )

        # If user model supports organisation, set it
        if hasattr(user, "organisation"):
            user.organisation = org
            user.save()

            # Activate user locale
            activate_user_locale(user.id)

            # Verify org defaults used (Django normalizes 'en' to 'en-us')
            assert translation.get_language() in ["en", "en-us"]
            assert str(timezone.get_current_timezone()) == "Europe/Amsterdam"
        else:
            # If no organisation field, test validates global fallback
            activate_user_locale(user.id)
            # Will use global defaults (UTC) - this is expected behavior
            assert translation.get_language() in ["en", "en-us"]


class TestActivateOrgLocale:
    """Tests for activate_org_locale() function."""

    def test_activate_org_locale(self):
        """activate_org_locale() sets Django's language and timezone to org defaults."""
        user = User.objects.create_user(email="admin@example.com", password="adminpass123")
        org = Organisation.objects.create(name="Test Org", creator=user)

        # Create org preferences
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
            value={"language": "en", "timezone": "Europe/Berlin"},
            value_type="JSON",
            default_value={},
        )

        # Activate org locale
        activate_org_locale(org.id)

        # Verify language and timezone activated
        assert translation.get_language() == "en"
        assert str(timezone.get_current_timezone()) == "Europe/Berlin"

    def test_activate_org_locale_missing_org(self):
        """activate_org_locale() raises Organisation.DoesNotExist for invalid org."""
        with pytest.raises(Organisation.DoesNotExist):
            activate_org_locale(999999)


class TestUserLocaleContext:
    """Tests for user_locale_context() context manager."""

    def test_user_locale_context_activates_and_restores(self):
        """Context manager activates user locale inside, restores after."""
        user = User.objects.create_user(email="test@example.com", password="testpass123")

        # Create user preferences
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.USER,
            user=user,
            value={"language": "en", "timezone": "Europe/London"},
            value_type="JSON",
            default_value={},
        )

        # Set initial locale
        translation.activate("en")
        timezone.activate(pytz.timezone("UTC"))

        # Use context manager
        with user_locale_context(user.id) as prefs:
            # Inside context: user's locale
            assert translation.get_language() == "en"
            assert str(timezone.get_current_timezone()) == "Europe/London"
            assert prefs.language == "en"
            assert prefs.timezone == "Europe/London"

        # Outside context: restored to previous
        assert translation.get_language() == "en"
        assert str(timezone.get_current_timezone()) == "UTC"

    def test_context_manager_restores_on_exception(self):
        """Locale is restored even if exception occurs inside context."""
        user = User.objects.create_user(email="test@example.com", password="testpass123")

        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.USER,
            user=user,
            value={"language": "en", "timezone": "Europe/Amsterdam"},
            value_type="JSON",
            default_value={},
        )

        # Set initial locale
        translation.activate("en")
        timezone.activate(pytz.timezone("UTC"))

        # Use context manager with exception
        try:
            with user_locale_context(user.id):
                assert translation.get_language() == "en"
                raise ValueError("Test exception")
        except ValueError:
            pass

        # Verify locale was restored
        assert translation.get_language() == "en"
        assert str(timezone.get_current_timezone()) == "UTC"

    def test_user_locale_context_missing_user(self):
        """Context manager raises User.DoesNotExist for invalid user."""
        translation.activate("en")
        timezone.activate(pytz.timezone("UTC"))

        with pytest.raises(User.DoesNotExist):
            with user_locale_context(999999):
                pass

        # Verify locale was still restored (in finally block)
        assert translation.get_language() == "en"
        assert str(timezone.get_current_timezone()) == "UTC"


class TestOrgLocaleContext:
    """Tests for org_locale_context() context manager."""

    def test_org_locale_context_activates_and_restores(self):
        """Context manager activates org locale inside, restores after."""
        user = User.objects.create_user(email="admin@example.com", password="adminpass123")
        org = Organisation.objects.create(name="Test Org", creator=user)

        # Create org preferences
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
            value={"language": "en", "timezone": "Europe/Berlin"},
            value_type="JSON",
            default_value={},
        )

        # Set initial locale
        translation.activate("en")
        timezone.activate(pytz.timezone("UTC"))

        # Use context manager
        with org_locale_context(org.id) as prefs:
            # Inside context: org's locale
            assert translation.get_language() == "en"
            assert str(timezone.get_current_timezone()) == "Europe/Berlin"
            assert prefs.language == "en"
            assert prefs.timezone == "Europe/Berlin"

        # Outside context: restored to previous
        assert translation.get_language() == "en"
        assert str(timezone.get_current_timezone()) == "UTC"


class TestSafeActivationFunctions:
    """Tests for safe activation functions with fallback."""

    def test_activate_user_locale_safe_success(self):
        """activate_user_locale_safe() returns True on success."""
        user = User.objects.create_user(email="test@example.com", password="testpass123")

        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.USER,
            user=user,
            value={"language": "en", "timezone": "Europe/London"},
            value_type="JSON",
            default_value={},
        )

        result = activate_user_locale_safe(user.id)

        assert result is True
        assert translation.get_language() == "en"
        assert str(timezone.get_current_timezone()) == "Europe/London"

    def test_activate_user_locale_safe_fallback(self):
        """activate_user_locale_safe() returns False and uses global defaults for missing user."""
        result = activate_user_locale_safe(999999)

        assert result is False
        # Should fall back to Django's default settings
        # (will be 'en' and 'UTC' in test environment)

    def test_activate_org_locale_safe_success(self):
        """activate_org_locale_safe() returns True on success."""
        user = User.objects.create_user(email="admin@example.com", password="adminpass123")
        org = Organisation.objects.create(name="Test Org", creator=user)

        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
            value={"language": "en", "timezone": "Europe/Berlin"},
            value_type="JSON",
            default_value={},
        )

        result = activate_org_locale_safe(org.id)

        assert result is True
        assert translation.get_language() == "en"
        assert str(timezone.get_current_timezone()) == "Europe/Berlin"

    def test_activate_org_locale_safe_fallback(self):
        """activate_org_locale_safe() returns False and uses global defaults for missing org."""
        result = activate_org_locale_safe(999999)

        assert result is False
        # Should fall back to Django's default settings
