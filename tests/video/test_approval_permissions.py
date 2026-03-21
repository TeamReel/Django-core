"""Integration tests for video approval/reject permissions across user roles and hierarchy.

Tests the full permission chain for approve/reject endpoints:
1. DRF permission layer (IsProjectMember) — can the user access the endpoint?
2. Workflow engine permission — does the workflow transition actually execute?

Test matrix:
┌─────────────────┬───────────────┬──────────┬───────────────┬────────────────────┐
│ User             │ Membership    │ Action   │ HTTP Expected │ Workflow Expected  │
├─────────────────┼───────────────┼──────────┼───────────────┼────────────────────┤
│ Team Admin       │ team (admin)  │ approve  │ 200           │ transition OK      │
│ Team Editor      │ team (editor) │ approve  │ 200           │ transition OK      │
│ Team Viewer      │ team (viewer) │ approve  │ 200           │ transition DENIED  │
│ Club Admin       │ club (admin)  │ approve  │ 200           │ transition OK      │
│ Club Editor      │ club (editor) │ approve  │ 200           │ transition OK      │
│ Club Viewer      │ club (viewer) │ approve  │ 200           │ transition DENIED  │
│ Team Admin→Club  │ team (admin)  │ approve  │ 403           │ N/A                │
│ Non-member       │ none          │ approve  │ 403           │ N/A                │
│ Anonymous        │ none          │ approve  │ 401           │ N/A                │
└─────────────────┴───────────────┴──────────┴───────────────┴────────────────────┘
"""

from __future__ import annotations

import pytest
from django.apps import apps
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.workflows.models import WorkflowInstance, WorkflowTemplate

# ── Video Approval workflow definition (matches seed_workflows.py) ──

VIDEO_APPROVAL_DEFINITION = {
    "states": [
        {"name": "processing", "is_initial": True, "is_terminal": False},
        {"name": "ready_for_review", "is_initial": False, "is_terminal": False},
        {"name": "approved", "is_initial": False, "is_terminal": True},
        {"name": "rejected", "is_initial": False, "is_terminal": True},
    ],
    "transitions": [
        {
            "action": "processing_complete",
            "from_state": "processing",
            "to_state": "ready_for_review",
            "permissions": [],
            "sync_hooks": [],
            "async_hooks": [],
        },
        {
            "action": "approve",
            "from_state": "ready_for_review",
            "to_state": "approved",
            "permissions": ["admin", "editor"],
            "sync_hooks": [],
            "async_hooks": [],
        },
        {
            "action": "reject",
            "from_state": "ready_for_review",
            "to_state": "rejected",
            "permissions": ["admin", "editor"],
            "sync_hooks": [],
            "async_hooks": [],
        },
    ],
}


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def org(db):
    """Create a test organisation."""
    from organisations.models import Organisation
    from tests.accounts.factories import UserFactory

    creator = UserFactory(is_active=True, email_verified=True)
    return Organisation.objects.create(name="Test Club", slug="test-club", creator=creator)


@pytest.fixture
def club_project(db, org):
    """Parent project (club level)."""
    from projects.models import Project

    return Project.objects.create(
        name="Club Project",
        slug="club-project",
        organisation=org,
        creator=org.creator,
        parent_project=None,
    )


@pytest.fixture
def team_project(db, org, club_project):
    """Child project (team level), linked to club."""
    from projects.models import Project

    return Project.objects.create(
        name="Team A",
        slug="team-a",
        organisation=org,
        creator=org.creator,
        parent_project=club_project,
    )


@pytest.fixture
def workflow_template(db):
    """Video Approval workflow template."""
    return WorkflowTemplate.objects.create(
        name="Video Approval (test)",
        version="1.0.0",
        definition=VIDEO_APPROVAL_DEFINITION,
        is_active=True,
    )


def _make_user(django_user_model, email: str):
    """Create an active user."""
    return django_user_model.objects.create_user(
        username=email.split("@")[0],
        email=email,
        password="testpass123",
        is_active=True,
    )


def _add_membership(user, project, role: str):
    """Add project membership with specified role."""
    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    return ProjectMembership.objects.create(user=user, project=project, role=role, deleted_at=None)


def _create_completed_job_with_workflow(
    project, workflow_template, created_by, output_file=None
) -> VideoJob:
    """Create a COMPLETED video job with workflow at 'ready_for_review' state."""
    from tests.video.factories import FileFactory

    # Create output file if not provided
    if output_file is None:
        output_file = FileFactory(organization=project.organisation)

    input_file = FileFactory(organization=project.organisation)

    # Create workflow instance at ready_for_review
    ct = ContentType.objects.get_for_model(VideoJob)
    instance = WorkflowInstance.objects.create(
        workflow=workflow_template,
        workflow_snapshot=workflow_template.definition,
        project=project,
        content_type=ct,
        object_id=0,  # will be updated
        current_state="ready_for_review",
        context={},
        version=0,
        created_by=created_by,
    )

    # Create completed video job linked to workflow
    job = VideoJob.objects.create(
        project=project,
        created_by=created_by,
        job_type="lineup",
        status=JobStatus.COMPLETED,
        input_file=input_file,
        output_file=output_file,
        workflow_instance=instance,
        metadata={},
    )

    # Update workflow object_id to job PK
    instance.object_id = job.pk
    instance.save(update_fields=["object_id"])

    return job


# ═══════════════════════════════════════════════════════════════════
# DIRECT MEMBERSHIP TESTS — User is member of the team project itself
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestDirectMembershipApproval:
    """Tests for users with direct membership on the video's project."""

    def test_team_admin_can_approve(
        self, api_client, team_project, workflow_template, django_user_model
    ):
        """Team Admin (admin role on team) can approve and workflow transitions."""
        user = _make_user(django_user_model, "team-admin@test.com")
        _add_membership(user, team_project, "admin")
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-approve", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        job.refresh_from_db()
        assert job.metadata.get("approval_status") == "approved"
        # Workflow should have transitioned to 'approved'
        job.workflow_instance.refresh_from_db()
        assert job.workflow_instance.current_state == "approved"

    def test_team_editor_can_approve(
        self, api_client, team_project, workflow_template, django_user_model
    ):
        """Team Editor (editor role on team) can approve and workflow transitions."""
        user = _make_user(django_user_model, "team-editor@test.com")
        _add_membership(user, team_project, "editor")
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-approve", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        job.workflow_instance.refresh_from_db()
        assert job.workflow_instance.current_state == "approved"

    def test_team_viewer_gets_200_but_workflow_stays(
        self, api_client, team_project, workflow_template, django_user_model
    ):
        """Team Viewer can access endpoint (has membership) but workflow transition is denied.

        The approve endpoint saves metadata regardless (best-effort workflow),
        so HTTP is 200 but the workflow stays at ready_for_review.
        """
        user = _make_user(django_user_model, "team-viewer@test.com")
        _add_membership(user, team_project, "viewer")
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-approve", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        # DRF permission passes (viewer IS a member), HTTP 200
        assert response.status_code == status.HTTP_200_OK
        job.refresh_from_db()
        assert job.metadata.get("approval_status") == "approved"
        # BUT workflow should NOT have transitioned (viewer not in ["admin", "editor"])
        job.workflow_instance.refresh_from_db()
        assert job.workflow_instance.current_state == "ready_for_review"

    def test_team_admin_can_reject(
        self, api_client, team_project, workflow_template, django_user_model
    ):
        """Team Admin can reject and workflow transitions to 'rejected'."""
        user = _make_user(django_user_model, "team-admin-reject@test.com")
        _add_membership(user, team_project, "admin")
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-reject", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        job.refresh_from_db()
        assert job.metadata.get("approval_status") == "rejected"
        job.workflow_instance.refresh_from_db()
        assert job.workflow_instance.current_state == "rejected"


# ═══════════════════════════════════════════════════════════════════
# HIERARCHY TESTS — Club member acts on team-level video
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestHierarchyApproval:
    """Tests for club-level users acting on team-level video jobs.

    Club Admin/Editor should be able to approve/reject videos for child teams,
    even without direct membership on the team project.
    """

    def test_club_admin_can_approve_team_video(
        self,
        api_client,
        club_project,
        team_project,
        workflow_template,
        django_user_model,
    ):
        """Club Admin (admin on parent) can approve team video — full hierarchy chain."""
        user = _make_user(django_user_model, "club-admin@test.com")
        _add_membership(user, club_project, "admin")
        # NO membership on team_project!
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-approve", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        job.refresh_from_db()
        assert job.metadata.get("approval_status") == "approved"
        # Workflow should also transition (admin is in permissions list)
        job.workflow_instance.refresh_from_db()
        assert job.workflow_instance.current_state == "approved"

    def test_club_editor_can_approve_team_video(
        self,
        api_client,
        club_project,
        team_project,
        workflow_template,
        django_user_model,
    ):
        """Club Editor (editor on parent) can approve team video."""
        user = _make_user(django_user_model, "club-editor@test.com")
        _add_membership(user, club_project, "editor")
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-approve", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        job.workflow_instance.refresh_from_db()
        assert job.workflow_instance.current_state == "approved"

    def test_club_viewer_cannot_approve_team_video_workflow(
        self,
        api_client,
        club_project,
        team_project,
        workflow_template,
        django_user_model,
    ):
        """Club Viewer can access endpoint (via hierarchy) but workflow denies transition.

        Viewer role is not in the approve transition's permissions list.
        """
        user = _make_user(django_user_model, "club-viewer@test.com")
        _add_membership(user, club_project, "viewer")
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-approve", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        # DRF allows access (viewer is a club member, hierarchy grants access)
        assert response.status_code == status.HTTP_200_OK
        # But workflow stays at ready_for_review (viewer not in ["admin", "editor"])
        job.workflow_instance.refresh_from_db()
        assert job.workflow_instance.current_state == "ready_for_review"

    def test_club_admin_can_reject_team_video(
        self,
        api_client,
        club_project,
        team_project,
        workflow_template,
        django_user_model,
    ):
        """Club Admin can reject team video with full workflow transition."""
        user = _make_user(django_user_model, "club-admin-reject@test.com")
        _add_membership(user, club_project, "admin")
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-reject", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        job.workflow_instance.refresh_from_db()
        assert job.workflow_instance.current_state == "rejected"


# ═══════════════════════════════════════════════════════════════════
# UPWARD HIERARCHY — Team member should NOT access club-level videos
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestUpwardHierarchyBlocked:
    """Team Admin cannot approve club-level videos (no upward traversal)."""

    def test_team_admin_cannot_approve_club_video(
        self,
        api_client,
        club_project,
        team_project,
        workflow_template,
        django_user_model,
    ):
        """Team Admin has membership on child team — cannot approve parent club video.

        The queryset only includes projects the user is a member of (and their
        children), so the club video is simply not found → 404.
        """
        user = _make_user(django_user_model, "team-only-admin@test.com")
        _add_membership(user, team_project, "admin")
        # Job is on the CLUB project
        job = _create_completed_job_with_workflow(
            club_project, workflow_template, club_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-approve", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        # Queryset filters out club videos for team-only members → 404
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ═══════════════════════════════════════════════════════════════════
# ACCESS BOUNDARY TESTS — Non-members and anonymous
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestAccessBoundaries:
    """Users without any membership or unauthenticated users are blocked."""

    def test_non_member_cannot_approve(
        self, api_client, team_project, workflow_template, django_user_model
    ):
        """User with no membership on project or parent gets 404 (queryset filters out)."""
        user = _make_user(django_user_model, "outsider@test.com")
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-approve", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_anonymous_cannot_approve(self, api_client, team_project, workflow_template):
        """Unauthenticated request gets 401."""
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        url = reverse("video:videojob-approve", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_member_cannot_reject(
        self, api_client, team_project, workflow_template, django_user_model
    ):
        """Non-member also cannot reject (job not in queryset → 404)."""
        user = _make_user(django_user_model, "outsider-reject@test.com")
        job = _create_completed_job_with_workflow(
            team_project, workflow_template, team_project.creator
        )

        api_client.force_authenticate(user=user)
        url = reverse("video:videojob-reject", kwargs={"pk": str(job.pk)})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
