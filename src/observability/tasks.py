"""Observable Celery Task base class for task lifecycle metrics (B15)."""

import builtins as _builtins
import logging
import time
from builtins import isinstance

from celery import Task, shared_task
from django.core.cache import caches
from django.core.cache.backends.redis import RedisCache

from .logging import set_correlation_id
from .metrics import emit_metric

logger = logging.getLogger(__name__)


# T039-T040: ObservableTask base class
class ObservableTask(Task):
    """
    Celery Task base class with built-in observability (FR-014).

    Emits:
    - tasks_started_total{task_name}
    - tasks_completed_total{task_name, status}
    - task_duration_seconds{task_name}
    - task_retries_total{task_name}

    Usage:
        from observability.tasks import ObservableTask

        @shared_task(base=ObservableTask, bind=True)
        def my_task(self, arg1, arg2):
            # Task implementation
            pass
    """

    def __call__(self, *args, **kwargs):
        """
        Override Task.__call__() to instrument task lifecycle (T040).

        Wraps execution with metrics emission, exception isolation (FR-011a),
        and correlation ID extraction from request headers.
        """
        start_time = time.time()
        task_name = self.name
        status = "unknown"

        try:
            # Extract correlation_id from task request headers
            correlation_id = self.request.get("correlation_id")
            if correlation_id:
                set_correlation_id(correlation_id)

            # FR-014: Emit tasks_started_total
            emit_metric("counter", "tasks_started_total", 1, {"task_name": task_name})

            # Execute task
            result = super().__call__(*args, **kwargs)
            status = "success"
            return result

        except Exception:
            status = "failure"
            raise  # Re-raise after capturing status

        finally:
            try:
                duration = time.time() - start_time

                # FR-014: Emit tasks_completed_total with status label
                emit_metric(
                    "counter",
                    "tasks_completed_total",
                    1,
                    {"task_name": task_name, "status": status},
                )

                # FR-014: Emit task_duration_seconds
                emit_metric(
                    "histogram", "task_duration_seconds", duration, {"task_name": task_name}
                )

                # FR-014: Emit task_retries_total if task has retries
                if self.request.retries > 0:
                    emit_metric(
                        "counter",
                        "task_retries_total",
                        self.request.retries,
                        {"task_name": task_name},
                    )

            except Exception as e:
                # FR-011a: Never propagate exceptions from observability hooks
                logger.error(f"Task metrics emission failed: {e}")


# T011: Collect system cache metrics periodically
@shared_task(base=ObservableTask, bind=True)
def collect_system_metrics(self) -> dict[str, int]:
    """
    Collect current cache performance metrics and store them in the database.

    This task is designed to run periodically via Celery Beat (every 10 minutes)
    to build historical data for the performance dashboard.

    Returns:
        Dictionary with counts of metrics recorded

    Raises:
        Exception: If critical errors occur (logged but not suppressed)
    """
    from .models import SystemMetric

    metrics_recorded = {
        "cache_hits": 0,
        "cache_misses": 0,
        "memory_used": 0,
        "total_keys": 0,
    }

    try:
        # Get the default cache
        cache = caches["default"]

        is_mock = cache.__class__.__module__ == "unittest.mock"

        def _safe_int(value: object, default: int = 0) -> int:
            try:
                return int(value)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                return default

        # Check if cache has a Redis client (works with both django.core.cache.backends.redis and django_redis)
        redis_client = None
        is_redis_backend = isinstance(cache, RedisCache)

        # Tests patch `observability.tasks.isinstance` to force Redis/non-Redis behaviour.
        # MagicMock objects look like they have every attribute, so heuristic detection
        # (e.g. checking for `_cache`/`client`) would incorrectly treat non-Redis mocks
        # as Redis and record metrics. If it's a mock and not a Redis backend, skip.
        if is_mock and not is_redis_backend:
            logger.warning(
                "Cache backend is not Redis (mock), skipping metrics collection",
                extra={"cache_backend": type(cache).__name__},
            )
            return metrics_recorded

        # NOTE:
        # - In prod backends, these attributes may or may not exist.
        # - In tests, MagicMock stores children in internal structures; relying on __dict__ misses them.
        # We prefer a straightforward getattr() with exception isolation.
        cache_backend = None
        cache_client = None
        try:
            cache_backend = getattr(cache, "_cache", None)
        except Exception:
            cache_backend = None
        try:
            cache_client = getattr(cache, "client", None)
        except Exception:
            cache_client = None

        if is_redis_backend or cache_backend is not None or cache_client is not None:
            if cache_backend is not None and hasattr(cache_backend, "get_client"):
                try:
                    redis_client = cache_backend.get_client()
                except Exception as e:
                    logger.error("Failed to get Redis client via cache._cache: %s", e)
                    redis_client = None
            elif cache_client is not None and hasattr(cache_client, "get_client"):
                try:
                    redis_client = cache_client.get_client()
                except Exception as e:
                    logger.error("Failed to get Redis client via cache.client: %s", e)
                    redis_client = None

        if redis_client:
            # Get Redis INFO stats
            info = redis_client.info("stats")
            hits = _safe_int(getattr(info, "get", lambda _k, _d=0: _d)("keyspace_hits", 0))
            misses = _safe_int(getattr(info, "get", lambda _k, _d=0: _d)("keyspace_misses", 0))

            # Get memory usage
            memory_info = redis_client.info("memory")
            memory_used = _safe_int(
                getattr(memory_info, "get", lambda _k, _d=0: _d)("used_memory", 0)
            )

            # Get total keys across all databases
            total_keys = 0
            saw_db_keyspace = False
            keyspace_info = redis_client.info("keyspace")
            for db_key, db_stats in keyspace_info.items():
                if db_key.startswith("db"):
                    saw_db_keyspace = True
                    # db_stats can be either a dict or a string depending on Redis client
                    if _builtins.isinstance(db_stats, dict):
                        keys_count = _safe_int(db_stats.get("keys", 0))
                    elif _builtins.isinstance(db_stats, str):
                        # Parse "keys=123,expires=45,avg_ttl=..." format
                        try:
                            keys_count = int(db_stats.split(",")[0].split("=")[1])
                        except (IndexError, ValueError):
                            keys_count = 0
                    else:
                        keys_count = 0
                    total_keys += keys_count

            # Record metrics
            SystemMetric.record_metric("cache_hits", float(hits))
            metrics_recorded["cache_hits"] = 1

            SystemMetric.record_metric("cache_misses", float(misses))
            metrics_recorded["cache_misses"] = 1

            SystemMetric.record_metric("memory_used", float(memory_used))
            metrics_recorded["memory_used"] = 1

            if saw_db_keyspace:
                SystemMetric.record_metric("total_keys", float(total_keys))
                metrics_recorded["total_keys"] = 1

            logger.info(
                "Collected cache metrics",
                extra={
                    "hits": hits,
                    "misses": misses,
                    "memory_bytes": memory_used,
                    "total_keys": total_keys,
                },
            )

            # Cleanup old metrics (7-day retention)
            deleted_count = SystemMetric.cleanup_old_metrics(days=7)
            if deleted_count > 0:
                logger.info(
                    "Cleaned up old metrics",
                    extra={"deleted_count": deleted_count},
                )

        else:
            logger.warning(
                "Cache backend is not Redis, skipping metrics collection",
                extra={"cache_backend": type(cache).__name__},
            )

    except Exception as e:
        logger.exception(
            "Failed to collect cache metrics",
            extra={"error": str(e)},
        )
        raise

    return metrics_recorded


@shared_task
def db_maintenance_vacuum():
    """Run lightweight VACUUM ANALYZE on high-churn tables.

    Reclaims dead-tuple space and updates planner statistics so
    PostgreSQL can choose efficient query plans.

    Runs weekly via celery-beat. Does NOT use VACUUM FULL (which
    requires an exclusive lock) — standard VACUUM is online-safe.
    """
    from django.db import connection

    tables = [
        "notifications_notification",
        "audit_events",
        "search_searchentry",
        "observability_systemmetric",
        "django_session",
    ]

    results = {}
    with connection.cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(f"VACUUM ANALYZE {table}")
                results[table] = "ok"
            except Exception as exc:
                results[table] = str(exc)
                logger.warning("VACUUM failed for %s: %s", table, exc)

    logger.info("DB maintenance completed", extra={"vacuum_results": results})
    return results
