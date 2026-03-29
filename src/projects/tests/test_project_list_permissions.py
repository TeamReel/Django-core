import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from organisations.models import Membership, Organisation
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices
from projects.models import Project
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestProjectListPermissions:
    def test_project_list_defaults_to_memberships(self):
        user = User.objects.create_user(
            email="u_proj_1@example.com",
            password="TestPass123!",
            is_active=True,
            email_verified=True,
        )

        org1 = Organisation.objects.create(name="Org One", slug="org-one", creator=user)
        org2 = Organisation.objects.create(name="Org Two", slug="org-two", creator=user)

        Membership.objects.create(user=user, organisation=org1, role="member")

        Project.objects.create(organisation=org1, creator=user, name="Club A", slug="club-a")
        Project.objects.create(organisation=org2, creator=user, name="Club B", slug="club-b")

        client = Client()
        client.force_login(user)

        response = client.get("/api/v1/projects/?page_size=250")
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()

        data = payload.get("data", payload)
        results = data.get("results", data if isinstance(data, list) else [])

        slugs = {p.get("slug") for p in results}
        assert "club-a" in slugs
        assert "club-b" not in slugs

    def test_project_list_with_project_view_all_lists_all_projects_minimal_fields(self):
        user = User.objects.create_user(
            email="u_proj_2@example.com",
            password="TestPass123!",
            is_active=True,
            email_verified=True,
        )

        org1 = Organisation.objects.create(name="Org Alpha", slug="org-alpha", creator=user)
        org2 = Organisation.objects.create(name="Org Beta", slug="org-beta", creator=user)

        Membership.objects.create(user=user, organisation=org1, role="member")

        Project.objects.create(
            organisation=org1, creator=user, name="Club Alpha", slug="club-alpha"
        )
        Project.objects.create(organisation=org2, creator=user, name="Club Beta", slug="club-beta")

        perm, _ = Permission.objects.get_or_create(
            permission="project.view_all",
            defaults={
                "resource_type": "project",
                "description": "View all projects",
                "is_sensitive": False,
            },
        )
        role, _ = Role.objects.get_or_create(
            name="Land Admin",
            defaults={
                "scope": ScopeChoices.ORGANIZATION,
                "description": "Federation director",
            },
        )
        role.permissions.add(perm)

        RoleAssignment.objects.create(
            user=user,
            role=role,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=org1,
        )

        client = Client()
        client.force_login(user)

        response = client.get("/api/v1/projects/?page_size=250")
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()

        data = payload.get("data", payload)
        results = data.get("results", data if isinstance(data, list) else [])
        slugs = {p.get("slug") for p in results}

        assert "club-alpha" in slugs
        assert "club-beta" in slugs

        sample = next(p for p in results if p.get("slug") == "club-beta")
        assert "member_count" not in sample
        assert "seasons_count" not in sample
        assert "competitions_count" not in sample
        assert "matches_count" not in sample

        # Nested route should also allow cross-org read when user has view_all
        nested = client.get("/api/v1/organisations/org-beta/projects/?page_size=250")
        assert nested.status_code == status.HTTP_200_OK
        nested_payload = nested.json()
        nested_data = nested_payload.get("data", nested_payload)
        nested_results = nested_data.get(
            "results", nested_data if isinstance(nested_data, list) else []
        )
        nested_slugs = {p.get("slug") for p in nested_results}
        assert "club-beta" in nested_slugs
