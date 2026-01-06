import pytest
from django.urls import reverse
from rest_framework import status
from audit.api import audit_log
from organisations.models import Membership
from projects.models import ProjectMembership


@pytest.mark.django_db
class TestAuditEventFiltering:
    def test_user_can_see_project_audit_logs(
        self, authenticated_client, user_factory, project_factory, organisation_factory
    ):
        user = authenticated_client.handler._force_user
        org = organisation_factory(creator=user)
        project = project_factory(organisation=org, creator=user)

        # Ensure user is project member
        ProjectMembership.objects.create(project=project, user=user, role="admin")

        # Create audit event for this project
        audit_log.record("test.event", user=user, project=project)

        url = reverse("api_v1:audit-event-list")
        response = authenticated_client.get(url, {"project": str(project.id)})

        if response.status_code != 200:
            print(f"Response data: {response.data}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["project_id"] == project.id

    def test_user_cannot_see_other_project_audit_logs(
        self, authenticated_client, user_factory, project_factory, organisation_factory
    ):
        user = authenticated_client.handler._force_user

        # Other project
        other_user = user_factory()
        other_org = organisation_factory(creator=other_user)
        other_project = project_factory(organisation=other_org, creator=other_user)

        # Create audit event for other project
        audit_log.record("test.event", user=other_user, project=other_project)

        url = reverse("api_v1:audit-event-list")
        response = authenticated_client.get(url, {"project": str(other_project.id)})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0

    def test_soft_deleted_member_cannot_see_logs_unless_actor(
        self, authenticated_client, user_factory, project_factory, organisation_factory
    ):
        user = authenticated_client.handler._force_user
        org = organisation_factory(creator=user)
        project = project_factory(organisation=org, creator=user)

        # Ensure user is project member
        pm = ProjectMembership.objects.create(project=project, user=user, role="admin")

        # Create audit event where user is actor
        audit_log.record("test.event", user=user, project=project)

        # Create audit event where user is NOT actor
        other_user = user_factory()
        audit_log.record("test.other_event", user=other_user, project=project)

        # Soft delete membership
        from django.utils import timezone

        pm.deleted_at = timezone.now()
        pm.save()

        # Also ensure not org admin (creator is usually org admin)
        Membership.objects.filter(user=user, organisation=org).update(is_active=False)

        url = reverse("api_v1:audit-event-list")
        response = authenticated_client.get(url, {"project": str(project.id)})

        assert response.status_code == status.HTTP_200_OK

        results = response.data["results"]
        # Should only see the one where they are actor
        assert len(results) == 1
        assert results[0]["event_type"] == "test.event"
