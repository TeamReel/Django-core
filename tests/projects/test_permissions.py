"""Tests for Project API permissions."""

import pytest
from django.urls import reverse
from organisations.models import Membership
from projects.api.permissions import IsOrganisationMemberOrAdmin
from rest_framework import status
from rest_framework.test import APIRequestFactory


@pytest.mark.django_db
class TestIsOrganisationMemberOrAdmin:
    """Test IsOrganisationMemberOrAdmin permission class."""

    def test_admin_has_permission(self, organisation, admin_user):
        """Test organisation admin has permission."""
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = admin_user

        permission = IsOrganisationMemberOrAdmin()
        view = type("MockView", (), {"kwargs": {"organisation_id": organisation.slug}})()

        assert permission.has_permission(request, view)

    def test_member_has_read_permission(self, organisation, member_user):
        """Test organisation member has read permission."""
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = member_user

        permission = IsOrganisationMemberOrAdmin()
        view = type("MockView", (), {"kwargs": {"organisation_id": organisation.slug}})()

        assert permission.has_permission(request, view)

    def test_member_no_write_permission(self, organisation, member_user):
        """Test organisation member lacks write permission."""
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = member_user

        permission = IsOrganisationMemberOrAdmin()
        view = type("MockView", (), {"kwargs": {"organisation_id": organisation.slug}})()

        assert not permission.has_permission(request, view)

    def test_non_member_no_permission(self, organisation, user_factory):
        """Test non-member has no permission."""
        non_member = user_factory(email="nonmember@example.com")
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = non_member

        permission = IsOrganisationMemberOrAdmin()
        view = type("MockView", (), {"kwargs": {"organisation_id": organisation.slug}})()

        assert not permission.has_permission(request, view)

    def test_unauthenticated_no_permission(self, organisation):
        """Test unauthenticated user has no permission."""
        from django.contrib.auth.models import AnonymousUser

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = AnonymousUser()

        permission = IsOrganisationMemberOrAdmin()
        view = type("MockView", (), {"kwargs": {"organisation_id": organisation.slug}})()

        assert not permission.has_permission(request, view)


@pytest.mark.django_db
class TestProjectPermissions:
    """Test project permissions via API endpoints."""

    def test_list_requires_authentication(self, api_client, organisation):
        """Test listing projects requires authentication."""
        url = reverse(
            "api_v1:organisation-projects-list", kwargs={"organisation_id": organisation.slug}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_requires_membership(self, api_client, user_factory, organisation):
        """Test listing projects requires organisation membership."""
        non_member = user_factory(email="nonmember@example.com")
        api_client.force_authenticate(user=non_member)

        url = reverse(
            "api_v1:organisation-projects-list", kwargs={"organisation_id": organisation.slug}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_requires_admin_role(self, api_client, member_user, organisation):
        """Test creating projects requires admin role."""
        api_client.force_authenticate(user=member_user)

        url = reverse(
            "api_v1:organisation-projects-list", kwargs={"organisation_id": organisation.slug}
        )
        response = api_client.post(url, {"name": "Test Project"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_requires_admin_role(self, api_client, member_user, project):
        """Test updating projects requires admin role."""
        api_client.force_authenticate(user=member_user)

        url = reverse(
            "api_v1:organisation-projects-detail",
            kwargs={"organisation_id": project.organisation.slug, "slug": project.slug},
        )
        response = api_client.patch(url, {"name": "Updated"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_archive_requires_admin_role(self, api_client, member_user, project):
        """Test archiving projects requires admin role."""
        api_client.force_authenticate(user=member_user)

        url = reverse(
            "api_v1:organisation-projects-archive",
            kwargs={"organisation_id": project.organisation.slug, "slug": project.slug},
        )
        response = api_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_restore_requires_admin_role(self, api_client, member_user, archived_project):
        """Test restoring projects requires admin role."""
        api_client.force_authenticate(user=member_user)

        url = reverse(
            "api_v1:organisation-projects-restore",
            kwargs={
                "organisation_id": archived_project.organisation.slug,
                "slug": archived_project.slug,
            },
        )
        response = api_client.post(f"{url}?include_archived=true")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_create(self, authenticated_client, organisation):
        """Test admin can create projects."""
        url = reverse(
            "api_v1:organisation-projects-list", kwargs={"organisation_id": organisation.slug}
        )
        response = authenticated_client.post(url, {"name": "New Project"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED

    def test_admin_can_update(self, authenticated_client, project):
        """Test admin can update projects."""
        url = reverse(
            "api_v1:organisation-projects-detail",
            kwargs={"organisation_id": project.organisation.slug, "slug": project.slug},
        )
        response = authenticated_client.patch(url, {"name": "Updated"}, format="json")

        assert response.status_code == status.HTTP_200_OK

    def test_admin_can_archive(self, authenticated_client, project):
        """Test admin can archive projects."""
        url = reverse(
            "api_v1:organisation-projects-archive",
            kwargs={"organisation_id": project.organisation.slug, "slug": project.slug},
        )
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_member_can_read(self, member_client, project):
        """Test member can read projects."""
        url = reverse(
            "api_v1:organisation-projects-detail",
            kwargs={"organisation_id": project.organisation.slug, "slug": project.slug},
        )
        response = member_client.get(url)

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCrossOrganisationPermissions:
    """Test permissions across different organisations."""

    def test_cannot_access_other_org_projects(
        self, api_client, user_factory, organisation_factory, project_factory
    ):
        """Test users cannot access projects from organisations they're not in."""
        user1 = user_factory(email="user1@example.com")
        user2 = user_factory(email="user2@example.com")

        org1 = organisation_factory(name="Org 1", creator=user1)
        org2 = organisation_factory(name="Org 2", creator=user2)

        # user1 is member of org1 only
        Membership.objects.create(organisation=org1, user=user1, role="admin")
        Membership.objects.create(organisation=org2, user=user2, role="admin")

        # Create project in org2
        proj2 = project_factory(organisation=org2, creator=user2)

        # user1 tries to access org2 project
        api_client.force_authenticate(user=user1)
        url = reverse(
            "api_v1:organisation-projects-detail",
            kwargs={"organisation_id": org2.slug, "slug": proj2.slug},
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_create_in_other_org(self, api_client, user_factory, organisation_factory):
        """Test users cannot create projects in organisations they're not in."""
        user1 = user_factory(email="user1@example.com")
        user2 = user_factory(email="user2@example.com")

        org1 = organisation_factory(name="Org 1", creator=user1)
        org2 = organisation_factory(name="Org 2", creator=user2)

        Membership.objects.create(organisation=org1, user=user1, role="admin")

        # user1 tries to create in org2
        api_client.force_authenticate(user=user1)
        url = reverse("api_v1:organisation-projects-list", kwargs={"organisation_id": org2.slug})
        response = api_client.post(url, {"name": "Test"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_can_be_member_of_multiple_orgs(
        self, api_client, user_factory, organisation_factory, project_factory
    ):
        """Test user can access projects from all their organisations."""
        user = user_factory(email="multiorg@example.com")

        org1 = organisation_factory(name="Org 1")
        org2 = organisation_factory(name="Org 2")

        # User is member of both orgs
        Membership.objects.create(organisation=org1, user=user, role="member")
        Membership.objects.create(organisation=org2, user=user, role="admin")

        proj1 = project_factory(organisation=org1, creator=user)
        proj2 = project_factory(organisation=org2, creator=user)

        api_client.force_authenticate(user=user)

        # Can read from org1
        url1 = reverse(
            "api_v1:organisation-projects-detail",
            kwargs={"organisation_id": org1.slug, "slug": proj1.slug},
        )
        response1 = api_client.get(url1)
        assert response1.status_code == status.HTTP_200_OK

        # Can read and write in org2 (admin)
        url2 = reverse(
            "api_v1:organisation-projects-detail",
            kwargs={"organisation_id": org2.slug, "slug": proj2.slug},
        )
        response2 = api_client.get(url2)
        assert response2.status_code == status.HTTP_200_OK

        # Can create in org2 (admin)
        create_url = reverse(
            "api_v1:organisation-projects-list", kwargs={"organisation_id": org2.slug}
        )
        response3 = api_client.post(create_url, {"name": "New"}, format="json")
        assert response3.status_code == status.HTTP_201_CREATED
