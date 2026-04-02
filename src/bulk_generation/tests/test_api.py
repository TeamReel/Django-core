"""Tests for BulkGenerationJob API endpoints."""

from __future__ import annotations

import uuid

import pytest
from django.apps import apps
from rest_framework.test import APIClient

from src.bulk_generation.models import (
    BulkContentType,
    BulkGenerationItem,
    BulkGenerationJob,
    ItemStatus,
    JobStatus,
)
from tests.accounts.factories import VerifiedUserFactory

from .factories import (
    ActivityFactory,
    BulkGenerationItemFactory,
    BulkGenerationJobFactory,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return VerifiedUserFactory()


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def project_with_membership(user):
    """Create a project + membership for the test user."""
    from tests.video.factories import OrganisationFactory, ProjectFactory

    org = OrganisationFactory()
    project = ProjectFactory(organisation=org, creator=user)
    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    ProjectMembership.objects.create(user=user, project=project)
    return project


@pytest.fixture
def activities(project_with_membership):
    """Create 3 activities for the test project."""
    return [
        ActivityFactory(project=project_with_membership)
        for _ in range(3)
    ]


BASE_URL = "/api/v1/bulk-generate/"


@pytest.mark.django_db
class TestCreateBulkJob:
    """Tests for POST /api/v1/bulk-generate/"""

    def test_create_job_success(self, authenticated_client, project_with_membership, activities):
        data = {
            "project_id": str(project_with_membership.id),
            "content_type": "lineup",
            "activity_ids": [str(a.id) for a in activities],
        }
        response = authenticated_client.post(BASE_URL, data, format="json")
        assert response.status_code == 202
        assert response.data["status"] == "queued"
        assert response.data["content_type"] == "lineup"
        assert response.data["total_items"] == 3

        # Verify items created in DB
        job = BulkGenerationJob.objects.get(id=response.data["id"])
        assert job.items.count() == 3

    def test_create_job_with_metadata(self, authenticated_client, project_with_membership, activities):
        data = {
            "project_id": str(project_with_membership.id),
            "content_type": "match_intro",
            "activity_ids": [str(activities[0].id)],
            "metadata": {"template_id": "abc-123"},
        }
        response = authenticated_client.post(BASE_URL, data, format="json")
        assert response.status_code == 202
        assert response.data["metadata"] == {"template_id": "abc-123"}

    def test_create_job_unauthenticated(self, api_client):
        response = api_client.post(BASE_URL, {}, format="json")
        assert response.status_code in (401, 403)

    def test_create_job_not_project_member(self, authenticated_client, activities):
        """User without project membership gets 403."""
        from tests.video.factories import ProjectFactory

        other_project = ProjectFactory()
        other_activity = ActivityFactory(project=other_project)
        data = {
            "project_id": str(other_project.id),
            "content_type": "lineup",
            "activity_ids": [str(other_activity.id)],
        }
        response = authenticated_client.post(BASE_URL, data, format="json")
        assert response.status_code == 403

    def test_create_job_project_not_found(self, authenticated_client):
        data = {
            "project_id": 999999,
            "content_type": "lineup",
            "activity_ids": [str(uuid.uuid4())],
        }
        response = authenticated_client.post(BASE_URL, data, format="json")
        assert response.status_code == 404

    def test_create_job_activity_not_in_project(
        self, authenticated_client, project_with_membership
    ):
        """Activities from another project are rejected."""
        from tests.video.factories import ProjectFactory

        other_project = ProjectFactory()
        other_activity = ActivityFactory(project=other_project)

        data = {
            "project_id": str(project_with_membership.id),
            "content_type": "lineup",
            "activity_ids": [str(other_activity.id)],
        }
        response = authenticated_client.post(BASE_URL, data, format="json")
        assert response.status_code == 400
        assert "not found" in response.data["error"].lower()

    def test_create_job_empty_activity_list(self, authenticated_client, project_with_membership):
        data = {
            "project_id": str(project_with_membership.id),
            "content_type": "lineup",
            "activity_ids": [],
        }
        response = authenticated_client.post(BASE_URL, data, format="json")
        assert response.status_code == 400

    def test_create_job_invalid_content_type(
        self, authenticated_client, project_with_membership, activities
    ):
        data = {
            "project_id": str(project_with_membership.id),
            "content_type": "invalid_type",
            "activity_ids": [str(activities[0].id)],
        }
        response = authenticated_client.post(BASE_URL, data, format="json")
        assert response.status_code == 400


@pytest.mark.django_db
class TestListBulkJobs:
    """Tests for GET /api/v1/bulk-generate/"""

    def test_list_jobs(self, authenticated_client, project_with_membership):
        BulkGenerationJobFactory(project=project_with_membership)
        BulkGenerationJobFactory(project=project_with_membership)

        response = authenticated_client.get(BASE_URL)
        assert response.status_code == 200
        # Pagination wrapper: {"data": [...], "meta": {"pagination": {"count": N}}}
        assert len(response.data["data"]) == 2

    def test_list_jobs_scoped_to_user(self, authenticated_client, project_with_membership):
        """User only sees jobs from their own projects."""
        from tests.video.factories import ProjectFactory

        BulkGenerationJobFactory(project=project_with_membership)
        BulkGenerationJobFactory(project=ProjectFactory())  # Other project

        response = authenticated_client.get(BASE_URL)
        assert len(response.data["data"]) == 1

    def test_list_jobs_filter_by_project(
        self, authenticated_client, project_with_membership, user
    ):
        from tests.video.factories import OrganisationFactory, ProjectFactory

        # Second project for same user
        org2 = OrganisationFactory()
        project2 = ProjectFactory(organisation=org2)
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        ProjectMembership.objects.create(user=user, project=project2)

        BulkGenerationJobFactory(project=project_with_membership)
        BulkGenerationJobFactory(project=project2)

        response = authenticated_client.get(
            BASE_URL, {"project": str(project_with_membership.id)}
        )
        assert len(response.data["data"]) == 1


@pytest.mark.django_db
class TestRetrieveBulkJob:
    """Tests for GET /api/v1/bulk-generate/{id}/"""

    def test_retrieve_job(self, authenticated_client, project_with_membership):
        job = BulkGenerationJobFactory(project=project_with_membership, total_items=5)
        response = authenticated_client.get(f"{BASE_URL}{job.id}/")
        assert response.status_code == 200
        assert response.data["id"] == str(job.id)
        assert response.data["progress_percent"] == 0


@pytest.mark.django_db
class TestCancelBulkJob:
    """Tests for POST /api/v1/bulk-generate/{id}/cancel/"""

    def test_cancel_queued_job(self, authenticated_client, project_with_membership):
        job = BulkGenerationJobFactory(
            project=project_with_membership, status=JobStatus.QUEUED
        )
        activity = ActivityFactory(project=project_with_membership)
        BulkGenerationItemFactory(bulk_job=job, activity=activity, status=ItemStatus.PENDING)

        response = authenticated_client.post(f"{BASE_URL}{job.id}/cancel/")
        assert response.status_code == 200
        assert response.data["status"] == "cancelled"

    def test_cancel_completed_job_fails(self, authenticated_client, project_with_membership):
        job = BulkGenerationJobFactory(
            project=project_with_membership, status=JobStatus.COMPLETED
        )
        response = authenticated_client.post(f"{BASE_URL}{job.id}/cancel/")
        assert response.status_code == 400


@pytest.mark.django_db
class TestRetryFailedItems:
    """Tests for POST /api/v1/bulk-generate/{id}/retry-failed/"""

    def test_retry_failed_items(self, authenticated_client, project_with_membership):
        job = BulkGenerationJobFactory(
            project=project_with_membership,
            status=JobStatus.PARTIALLY_COMPLETED,
            total_items=2,
            completed_items=1,
            failed_items=1,
        )
        activity = ActivityFactory(project=project_with_membership)
        BulkGenerationItemFactory(
            bulk_job=job, activity=activity, status=ItemStatus.FAILED,
        )
        activity2 = ActivityFactory(project=project_with_membership)
        BulkGenerationItemFactory(
            bulk_job=job, activity=activity2, status=ItemStatus.COMPLETED,
        )

        response = authenticated_client.post(f"{BASE_URL}{job.id}/retry-failed/")
        assert response.status_code == 200
        assert response.data["status"] == "processing"

        # Failed item should be reset to pending
        assert job.items.filter(status=ItemStatus.PENDING).count() == 1
        assert job.items.filter(status=ItemStatus.COMPLETED).count() == 1

    def test_retry_no_failed_items(self, authenticated_client, project_with_membership):
        job = BulkGenerationJobFactory(
            project=project_with_membership,
            status=JobStatus.COMPLETED,
        )
        response = authenticated_client.post(f"{BASE_URL}{job.id}/retry-failed/")
        assert response.status_code == 400


@pytest.mark.django_db
class TestListBulkJobItems:
    """Tests for GET /api/v1/bulk-generate/{id}/items/"""

    def test_list_items(self, authenticated_client, project_with_membership):
        job = BulkGenerationJobFactory(project=project_with_membership, total_items=2)
        a1 = ActivityFactory(project=project_with_membership)
        a2 = ActivityFactory(project=project_with_membership)
        BulkGenerationItemFactory(bulk_job=job, activity=a1)
        BulkGenerationItemFactory(bulk_job=job, activity=a2)

        response = authenticated_client.get(f"{BASE_URL}{job.id}/items/")
        assert response.status_code == 200
        assert len(response.data["data"]) == 2

    def test_list_items_filter_status(self, authenticated_client, project_with_membership):
        job = BulkGenerationJobFactory(project=project_with_membership, total_items=2)
        a1 = ActivityFactory(project=project_with_membership)
        a2 = ActivityFactory(project=project_with_membership)
        BulkGenerationItemFactory(bulk_job=job, activity=a1, status=ItemStatus.COMPLETED)
        BulkGenerationItemFactory(bulk_job=job, activity=a2, status=ItemStatus.FAILED)

        response = authenticated_client.get(
            f"{BASE_URL}{job.id}/items/", {"status": "completed"}
        )
        assert len(response.data["data"]) == 1
