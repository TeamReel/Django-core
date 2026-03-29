import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from organisations.models import Membership, Organisation
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestOrganisationListPermissions:
    def test_org_list_defaults_to_memberships(self):
        user = User.objects.create_user(
            email="u1@example.com",
            password="TestPass123!",
            is_active=True,
            email_verified=True,
        )

        org1 = Organisation.objects.create(name="Org One", slug="org-one", creator=user)
        Organisation.objects.create(name="Org Two", slug="org-two", creator=user)

        Membership.objects.create(user=user, organisation=org1, role="member")

        client = Client()
        client.force_login(user)

        response = client.get("/api/v1/organisations/?page_size=250")
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()

        # Handle envelope or plain pagination
        data = payload.get("data", payload)
        results = data.get("results", data if isinstance(data, list) else [])

        slugs = {o.get("slug") for o in results}
        assert "org-one" in slugs
        assert "org-two" not in slugs

    def test_org_list_with_org_view_all_lists_all_orgs_minimal_fields(self):
        user = User.objects.create_user(
            email="u2@example.com",
            password="TestPass123!",
            is_active=True,
            email_verified=True,
        )

        org1 = Organisation.objects.create(name="Org Alpha", slug="org-alpha", creator=user)
        Organisation.objects.create(name="Org Beta", slug="org-beta", creator=user)

        Membership.objects.create(user=user, organisation=org1, role="member")

        perm, _ = Permission.objects.get_or_create(
            permission="org.view_all",
            defaults={
                "resource_type": "organisation",
                "description": "View all organisations",
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

        response = client.get("/api/v1/organisations/?page_size=250")
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()

        data = payload.get("data", payload)
        results = data.get("results", data if isinstance(data, list) else [])
        slugs = {o.get("slug") for o in results}

        assert "org-alpha" in slugs
        assert "org-beta" in slugs

        # Minimal serializer should not include member_count/user_role when cross-org
        sample = next(o for o in results if o.get("slug") == "org-beta")
        assert "member_count" not in sample
        assert "user_role" not in sample
