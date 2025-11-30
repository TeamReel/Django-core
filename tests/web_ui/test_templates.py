"""Test template rendering for web_ui app."""

import pytest
from accounts.models import User
from django.contrib.auth.models import AnonymousUser
from django.contrib.messages.storage.fallback import FallbackStorage
from django.template.loader import render_to_string
from django.test import RequestFactory


@pytest.fixture
def rf():
    """Request factory."""
    return RequestFactory()


@pytest.fixture
def authenticated_user(db):
    """Create authenticated user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.mark.django_db
class TestBaseTemplate:
    """Test base.html template."""

    def test_base_template_renders(self, rf):
        """Test base template renders without errors."""
        request = rf.get("/")
        request.user = AnonymousUser()

        html = render_to_string("web_ui/base/base.html", request=request)

        assert "<!DOCTYPE html>" in html
        assert '<html lang="en">' in html
        assert "<header" in html
        assert "<nav" in html
        assert "<main" in html
        assert "<footer" in html

    def test_base_template_has_site_name(self, rf):
        """Test base template includes site name."""
        request = rf.get("/")
        request.user = AnonymousUser()

        html = render_to_string("web_ui/base/base.html", request=request)

        assert "Django Core" in html or "{{ site_name }}" in html

    def test_base_template_for_authenticated_user(self, rf, authenticated_user):
        """Test base template for authenticated user."""
        request = rf.get("/")
        request.user = authenticated_user

        html = render_to_string("web_ui/base/base.html", request=request)

        assert authenticated_user.email[:20] in html or "test@example.com" in html


@pytest.mark.django_db
class TestNavigationComponent:
    """Test navigation.html component."""

    def test_navigation_for_anonymous_user(self, rf):
        """Test navigation shows login/register for anonymous users."""
        request = rf.get("/")
        request.user = AnonymousUser()

        html = render_to_string("web_ui/components/navigation.html", request=request)

        assert "Login" in html or "login" in html.lower()

    def test_navigation_for_authenticated_user(self, rf, authenticated_user):
        """Test navigation shows user info for authenticated users."""
        request = rf.get("/")
        request.user = authenticated_user

        html = render_to_string("web_ui/components/navigation.html", request=request)

        assert authenticated_user.email[:20] in html


@pytest.mark.django_db
class TestMessagesComponent:
    """Test messages.html component."""

    def test_messages_component_renders_empty(self, rf):
        """Test messages component renders when no messages."""
        request = rf.get("/")
        request.user = AnonymousUser()
        request.session = "session"
        messages = FallbackStorage(request)
        request._messages = messages

        html = render_to_string("web_ui/components/messages.html", request=request)

        # Should render without errors even with no messages
        assert html is not None


@pytest.mark.django_db
class TestFormComponents:
    """Test form component templates."""

    def test_form_layout_renders(self, rf):
        """Test form_layout component renders."""
        from django import forms

        class TestForm(forms.Form):
            name = forms.CharField()

        request = rf.get("/")
        form = TestForm()

        html = render_to_string(
            "web_ui/components/form_layout.html",
            {"form": form, "submit_text": "Submit"},
            request=request,
        )

        assert "form" in html.lower()
        assert "submit" in html.lower()
        assert "csrf" in html.lower() or "csrfmiddlewaretoken" in html.lower()


@pytest.mark.django_db
class TestAuthTemplates:
    """Test authentication template overrides."""

    def test_login_template_extends_base(self, rf):
        """Test login template extends base."""
        request = rf.get("/")
        request.user = AnonymousUser()

        html = render_to_string("accounts/login.html", request=request)

        assert "<!DOCTYPE html>" in html
        assert "login" in html.lower()

    def test_register_template_extends_base(self, rf):
        """Test register template extends base."""
        request = rf.get("/")
        request.user = AnonymousUser()

        html = render_to_string("accounts/register.html", request=request)

        assert "<!DOCTYPE html>" in html
        assert "register" in html.lower() or "create account" in html.lower()
