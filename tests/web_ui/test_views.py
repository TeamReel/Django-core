"""Test views for web_ui app."""

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
    """Create authenticated user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.fixture
def organisation(db, authenticated_user):
    """Create test organisation."""
    org = Organisation.objects.create(name="Test Org", description="Test Description")
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
class TestHomeView:
    """Test home view."""

    def test_home_view_anonymous(self, client):
        """Test home view for anonymous user."""
        response = client.get(reverse("web_ui:ui_home"))

        assert response.status_code == 200
        assert b"welcome" in response.content.lower() or b"home" in response.content.lower()

    def test_home_view_authenticated(self, client, authenticated_user):
        """Test home view for authenticated user."""
        client.force_login(authenticated_user)
        response = client.get(reverse("web_ui:ui_home"))

        assert response.status_code == 200


@pytest.mark.django_db
class TestOrganisationsViews:
    """Test organisations views."""

    def test_organisations_list_requires_login(self, client):
        """Test organisations list redirects anonymous users."""
        response = client.get(reverse("web_ui:ui_organisations_list"))

        assert response.status_code == 302  # Redirect to login

    def test_organisations_list_with_permission(self, client, authenticated_user, organisation):
        """Test organisations list for user with permission."""
        # Grant permission
        from django.contrib.auth.models import Permission

        perm = Permission.objects.get(codename="view_organisation")
        authenticated_user.user_permissions.add(perm)

        client.force_login(authenticated_user)
        response = client.get(reverse("web_ui:ui_organisations_list"))

        assert response.status_code == 200
        assert organisation.name.encode() in response.content

    def test_organisations_detail_requires_login(self, client, organisation):
        """Test organisation detail redirects anonymous users."""
        response = client.get(reverse("web_ui:ui_organisations_detail", args=[organisation.pk]))

        assert response.status_code == 302  # Redirect to login

    def test_organisations_detail_with_permission(self, client, authenticated_user, organisation):
        """Test organisation detail for user with permission."""
        from django.contrib.auth.models import Permission

        perm = Permission.objects.get(codename="view_organisation")
        authenticated_user.user_permissions.add(perm)

        client.force_login(authenticated_user)
        response = client.get(reverse("web_ui:ui_organisations_detail", args=[organisation.pk]))

        assert response.status_code == 200
        assert organisation.name.encode() in response.content


@pytest.mark.django_db
class TestProjectsViews:
    """Test projects views."""

    def test_projects_list_requires_login(self, client):
        """Test projects list redirects anonymous users."""
        response = client.get(reverse("web_ui:ui_projects_list"))

        assert response.status_code == 302  # Redirect to login

    def test_projects_list_with_permission(self, client, authenticated_user, project):
        """Test projects list for user with permission."""
        from django.contrib.auth.models import Permission

        perm = Permission.objects.get(codename="view_project")
        authenticated_user.user_permissions.add(perm)

        client.force_login(authenticated_user)
        response = client.get(reverse("web_ui:ui_projects_list"))

        assert response.status_code == 200
        assert project.name.encode() in response.content

    def test_projects_detail_requires_login(self, client, project):
        """Test project detail redirects anonymous users."""
        response = client.get(reverse("web_ui:ui_projects_detail", args=[project.pk]))

        assert response.status_code == 302  # Redirect to login

    def test_projects_detail_with_permission(self, client, authenticated_user, project):
        """Test project detail for user with permission."""
        from django.contrib.auth.models import Permission

        perm = Permission.objects.get(codename="view_project")
        authenticated_user.user_permissions.add(perm)

        client.force_login(authenticated_user)
        response = client.get(reverse("web_ui:ui_projects_detail", args=[project.pk]))

        assert response.status_code == 200
        assert project.name.encode() in response.content


@pytest.mark.django_db
class TestAccountViews:
    """Test account views."""

    def test_account_profile_requires_login(self, client):
        """Test account profile redirects anonymous users."""
        response = client.get(reverse("web_ui:ui_account_profile"))

        assert response.status_code == 302  # Redirect to login

    def test_account_profile_authenticated(self, client, authenticated_user):
        """Test account profile for authenticated user."""
        client.force_login(authenticated_user)
        response = client.get(reverse("web_ui:ui_account_profile"))

        assert response.status_code == 200
        assert authenticated_user.email.encode() in response.content
