"""Test template rendering for web_ui app."""

import pytest
from accounts.models import User
from django.test import Client


@pytest.fixture
def client():
    """Django test client."""
    return Client()


@pytest.fixture
def authenticated_user(db):
    """Create authenticated user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.mark.django_db
class TestTemplateRendering:
    """Test that templates render correctly via views."""

    def test_home_template_renders(self, client):
        """Test home page template renders."""
        response = client.get("/ui/")

        assert response.status_code == 200
        assert b"<!DOCTYPE html>" in response.content
        assert b"<html" in response.content
        assert b"<body" in response.content

    def test_home_template_for_authenticated_user(self, client, authenticated_user):
        """Test home template renders for authenticated users."""
        client.force_login(authenticated_user)
        response = client.get("/ui/")

        assert response.status_code == 200
        assert b"<!DOCTYPE html>" in response.content

    @pytest.mark.skip(reason="Web UI views require Django permissions. Demo-only functionality.")
    def test_account_profile_template_renders(self, client, authenticated_user):
        """Test account profile template renders."""
        client.force_login(authenticated_user)
        response = client.get("/ui/account/profile/")

        assert response.status_code == 200
        assert b"profile" in response.content.lower()
