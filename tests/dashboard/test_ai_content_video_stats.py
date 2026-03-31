"""Tests for AI, Content, and Video stats in DashboardStatsService."""

from __future__ import annotations

from datetime import timedelta

import pytest
from dashboard.services import (
    AI_STATS_CACHE_KEY,
    DashboardStatsService,
)
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture()
def user(db):
    return User.objects.create_user(
        email="dash@test.com", password="test123",
        first_name="Dash", last_name="Test",
    )


@pytest.fixture()
def org(user):
    from organisations.models import Organisation

    return Organisation.objects.create(
        name="Test Org", slug="test-org", creator=user,
    )


@pytest.fixture()
def project(org, user):
    from projects.models import Project

    return Project.objects.create(
        name="Test Project", slug="test-project",
        organisation=org, creator=user,
    )


@pytest.fixture()
def gen_template(org, user):
    from src.generative.models import GenerationTemplate

    return GenerationTemplate.objects.create(
        organisation=org,
        name="Test Template",
        slug="test-tpl",
        version="1.0.0",
        input_schema={"type": "object"},
        pipeline_config={"provider": "gemini", "model": "gemini-pro"},
        created_by=user,
    )


# ── AI Stats ────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAIStats:
    def test_groups_by_status(self, gen_template, user):
        from src.generative.models import GenerationRequest, RequestStatus

        GenerationRequest.objects.create(
            template=gen_template, template_version="1.0.0",
            requester=user, status=RequestStatus.PENDING,
            input_data={},
        )
        GenerationRequest.objects.create(
            template=gen_template, template_version="1.0.0",
            requester=user, status=RequestStatus.COMPLETED,
            input_data={},
        )
        GenerationRequest.objects.create(
            template=gen_template, template_version="1.0.0",
            requester=user, status=RequestStatus.COMPLETED,
            input_data={},
        )

        stats = DashboardStatsService.get_ai_stats(use_cache=False)

        assert stats["requests_by_status"]["pending"] == 1
        assert stats["requests_by_status"]["completed"] == 2
        assert stats["requests_by_status"]["failed"] == 0

    def test_provider_breakdown(self, org, user):
        from src.generative.models import GenerationRequest, GenerationTemplate

        tpl_gemini = GenerationTemplate.objects.create(
            organisation=org, name="Gemini", slug="gem", version="1.0.0",
            input_schema={"type": "object"},
            pipeline_config={"provider": "gemini"},
            created_by=user,
        )
        tpl_openai = GenerationTemplate.objects.create(
            organisation=org, name="OpenAI", slug="oai", version="1.0.0",
            input_schema={"type": "object"},
            pipeline_config={"provider": "openai", "model": "gpt-4"},
            created_by=user,
        )

        GenerationRequest.objects.create(
            template=tpl_gemini, template_version="1.0.0",
            requester=user, input_data={},
        )
        GenerationRequest.objects.create(
            template=tpl_gemini, template_version="1.0.0",
            requester=user, input_data={},
        )
        GenerationRequest.objects.create(
            template=tpl_openai, template_version="1.0.0",
            requester=user, input_data={},
        )

        stats = DashboardStatsService.get_ai_stats(use_cache=False)

        assert stats["requests_by_provider"]["gemini"] == 2
        assert stats["requests_by_provider"]["openai"] == 1

    def test_avg_processing_time(self, gen_template, user):
        from src.generative.models import GenerationRequest, RequestStatus

        now = timezone.now()
        GenerationRequest.objects.create(
            template=gen_template, template_version="1.0.0",
            requester=user, status=RequestStatus.COMPLETED,
            input_data={},
            started_at=now - timedelta(seconds=60),
            completed_at=now,
        )
        GenerationRequest.objects.create(
            template=gen_template, template_version="1.0.0",
            requester=user, status=RequestStatus.COMPLETED,
            input_data={},
            started_at=now - timedelta(seconds=20),
            completed_at=now,
        )

        stats = DashboardStatsService.get_ai_stats(use_cache=False)

        # avg of 60s and 20s = 40s
        assert stats["avg_processing_seconds"] is not None
        assert abs(stats["avg_processing_seconds"] - 40.0) < 1.0

    def test_caching(self, db):
        stats1 = DashboardStatsService.get_ai_stats()
        assert cache.get(AI_STATS_CACHE_KEY) is not None

        stats2 = DashboardStatsService.get_ai_stats()
        assert stats1 == stats2

        DashboardStatsService.invalidate_ai_stats()
        assert cache.get(AI_STATS_CACHE_KEY) is None


# ── Content Stats ───────────────────────────────────────────────────


@pytest.mark.django_db
class TestContentStats:
    def test_approval_rate(self, project, user):
        from src.content_generation.models import (
            ContentItem,
            ContentStatus,
            ContentTemplate,
        )

        tpl = ContentTemplate.objects.create(
            name="Test", template_type="member",
            ai_workflow_id="test-wf", organisation=project.organisation,
            is_active=True,
        )

        # 3 approved, 1 rejected → 75%
        for _ in range(3):
            ContentItem.objects.create(
                template=tpl, project=project, created_by=user,
                status=ContentStatus.APPROVED,
            )
        ContentItem.objects.create(
            template=tpl, project=project, created_by=user,
            status=ContentStatus.REJECTED,
        )

        stats = DashboardStatsService.get_content_stats(use_cache=False)

        assert stats["approval_rate"] is not None
        assert abs(stats["approval_rate"] - 75.0) < 0.1

    def test_items_by_status(self, project, user):
        from src.content_generation.models import (
            ContentItem,
            ContentStatus,
            ContentTemplate,
        )

        tpl = ContentTemplate.objects.create(
            name="Status Test", template_type="member",
            ai_workflow_id="test-wf-2", organisation=project.organisation,
            is_active=True,
        )

        ContentItem.objects.create(
            template=tpl, project=project, created_by=user,
            status=ContentStatus.QUEUED,
        )
        ContentItem.objects.create(
            template=tpl, project=project, created_by=user,
            status=ContentStatus.GENERATING,
        )

        stats = DashboardStatsService.get_content_stats(use_cache=False)

        assert stats["items_by_status"]["queued"] == 1
        assert stats["items_by_status"]["generating"] == 1
        assert stats["items_by_status"]["completed"] == 0

    def test_template_counts(self, org):
        from src.content_generation.models import ContentTemplate

        ContentTemplate.objects.create(
            name="Active", template_type="member",
            ai_workflow_id="active-wf", organisation=org, is_active=True,
        )
        ContentTemplate.objects.create(
            name="Inactive", template_type="member",
            ai_workflow_id="inactive-wf", organisation=org, is_active=False,
        )

        stats = DashboardStatsService.get_content_stats(use_cache=False)

        assert stats["templates_active"] >= 1
        assert stats["templates_inactive"] >= 1


# ── Video Stats ─────────────────────────────────────────────────────


@pytest.mark.django_db
class TestVideoStats:
    def test_stale_jobs(self, project, user):
        from src.video.models import JobStatus, JobType, VideoJob

        # Processing for > 30 min → stale
        VideoJob.objects.create(
            project=project, created_by=user,
            job_type=JobType.COMPOSE, status=JobStatus.PROCESSING,
            started_at=timezone.now() - timedelta(minutes=45),
        )
        # Processing for < 30 min → not stale
        VideoJob.objects.create(
            project=project, created_by=user,
            job_type=JobType.COMPOSE, status=JobStatus.PROCESSING,
            started_at=timezone.now() - timedelta(minutes=10),
        )
        # Completed → not stale
        VideoJob.objects.create(
            project=project, created_by=user,
            job_type=JobType.COMPOSE, status=JobStatus.COMPLETED,
            started_at=timezone.now() - timedelta(minutes=60),
        )

        stats = DashboardStatsService.get_video_stats(use_cache=False)

        assert stats["stale_jobs_count"] == 1

    def test_type_breakdown(self, project, user):
        from src.video.models import JobType, VideoJob

        VideoJob.objects.create(
            project=project, created_by=user,
            job_type=JobType.TRANSCODE,
        )
        VideoJob.objects.create(
            project=project, created_by=user,
            job_type=JobType.THUMBNAIL,
        )
        VideoJob.objects.create(
            project=project, created_by=user,
            job_type=JobType.TRANSCODE,
        )

        stats = DashboardStatsService.get_video_stats(use_cache=False)

        assert stats["jobs_by_type"]["transcode"] == 2
        assert stats["jobs_by_type"]["thumbnail"] == 1

    def test_jobs_by_status(self, project, user):
        from src.video.models import JobStatus, JobType, VideoJob

        VideoJob.objects.create(
            project=project, created_by=user,
            job_type=JobType.COMPOSE, status=JobStatus.QUEUED,
        )
        VideoJob.objects.create(
            project=project, created_by=user,
            job_type=JobType.COMPOSE, status=JobStatus.COMPLETED,
        )

        stats = DashboardStatsService.get_video_stats(use_cache=False)

        assert stats["jobs_by_status"]["queued"] == 1
        assert stats["jobs_by_status"]["completed"] == 1
        assert stats["jobs_by_status"]["failed"] == 0
