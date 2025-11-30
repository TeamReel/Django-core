"""Test configuration for Django Core-App.

This module provides test fixtures for all Django applications,
with special focus on Celery/async task testing (B15).
"""

import pytest


def pytest_addoption(parser):
    """Add custom pytest command-line options."""
    parser.addoption(
        "--integration",
        action="store_true",
        default=False,
        help="Run integration tests (requires Redis)",
    )


@pytest.fixture(scope="session")
def celery_config():
    """
    Override Celery configuration for testing.

    Uses memory:// broker and cache+memory:// backend for fast tests.
    task_always_eager=True executes tasks synchronously.
    """
    return {
        "broker_url": "memory://",
        "result_backend": "cache+memory://",
        "task_always_eager": True,  # Execute tasks synchronously
        "task_eager_propagates": True,  # Propagate exceptions
        "task_store_eager_result": True,  # Store results even in eager mode
    }


@pytest.fixture(scope="session")
def celery_app(celery_config):
    """
    Create Celery app for testing.

    Note: For integration tests that need real Redis,
    use separate fixture with actual broker URL.
    """
    from tasks.celery import app

    app.config_from_object(celery_config)
    return app


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
def redis_config():
    """
    Real Redis configuration for integration tests.

    Usage:
        @pytest.mark.integration
        def test_with_real_redis(redis_config):
            # Use redis_config for actual broker connection
            pass
    """
    return {
        "broker_url": "redis://localhost:6379/15",  # Use DB 15 for tests
        "result_backend": "redis://localhost:6379/15",
    }
