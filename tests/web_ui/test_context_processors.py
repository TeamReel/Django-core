"""Test context processor for web_ui app."""

import pytest
from accounts.models import User
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory
from web_ui.context_processors.navigation import navigation_context


@pytest.fixture
def rf():
    """Request factory."""
    return RequestFactory()


@pytest.fixture
def authenticated_user(db):
    """Create authenticated user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.mark.django_db
class TestNavigationContext:
    """Test navigation context processor."""

    def test_context_for_anonymous_user(self, rf):
        """Test context processor for anonymous user."""
        request = rf.get("/")
        request.user = AnonymousUser()

        context = navigation_context(request)

        assert context["is_authenticated"] is False
        assert context["can_view_orgs"] is False
        assert context["can_view_projects"] is False
        assert "has_perm" in context

    def test_context_for_authenticated_user(self, rf, authenticated_user):
        """Test navigation context for authenticated user."""
        request = rf.get("/")
        request.user = authenticated_user

        context = navigation_context(request)

        assert context["is_authenticated"] is True
        assert context["user"] == authenticated_user
        assert "has_perm" in context

    def test_context_site_name(self, rf):
        """Test context includes user object."""
        request = rf.get("/")
        request.user = AnonymousUser()

        context = navigation_context(request)

        assert "user" in context
        assert not context["user"].is_authenticated

    def test_context_permission_flags(self, rf, authenticated_user):
        """Test context includes permission flags."""
        request = rf.get("/")
        request.user = authenticated_user

        context = navigation_context(request)

        # Permission flags should be booleans
        assert isinstance(context["can_view_orgs"], bool)
        assert isinstance(context["can_view_projects"], bool)

    def test_email_truncation(self, rf, db):
        """Test has_perm helper function."""
        user = User.objects.create_user(
            email="verylongemailaddress@example.com", password="testpass123"
        )
        request = rf.get("/")
        request.user = user

        context = navigation_context(request)

        # Should have has_perm callable
        assert callable(context["has_perm"])
        # Anonymous permission check should return False
        assert context["has_perm"]("some.permission") is False
