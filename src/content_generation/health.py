"""
B31 Content Generation - Health Check Integration

Provides health check for content generation subsystem,
integrating with B25 observability health check registry.
"""

import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Dict, Optional

from django.utils import timezone

from .models import ContentItem, ContentStatus

logger = logging.getLogger(__name__)


@dataclass
class HealthCheckResult:
    """Health check result compatible with observability module."""

    name: str
    status: bool
    latency_ms: float
    details: Optional[Dict[str, Any]] = None


class ContentGenerationHealthCheck:
    """
    Health check for content generation subsystem.

    Non-critical check that monitors:
    - Queue depth (queued items)
    - Stuck items (generating > 2 hours)
    - Recent failure rate (last 24 hours)
    """

    def check(self) -> HealthCheckResult:
        """Execute health check and return result."""
        import time

        start_time = time.time()
        details = {}
        is_healthy = True

        try:
            # Count queued items
            queued_count = ContentItem.objects.active().filter(status=ContentStatus.QUEUED).count()
            details["queued"] = queued_count

            # Count actively generating items
            generating_count = (
                ContentItem.objects.active().filter(status=ContentStatus.GENERATING).count()
            )
            details["generating"] = generating_count

            # Check for stuck items (generating > 2 hours)
            two_hours_ago = timezone.now() - timedelta(hours=2)
            stuck_count = (
                ContentItem.objects.active()
                .filter(
                    status=ContentStatus.GENERATING,
                    updated_at__lt=two_hours_ago,
                )
                .count()
            )
            details["stuck"] = stuck_count

            # Stuck items indicate a problem
            if stuck_count > 0:
                is_healthy = False
                details["warning"] = f"{stuck_count} items stuck in generating state"

            # Check failure rate (last 24 hours)
            yesterday = timezone.now() - timedelta(days=1)
            failed_24h = (
                ContentItem.objects.active()
                .filter(
                    status=ContentStatus.FAILED,
                    updated_at__gte=yesterday,
                )
                .count()
            )
            completed_24h = (
                ContentItem.objects.active()
                .filter(
                    status__in=[ContentStatus.COMPLETED, ContentStatus.APPROVED],
                    updated_at__gte=yesterday,
                )
                .count()
            )
            details["failed_24h"] = failed_24h
            details["completed_24h"] = completed_24h

            # Calculate failure rate if there's been activity
            total_24h = failed_24h + completed_24h
            if total_24h > 0:
                failure_rate = (failed_24h / total_24h) * 100
                details["failure_rate_24h"] = round(failure_rate, 1)
                # High failure rate is a warning but not critical
                if failure_rate > 20:
                    details["warning"] = f"High failure rate: {failure_rate:.1f}%"

        except Exception as e:
            logger.error(f"Content generation health check failed: {e}")
            is_healthy = False
            details["error"] = str(e)

        latency_ms = (time.time() - start_time) * 1000
        return HealthCheckResult(
            name="content_generation",
            status=is_healthy,
            latency_ms=latency_ms,
            details=details,
        )


def register_health_check():
    """
    Register content generation health check with observability module.

    Called from apps.py ready() method.
    """
    try:
        from observability.health import register_health_check as obs_register

        obs_register(
            "content_generation",
            ContentGenerationHealthCheck(),
            critical=False,  # Non-critical: doesn't affect overall readiness
        )
        logger.debug("Registered content_generation health check")
    except ImportError:
        logger.debug("Observability module not available, skipping health check registration")
    except Exception as e:
        logger.warning(f"Failed to register content_generation health check: {e}")
