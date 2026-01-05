import pytest
from django.core.exceptions import ValidationError
from projects.models import ProjectMembership
from projects.services.membership_service import MembershipService
from organisations.models import Membership


@pytest.mark.django_db
class TestMembershipServiceRemoval:
    def test_remove_member_soft_delete(self, user_factory, organisation_factory, project_factory):
        owner = user_factory()
        org = organisation_factory(creator=owner)
        project = project_factory(organisation=org, creator=owner)

        member = user_factory()
        # Add member to org first
        Membership.objects.create(user=member, organisation=org, role="member")

        service = MembershipService()
        membership = service.add_member(project, member, ProjectMembership.Role.VIEWER, actor=owner)

        assert membership.deleted_at is None

        service.remove_member(membership, actor=owner)

        membership.refresh_from_db()
        assert membership.deleted_at is not None

    def test_remove_last_admin_auto_assign_org_admin(
        self, user_factory, organisation_factory, project_factory
    ):
        # Org Admin 1 (Creator)
        org_admin1 = user_factory()
        org = organisation_factory(creator=org_admin1)

        # Org Admin 2 (The one who will take over)
        org_admin2 = user_factory()
        Membership.objects.create(user=org_admin2, organisation=org, role="admin")

        project = project_factory(organisation=org, creator=org_admin1)

        service = MembershipService()

        # Make org_admin1 the ONLY project admin
        pm1, _ = ProjectMembership.objects.get_or_create(
            project=project, user=org_admin1, defaults={"role": ProjectMembership.Role.ADMIN}
        )
        if pm1.role != ProjectMembership.Role.ADMIN:
            pm1.role = ProjectMembership.Role.ADMIN
            pm1.save()

        # Ensure org_admin2 is NOT in project
        assert not ProjectMembership.objects.filter(project=project, user=org_admin2).exists()

        # Remove the last admin (org_admin1)
        service.remove_member(pm1, actor=org_admin1)

        # Check pm1 is soft deleted
        pm1.refresh_from_db()
        assert pm1.deleted_at is not None

        # Check org_admin2 is now Project Admin
        pm2 = ProjectMembership.objects.get(project=project, user=org_admin2)
        assert pm2.role == ProjectMembership.Role.ADMIN
        assert pm2.assignment_reason == ProjectMembership.AssignmentReason.ORG_DEFAULT

    def test_remove_last_admin_fails_if_no_other_org_admin(
        self, user_factory, organisation_factory, project_factory
    ):
        org_admin1 = user_factory()
        org = organisation_factory(creator=org_admin1)
        # Ensure org_admin1 is an org admin
        Membership.objects.create(user=org_admin1, organisation=org, role="admin")

        project = project_factory(organisation=org, creator=org_admin1)

        service = MembershipService()
        pm1, _ = ProjectMembership.objects.get_or_create(
            project=project, user=org_admin1, defaults={"role": ProjectMembership.Role.ADMIN}
        )
        if pm1.role != ProjectMembership.Role.ADMIN:
            pm1.role = ProjectMembership.Role.ADMIN
            pm1.save()

        # Ensure no other org admin exists
        assert org.memberships.filter(role="admin").count() == 1

        with pytest.raises(ValidationError, match="Cannot remove the last admin"):
            service.remove_member(pm1, actor=org_admin1)

        pm1.refresh_from_db()
        assert pm1.deleted_at is None

    def test_remove_admin_when_multiple_exist(
        self, user_factory, organisation_factory, project_factory
    ):
        org_admin1 = user_factory()
        org = organisation_factory(creator=org_admin1)
        # Ensure org_admin1 is an org admin
        Membership.objects.create(user=org_admin1, organisation=org, role="admin")

        project = project_factory(organisation=org, creator=org_admin1)

        # Create Project Admin 1
        pm1 = ProjectMembership.objects.create(
            project=project, user=org_admin1, role=ProjectMembership.Role.ADMIN
        )

        # Add another admin
        admin2 = user_factory()
        Membership.objects.create(user=admin2, organisation=org, role="member")
        service = MembershipService()
        pm2 = service.add_member(project, admin2, ProjectMembership.Role.ADMIN, actor=org_admin1)

        # Remove admin1
        service.remove_member(pm1, actor=org_admin1)

        pm1.refresh_from_db()
        assert pm1.deleted_at is not None

        # Ensure admin2 is still there and no new admin added
        pm2.refresh_from_db()
        assert pm2.deleted_at is None
        assert (
            ProjectMembership.objects.filter(
                project=project, deleted_at__isnull=True, role=ProjectMembership.Role.ADMIN
            ).count()
            == 1
        )
