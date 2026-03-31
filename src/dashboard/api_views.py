"""Dashboard API views for the interactive React dashboard.

Exposes platform stats, pipeline metrics, and credits data as JSON
for the frontend PlatformStatsPage. All endpoints require superuser access.

Response shapes are transformed from the internal DashboardStatsService
to match the frontend TypeScript interfaces in platformStatsTypes.ts.
"""

from __future__ import annotations

from datetime import timedelta

from dashboard.services import DashboardStatsService
from django.db.models import Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

_RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90, "season": 365}


def _parse_range_days(request: Request) -> int:
    """Parse ?range= query param into number of days."""
    raw = request.query_params.get("range", "30d")
    return _RANGE_DAYS.get(raw, 30)


class IsSuperUser(permissions.BasePermission):
    """Only allow superusers."""

    def has_permission(self, request: Request, view: object) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


@api_view(["GET"])
@permission_classes([IsSuperUser])
def overview(request: Request) -> Response:
    """Platform overview: counts + growth trends.

    Transforms _count suffix keys to match frontend PlatformCounts interface.
    """
    raw = DashboardStatsService.get_platform_stats()
    platform = {
        "organisations": raw["organisations_count"],
        "projects": raw["projects_count"],
        "members": raw["members_count"],
        "users": raw["users_count"],
        "file_assets": raw["file_assets_count"],
    }
    growth = DashboardStatsService.get_growth_stats()
    return Response(
        {"platform": platform, "growth": growth["weeks"]},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsSuperUser])
def pipelines(request: Request) -> Response:
    """AI, content, and video pipeline stats.

    Enhances video section with detailed stale_jobs array
    (frontend expects StaleJob[] not just a count).
    """
    from src.video.models import JobStatus, VideoJob

    ai = DashboardStatsService.get_ai_stats()
    content = DashboardStatsService.get_content_stats()
    video_raw = DashboardStatsService.get_video_stats()

    # Build detailed stale_jobs array
    stale_threshold = timezone.now() - timedelta(minutes=30)
    now = timezone.now()
    stale_qs = VideoJob.objects.filter(
        status=JobStatus.PROCESSING,
        started_at__lt=stale_threshold,
    ).values("id", "job_type", "started_at")

    stale_jobs = [
        {
            "id": str(j["id"]),
            "type": j["job_type"],
            "started_at": j["started_at"].isoformat(),
            "minutes_elapsed": int((now - j["started_at"]).total_seconds() / 60),
        }
        for j in stale_qs
    ]

    video = {
        "jobs_by_status": video_raw["jobs_by_status"],
        "jobs_by_type": video_raw["jobs_by_type"],
        "stale_jobs": stale_jobs,
    }
    return Response(
        {"ai": ai, "content": content, "video": video},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsSuperUser])
def credits(request: Request) -> Response:
    """Credits usage: allocated, used, daily breakdown, top orgs.

    Transforms from internal CreditsStats to match frontend DashboardCredits:
    - total_allocated / total_used (from Transaction ledger)
    - usage_by_day (daily aggregation from Transaction)
    - top_orgs with id, name, balance, used
    """
    from credits.models import CreditsBalance
    from transactions.models import Transaction

    credits_raw = DashboardStatsService.get_credits_stats()
    days = _parse_range_days(request)
    cutoff = timezone.now() - timedelta(days=days)

    # Total used = sum of negative transactions (abs)
    used_agg = Transaction.objects.filter(
        amount__lt=0,
    ).aggregate(total=Sum("amount"))
    total_used = abs(float(used_agg["total"] or 0))

    # Daily usage breakdown
    daily_qs = (
        Transaction.objects.filter(amount__lt=0, timestamp__gte=cutoff)
        .annotate(date=TruncDate("timestamp"))
        .values("date")
        .annotate(used=Sum("amount"))
        .order_by("date")
    )
    usage_by_day = [
        {"date": row["date"].isoformat(), "used": abs(float(row["used"]))}
        for row in daily_qs
    ]

    # Top orgs with id, balance, and used amount
    top_qs = (
        CreditsBalance.objects.select_related("organisation")
        .order_by("-current_balance")[:5]
    )
    org_ids = [cb.organisation_id for cb in top_qs]

    # Batch query: total used per org (avoids N+1)
    org_used_qs = (
        Transaction.objects.filter(organization_id__in=org_ids, amount__lt=0)
        .values("organization_id")
        .annotate(total_used=Sum("amount"))
    )
    org_used_map: dict[int, float] = {
        row["organization_id"]: abs(float(row["total_used"]))
        for row in org_used_qs
    }

    top_orgs = [
        {
            "id": cb.organisation_id,
            "name": cb.organisation.name,
            "balance": cb.current_balance,
            "used": int(org_used_map.get(cb.organisation_id, 0)),
        }
        for cb in top_qs
    ]

    return Response(
        {
            "total_allocated": credits_raw["total_credits_allocated"],
            "total_used": int(total_used),
            "usage_by_day": usage_by_day,
            "top_orgs": top_orgs,
        },
        status=status.HTTP_200_OK,
    )
