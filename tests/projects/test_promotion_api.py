"""Tests for project promotion API."""

import pytest
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status

from projects.models import ProjectMembership, ProjectMembershipPromotion


@pytest.fixture
def project_membership(project, admin_user):
    """Create a test project membership with admin role for the admin_user."""
    return ProjectMembership.objects.create(
        project=project,
        user=admin_user,
        role=ProjectMembership.Role.ADMIN,
    )


@pytest.fixture
def target_user(user_factory):
    return user_factory()


@pytest.fixture
def target_membership(project, target_user):
    return ProjectMembership.objects.create(
        project=project,
        user=target_user,
        role=ProjectMembership.Role.VIEWER,
    )


@pytest.mark.django_db
class TestProjectPromotionAPI:
    def test_request_promotion_requires_approval(
        self, authenticated_client, project, project_membership, target_membership
    ):
        """Test that promoting a user creates a promotion request when flag is enabled."""
        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": target_membership.id},
        )
        data = {"role": ProjectMembership.Role.EDITOR}

        with patch("projects.services.promotion_service.get_flag", return_value=True):
            response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert "promotion_id" in response.data

        # Verify promotion created
        promotion = ProjectMembershipPromotion.objects.get(id=response.data["promotion_id"])
        assert promotion.status == ProjectMembershipPromotion.Status.PENDING
        assert promotion.from_role == ProjectMembership.Role.VIEWER
        assert promotion.to_role == ProjectMembership.Role.EDITOR

        # Verify membership NOT updated yet
        target_membership.refresh_from_db()
        assert target_membership.role == ProjectMembership.Role.VIEWER

    def test_request_promotion_immediate(
        self, authenticated_client, project, project_membership, target_membership
    ):
        """Test that promoting a user updates role immediately when flag is disabled."""
        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": target_membership.id},
        )
        data = {"role": ProjectMembership.Role.EDITOR}

        with patch("projects.services.promotion_service.get_flag", return_value=False):
            response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK

        # Verify membership updated
        target_membership.refresh_from_db()
        assert target_membership.role == ProjectMembership.Role.EDITOR
        assert target_membership.assignment_reason == ProjectMembership.AssignmentReason.PROMOTION

    def test_accept_promotion(
        self, api_client, project, admin_user, target_user, target_membership
    ):
        """Test accepting a promotion."""
        # Create promotion
        promotion = ProjectMembershipPromotion.objects.create(
            project=project,
            target_user=target_user,
            requested_by=admin_user,
            from_role=ProjectMembership.Role.VIEWER,
            to_role=ProjectMembership.Role.EDITOR,
            status=ProjectMembershipPromotion.Status.PENDING,
        )

        url = reverse("api_v1:promotion-accept", kwargs={"pk": promotion.id})

        # Authenticate as target user
        api_client.force_authenticate(user=target_user)
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        # Verify accepted
        promotion.refresh_from_db()
        assert promotion.status == ProjectMembershipPromotion.Status.ACCEPTED

        # Verify membership updated
        target_membership.refresh_from_db()
        assert target_membership.role == ProjectMembership.Role.EDITOR

    def test_decline_promotion(
        self, api_client, project, admin_user, target_user, target_membership
    ):
        """Test declining a promotion."""
        promotion = ProjectMembershipPromotion.objects.create(
            project=project,
            target_user=target_user,
            requested_by=admin_user,
            from_role=ProjectMembership.Role.VIEWER,
            to_role=ProjectMembership.Role.EDITOR,
            status=ProjectMembershipPromotion.Status.PENDING,
        )

        url = reverse("api_v1:promotion-decline", kwargs={"pk": promotion.id})

        api_client.force_authenticate(user=target_user)
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        promotion.refresh_from_db()
        assert promotion.status == ProjectMembershipPromotion.Status.DECLINED

        target_membership.refresh_from_db()
        assert target_membership.role == ProjectMembership.Role.VIEWER

    def test_cancel_promotion(
        self, api_client, project, admin_user, target_user, project_membership
    ):
        """Test cancelling a promotion by admin."""
        promotion = ProjectMembershipPromotion.objects.create(
            project=project,
            target_user=target_user,
            requested_by=admin_user,
            from_role=ProjectMembership.Role.VIEWER,
            to_role=ProjectMembership.Role.EDITOR,
            status=ProjectMembershipPromotion.Status.PENDING,
        )

        url = reverse("api_v1:promotion-cancel", kwargs={"pk": promotion.id})

        api_client.force_authenticate(user=admin_user)
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_200_OK

        promotion.refresh_from_db()
        assert promotion.status == ProjectMembershipPromotion.Status.CANCELLED

    def test_list_promotions(
        self, api_client, project, admin_user, target_user, project_membership
    ):
        """Test listing promotions."""
        ProjectMembershipPromotion.objects.create(
            project=project,
            target_user=target_user,
            requested_by=admin_user,
            from_role=ProjectMembership.Role.VIEWER,
            to_role=ProjectMembership.Role.EDITOR,
            status=ProjectMembershipPromotion.Status.PENDING,
        )

        url = reverse(
            "api_v1:project-promotions-list",
            kwargs={"project_pk": project.id},
        )

        api_client.force_authenticate(user=admin_user)
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response is enveloped: {"status": "success", "data": [...]}
        assert len(response.data["data"]) == 1

    def test_list_promotions_as_member(
        self, api_client, project, admin_user, target_user, target_membership, django_user_model
    ):
        """Test listing promotions as a normal member (only sees own)."""
        # Promotion for target_user
        p1 = ProjectMembershipPromotion.objects.create(
            project=project,
            target_user=target_user,
            requested_by=admin_user,
            from_role=ProjectMembership.Role.VIEWER,
            to_role=ProjectMembership.Role.EDITOR,
            status=ProjectMembershipPromotion.Status.PENDING,
        )

        # Promotion for another user
        other_user = django_user_model.objects.create_user(
            email="other@example.com", password="password", first_name="Other", last_name="User"
        )
        ProjectMembership.objects.create(
            project=project, user=other_user, role=ProjectMembership.Role.VIEWER
        )
        p2 = ProjectMembershipPromotion.objects.create(
            project=project,
            target_user=other_user,
            requested_by=admin_user,
            from_role=ProjectMembership.Role.VIEWER,
            to_role=ProjectMembership.Role.EDITOR,
            status=ProjectMembershipPromotion.Status.PENDING,
        )

        url = reverse(
            "api_v1:project-promotions-list",
            kwargs={"project_pk": project.id},
        )

        api_client.force_authenticate(user=target_user)
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data["data"]
        assert len(data) == 1
        assert data[0]["id"] == str(p1.id)
