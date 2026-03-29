"""Tests for presigned-urls endpoint org-scoping (Q032).

Validates that the /files/presigned-urls/ endpoint:
- Requires X-Organization-ID header
- Rejects users who are not members of the org
- Only returns URLs for paths belonging to the org
- Handles structural path prefixes (uploads/{org_id}/, clubs/{slug}-{id}/)
- Handles member asset paths (members/{uuid}/)
"""

import uuid
from unittest.mock import patch

import pytest
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from files.models import FileAsset
from organisations.models import Membership, Organisation
from projects.models import Project, ProjectMembership


@pytest.fixture
def user_a(db):
    """User belonging to org_a."""
    return User.objects.create_user(email="user-a@test.com", password="Test123!@#")


@pytest.fixture
def user_b(db):
    """User belonging to org_b only."""
    return User.objects.create_user(email="user-b@test.com", password="Test123!@#")


@pytest.fixture
def org_a(db, user_a):
    """Organisation A."""
    return Organisation.objects.create(name="Org A", creator=user_a)


@pytest.fixture
def org_b(db, user_b):
    """Organisation B."""
    return Organisation.objects.create(name="Org B", creator=user_b)


@pytest.fixture
def membership_a(db, user_a, org_a):
    """Active membership for user_a in org_a."""
    return Membership.objects.create(user=user_a, organisation=org_a, is_active=True)


@pytest.fixture
def membership_b(db, user_b, org_b):
    """Active membership for user_b in org_b."""
    return Membership.objects.create(user=user_b, organisation=org_b, is_active=True)


@pytest.fixture
def project_a(db, org_a, user_a):
    """A club project in org_a."""
    return Project.objects.create(
        name="FC Test",
        slug="fc-test",
        organisation=org_a,
        creator=user_a,
    )


@pytest.fixture
def member_in_a(db, project_a, user_a):
    """A ProjectMembership in org_a's project."""
    return ProjectMembership.objects.create(
        project=project_a,
        user=user_a,
    )


@pytest.fixture
def file_in_a(db, org_a, user_a):
    """A FileAsset belonging to org_a."""
    return FileAsset.objects.create(
        organization=org_a,
        uploaded_by=user_a,
        original_name="photo.jpg",
        storage_path=f"uploads/{org_a.id}/photo.jpg",
        file_size=1024,
        mime_type="image/jpeg",
    )


@pytest.fixture
def file_in_b(db, org_b, user_b):
    """A FileAsset belonging to org_b."""
    return FileAsset.objects.create(
        organization=org_b,
        uploaded_by=user_b,
        original_name="secret.jpg",
        storage_path=f"uploads/{org_b.id}/secret.jpg",
        file_size=1024,
        mime_type="image/jpeg",
    )


@pytest.fixture
def client_a(user_a):
    """Authenticated API client for user_a."""
    client = APIClient()
    client.force_authenticate(user=user_a)
    return client


@pytest.fixture
def client_b(user_b):
    """Authenticated API client for user_b."""
    client = APIClient()
    client.force_authenticate(user=user_b)
    return client


URL = "/api/v1/files/presigned-urls/"


@pytest.mark.django_db
class TestPresignedUrlsOrgScoping:
    """Q032: presigned-urls must validate org ownership."""

    def test_missing_org_header_returns_400(self, client_a):
        """Request without X-Organization-ID header returns 400."""
        resp = client_a.post(URL, {"paths": ["some/path.jpg"]}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "X-Organization-ID" in resp.data["detail"]

    def test_non_member_returns_403(self, client_b, org_a, membership_b):
        """User not in org gets 403."""
        resp = client_b.post(
            URL,
            {"paths": ["some/path.jpg"]},
            format="json",
            HTTP_X_ORGANIZATION_ID=str(org_a.id),
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_org_id_returns_403(self, client_a, membership_a):
        """Bogus org UUID returns 403."""
        resp = client_a.post(
            URL,
            {"paths": ["some/path.jpg"]},
            format="json",
            HTTP_X_ORGANIZATION_ID=str(uuid.uuid4()),
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @patch("files.views.get_storage_backend")
    def test_own_file_gets_url(self, mock_backend_fn, client_a, org_a, membership_a, file_in_a):
        """File belonging to org_a is resolved for user_a."""
        mock_backend = mock_backend_fn.return_value
        mock_backend.get_url.return_value = "https://s3.example.com/signed"

        resp = client_a.post(
            URL,
            {"paths": [file_in_a.storage_path]},
            format="json",
            HTTP_X_ORGANIZATION_ID=str(org_a.id),
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["urls"][file_in_a.storage_path] == "https://s3.example.com/signed"

    @patch("files.views.get_storage_backend")
    def test_other_org_file_returns_null(
        self, mock_backend_fn, client_a, org_a, org_b, membership_a, membership_b, file_in_b
    ):
        """File belonging to org_b returns null URL for user_a."""
        mock_backend = mock_backend_fn.return_value
        mock_backend.get_url.return_value = "https://s3.example.com/should-not-appear"

        resp = client_a.post(
            URL,
            {"paths": [file_in_b.storage_path]},
            format="json",
            HTTP_X_ORGANIZATION_ID=str(org_a.id),
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["urls"][file_in_b.storage_path] is None

    @patch("files.views.get_storage_backend")
    def test_structural_prefix_allowed(self, mock_backend_fn, client_a, org_a, membership_a):
        """Storage paths under uploads/{org_id}/ are allowed by prefix."""
        mock_backend = mock_backend_fn.return_value
        mock_backend.get_url.return_value = "https://s3.example.com/signed"

        path = f"uploads/{org_a.id}/some/nested/file.png"
        resp = client_a.post(
            URL,
            {"paths": [path]},
            format="json",
            HTTP_X_ORGANIZATION_ID=str(org_a.id),
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["urls"][path] is not None

    @patch("files.views.get_storage_backend")
    def test_club_prefix_allowed(
        self, mock_backend_fn, client_a, org_a, membership_a, project_a
    ):
        """Storage paths under clubs/{slug}-{id}/ are allowed."""
        mock_backend = mock_backend_fn.return_value
        mock_backend.get_url.return_value = "https://s3.example.com/signed"

        path = f"clubs/{project_a.slug}-{project_a.id}/assets/logo.png"
        resp = client_a.post(
            URL,
            {"paths": [path]},
            format="json",
            HTTP_X_ORGANIZATION_ID=str(org_a.id),
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["urls"][path] is not None

    @patch("files.views.get_storage_backend")
    def test_member_path_allowed(
        self, mock_backend_fn, client_a, org_a, membership_a, member_in_a
    ):
        """Storage paths under members/{membership_id}/ are allowed for org members."""
        mock_backend = mock_backend_fn.return_value
        mock_backend.get_url.return_value = "https://s3.example.com/signed"

        path = f"members/{member_in_a.id}/processed/fullbody/home/image.webp"
        resp = client_a.post(
            URL,
            {"paths": [path]},
            format="json",
            HTTP_X_ORGANIZATION_ID=str(org_a.id),
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["urls"][path] is not None

    @patch("files.views.get_storage_backend")
    def test_member_path_other_org_denied(
        self, mock_backend_fn, client_a, org_a, org_b, membership_a, membership_b, user_b
    ):
        """Member UUID from another org's project returns null."""
        mock_backend = mock_backend_fn.return_value
        mock_backend.get_url.return_value = "https://s3.example.com/should-not-appear"

        other_project = Project.objects.create(
            name="Other Club", slug="other-club", organisation=org_b, creator=user_b
        )
        other_member = ProjectMembership.objects.create(
            project=other_project, user=user_b,
        )

        path = f"members/{other_member.id}/processed/fullbody/home/image.webp"
        resp = client_a.post(
            URL,
            {"paths": [path]},
            format="json",
            HTTP_X_ORGANIZATION_ID=str(org_a.id),
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["urls"][path] is None

    def test_unauthenticated_returns_401_or_403(self):
        """Unauthenticated request is rejected."""
        client = APIClient()
        resp = client.post(URL, {"paths": ["some/path.jpg"]}, format="json")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    @patch("files.views.get_storage_backend")
    def test_max_100_paths(self, mock_backend_fn, client_a, org_a, membership_a):
        """More than 100 paths returns 400."""
        resp = client_a.post(
            URL,
            {"paths": [f"uploads/{org_a.id}/file{i}.jpg" for i in range(101)]},
            format="json",
            HTTP_X_ORGANIZATION_ID=str(org_a.id),
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
