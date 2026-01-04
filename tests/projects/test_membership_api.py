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
        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project.id},
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Handle pagination or list
        results = response.data
        if isinstance(response.data, dict):
            if "results" in response.data:
                results = response.data["results"]
            elif "data" in response.data:
                results = response.data["data"]

        assert len(results) >= 1

        # Check if the user is in the list
        user_ids = [
            str(m["user"]["id"]) if isinstance(m["user"], dict) else str(m["user"]) for m in results
        ]

        assert str(project_membership.user.id) in user_ids

    def test_add_member(self, authenticated_client, project, project_membership, user_factory):
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

    def test_update_member_role(
        self, authenticated_client, project, project_membership, user_factory
    ):
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

    def test_remove_member(self, authenticated_client, project, project_membership, user_factory):
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
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already a member" in str(response.data).lower()

    def test_non_admin_cannot_add_member(self, api_client, project, user_factory, organisation):
        """Test that non-admin project members cannot add new members."""
        # Create a viewer user
        viewer_user = user_factory()

        # Add viewer to org
        from organisations.models import Membership

        Membership.objects.create(organisation=organisation, user=viewer_user, role="member")

        # Add viewer to project as VIEWER
        ProjectMembership.objects.create(
            project=project, user=viewer_user, role=ProjectMembership.Role.VIEWER
        )

        # Authenticate as viewer
        api_client.force_authenticate(user=viewer_user)

        # Try to add a new member
        new_user = user_factory()
        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "user_id": str(new_user.id),
            "role": ProjectMembership.Role.VIEWER,
        }

        response = api_client.post(url, data)

        # Should be denied (403 Forbidden)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "admin" in str(response.data).lower()

    def test_non_admin_cannot_update_role(self, api_client, project, user_factory, organisation):
        """Test that non-admin project members cannot update roles."""
        # Create viewer and target users
        viewer_user = user_factory()
        target_user = user_factory()

        # Add both to org
        from organisations.models import Membership

        Membership.objects.create(organisation=organisation, user=viewer_user, role="member")

        # Add viewer to project as VIEWER
        ProjectMembership.objects.create(
            project=project, user=viewer_user, role=ProjectMembership.Role.VIEWER
        )

        # Add target to project as VIEWER
        target_membership = ProjectMembership.objects.create(
            project=project, user=target_user, role=ProjectMembership.Role.VIEWER
        )

        # Authenticate as viewer
        api_client.force_authenticate(user=viewer_user)

        # Try to update target's role
        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": target_membership.id},
        )
        data = {"role": ProjectMembership.Role.EDITOR}

        response = api_client.patch(url, data)

        # Should be denied (403 Forbidden)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_non_admin_cannot_remove_member(self, api_client, project, user_factory, organisation):
        """Test that non-admin project members cannot remove members."""
        # Create viewer and target users
        viewer_user = user_factory()
        target_user = user_factory()

        # Add both to org
        from organisations.models import Membership

        Membership.objects.create(organisation=organisation, user=viewer_user, role="member")

        # Add viewer to project as VIEWER
        ProjectMembership.objects.create(
            project=project, user=viewer_user, role=ProjectMembership.Role.VIEWER
        )

        # Add target to project
        target_membership = ProjectMembership.objects.create(
            project=project, user=target_user, role=ProjectMembership.Role.VIEWER
        )

        # Authenticate as viewer
        api_client.force_authenticate(user=viewer_user)

        # Try to remove target
        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": target_membership.id},
        )

        response = api_client.delete(url)

        # Should be denied (403 Forbidden)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_searchable_users_endpoint(
        self, authenticated_client, project, project_membership, user_factory, organisation
    ):
        """Test searchable users endpoint returns org members not in project."""
        # Create some org members
        org_member1 = user_factory(email="alice@example.com", first_name="Alice")
        org_member2 = user_factory(email="bob@example.com", first_name="Bob")
        org_member3 = user_factory(email="charlie@example.com", first_name="Charlie")

        # Add them to the organization
        from organisations.models import Membership

        for user in [org_member1, org_member2, org_member3]:
            Membership.objects.create(organisation=organisation, user=user, role="member")

        # Add one to the project (should be excluded from results)
        ProjectMembership.objects.create(
            project=project, user=org_member1, role=ProjectMembership.Role.VIEWER
        )

        # Call searchable users endpoint
        url = reverse(
            "api_v1:project-members-searchable-users",
            kwargs={"project_pk": project.id},
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "data" in response.data

        users = response.data["data"]
        user_emails = [u["email"] for u in users]

        # org_member1 should NOT be in results (already in project)
        assert "alice@example.com" not in user_emails

        # org_member2 and org_member3 should be in results
        assert "bob@example.com" in user_emails
        assert "charlie@example.com" in user_emails

    def test_searchable_users_with_search_filter(
        self, authenticated_client, project, project_membership, user_factory, organisation
    ):
        """Test searchable users endpoint with search query."""
        # Create org members
        org_member1 = user_factory(email="alice@example.com", first_name="Alice")
        org_member2 = user_factory(email="bob@example.com", first_name="Bob")

        # Add them to the organization
        from organisations.models import Membership

        for user in [org_member1, org_member2]:
            Membership.objects.create(organisation=organisation, user=user, role="member")

        # Search for "alice"
        url = reverse(
            "api_v1:project-members-searchable-users",
            kwargs={"project_pk": project.id},
        )
        response = authenticated_client.get(url, {"search": "alice"})

        assert response.status_code == status.HTTP_200_OK
        users = response.data["data"]
        user_emails = [u["email"] for u in users]

        # Should only return alice
        assert "alice@example.com" in user_emails
        assert "bob@example.com" not in user_emails
