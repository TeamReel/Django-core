"""Integration tests for web_ui app."""

import pytest
from accounts.models import User
from django.test import Client
from django.urls import reverse
from organisations.models import Organisation
from projects.models import Project


@pytest.fixture
def client():
    """Django test client."""
    return Client()


@pytest.fixture
def authenticated_user(db):
    """Create authenticated user with permissions."""
    from django.contrib.auth.models import Permission

    user = User.objects.create_user(email="test@example.com", password="testpass123")

    # Grant necessary permissions
    perms = Permission.objects.filter(codename__in=["view_organisation", "view_project"])
    user.user_permissions.set(perms)

    return user


@pytest.fixture
def organisation(db, authenticated_user):
    """Create test organisation."""
    org = Organisation.objects.create(
        name="Test Org", description="Test Description", creator=authenticated_user
    )
    org.members.add(authenticated_user)
    return org


@pytest.fixture
def project(db, organisation, authenticated_user):
    """Create test project."""
    return Project.objects.create(
        name="Test Project",
        description="Test Description",
        organisation=organisation,
        owner=authenticated_user,
    )


@pytest.mark.django_db
class TestAuthenticationFlow:
    """Test complete authentication flow."""

    def test_login_flow(self, client, authenticated_user):
        """Test login → home with user context."""
        # Login
        client.force_login(authenticated_user)

        # Visit home
        response = client.get(reverse("web_ui:ui_home"))

        assert response.status_code == 200
        assert authenticated_user.email.encode() in response.content

    def test_logout_redirect(self, client, authenticated_user):
        """Test logout redirects correctly."""
        client.force_login(authenticated_user)

        # Logout
        response = client.post(reverse("accounts:logout"))

        assert response.status_code == 302  # Redirect after logout


@pytest.mark.django_db
class TestNavigationFlow:
    """Test navigation between pages."""

    def test_home_to_organisations(self, client, authenticated_user, organisation):
        """Test navigation from home to organisations."""
        client.force_login(authenticated_user)

        # Start at home
        response = client.get(reverse("web_ui:ui_home"))
        assert response.status_code == 200

        # Navigate to organisations
        response = client.get(reverse("web_ui:ui_organisations_list"))
        assert response.status_code == 200
        assert organisation.name.encode() in response.content

    def test_home_to_projects(self, client, authenticated_user, project):
        """Test navigation from home to projects."""
        client.force_login(authenticated_user)

        # Start at home
        response = client.get(reverse("web_ui:ui_home"))
        assert response.status_code == 200

        # Navigate to projects
        response = client.get(reverse("web_ui:ui_projects_list"))
        assert response.status_code == 200
        assert project.name.encode() in response.content

    def test_organisations_to_detail(self, client, authenticated_user, organisation):
        """Test navigation from list to detail."""
        client.force_login(authenticated_user)

        # Start at organisations list
        response = client.get(reverse("web_ui:ui_organisations_list"))
        assert response.status_code == 200

        # Navigate to organisation detail
        response = client.get(reverse("web_ui:ui_organisations_detail", args=[organisation.pk]))
        assert response.status_code == 200
        assert organisation.name.encode() in response.content

    def test_projects_to_detail(self, client, authenticated_user, project):
        """Test navigation from list to detail."""
        client.force_login(authenticated_user)

        # Start at projects list
        response = client.get(reverse("web_ui:ui_projects_list"))
        assert response.status_code == 200

        # Navigate to project detail
        response = client.get(reverse("web_ui:ui_projects_detail", args=[project.pk]))
        assert response.status_code == 200
        assert project.name.encode() in response.content
