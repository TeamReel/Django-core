import pytest
from django.urls import reverse
from rest_framework import status
from projects.models import ProjectMembership, ProjectInvite, ProjectMembershipPromotion


@pytest.mark.django_db
class TestProjectAnalyticsAPI:
    def test_membership_stats_structure(self, api_client, project, user_factory):
        """Test that the membership stats endpoint returns the correct structure and counts."""

        # Create project admin
        project_admin = user_factory()
        ProjectMembership.objects.create(
            project=project, user=project_admin, role=ProjectMembership.Role.ADMIN
        )

        # Authenticate as project admin
        api_client.force_authenticate(user=project_admin)

        # Create some members
        # 1 admin (project_admin already exists)
        # 2 editors
        editor1 = user_factory()
        editor2 = user_factory()
        ProjectMembership.objects.create(
            project=project, user=editor1, role=ProjectMembership.Role.EDITOR
        )
        ProjectMembership.objects.create(
            project=project, user=editor2, role=ProjectMembership.Role.EDITOR
        )

        # 3 viewers
        for _ in range(3):
            viewer = user_factory()
            ProjectMembership.objects.create(
                project=project, user=viewer, role=ProjectMembership.Role.VIEWER
            )

        # Create pending invites
        ProjectInvite.objects.create(
            project=project,
            email="invite1@example.com",
            role=ProjectMembership.Role.VIEWER,
            invited_by=project_admin,
            status=ProjectInvite.Status.PENDING,
        )
        ProjectInvite.objects.create(
            project=project,
            email="invite2@example.com",
            role=ProjectMembership.Role.EDITOR,
            invited_by=project_admin,
            status=ProjectInvite.Status.PENDING,
        )
        # One accepted invite (should not count as pending)
        ProjectInvite.objects.create(
            project=project,
            email="accepted@example.com",
            role=ProjectMembership.Role.VIEWER,
            invited_by=project_admin,
            status=ProjectInvite.Status.ACCEPTED,
        )

        # Create pending promotions
        member_to_promote = user_factory()
        ProjectMembership.objects.create(
            project=project, user=member_to_promote, role=ProjectMembership.Role.EDITOR
        )

        ProjectMembershipPromotion.objects.create(
            project=project,
            target_user=member_to_promote,
            requested_by=project_admin,
            from_role=ProjectMembership.Role.EDITOR,
            to_role=ProjectMembership.Role.ADMIN,
            status=ProjectMembershipPromotion.Status.PENDING,
        )

        # URL for the stats endpoint
        url = reverse("api_v1:project-membership-stats", kwargs={"slug": project.slug})

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # Total members: 1 admin + 2 editors + 3 viewers + 1 member_to_promote = 7
        assert data["total_members"] == 7

        # Breakdown
        assert data["breakdown"]["admin"] == 1
        assert data["breakdown"]["editor"] == 3  # 2 editors + 1 member_to_promote
        assert data["breakdown"]["viewer"] == 3

        # Pending invites: 2
        assert data["pending_invites"] == 2

        # Pending promotions: 1
        assert data["pending_promotions"] == 1

    def test_membership_stats_permissions(self, api_client, project, user_factory):
        """Test that only admins can view stats."""
        user = user_factory()
        # Add as viewer
        ProjectMembership.objects.create(
            project=project, user=user, role=ProjectMembership.Role.VIEWER
        )

        api_client.force_authenticate(user=user)

        url = reverse("api_v1:project-membership-stats", kwargs={"slug": project.slug})
        response = api_client.get(url)

        # Should be forbidden for non-admins
        assert response.status_code == status.HTTP_403_FORBIDDEN
