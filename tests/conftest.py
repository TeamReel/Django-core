"""Test configuration for Django Core-App.

This module provides test fixtures for all Django applications,
with special focus on Celery/async task testing (B15) and
graceful handling of Redis unavailability for local development.
"""

import pytest
from django.conf import settings


def _check_redis_available():
    """Check if Redis is available at the configured URL."""
    try:
        import redis

        client = redis.Redis(host="127.0.0.1", port=6379, socket_timeout=1)
        client.ping()
        return True
    except Exception:
        return False


# Cache this at module level to avoid repeated connection attempts
_REDIS_AVAILABLE = None


def is_redis_available():
    """Check Redis availability (cached for session)."""
    global _REDIS_AVAILABLE
    if _REDIS_AVAILABLE is None:
        _REDIS_AVAILABLE = _check_redis_available()
    return _REDIS_AVAILABLE


def pytest_configure(config):
    """Configure Django settings for testing before any imports happen."""
    # Override Celery settings to use memory backend for tests
    settings.CELERY_BROKER_URL = "memory://"
    settings.CELERY_RESULT_BACKEND = "cache+memory://"
    settings.CELERY_TASK_ALWAYS_EAGER = True
    # Don't set EAGER_PROPAGATES here - let tests control exception behavior

    # Override cache to use in-memory backend when Redis is not available
    # This allows tests to run locally without Redis while CI uses real Redis
    if not is_redis_available():
        settings.CACHES = {
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "test-cache",
            }
        }

    # Register custom markers
    config.addinivalue_line(
        "markers", "requires_redis: mark test as requiring Redis (skip if unavailable)"
    )


def pytest_addoption(parser):
    """Add custom pytest command-line options."""
    parser.addoption(
        "--integration",
        action="store_true",
        default=False,
        help="Run integration tests (requires Redis)",
    )


def pytest_collection_modifyitems(config, items):
    """Skip tests that require Redis when it's not available."""
    if is_redis_available():
        # Redis is available, run all tests
        return

    skip_redis = pytest.mark.skip(reason="Redis not available (run with Redis for full test suite)")
    for item in items:
        if "requires_redis" in item.keywords:
            item.add_marker(skip_redis)


@pytest.fixture(scope="session")
def redis_available():
    """Fixture to check if Redis is available."""
    return is_redis_available()


@pytest.fixture(scope="session")
def celery_config():
    """
    Override Celery configuration for testing.

    Uses memory:// broker and cache+memory:// backend for fast tests.
    task_always_eager=True executes tasks synchronously with full hooks.
    """
    return {
        "broker_url": "memory://",
        "result_backend": "cache+memory://",
        "task_always_eager": True,  # Execute tasks synchronously
        "task_eager_propagates": False,  # Don't propagate exceptions (store in result)
        "task_store_eager_result": True,  # Store results even in eager mode
        "task_send_sent_event": True,  # Enable task sent events
        "worker_send_task_events": True,  # Enable worker task events
    }


@pytest.fixture(scope="session")
def celery_app():
    """
    Create Celery app for testing.

    Configures app to use memory backend for fast unit tests.
    Integration tests can temporarily override via redis_config fixture.
    """
    from tasks.celery import app

    # Force memory backend for testing
    app.conf.broker_url = "memory://"
    app.conf.result_backend = "cache+memory://"
    app.conf.task_always_eager = True
    app.conf.task_eager_propagates = False  # Store exceptions in result
    app.conf.task_store_eager_result = True

    return app


@pytest.fixture(autouse=True)
def reset_celery_config(celery_app):
    """Ensure Celery is using memory backend before each test."""
    celery_app.conf.broker_url = "memory://"
    celery_app.conf.result_backend = "cache+memory://"
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = False  # Don't propagate by default
    yield


@pytest.fixture(scope="session")
def celery_worker(celery_app):
    """
    Start Celery worker for integration tests.

    Only needed for tests that require actual worker processes.
    Most tests can use task_always_eager=True for synchronous execution.
    """
    from celery.contrib.testing import worker

    with worker.start_worker(celery_app, perform_ping_check=False):
        yield


@pytest.fixture
def redis_config(celery_app):
    """
    Real Redis configuration for integration tests.

    Temporarily reconfigures Celery to use Redis, then restores
    memory backend after test completes.

    Usage:
        @pytest.mark.integration
        def test_with_real_redis(redis_config):
            # Celery now using Redis for this test
            pass
    """
    # Save original config
    original_broker = celery_app.conf.broker_url
    original_backend = celery_app.conf.result_backend
    original_eager = celery_app.conf.task_always_eager

    # Configure for Redis
    celery_app.conf.broker_url = "redis://localhost:6379/15"
    celery_app.conf.result_backend = "redis://localhost:6379/15"
    celery_app.conf.task_always_eager = False

    yield

    # Restore original config
    celery_app.conf.broker_url = original_broker
    celery_app.conf.result_backend = original_backend
    celery_app.conf.task_always_eager = original_eager
