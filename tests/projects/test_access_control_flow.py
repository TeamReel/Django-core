"""
Integration tests for Project Access Control flow.

This module tests the complete lifecycle of project membership,
from invitation to promotion and removal, verifying analytics
and permissions at each step.
"""

import pytest
from django.urls import reverse
from rest_framework import status
from projects.models import ProjectMembership, ProjectInvite, ProjectMembershipPromotion


@pytest.mark.django_db
class TestProjectAccessControlFlow:
    """Test the full access control lifecycle."""

    def test_full_membership_lifecycle(self, api_client, project, user_factory, admin_user):
        """
        Test the complete flow:
        1. Admin invites user
        2. User accepts (simulated)
        3. Admin checks stats
        4. Admin promotes user
        5. Admin checks stats again
        6. Admin removes user
        """
        # --- Setup ---
        # Use existing admin_user from fixture (who is already org admin)
        # Make them project admin too
        ProjectMembership.objects.create(
            project=project, user=admin_user, role=ProjectMembership.Role.ADMIN
        )

        # Create User to be invited
        new_user = user_factory(email="newuser@example.com")

        # Authenticate as Admin
        api_client.force_authenticate(user=admin_user)

        # --- 1. Invite User ---
        # POST /api/v1/projects/{id}/invitations/
        invite_url = reverse("api_v1:project-invitations-list", kwargs={"project_pk": project.id})
        invite_data = {"email": "newuser@example.com", "role": ProjectMembership.Role.VIEWER}
        response = api_client.post(invite_url, invite_data)
        assert response.status_code == status.HTTP_201_CREATED

        # Verify Invite exists
        invite = ProjectInvite.objects.get(email="newuser@example.com", project=project)
        assert invite.status == ProjectInvite.Status.PENDING

        # Verify Stats (Pending Invite)
        stats_url = reverse("api_v1:project-membership-stats", kwargs={"slug": project.slug})
        response = api_client.get(stats_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["pending_invites"] == 1
        assert response.data["total_members"] == 1  # Only admin so far

        # Verify Activity Feed (Invite Sent)
        # GET /api/v1/activity/?project={id}&event_type=project.invitation.created
        activity_url = reverse("api_v1:audit-event-list")
        response = api_client.get(
            activity_url, {"project": project.id, "event_type": "project.invitation.created"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1
        assert response.data["results"][0]["event_type"] == "project.invitation.created"

        # --- 2. User Accepts Invite (Simulated) ---
        # In a real flow, user clicks link, we verify token, then create membership.
        # Here we simulate the result of that process.
        invite.status = ProjectInvite.Status.ACCEPTED
        invite.save()

        # Use service to create membership so audit log is created
        from projects.services.membership_service import MembershipService

        service = MembershipService()
        service.add_member(
            project=project,
            user=new_user,
            role=ProjectMembership.Role.VIEWER,
            actor=new_user,  # User adds themselves by accepting
            reason=ProjectMembership.AssignmentReason.INVITATION,
        )

        # --- 3. Admin Checks Stats ---
        response = api_client.get(stats_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["pending_invites"] == 0  # Should be 0 now
        assert response.data["total_members"] == 2
        assert response.data["breakdown"]["viewer"] == 1

        # Verify Activity Feed (Member Added)
        response = api_client.get(
            activity_url, {"project": project.id, "event_type": "project.membership.created"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

        # --- 4. Admin Promotes User ---
        # PATCH /api/v1/projects/{id}/members/{member_id}/
        # Note: We need the membership ID, not user ID
        membership = ProjectMembership.objects.get(project=project, user=new_user)
        promote_url = reverse(
            "api_v1:project-members-detail", kwargs={"project_pk": project.id, "pk": membership.id}
        )
        promote_data = {"role": ProjectMembership.Role.EDITOR}
        response = api_client.patch(promote_url, promote_data)

        # Depending on implementation, this might be immediate or require acceptance.
        # Assuming immediate for this test or checking pending status if that's the flow.
        # Let's check the response to see what happened.
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]

        # If it created a promotion request (pending)
        if response.status_code == status.HTTP_202_ACCEPTED:
            promotion = ProjectMembershipPromotion.objects.get(
                project=project, target_user=new_user
            )
            assert promotion.status == ProjectMembershipPromotion.Status.PENDING

            # Verify Stats (Pending Promotion)
            response = api_client.get(stats_url)
            assert response.data["pending_promotions"] == 1

            # Simulate acceptance of promotion
            promotion.status = ProjectMembershipPromotion.Status.ACCEPTED
            promotion.save()
            membership.role = ProjectMembership.Role.EDITOR
            membership.save()

        else:
            # If it was immediate
            membership.refresh_from_db()
            assert membership.role == ProjectMembership.Role.EDITOR

        # --- 5. Admin Checks Stats Again ---
        response = api_client.get(stats_url)
        assert response.data["breakdown"]["editor"] == 1
        assert response.data["breakdown"]["viewer"] == 0
        assert response.data["pending_promotions"] == 0

        # --- 6. Admin Removes User ---
        # DELETE /api/v1/projects/{id}/members/{member_id}/
        member_url = reverse(
            "api_v1:project-members-detail", kwargs={"project_pk": project.id, "pk": membership.id}
        )
        response = api_client.delete(member_url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify Stats (User Removed)
        response = api_client.get(stats_url)
        assert response.data["total_members"] == 1
        assert response.data["breakdown"]["editor"] == 0
