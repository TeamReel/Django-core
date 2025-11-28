"""
Test suite for WP03: Project Creation & Listing API

Tests cover:
- T015-T016: Serializers with validation
- T017: ViewSet CRUD operations
- T018: Pagination and query optimization
- T019: Dual routing (nested and top-level)
- T020: Permissions (member-read, admin-write)
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from organisations.models import Membership, Organisation
from projects.models import Project
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """API client for testing."""
    return APIClient()


@pytest.fixture
def org_creator():
    """Creator user for organisation."""
    return User.objects.create_user(
        email="creator@example.com",
        password="testpass123",
        first_name="Creator",
        last_name="User",
    )


@pytest.fixture
def org(org_creator):
    """Test organisation."""
    return Organisation.objects.create(
        name="Test Org",
        slug="test-org",
        description="Test organisation",
        creator=org_creator,
    )


@pytest.fixture
def admin_user(org):
    """Admin user with organisation membership."""
    user = User.objects.create_user(
        email="admin@example.com",
        password="testpass123",
        first_name="Admin",
        last_name="User",
    )
    Membership.objects.create(
        organisation=org,
        user=user,
        role="admin",
    )
    return user


@pytest.fixture
def member_user(org):
    """Member user with organisation membership."""
    user = User.objects.create_user(
        email="member@example.com",
        password="testpass123",
        first_name="Member",
        last_name="User",
    )
    Membership.objects.create(
        organisation=org,
        user=user,
        role="member",
    )
    return user


@pytest.fixture
def project(org, admin_user):
    """Test project."""
    return Project.objects.create(
        organisation=org,
        creator=admin_user,
        name="Test Project",
        slug="test-project",
        description="Test project description",
    )


@pytest.mark.django_db
class TestProjectListSerializer:
    """Test ProjectListSerializer."""

    def test_list_serializer_fields(self, api_client, admin_user, org, project):
        """Test list serializer includes correct fields."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("project-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 1

        project_data = response.data["results"][0]
        assert "id" in project_data
        assert "organisation" in project_data
        assert "name" in project_data
        assert "slug" in project_data
        assert "description" in project_data
        assert "is_active" in project_data
        assert "created_at" in project_data
        assert "updated_at" in project_data
        # List serializer should NOT include creator
        assert "creator" not in project_data


@pytest.mark.django_db
class TestProjectDetailSerializer:
    """Test ProjectDetailSerializer."""

    def test_detail_serializer_includes_creator(self, api_client, admin_user, project):
        """Test detail serializer includes creator with nested fields."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("project-detail", kwargs={"id": project.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "creator" in response.data
        assert response.data["creator"]["id"] == admin_user.id
        assert response.data["creator"]["email"] == admin_user.email
        assert response.data["creator"]["first_name"] == admin_user.first_name
        assert response.data["creator"]["last_name"] == admin_user.last_name
        assert "full_name" in response.data["creator"]
        assert response.data["creator"]["full_name"] == "Admin User"

    def test_name_validation_too_short(self, api_client, admin_user, org):
        """Test name validation rejects empty strings."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("organisation-projects-list", kwargs={"organisation_id": org.id})
        response = api_client.post(url, {"name": "   ", "description": "Test"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in response.data

    def test_name_validation_too_long(self, api_client, admin_user, org):
        """Test name validation rejects strings over 200 characters."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("organisation-projects-list", kwargs={"organisation_id": org.id})
        response = api_client.post(url, {"name": "x" * 201, "description": "Test"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in response.data

    def test_description_validation_too_long(self, api_client, admin_user, org):
        """Test description validation rejects strings over 2000 characters."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("organisation-projects-list", kwargs={"organisation_id": org.id})
        response = api_client.post(url, {"name": "Valid Name", "description": "x" * 2001})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "description" in response.data

    def test_case_insensitive_name_uniqueness(self, api_client, admin_user, org, project):
        """Test case-insensitive name uniqueness within organisation."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("organisation-projects-list", kwargs={"organisation_id": org.id})
        # Try to create project with same name but different case
        response = api_client.post(url, {"name": "TEST PROJECT", "description": "Test"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in response.data


@pytest.mark.django_db
class TestProjectViewSet:
    """Test ProjectViewSet CRUD operations."""

    def test_create_project(self, api_client, admin_user, org):
        """Test creating a project via API."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("organisation-projects-list", kwargs={"organisation_id": org.id})
        data = {"name": "New Project", "description": "New project description"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Project"
        assert response.data["slug"] == "new-project"
        assert response.data["description"] == "New project description"
        assert response.data["is_active"] is True
        assert response.data["creator"]["id"] == admin_user.id

    def test_create_project_requires_organisation_id(self, api_client, admin_user):
        """Test creating a project requires organisation_id in nested route."""
        api_client.force_authenticate(user=admin_user)
        # This should fail as top-level create is not supported
        url = reverse("project-list")
        data = {"name": "New Project", "description": "Test"}

        response = api_client.post(url, data)

        # Should fail because no organisation context
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_projects_top_level(self, api_client, admin_user, project):
        """Test listing projects via top-level route."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("project-list")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == project.id

    def test_list_projects_nested(self, api_client, admin_user, org, project):
        """Test listing projects via nested route."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("organisation-projects-list", kwargs={"organisation_id": org.id})

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 1

    def test_retrieve_project(self, api_client, admin_user, project):
        """Test retrieving a single project."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("project-detail", kwargs={"id": project.id})

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == project.id
        assert response.data["name"] == project.name
        assert "creator" in response.data

    def test_update_project(self, api_client, admin_user, project):
        """Test updating a project."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("project-detail", kwargs={"id": project.id})
        original_slug = project.slug
        data = {"name": "Updated Name", "description": "Updated description"}

        response = api_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Name"
        assert response.data["description"] == "Updated description"
        # Verify slug is unchanged in database
        project.refresh_from_db()
        assert project.slug == original_slug

    def test_archive_project(self, api_client, admin_user, project):
        """Test archiving a project."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("project-archive", kwargs={"id": project.id})

        response = api_client.post(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify project is archived
        project.refresh_from_db()
        assert project.is_active is False

    def test_restore_project(self, api_client, admin_user, project):
        """Test restoring an archived project."""
        # First archive the project
        project.archive()

        api_client.force_authenticate(user=admin_user)
        url = reverse("project-restore", kwargs={"id": project.id})

        response = api_client.post(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify project is restored
        project.refresh_from_db()
        assert project.is_active is True

    def test_archive_already_archived_project(self, api_client, admin_user, project):
        """Test archiving an already archived project returns 400."""
        # First archive the project
        project.archive()

        api_client.force_authenticate(user=admin_user)
        url = reverse("project-archive", kwargs={"id": project.id})

        response = api_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already archived" in response.data["detail"].lower()

    def test_restore_already_active_project(self, api_client, admin_user, project):
        """Test restoring an already active project returns 400."""
        # Project is already active (default state)
        api_client.force_authenticate(user=admin_user)
        url = reverse("project-restore", kwargs={"id": project.id})

        response = api_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already active" in response.data["detail"].lower()


@pytest.mark.django_db
class TestProjectPagination:
    """Test ProjectCursorPagination."""

    def test_pagination_default_page_size(self, api_client, admin_user, org):
        """Test default page size is 50."""
        # Create 60 projects
        for i in range(60):
            Project.objects.create(
                organisation=org,
                creator=admin_user,
                name=f"Project {i}",
                slug=f"project-{i}",
            )

        api_client.force_authenticate(user=admin_user)
        url = reverse("project-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 50
        assert response.data["next"] is not None

    def test_pagination_custom_page_size(self, api_client, admin_user, org):
        """Test custom page size."""
        # Create 30 projects
        for i in range(30):
            Project.objects.create(
                organisation=org,
                creator=admin_user,
                name=f"Project {i}",
                slug=f"project-{i}",
            )

        api_client.force_authenticate(user=admin_user)
        url = reverse("project-list")
        response = api_client.get(url, {"page_size": 10})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 10


@pytest.mark.django_db
class TestProjectQueryFilters:
    """Test query parameter filters."""

    def test_include_archived_filter(self, api_client, admin_user, org):
        """Test include_archived query parameter."""
        # Create active and archived projects
        active = Project.objects.create(
            organisation=org,
            creator=admin_user,
            name="Active Project",
            slug="active-project",
        )
        archived = Project.objects.create(
            organisation=org,
            creator=admin_user,
            name="Archived Project",
            slug="archived-project",
        )
        archived.archive()

        api_client.force_authenticate(user=admin_user)
        url = reverse("project-list")

        # Without include_archived, only active projects
        response = api_client.get(url)
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == active.id

        # With include_archived, both projects
        response = api_client.get(url, {"include_archived": "true"})
        assert len(response.data["results"]) == 2

    def test_search_filter(self, api_client, admin_user, org):
        """Test search query parameter."""
        Project.objects.create(
            organisation=org,
            creator=admin_user,
            name="Django Project",
            slug="django-project",
        )
        Project.objects.create(
            organisation=org,
            creator=admin_user,
            name="React Project",
            slug="react-project",
        )

        api_client.force_authenticate(user=admin_user)
        url = reverse("project-list")

        # Search for "django"
        response = api_client.get(url, {"search": "django"})
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Django Project"


@pytest.mark.django_db
class TestProjectPermissions:
    """Test IsOrganisationMemberOrAdmin permissions."""

    def test_member_can_read(self, api_client, member_user, project):
        """Test organisation member can read projects."""
        api_client.force_authenticate(user=member_user)
        url = reverse("project-detail", kwargs={"id": project.id})

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_member_cannot_create(self, api_client, member_user, org):
        """Test organisation member cannot create projects."""
        api_client.force_authenticate(user=member_user)
        url = reverse("organisation-projects-list", kwargs={"organisation_id": org.id})
        data = {"name": "New Project", "description": "Test"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_member_cannot_update(self, api_client, member_user, project):
        """Test organisation member cannot update projects."""
        api_client.force_authenticate(user=member_user)
        url = reverse("project-detail", kwargs={"id": project.id})
        data = {"name": "Updated Name"}

        response = api_client.patch(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_create(self, api_client, admin_user, org):
        """Test organisation admin can create projects."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("organisation-projects-list", kwargs={"organisation_id": org.id})
        data = {"name": "New Project", "description": "Test"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED

    def test_admin_can_update(self, api_client, admin_user, project):
        """Test organisation admin can update projects."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("project-detail", kwargs={"id": project.id})
        data = {"name": "Updated Name"}

        response = api_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK

    def test_unauthenticated_cannot_access(self, api_client, project):
        """Test unauthenticated users cannot access projects."""
        url = reverse("project-detail", kwargs={"id": project.id})

        response = api_client.get(url)

        # DRF returns 403 for unauthenticated requests by default
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_non_member_cannot_access(self, api_client, org):
        """Test non-member users cannot access organisation projects via nested route."""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="testpass123",
        )
        api_client.force_authenticate(user=other_user)
        # Use the nested list route which checks organisation membership
        url = reverse(
            "organisation-projects-list",
            kwargs={"organisation_id": org.id},
        )

        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
