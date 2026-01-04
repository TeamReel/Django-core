import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from projects.models.project_membership import ProjectMembership
from projects.models.project_invite import ProjectInvite
from projects.models.project_membership_promotion import ProjectMembershipPromotion


@pytest.mark.django_db
class TestProjectMembershipValidation:
    def test_last_admin_protection(self, user_factory, organisation_factory, project_factory):
        """Test that the last admin cannot be removed or demoted."""
        user = user_factory()
        org = organisation_factory(creator=user)
        project = project_factory(organisation=org, creator=user)

        # Create the sole admin membership
        membership = ProjectMembership.objects.create(
            project=project, user=user, role=ProjectMembership.Role.ADMIN
        )

        # Attempt to demote
        membership.role = ProjectMembership.Role.EDITOR
        with pytest.raises(ValidationError, match="Cannot remove or demote the last project admin"):
            membership.clean()

        # Reset role
        membership.role = ProjectMembership.Role.ADMIN
        membership.save()

        # Attempt to soft-delete
        membership.deleted_at = timezone.now()
        with pytest.raises(ValidationError, match="Cannot remove or demote the last project admin"):
            membership.clean()

        # Add another admin
        user2 = user_factory()
        ProjectMembership.objects.create(
            project=project, user=user2, role=ProjectMembership.Role.ADMIN
        )

        # Now demotion should work
        membership.deleted_at = None
        membership.role = ProjectMembership.Role.EDITOR
        membership.clean()  # Should not raise
        membership.save()

        # And deletion should work (for the now-editor)
        membership.deleted_at = timezone.now()
        membership.clean()  # Should not raise
        membership.save()

    def test_unique_active_membership(self, user_factory, organisation_factory, project_factory):
        """Test that a user can have only one active membership per project."""
        user = user_factory()
        org = organisation_factory(creator=user)
        project = project_factory(organisation=org, creator=user)

        ProjectMembership.objects.create(
            project=project, user=user, role=ProjectMembership.Role.VIEWER
        )

        # Attempt to create duplicate membership
        with pytest.raises(
            Exception
        ):  # IntegrityError or ValidationError depending on DB enforcement
            ProjectMembership.objects.create(
                project=project, user=user, role=ProjectMembership.Role.EDITOR
            )


@pytest.mark.django_db
class TestProjectInviteValidation:
    def test_token_generation_and_expiry(self, user_factory, organisation_factory, project_factory):
        """Test that invites generate tokens and expiry dates."""
        user = user_factory()
        org = organisation_factory(creator=user)
        project = project_factory(organisation=org, creator=user)

        invite = ProjectInvite.objects.create(
            project=project, email="newuser@example.com", invited_by=user
        )

        assert invite.token is not None
        assert len(invite.token) > 0
        assert invite.expires_at is not None
        assert invite.expires_at > timezone.now()
        assert not invite.is_expired()

    def test_invite_existing_member(self, user_factory, organisation_factory, project_factory):
        """Test that you cannot invite an existing project member."""
        user = user_factory()
        org = organisation_factory(creator=user)
        project = project_factory(organisation=org, creator=user)
        member_user = user_factory(email="member@example.com")

        ProjectMembership.objects.create(
            project=project, user=member_user, role=ProjectMembership.Role.VIEWER
        )

        invite = ProjectInvite(project=project, email="member@example.com", invited_by=user)

        with pytest.raises(ValidationError, match="User with this email is already a member"):
            invite.clean()


@pytest.mark.django_db
class TestProjectMembershipPromotionValidation:
    def test_suspicious_promotion(self, user_factory, organisation_factory, project_factory):
        """Test detection of suspicious promotions (shortly after joining)."""
        user = user_factory()
        org = organisation_factory(creator=user)
        project = project_factory(organisation=org, creator=user)
        target_user = user_factory()

        # User joins now
        membership = ProjectMembership.objects.create(
            project=project, user=target_user, role=ProjectMembership.Role.VIEWER
        )

        # Promotion immediately
        promotion = ProjectMembershipPromotion(
            project=project,
            target_user=target_user,
            from_role=ProjectMembership.Role.VIEWER,
            to_role=ProjectMembership.Role.ADMIN,
        )

        is_suspicious = promotion.check_suspicious()
        assert is_suspicious is True
        assert promotion.is_suspicious is True
        assert "within 24 hours" in promotion.suspicious_reason

        # Backdate membership
        membership.created_at = timezone.now() - timezone.timedelta(days=2)
        membership.save()

        # Check again (need new promotion instance or reset flags, but check_suspicious re-evaluates)
        promotion.is_suspicious = False
        promotion.suspicious_reason = None

        is_suspicious = promotion.check_suspicious()
        assert is_suspicious is False
