"""Dashboard statistics service.

Gathers platform-wide statistics for the admin monitoring dashboard.
All results are cached via Django's cache framework (Redis, TTL 300s).
"""

from __future__ import annotations

from datetime import timedelta
from typing import TypedDict

from django.core.cache import cache
from django.db.models import Avg, Count, F, Sum
from django.db.models.functions import TruncWeek
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


class CreditsStats(TypedDict):
    """Credits usage statistics."""

    total_credits_allocated: int
    top_orgs: list[dict[str, int | str]]
    credits_this_month: int
    credits_last_month: int


class WeekRow(TypedDict):
    """Single row of weekly growth data."""

    week: str
    start_date: str
    organisations: int
    members: int
    content_items: int
    generation_requests: int
    delta_organisations: int
    delta_members: int
    delta_content_items: int
    delta_generation_requests: int


class GrowthStats(TypedDict):
    """Week-over-week growth statistics."""

    weeks: list[WeekRow]


class ModelInfo(TypedDict):
    """Single model info for data explorer."""

    name: str
    count: int
    admin_url: str


class AppInfo(TypedDict):
    """Single app info for data explorer."""

    label: str
    verbose_name: str
    models: list[ModelInfo]
    total_records: int
    fill_indicator: str  # 🟢 / 🟡 / 🔴


class DataExplorerStats(TypedDict):
    """Data explorer statistics."""

    apps: list[AppInfo]
    total_apps: int
    total_models: int
    total_records: int
    filled_tables_pct: float


PLATFORM_STATS_CACHE_KEY = "dashboard:platform_stats"
AI_STATS_CACHE_KEY = "dashboard:ai_stats"
CONTENT_STATS_CACHE_KEY = "dashboard:content_stats"
VIDEO_STATS_CACHE_KEY = "dashboard:video_stats"
CREDITS_STATS_CACHE_KEY = "dashboard:credits_stats"
GROWTH_STATS_CACHE_KEY = "dashboard:growth_stats"
DATA_EXPLORER_CACHE_KEY = "dashboard:data_explorer"
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

    # ── Credits stats ───────────────────────────────────────────────

    @staticmethod
    def get_credits_stats(*, use_cache: bool = True) -> CreditsStats:
        """Return credits usage statistics."""
        if use_cache:
            cached = cache.get(CREDITS_STATS_CACHE_KEY)
            if cached is not None:
                return cached

        stats = DashboardStatsService._compute_credits_stats()
        cache.set(CREDITS_STATS_CACHE_KEY, stats, CACHE_TTL)
        return stats

    @staticmethod
    def _compute_credits_stats() -> CreditsStats:
        from credits.models import CreditsBalance

        # Total credits allocated across all orgs
        total = CreditsBalance.objects.aggregate(
            total=Sum("current_balance")
        )["total"] or 0

        # Top 5 orgs by balance
        top_qs = (
            CreditsBalance.objects.select_related("organisation")
            .order_by("-current_balance")[:5]
        )
        top_orgs = [
            {"name": cb.organisation.name, "balance": cb.current_balance}
            for cb in top_qs
        ]

        # Credits created this month vs last month (based on CreditsBalance.created_at)
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_start.month == 1:
            prev_month_start = month_start.replace(year=month_start.year - 1, month=12)
        else:
            prev_month_start = month_start.replace(month=month_start.month - 1)

        credits_this_month = CreditsBalance.objects.filter(
            created_at__gte=month_start
        ).aggregate(total=Sum("current_balance"))["total"] or 0

        credits_last_month = CreditsBalance.objects.filter(
            created_at__gte=prev_month_start,
            created_at__lt=month_start,
        ).aggregate(total=Sum("current_balance"))["total"] or 0

        return CreditsStats(
            total_credits_allocated=total,
            top_orgs=top_orgs,
            credits_this_month=credits_this_month,
            credits_last_month=credits_last_month,
        )

    @staticmethod
    def invalidate_credits_stats() -> None:
        cache.delete(CREDITS_STATS_CACHE_KEY)

    # ── Growth stats ────────────────────────────────────────────────

    @staticmethod
    def get_growth_stats(*, use_cache: bool = True) -> GrowthStats:
        """Return week-over-week growth statistics (last 4 weeks)."""
        if use_cache:
            cached = cache.get(GROWTH_STATS_CACHE_KEY)
            if cached is not None:
                return cached

        stats = DashboardStatsService._compute_growth_stats()
        cache.set(GROWTH_STATS_CACHE_KEY, stats, CACHE_TTL)
        return stats

    @staticmethod
    def _compute_growth_stats() -> GrowthStats:
        from organisations.models import Membership, Organisation

        from src.content_generation.models import ContentItem
        from src.generative.models import GenerationRequest

        now = timezone.now()
        # Go back 5 weeks to get 4 weeks + deltas
        five_weeks_ago = now - timedelta(weeks=5)

        def _weekly_counts(qs, date_field: str) -> dict[str, int]:
            """Return {iso_week_start_str: count} for last 5 weeks."""
            rows = (
                qs.filter(**{f"{date_field}__gte": five_weeks_ago})
                .annotate(week=TruncWeek(date_field))
                .values("week")
                .annotate(count=Count("id"))
                .order_by("week")
            )
            return {
                row["week"].strftime("%Y-%m-%d"): row["count"]
                for row in rows
            }

        org_weeks = _weekly_counts(
            Organisation.objects.filter(is_active=True), "created_at"
        )
        member_weeks = _weekly_counts(
            Membership.objects.filter(is_active=True), "joined_at"
        )
        content_weeks = _weekly_counts(
            ContentItem.objects.filter(deleted_at__isnull=True), "created_at"
        )
        gen_weeks = _weekly_counts(
            GenerationRequest.objects.all(), "created_at"
        )

        # Build sorted list of all week keys (last 5 weeks)
        all_keys = sorted(
            set(org_weeks) | set(member_weeks) | set(content_weeks) | set(gen_weeks)
        )

        # Build rows with deltas (skip first week, it's only for delta calc)
        rows: list[WeekRow] = []
        for i, key in enumerate(all_keys):
            orgs = org_weeks.get(key, 0)
            members = member_weeks.get(key, 0)
            content = content_weeks.get(key, 0)
            gen_req = gen_weeks.get(key, 0)

            if i == 0:
                prev_orgs = prev_members = prev_content = prev_gen = 0
            else:
                prev_key = all_keys[i - 1]
                prev_orgs = org_weeks.get(prev_key, 0)
                prev_members = member_weeks.get(prev_key, 0)
                prev_content = content_weeks.get(prev_key, 0)
                prev_gen = gen_weeks.get(prev_key, 0)

            rows.append(WeekRow(
                week=key,
                start_date=key,
                organisations=orgs,
                members=members,
                content_items=content,
                generation_requests=gen_req,
                delta_organisations=orgs - prev_orgs,
                delta_members=members - prev_members,
                delta_content_items=content - prev_content,
                delta_generation_requests=gen_req - prev_gen,
            ))

        # Return last 4 weeks only (drop the oldest delta-seed week)
        return GrowthStats(weeks=rows[-4:] if len(rows) > 4 else rows)

    @staticmethod
    def invalidate_growth_stats() -> None:
        cache.delete(GROWTH_STATS_CACHE_KEY)

    # ── Data Explorer stats ─────────────────────────────────────────

    # Internal Django apps to skip in the data explorer
    _INTERNAL_APPS = frozenset({
        "admin", "auth", "contenttypes", "sessions",
        "token_blacklist", "django_prometheus",
    })

    @staticmethod
    def get_data_explorer_stats(*, use_cache: bool = True) -> DataExplorerStats:
        """Return per-app model counts for the data explorer."""
        if use_cache:
            cached = cache.get(DATA_EXPLORER_CACHE_KEY)
            if cached is not None:
                return cached

        stats = DashboardStatsService._compute_data_explorer_stats()
        cache.set(DATA_EXPLORER_CACHE_KEY, stats, CACHE_TTL)
        return stats

    @staticmethod
    def _compute_data_explorer_stats() -> DataExplorerStats:
        from django.apps import apps
        from django.urls import reverse

        app_list: list[AppInfo] = []
        total_models = 0
        total_records = 0
        filled_tables = 0

        for app_config in apps.get_app_configs():
            if app_config.label in DashboardStatsService._INTERNAL_APPS:
                continue

            models = app_config.get_models()
            model_infos: list[ModelInfo] = []

            for model in models:
                # Skip proxy models and unmanaged models
                if model._meta.proxy or not model._meta.managed:
                    continue

                count = model.objects.count()
                total_models += 1
                total_records += count
                if count > 0:
                    filled_tables += 1

                # Build admin changelist URL
                try:
                    admin_url = reverse(
                        f"admin:{app_config.label}_{model._meta.model_name}_changelist"
                    )
                except Exception:
                    admin_url = ""

                model_infos.append(ModelInfo(
                    name=model._meta.verbose_name_plural.title(),
                    count=count,
                    admin_url=admin_url,
                ))

            if not model_infos:
                continue

            # Sort models: filled first, then alphabetical
            model_infos.sort(key=lambda m: (-m["count"], m["name"]))

            app_total = sum(m["count"] for m in model_infos)
            filled_in_app = sum(1 for m in model_infos if m["count"] > 0)

            if filled_in_app == len(model_infos):
                fill_indicator = "🟢"
            elif filled_in_app > 0:
                fill_indicator = "🟡"
            else:
                fill_indicator = "🔴"

            app_list.append(AppInfo(
                label=app_config.label,
                verbose_name=app_config.verbose_name,
                models=model_infos,
                total_records=app_total,
                fill_indicator=fill_indicator,
            ))

        # Sort: 🟢 first, then 🟡, then 🔴; within same indicator, by record count desc
        indicator_order = {"🟢": 0, "🟡": 1, "🔴": 2}
        app_list.sort(
            key=lambda a: (indicator_order.get(a["fill_indicator"], 3), -a["total_records"])
        )

        filled_pct = (filled_tables / total_models * 100) if total_models > 0 else 0.0

        return DataExplorerStats(
            apps=app_list,
            total_apps=len(app_list),
            total_models=total_models,
            total_records=total_records,
            filled_tables_pct=round(filled_pct, 1),
        )

    @staticmethod
    def invalidate_data_explorer_stats() -> None:
        cache.delete(DATA_EXPLORER_CACHE_KEY)

    # ── Invalidate all ──────────────────────────────────────────────

    @staticmethod
    def invalidate_all() -> None:
        """Clear all dashboard caches."""
        cache.delete_many([
            PLATFORM_STATS_CACHE_KEY,
            AI_STATS_CACHE_KEY,
            CONTENT_STATS_CACHE_KEY,
            VIDEO_STATS_CACHE_KEY,
            CREDITS_STATS_CACHE_KEY,
            GROWTH_STATS_CACHE_KEY,
            DATA_EXPLORER_CACHE_KEY,
        ])
