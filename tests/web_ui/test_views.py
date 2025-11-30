"""Test views for web_ui app."""

import pytest
from django.contrib.auth.models import Permission
from django.test import Client

from accounts.models import User
from organisations.models import Membership, Organisation
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
    org = Organisation.objects.create(
        name="Test Org", description="Test Description", creator=authenticated_user
    )
    Membership.objects.create(user=authenticated_user, organisation=org, role="member")
    return org


@pytest.fixture
def project(db, organisation, authenticated_user):
    """Create test project."""
    return Project.objects.create(
        name="Test Project",
        description="Test Description",
        organisation=organisation,
        creator=authenticated_user,
    )


@pytest.mark.django_db
class TestHomeView:
    """Test home view."""

    def test_home_view_anonymous(self, client):
        """Test home view for anonymous user."""
        response = client.get("/ui/")

        assert response.status_code == 200

    def test_home_view_authenticated(self, client, authenticated_user):
        """Test home view for authenticated user."""
        client.force_login(authenticated_user)
        response = client.get("/ui/")

        assert response.status_code == 200


@pytest.mark.django_db
class TestOrganisationsViews:
    """Test organisations views."""

    def test_organisations_list_requires_login(self, client):
        """Test organisations list requires login."""
        response = client.get("/ui/organisations/")

        assert response.status_code == 302  # Redirect to login

    def test_organisations_list_with_permission(self, client, authenticated_user, organisation):
        """Test organisations list with permission."""
        client.force_login(authenticated_user)
        perm = Permission.objects.get(codename="view_organisation")
        authenticated_user.user_permissions.add(perm)

        response = client.get("/ui/organisations/")

        assert response.status_code == 200


@pytest.mark.django_db
class TestProjectsViews:
    """Test projects views."""

    def test_projects_list_requires_login(self, client):
        """Test projects list requires login."""
        response = client.get("/ui/projects/")

        assert response.status_code == 302  # Redirect to login

    def test_projects_list_with_permission(self, client, authenticated_user, project):
        """Test projects list with permission."""
        client.force_login(authenticated_user)
        perm = Permission.objects.get(codename="view_project")
        authenticated_user.user_permissions.add(perm)

        response = client.get("/ui/projects/")

        assert response.status_code == 200


@pytest.mark.django_db
class TestAccountViews:
    """Test account views."""

    def test_account_profile_requires_login(self, client):
        """Test account profile requires login."""
        response = client.get("/ui/account/profile/")

        assert response.status_code == 302  # Redirect to login

    def test_account_profile_authenticated(self, client, authenticated_user):
        """Test account profile for authenticated user."""
        client.force_login(authenticated_user)

        response = client.get("/ui/account/profile/")

        assert response.status_code == 200
