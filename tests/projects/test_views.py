"""Tests for Project API views."""

import pytest
from django.urls import reverse
from src.organisations.models import Membership
from src.projects.models import Project
from rest_framework import status


@pytest.mark.django_db
class TestProjectListView:
    """Test project list API."""

    def test_list_projects_authenticated(self, authenticated_client, project):
        """Test listing projects as authenticated user."""
        url = reverse(
            "project-list",
            kwargs={"organisation_slug": project.organisation.slug},
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) >= 1

    def test_list_projects_unauthenticated(self, api_client, project):
        """Test listing projects requires authentication."""
        url = reverse(
            "project-list",
            kwargs={"organisation_slug": project.organisation.slug},
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_only_active_projects(self, authenticated_client, project, archived_project):
        """Test list only returns active projects by default."""
        url = reverse(
            "project-list",
            kwargs={"organisation_slug": project.organisation.slug},
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        project_ids = [p["id"] for p in response.data["results"]]
        assert project.id in project_ids
        assert archived_project.id not in project_ids

    def test_list_include_archived(self, authenticated_client, project, archived_project):
        """Test list includes archived when requested."""
        url = reverse(
            "project-list",
            kwargs={"organisation_slug": project.organisation.slug},
        )
        response = authenticated_client.get(url, {"include_archived": "true"})

        assert response.status_code == status.HTTP_200_OK
        project_ids = [p["id"] for p in response.data["results"]]
        assert project.id in project_ids
        assert archived_project.id in project_ids

    def test_list_pagination(self, authenticated_client, project_factory, organisation, admin_user):
        """Test project list pagination."""
        # Create multiple projects
        for i in range(15):
            project_factory(
                organisation=organisation,
                creator=admin_user,
                name=f"Project {i}",
            )

        url = reverse(
            "project-list",
            kwargs={"organisation_slug": organisation.slug},
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert "next" in response.data or "previous" in response.data

    def test_list_non_member_forbidden(self, api_client, user_factory, organisation, project):
        """Test non-members cannot list organisation projects."""
        non_member = user_factory(email="nonmember@example.com")
        api_client.force_authenticate(user=non_member)

        url = reverse(
            "project-list",
            kwargs={"organisation_slug": organisation.slug},
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestProjectCreateView:
    """Test project creation API."""

    def test_create_project_success(self, authenticated_client, organisation):
        """Test creating a project as admin."""
        url = reverse(
            "project-list",
            kwargs={"organisation_slug": organisation.slug},
        )
        data = {
            "name": "New Project",
            "description": "Test project creation",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Project"
        assert "slug" in response.data
        assert Project.objects.filter(name="New Project").exists()

    def test_create_project_generates_slug(self, authenticated_client, organisation):
        """Test slug is auto-generated from name."""
        url = reverse(
            "project-list",
            kwargs={"organisation_slug": organisation.slug},
        )
        data = {"name": "My Awesome Project"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "my-awesome-project"

    def test_create_project_duplicate_name_fails(self, authenticated_client, project):
        """Test creating project with duplicate name fails."""
        url = reverse(
            "project-list",
            kwargs={"organisation_slug": project.organisation.slug},
        )
        data = {"name": project.name}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in response.data

    def test_create_project_member_forbidden(self, member_client, organisation):
        """Test regular members cannot create projects."""
        url = reverse(
            "project-list",
            kwargs={"organisation_slug": organisation.slug},
        )
        data = {"name": "New Project"}
        response = member_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_project_non_member_forbidden(self, api_client, user_factory, organisation):
        """Test non-members cannot create projects."""
        non_member = user_factory(email="nonmember@example.com")
        api_client.force_authenticate(user=non_member)

        url = reverse(
            "project-list",
            kwargs={"organisation_slug": organisation.slug},
        )
        data = {"name": "New Project"}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_project_unauthenticated(self, api_client, organisation):
        """Test unauthenticated users cannot create projects."""
        url = reverse(
            "project-list",
            kwargs={"organisation_slug": organisation.slug},
        )
        data = {"name": "New Project"}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestProjectRetrieveView:
    """Test project detail retrieval API."""

    def test_retrieve_project_success(self, authenticated_client, project):
        """Test retrieving a project."""
        url = reverse(
            "project-detail",
            kwargs={
                "organisation_slug": project.organisation.slug,
                "id": project.id,
            },
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == project.id
        assert response.data["name"] == project.name
        assert "creator" in response.data
        assert "organisation" in response.data

    def test_retrieve_project_not_found(self, authenticated_client, organisation):
        """Test retrieving non-existent project."""
        url = reverse(
            "project-detail",
            kwargs={
                "organisation_slug": organisation.slug,
                "id": 99999,
            },
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_archived_project_not_found(self, authenticated_client, archived_project):
        """Test archived projects not returned by default."""
        url = reverse(
            "project-detail",
            kwargs={
                "organisation_slug": archived_project.organisation.slug,
                "id": archived_project.id,
            },
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_non_member_forbidden(self, api_client, user_factory, project):
        """Test non-members cannot retrieve project."""
        non_member = user_factory(email="nonmember@example.com")
        api_client.force_authenticate(user=non_member)

        url = reverse(
            "project-detail",
            kwargs={
                "organisation_slug": project.organisation.slug,
                "id": project.id,
            },
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestProjectUpdateView:
    """Test project update API."""

    def test_update_project_name(self, authenticated_client, project):
        """Test updating project name."""
        url = reverse(
            "project-detail",
            kwargs={
                "organisation_slug": project.organisation.slug,
                "id": project.id,
            },
        )
        data = {"name": "Updated Project Name"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Project Name"
        project.refresh_from_db()
        assert project.name == "Updated Project Name"

    def test_update_project_description(self, authenticated_client, project):
        """Test updating project description."""
        url = reverse(
            "project-detail",
            kwargs={
                "organisation_slug": project.organisation.slug,
                "id": project.id,
            },
        )
        data = {"description": "Updated description"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["description"] == "Updated description"

    def test_update_project_slug_readonly(self, authenticated_client, project):
        """Test slug cannot be updated."""
        url = reverse(
            "project-detail",
            kwargs={
                "organisation_slug": project.organisation.slug,
                "id": project.id,
            },
        )
        original_slug = project.slug
        data = {"slug": "new-slug"}
        response = authenticated_client.patch(url, data, format="json")

        # Should succeed but slug unchanged
        assert response.status_code == status.HTTP_200_OK
        project.refresh_from_db()
        assert project.slug == original_slug

    def test_update_project_member_forbidden(self, member_client, project):
        """Test regular members cannot update projects."""
        url = reverse(
            "project-detail",
            kwargs={
                "organisation_slug": project.organisation.slug,
                "id": project.id,
            },
        )
        data = {"name": "Updated Name"}
        response = member_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_archived_project_fails(self, authenticated_client, archived_project):
        """Test cannot update archived project."""
        url = reverse(
            "project-detail",
            kwargs={
                "organisation_slug": archived_project.organisation.slug,
                "id": archived_project.id,
            },
        )
        data = {"name": "Updated Name"}
        response = authenticated_client.patch(url, data, format="json")

        # Archived projects not in default queryset
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestProjectArchiveRestoreView:
    """Test project archive and restore actions."""

    def test_archive_project_success(self, authenticated_client, project):
        """Test archiving a project."""
        url = reverse(
            "project-archive",
            kwargs={
                "organisation_slug": project.organisation.slug,
                "id": project.id,
            },
        )
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        project.refresh_from_db()
        assert project.is_active is False
        assert project.archived_at is not None

    def test_restore_project_success(self, authenticated_client, archived_project):
        """Test restoring an archived project."""
        url = reverse(
            "project-restore",
            kwargs={
                "organisation_slug": archived_project.organisation.slug,
                "id": archived_project.id,
            },
        )
        # Need include_archived to access archived project
        response = authenticated_client.post(f"{url}?include_archived=true")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        archived_project.refresh_from_db()
        assert archived_project.is_active is True
        assert archived_project.archived_at is None

    def test_archive_already_archived(self, authenticated_client, archived_project):
        """Test archiving an already archived project."""
        url = reverse(
            "project-archive",
            kwargs={
                "organisation_slug": archived_project.organisation.slug,
                "id": archived_project.id,
            },
        )
        response = authenticated_client.post(f"{url}?include_archived=true")

        # Should succeed (idempotent)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_restore_already_active(self, authenticated_client, project):
        """Test restoring an already active project."""
        url = reverse(
            "project-restore",
            kwargs={
                "organisation_slug": project.organisation.slug,
                "id": project.id,
            },
        )
        response = authenticated_client.post(url)

        # Should succeed (idempotent)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_archive_member_forbidden(self, member_client, project):
        """Test regular members cannot archive projects."""
        url = reverse(
            "project-archive",
            kwargs={
                "organisation_slug": project.organisation.slug,
                "id": project.id,
            },
        )
        response = member_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_restore_member_forbidden(self, member_client, archived_project):
        """Test regular members cannot restore projects."""
        url = reverse(
            "project-restore",
            kwargs={
                "organisation_slug": archived_project.organisation.slug,
                "id": archived_project.id,
            },
        )
        response = member_client.post(f"{url}?include_archived=true")

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestTopLevelProjectRoutes:
    """Test top-level (non-nested) project routes."""

    def test_list_projects_top_level(self, authenticated_client, project):
        """Test listing projects via top-level route."""
        url = reverse("project-list-top-level")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_retrieve_project_top_level(self, authenticated_client, project):
        """Test retrieving project via top-level route."""
        url = reverse("project-detail-top-level", kwargs={"id": project.id})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == project.id

    def test_top_level_filters_by_user_organisations(
        self, api_client, user_factory, organisation_factory, project_factory
    ):
        """Test top-level route only shows projects from user's organisations."""
        user1 = user_factory(email="user1@example.com")
        user2 = user_factory(email="user2@example.com")

        org1 = organisation_factory(name="Org 1", creator=user1)
        org2 = organisation_factory(name="Org 2", creator=user2)

        # user1 is member of org1
        Membership.objects.create(organisation=org1, user=user1, role="admin")

        # Create projects in both orgs
        proj1 = project_factory(organisation=org1, creator=user1)
        proj2 = project_factory(organisation=org2, creator=user2)

        # user1 should only see org1 projects
        api_client.force_authenticate(user=user1)
        url = reverse("project-list-top-level")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        project_ids = [p["id"] for p in response.data["results"]]
        assert proj1.id in project_ids
        assert proj2.id not in project_ids
