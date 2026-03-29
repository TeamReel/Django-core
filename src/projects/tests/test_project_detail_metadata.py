import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from organisations.models import Membership, Organisation
from projects.models import Project
from rest_framework import status

User = get_user_model()


def _unwrap(raw: dict):
    return raw.get("data", raw)


@pytest.mark.django_db
class TestProjectDetailMetadata:
    def test_project_detail_includes_metadata_identity_default_location(self):
        user = User.objects.create_user(
            email="u_proj_meta_1@example.com",
            password="TestPass123!",
            is_active=True,
            email_verified=True,
        )

        org = Organisation.objects.create(name="Org One", slug="org-one", creator=user)
        Membership.objects.create(user=user, organisation=org, role="admin")

        project = Project.objects.create(
            organisation=org,
            creator=user,
            name="Feyenoord",
            slug="feyenoord",
            metadata={"identity": {"default_location": "De Kuip"}},
        )

        client = Client()
        client.force_login(user)

        response = client.get(f"/api/v1/projects/{project.id}/")
        assert response.status_code == status.HTTP_200_OK

        payload = _unwrap(response.json())
        assert payload.get("metadata", {}).get("identity", {}).get("default_location") == "De Kuip"

    def test_project_patch_can_update_metadata_identity_default_location(self):
        user = User.objects.create_user(
            email="u_proj_meta_2@example.com",
            password="TestPass123!",
            is_active=True,
            email_verified=True,
        )

        org = Organisation.objects.create(name="Org Two", slug="org-two", creator=user)
        Membership.objects.create(user=user, organisation=org, role="admin")

        project = Project.objects.create(
            organisation=org,
            creator=user,
            name="Ajax",
            slug="ajax",
            metadata={"identity": {"default_location": "Johan Cruijff ArenA"}, "other": {"x": 1}},
        )

        client = Client()
        client.force_login(user)

        response = client.patch(
            f"/api/v1/projects/{project.id}/",
            data={
                "metadata": {"identity": {"default_location": "Johan Cruijff ArenA (Amsterdam)"}}
            },
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_200_OK

        body = _unwrap(response.json())
        assert (
            body.get("metadata", {}).get("identity", {}).get("default_location")
            == "Johan Cruijff ArenA (Amsterdam)"
        )

        project.refresh_from_db()
        assert (
            project.metadata.get("identity", {}).get("default_location")
            == "Johan Cruijff ArenA (Amsterdam)"
        )
        # Shallow-merge: keep unrelated top-level keys
        assert project.metadata.get("other", {}).get("x") == 1
