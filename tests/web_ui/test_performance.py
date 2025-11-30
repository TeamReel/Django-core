"""Performance tests for web_ui app."""

import time

import pytest
from django.contrib.auth.models import Permission
from django.test import Client, RequestFactory

from accounts.models import User
from organisations.models import Membership, Organisation
from projects.models import Project
from web_ui.context_processors.navigation import navigation_context


@pytest.fixture
def rf():
    """Request factory."""
    return RequestFactory()


@pytest.fixture
def client():
    """Django test client."""
    return Client()


@pytest.fixture
def authenticated_user(db):
    """Create authenticated user with permissions."""
    user = User.objects.create_user(email="test@example.com", password="testpass123")
    perms = Permission.objects.filter(codename__in=["view_organisation", "view_project"])
    user.user_permissions.set(perms)
    return user


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
class TestContextProcessorPerformance:
    """Test context processor performance."""

    def test_context_processor_execution_time(self, rf, authenticated_user):
        """Test context processor executes in under 5ms."""
        request = rf.get("/")
        request.user = authenticated_user

        # Warm up
        navigation_context(request)

        # Run 100 iterations
        start = time.perf_counter()
        for _ in range(100):
            navigation_context(request)
        end = time.perf_counter()

        avg_time_ms = ((end - start) / 100) * 1000

        # Should be under 5ms average
        assert (
            avg_time_ms < 5.0
        ), f"Context processor took {avg_time_ms:.2f}ms (target: <5ms)"


@pytest.mark.django_db
class TestViewPerformance:
    """Test view performance."""

    def test_home_view_performance(self, client, authenticated_user):
        """Test home view renders in under 100ms."""
        client.force_login(authenticated_user)

        # Warm up
        client.get("/ui/")

        # Measure
        start = time.perf_counter()
        response = client.get("/ui/")
        end = time.perf_counter()

        elapsed_ms = (end - start) * 1000

        assert response.status_code == 200
        assert elapsed_ms < 100.0, f"Home view took {elapsed_ms:.2f}ms (target: <100ms)"

    def test_organisations_list_performance(self, client, authenticated_user, organisation):
        """Test organisations list renders in under 100ms."""
        client.force_login(authenticated_user)

        # Warm up
        client.get("/ui/organisations/")

        # Measure
        start = time.perf_counter()
        response = client.get("/ui/organisations/")
        end = time.perf_counter()

        elapsed_ms = (end - start) * 1000

        assert response.status_code == 200
        assert (
            elapsed_ms < 100.0
        ), f"Organisations list took {elapsed_ms:.2f}ms (target: <100ms)"

    def test_projects_list_performance(self, client, authenticated_user, project):
        """Test projects list renders in under 100ms."""
        client.force_login(authenticated_user)

        # Warm up
        client.get("/ui/projects/")

        # Measure
        start = time.perf_counter()
        response = client.get("/ui/projects/")
        end = time.perf_counter()

        elapsed_ms = (end - start) * 1000

        assert response.status_code == 200
        assert (
            elapsed_ms < 100.0
        ), f"Projects list took {elapsed_ms:.2f}ms (target: <100ms)"
