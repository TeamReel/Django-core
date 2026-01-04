import pytest
from django.urls import reverse
from rest_framework import status
from projects.models import ProjectMembership


@pytest.fixture
def project_membership(project, admin_user):
    """Create a membership for the authenticated user."""
    return ProjectMembership.objects.create(
        project=project, user=admin_user, role=ProjectMembership.Role.ADMIN
    )


@pytest.mark.django_db
class TestProjectMembershipAPI:
    """Test project membership API."""

    def test_list_members(self, authenticated_client, project, project_membership):
        """Test listing members of a project."""
        # project_membership fixture ensures the authenticated user is a member (owner/admin usually)
        # We need to make sure we are querying the right project

        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project.id},
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Handle pagination or list
        if isinstance(response.data, dict) and "results" in response.data:
            results = response.data["results"]
        else:
            results = response.data

        assert len(results) >= 1

        # Check if the user is in the list
        # User is nested, so we check m["user"]["id"]
        user_ids = []
        for m in results:
            if isinstance(m.get("user"), dict):
                user_ids.append(str(m["user"]["id"]))
            else:
                print(f"Unexpected user format: {m.get('user')}")

        assert str(project_membership.user.id) in user_ids

    def test_add_member(self, authenticated_client, project, user_factory):
        """Test adding a member to a project."""
        new_user = user_factory()

        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "user_id": str(new_user.id),
            "role": ProjectMembership.Role.VIEWER,
        }

        response = authenticated_client.post(url, data)

        if response.status_code != status.HTTP_201_CREATED:
            print(f"Add member failed: {response.data}")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["role"] == ProjectMembership.Role.VIEWER
        assert str(response.data["user"]["id"]) == str(new_user.id)

        # Verify DB
        assert ProjectMembership.objects.filter(project=project, user=new_user).exists()

    def test_update_member_role(self, authenticated_client, project, user_factory):
        """Test updating a member's role."""
        # Create a member first
        user = user_factory()
        membership = ProjectMembership.objects.create(
            project=project, user=user, role=ProjectMembership.Role.VIEWER
        )

        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": membership.id},
        )
        data = {
            "role": ProjectMembership.Role.EDITOR,
        }

        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["role"] == ProjectMembership.Role.EDITOR

        membership.refresh_from_db()
        assert membership.role == ProjectMembership.Role.EDITOR

    def test_remove_member(self, authenticated_client, project, user_factory):
        """Test removing a member."""
        user = user_factory()
        membership = ProjectMembership.objects.create(
            project=project, user=user, role=ProjectMembership.Role.VIEWER
        )

        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": membership.id},
        )

        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        assert not ProjectMembership.objects.filter(pk=membership.id).exists()

    def test_add_existing_member_fails(self, authenticated_client, project, project_membership):
        """Test adding an existing member fails."""
        user = project_membership.user

        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "user_id": str(user.id),
            "role": ProjectMembership.Role.VIEWER,
        }

        response = authenticated_client.post(url, data)

        # Should fail because user is already a member
        # The service raises ValueError, but DRF might catch it or 500.
        # We should probably handle validation in serializer or view.
        # Currently service raises ValueError. View doesn't catch it.
        # So it might be 500. Ideally it should be 400.
        # Let's see what happens.
        # If it's 500, I'll need to fix the view/serializer.
