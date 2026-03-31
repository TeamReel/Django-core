"""Dashboard statistics service.

Gathers platform-wide statistics for the admin monitoring dashboard.
All results are cached via Django's cache framework (Redis, TTL 300s).
"""

from __future__ import annotations

from datetime import timedelta
from typing import TypedDict

from django.core.cache import cache
from django.db.models import Avg, Count, F
from django.utils import timezone


class PlatformStats(TypedDict):
    """Platform overview statistics."""

    organisations_count: int
    projects_count: int
    members_count: int
    periods_count: int
    activities_count: int
    participations_count: int
    users_count: int
    file_assets_count: int


class AIStats(TypedDict):
    """AI generation pipeline statistics."""

    requests_by_status: dict[str, int]
    requests_by_provider: dict[str, int]
    total_outputs: int
    avg_processing_seconds: float | None


class ContentStats(TypedDict):
    """Content production statistics."""

    items_by_status: dict[str, int]
    templates_active: int
    templates_inactive: int
    approval_rate: float | None
    pending_approvals: int


class VideoStats(TypedDict):
    """Video processing statistics."""

    jobs_by_status: dict[str, int]
    jobs_by_type: dict[str, int]
    stale_jobs_count: int


PLATFORM_STATS_CACHE_KEY = "dashboard:platform_stats"
AI_STATS_CACHE_KEY = "dashboard:ai_stats"
CONTENT_STATS_CACHE_KEY = "dashboard:content_stats"
VIDEO_STATS_CACHE_KEY = "dashboard:video_stats"
CACHE_TTL = 300  # 5 minutes


class DashboardStatsService:
    """Gathers and caches dashboard statistics."""

    # ── Platform stats ──────────────────────────────────────────────

    @staticmethod
    def get_platform_stats(*, use_cache: bool = True) -> PlatformStats:
        """Return platform-wide counts for core models."""
        if use_cache:
            cached = cache.get(PLATFORM_STATS_CACHE_KEY)
            if cached is not None:
                return cached

        stats = DashboardStatsService._compute_platform_stats()
        cache.set(PLATFORM_STATS_CACHE_KEY, stats, CACHE_TTL)
        return stats

    @staticmethod
    def _compute_platform_stats() -> PlatformStats:
        """Execute count queries for all platform models."""
        from accounts.models import User
        from activities.models import Activity, Participation, Period
        from files.models import FileAsset
        from organisations.models import Membership, Organisation
        from projects.models import Project

        return PlatformStats(
            organisations_count=Organisation.objects.filter(is_active=True).count(),
            projects_count=Project.objects.filter(is_active=True).count(),
            members_count=Membership.objects.filter(is_active=True).count(),
            periods_count=Period.objects.filter(deleted_at__isnull=True).count(),
            activities_count=Activity.objects.filter(deleted_at__isnull=True).count(),
            participations_count=Participation.objects.filter(
                deleted_at__isnull=True
            ).count(),
            users_count=User.objects.filter(is_active=True).count(),
            file_assets_count=FileAsset.objects.filter(is_deleted=False).count(),
        )

    @staticmethod
    def invalidate_platform_stats() -> None:
        """Clear the platform stats cache."""
        cache.delete(PLATFORM_STATS_CACHE_KEY)

    # ── AI stats ────────────────────────────────────────────────────

    @staticmethod
    def get_ai_stats(*, use_cache: bool = True) -> AIStats:
        """Return AI generation pipeline statistics."""
        if use_cache:
            cached = cache.get(AI_STATS_CACHE_KEY)
            if cached is not None:
                return cached

        stats = DashboardStatsService._compute_ai_stats()
        cache.set(AI_STATS_CACHE_KEY, stats, CACHE_TTL)
        return stats

    @staticmethod
    def _compute_ai_stats() -> AIStats:
        from src.generative.models import (
            GenerationOutput,
            GenerationRequest,
            RequestStatus,
        )

        # Requests per status via single annotate query
        status_qs = (
            GenerationRequest.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        requests_by_status: dict[str, int] = {
            s.value: 0 for s in RequestStatus
        }
        for row in status_qs:
            requests_by_status[row["status"]] = row["count"]

        # Provider breakdown via template.pipeline_config->>'provider'
        provider_qs = (
            GenerationRequest.objects.values(
                provider=F("template__pipeline_config__provider")
            )
            .annotate(count=Count("id"))
            .order_by("provider")
        )
        requests_by_provider: dict[str, int] = {}
        for row in provider_qs:
            key = row["provider"] or "unknown"
            requests_by_provider[key] = row["count"]

        # Total outputs
        total_outputs = GenerationOutput.objects.count()

        # Average processing time for completed requests
        avg_result = GenerationRequest.objects.filter(
            status=RequestStatus.COMPLETED,
            started_at__isnull=False,
            completed_at__isnull=False,
        ).aggregate(
            avg_duration=Avg(F("completed_at") - F("started_at"))
        )
        avg_td = avg_result["avg_duration"]
        avg_processing_seconds = avg_td.total_seconds() if avg_td else None

        return AIStats(
            requests_by_status=requests_by_status,
            requests_by_provider=requests_by_provider,
            total_outputs=total_outputs,
            avg_processing_seconds=avg_processing_seconds,
        )

    @staticmethod
    def invalidate_ai_stats() -> None:
        cache.delete(AI_STATS_CACHE_KEY)

    # ── Content stats ───────────────────────────────────────────────

    @staticmethod
    def get_content_stats(*, use_cache: bool = True) -> ContentStats:
        """Return content production statistics."""
        if use_cache:
            cached = cache.get(CONTENT_STATS_CACHE_KEY)
            if cached is not None:
                return cached

        stats = DashboardStatsService._compute_content_stats()
        cache.set(CONTENT_STATS_CACHE_KEY, stats, CACHE_TTL)
        return stats

    @staticmethod
    def _compute_content_stats() -> ContentStats:
        from src.content_generation.models import (
            ContentItem,
            ContentStatus,
            ContentTemplate,
        )

        # Items per status
        status_qs = (
            ContentItem.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        items_by_status: dict[str, int] = {s.value: 0 for s in ContentStatus}
        for row in status_qs:
            items_by_status[row["status"]] = row["count"]

        # Template counts
        templates_active = ContentTemplate.objects.filter(is_active=True).count()
        templates_inactive = ContentTemplate.objects.filter(is_active=False).count()

        # Approval rate: approved / (approved + rejected)
        approved = items_by_status.get("approved", 0)
        rejected = items_by_status.get("rejected", 0)
        total_reviewed = approved + rejected
        approval_rate = (approved / total_reviewed * 100) if total_reviewed > 0 else None

        # Pending approvals: completed items not yet approved/rejected
        pending_approvals = ContentItem.objects.filter(
            status=ContentStatus.COMPLETED
        ).count()

        return ContentStats(
            items_by_status=items_by_status,
            templates_active=templates_active,
            templates_inactive=templates_inactive,
            approval_rate=approval_rate,
            pending_approvals=pending_approvals,
        )

    @staticmethod
    def invalidate_content_stats() -> None:
        cache.delete(CONTENT_STATS_CACHE_KEY)

    # ── Video stats ─────────────────────────────────────────────────

    @staticmethod
    def get_video_stats(*, use_cache: bool = True) -> VideoStats:
        """Return video processing statistics."""
        if use_cache:
            cached = cache.get(VIDEO_STATS_CACHE_KEY)
            if cached is not None:
                return cached

        stats = DashboardStatsService._compute_video_stats()
        cache.set(VIDEO_STATS_CACHE_KEY, stats, CACHE_TTL)
        return stats

    @staticmethod
    def _compute_video_stats() -> VideoStats:
        from src.video.models import JobStatus, JobType, VideoJob

        # Jobs per status
        status_qs = (
            VideoJob.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        jobs_by_status: dict[str, int] = {s.value: 0 for s in JobStatus}
        for row in status_qs:
            jobs_by_status[row["status"]] = row["count"]

        # Jobs per type
        type_qs = (
            VideoJob.objects.values("job_type")
            .annotate(count=Count("id"))
            .order_by("job_type")
        )
        jobs_by_type: dict[str, int] = {t.value: 0 for t in JobType}
        for row in type_qs:
            jobs_by_type[row["job_type"]] = row["count"]

        # Stale jobs: processing for > 30 minutes
        stale_threshold = timezone.now() - timedelta(minutes=30)
        stale_jobs_count = VideoJob.objects.filter(
            status=JobStatus.PROCESSING,
            started_at__lt=stale_threshold,
        ).count()

        return VideoStats(
            jobs_by_status=jobs_by_status,
            jobs_by_type=jobs_by_type,
            stale_jobs_count=stale_jobs_count,
        )

    @staticmethod
    def invalidate_video_stats() -> None:
        cache.delete(VIDEO_STATS_CACHE_KEY)
