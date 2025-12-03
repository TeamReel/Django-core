"""Pytest configuration for observability tests."""

import pytest
from django.conf import settings
from unittest.mock import Mock, patch


@pytest.fixture
def mock_database_connection():
    """Mock database connection for testing."""
    with patch("django.db.connection") as mock_conn:
        mock_cursor = Mock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_cursor.execute.return_value = None
        mock_cursor.fetchone.return_value = (1,)
        mock_conn.vendor = "postgresql"
        yield mock_conn


@pytest.fixture
def mock_cache():
    """Mock cache backend for testing."""
    with patch("django.core.cache.cache") as mock:
        mock.set.return_value = True
        mock.get.return_value = "ok"
        mock.delete.return_value = True
        mock.__class__.__name__ = "RedisCache"
        yield mock


@pytest.fixture
def mock_celery_connection():
    """Mock Celery broker connection for testing."""
    with patch("celery.current_app") as mock_app:
        mock_conn = Mock()
        mock_conn.ensure_connection.return_value = None
        mock_conn.release.return_value = None
        mock_app.connection.return_value = mock_conn
        mock_app.conf.broker_url = "redis://localhost:6379/0"
        yield mock_app


@pytest.fixture
def mock_migration_executor():
    """Mock Django migration executor for testing."""
    with patch("django.db.migrations.executor.MigrationExecutor") as mock_executor:
        mock_instance = Mock()
        mock_instance.migration_plan.return_value = []  # No pending migrations
        mock_executor.return_value = mock_instance
        yield mock_executor


@pytest.fixture
def enable_health_checks():
    """Temporarily enable health checks in settings."""
    original_value = getattr(settings, "OBSERVABILITY_HEALTH_CHECKS_ENABLED", True)
    settings.OBSERVABILITY_HEALTH_CHECKS_ENABLED = True
    yield
    settings.OBSERVABILITY_HEALTH_CHECKS_ENABLED = original_value


@pytest.fixture
def disable_health_checks():
    """Temporarily disable health checks in settings."""
    original_value = getattr(settings, "OBSERVABILITY_HEALTH_CHECKS_ENABLED", True)
    settings.OBSERVABILITY_HEALTH_CHECKS_ENABLED = False
    yield
    settings.OBSERVABILITY_HEALTH_CHECKS_ENABLED = original_value
