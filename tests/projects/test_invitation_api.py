"""Tests for project invitation API."""

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from projects.models import ProjectInvite, ProjectMembership


@pytest.fixture
def project_membership(project, admin_user):
    """Create a test project membership with admin role for the admin_user."""
    return ProjectMembership.objects.create(
        project=project,
        user=admin_user,
        role=ProjectMembership.Role.ADMIN,
    )


@pytest.fixture
def invitation(project, user_factory, admin_user):
    """Create a test invitation."""
    invited_user_email = "invitee@example.com"
    expires_at = timezone.now() + timezone.timedelta(days=7)

    return ProjectInvite.objects.create(
        project=project,
        email=invited_user_email,
        role=ProjectMembership.Role.VIEWER,
        invited_by=admin_user,
        expires_at=expires_at,
    )


@pytest.mark.django_db
class TestProjectInvitationAPI:
    """Test project invitation API endpoints."""

    def test_list_invitations(self, authenticated_client, project, project_membership, invitation):
        """Test listing pending invitations for a project."""
        url = reverse(
            "api_v1:project-invitations-list",
            kwargs={"project_pk": project.id},
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "data" in response.data
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["email"] == "invitee@example.com"

    def test_create_invitation(self, authenticated_client, project, project_membership):
        """Test creating a new invitation."""
        url = reverse(
            "api_v1:project-invitations-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "email": "newuser@example.com",
            "role": ProjectMembership.Role.EDITOR,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == "newuser@example.com"
        assert response.data["role"] == ProjectMembership.Role.EDITOR
        assert response.data["status"] == ProjectInvite.Status.PENDING
        assert "id" in response.data

        # Verify invitation was created in database
        invitation = ProjectInvite.objects.get(email="newuser@example.com", project=project)
        assert invitation.token is not None
        assert len(invitation.token) > 0

    def test_create_invitation_duplicate_fails(
        self, authenticated_client, project, project_membership, invitation
    ):
        """Test that creating duplicate invitation fails."""
        url = reverse(
            "api_v1:project-invitations-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "email": invitation.email,
            "role": ProjectMembership.Role.VIEWER,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "pending invitation" in str(response.data).lower()

    def test_create_invitation_for_existing_member_fails(
        self, authenticated_client, project, project_membership, user_factory
    ):
        """Test that inviting existing member fails."""
        # Create a new member
        new_user = user_factory(email="member@example.com")
        ProjectMembership.objects.create(
            project=project, user=new_user, role=ProjectMembership.Role.VIEWER
        )

        url = reverse(
            "api_v1:project-invitations-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "email": "member@example.com",
            "role": ProjectMembership.Role.EDITOR,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already a member" in str(response.data).lower()

    def test_cancel_invitation(self, authenticated_client, project, project_membership, invitation):
        """Test cancelling a pending invitation."""
        url = reverse(
            "api_v1:project-invitations-detail",
            kwargs={"project_pk": project.id, "pk": invitation.id},
        )

        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify invitation was cancelled
        invitation.refresh_from_db()
        assert invitation.status == ProjectInvite.Status.CANCELLED

    def test_resend_invitation(self, authenticated_client, project, project_membership, invitation):
        """Test resending an invitation."""
        old_expires_at = invitation.expires_at

        url = reverse(
            "api_v1:project-invitations-resend",
            kwargs={"project_pk": project.id, "pk": invitation.id},
        )

        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        # Verify expiry was extended
        invitation.refresh_from_db()
        assert invitation.expires_at > old_expires_at

    def test_non_admin_cannot_create_invitation(
        self, api_client, project, user_factory, organisation
    ):
        """Test that non-admin users cannot create invitations."""
        # Create a viewer user
        viewer_user = user_factory(email="viewer@example.com")

        # Add viewer to org
        from organisations.models import Membership

        Membership.objects.create(organisation=organisation, user=viewer_user, role="member")

        # Add viewer to project as VIEWER
        ProjectMembership.objects.create(
            project=project, user=viewer_user, role=ProjectMembership.Role.VIEWER
        )

        # Authenticate as viewer
        api_client.force_authenticate(user=viewer_user)

        url = reverse(
            "api_v1:project-invitations-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "email": "newuser@example.com",
            "role": ProjectMembership.Role.VIEWER,
        }

        response = api_client.post(url, data)

        # Should be denied (403 Forbidden)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "admin" in str(response.data).lower()

    def test_get_invitation_by_token_public(self, api_client, invitation):
        """Test retrieving invitation by token (public endpoint)."""
        url = reverse(
            "api_v1:invitation-detail",
            kwargs={"token": invitation.token},
        )

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == invitation.email
        assert response.data["project_name"] == invitation.project.name

    def test_accept_invitation_creates_membership(
        self, api_client, invitation, user_factory, organisation
    ):
        """Test accepting an invitation creates membership."""
        # Create user with matching email
        accepting_user = user_factory(email=invitation.email)

        # Add user to the organisation first (required)
        from organisations.models import Membership

        Membership.objects.create(organisation=organisation, user=accepting_user, role="member")

        api_client.force_authenticate(user=accepting_user)

        url = reverse(
            "api_v1:invitation-accept",
            kwargs={"token": invitation.token},
        )

        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        # Verify membership was created
        membership = ProjectMembership.objects.get(project=invitation.project, user=accepting_user)
        assert membership.role == invitation.role
        assert membership.assignment_reason == ProjectMembership.AssignmentReason.INVITATION

        # Verify invitation was marked as accepted
        invitation.refresh_from_db()
        assert invitation.status == ProjectInvite.Status.ACCEPTED
        assert invitation.accepted_at is not None

    def test_accept_invitation_email_mismatch_fails(self, api_client, invitation, user_factory):
        """Test that accepting with wrong email fails."""
        # Create user with different email
        wrong_user = user_factory(email="wrong@example.com")
        api_client.force_authenticate(user=wrong_user)

        url = reverse(
            "api_v1:invitation-accept",
            kwargs={"token": invitation.token},
        )

        response = api_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email does not match" in str(response.data).lower()

    def test_accept_expired_invitation_fails(self, api_client, invitation):
        """Test that accepting expired invitation fails."""
        # Make invitation expired
        invitation.expires_at = timezone.now() - timezone.timedelta(days=1)
        invitation.save()

        url = reverse(
            "api_v1:invitation-accept",
            kwargs={"token": invitation.token},
        )

        response = api_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in str(response.data).lower()

    def test_accept_invitation_invalid_token(self, api_client):
        """Test that invalid token returns 404."""
        url = reverse(
            "api_v1:invitation-accept",
            kwargs={"token": "invalid-token"},
        )

        response = api_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "invalid" in str(response.data).lower()
