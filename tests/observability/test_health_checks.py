"""Tests for health check protocol and implementations."""

import pytest
import time
from unittest.mock import Mock, patch
from observability.health import HealthCheckResult, HealthCheck, register_health_check, get_registered_checks
from observability.checks.database import DatabaseHealthCheck
from observability.checks.cache import CacheHealthCheck
from observability.checks.queue import QueueHealthCheck
from observability.checks.migrations import MigrationHealthCheck


class TestHealthCheckResult:
    """Tests for HealthCheckResult dataclass."""
    
    def test_create_result_with_all_fields(self):
        """Test creating HealthCheckResult with all fields."""
        result = HealthCheckResult(
            name="test_check",
            status=True,
            latency_ms=15.5,
            details={"key": "value"}
        )
        
        assert result.name == "test_check"
        assert result.status is True
        assert result.latency_ms == 15.5
        assert result.details == {"key": "value"}
    
    def test_create_result_without_details(self):
        """Test creating HealthCheckResult without details field."""
        result = HealthCheckResult(
            name="simple_check",
            status=False,
            latency_ms=10.0
        )
        
        assert result.name == "simple_check"
        assert result.status is False
        assert result.details is None


class TestHealthCheckRegistry:
    """Tests for health check registration and retrieval."""
    
    def test_register_critical_check(self):
        """Test registering a critical health check."""
        check = Mock(spec=HealthCheck)
        register_health_check("test_critical", check, critical=True)
        
        registered = get_registered_checks()
        assert "test_critical" in registered
        assert registered["test_critical"][0] == check
        assert registered["test_critical"][1] is True
    
    def test_register_non_critical_check(self):
        """Test registering a non-critical health check."""
        check = Mock(spec=HealthCheck)
        register_health_check("test_non_critical", check, critical=False)
        
        registered = get_registered_checks()
        assert "test_non_critical" in registered
        assert registered["test_non_critical"][1] is False


class TestDatabaseHealthCheck:
    """Tests for DatabaseHealthCheck implementation."""
    
    def test_database_healthy(self, mock_database_connection):
        """Test successful database health check."""
        check = DatabaseHealthCheck()
        result = check.check()
        
        assert result.name == "database"
        assert result.status is True
        assert result.latency_ms > 0
        assert result.details["engine"] == "postgresql"
    
    def test_database_connection_failure(self, mock_database_connection):
        """Test database health check when connection fails."""
        mock_database_connection.cursor.side_effect = Exception("Connection refused")
        
        check = DatabaseHealthCheck()
        result = check.check()
        
        assert result.name == "database"
        assert result.status is False
        assert "Connection refused" in result.details["error"]
    
    def test_database_query_timeout(self, mock_database_connection):
        """Test database health check with slow query."""
        def slow_execute(*args):
            time.sleep(0.6)  # Exceeds 500ms timeout
        
        mock_database_connection.cursor.return_value.__enter__.return_value.execute.side_effect = slow_execute
        
        check = DatabaseHealthCheck()
        # Note: Timeout enforcement is in readiness_view, not in check itself
        result = check.check()
        
        assert result.name == "database"


class TestCacheHealthCheck:
    """Tests for CacheHealthCheck implementation."""
    
    def test_cache_healthy(self, mock_cache):
        """Test successful cache health check."""
        check = CacheHealthCheck()
        result = check.check()
        
        assert result.name == "cache"
        assert result.status is True
        assert result.latency_ms > 0
        assert "backend" in result.details
    
    def test_cache_connection_failure(self, mock_cache):
        """Test cache health check when connection fails."""
        mock_cache.set.side_effect = Exception("Redis connection refused")
        
        check = CacheHealthCheck()
        result = check.check()
        
        assert result.name == "cache"
        assert result.status is False
        assert "Redis connection refused" in result.details["error"]
    
    def test_cache_get_set_mismatch(self, mock_cache):
        """Test cache health check when get/set values don't match."""
        mock_cache.get.return_value = "wrong_value"
        
        check = CacheHealthCheck()
        result = check.check()
        
        assert result.name == "cache"
        assert result.status is False
        assert "mismatch" in result.details["error"]


class TestQueueHealthCheck:
    """Tests for QueueHealthCheck implementation."""
    
    def test_queue_healthy(self, mock_celery_connection):
        """Test successful queue health check."""
        check = QueueHealthCheck()
        result = check.check()
        
        assert result.name == "queue"
        assert result.status is True
        assert result.latency_ms > 0
        assert result.details["broker"] == "redis"
    
    def test_queue_connection_failure(self, mock_celery_connection):
        """Test queue health check when broker connection fails."""
        mock_celery_connection.connection.return_value.ensure_connection.side_effect = Exception("Broker unreachable")
        
        check = QueueHealthCheck()
        result = check.check()
        
        assert result.name == "queue"
        assert result.status is False
        assert "Broker unreachable" in result.details["error"]
    
    def test_queue_celery_not_installed(self):
        """Test queue health check when Celery is not installed."""
        with patch("observability.checks.queue.current_app", side_effect=ImportError):
            check = QueueHealthCheck()
            result = check.check()
            
            assert result.name == "queue"
            assert result.status is False
            assert "not installed" in result.details["error"]


class TestMigrationHealthCheck:
    """Tests for MigrationHealthCheck implementation."""
    
    def test_migrations_all_applied(self, mock_migration_executor, mock_database_connection):
        """Test migration health check when all migrations are applied."""
        # Mock no pending migrations
        mock_migration_executor.return_value.migration_plan.return_value = []
        
        # Mock no table locks
        mock_database_connection.cursor.return_value.__enter__.return_value.fetchone.return_value = (0,)
        
        check = MigrationHealthCheck()
        result = check.check()
        
        assert result.name == "migrations"
        assert result.status is True
        assert result.details["pending_count"] == 0
    
    def test_migrations_pending(self, mock_migration_executor, mock_database_connection):
        """Test migration health check with pending migrations."""
        # Mock pending migrations
        mock_migration_executor.return_value.migration_plan.return_value = [
            ("app1", "0001_initial"),
            ("app1", "0002_add_field")
        ]
        
        check = MigrationHealthCheck()
        result = check.check()
        
        assert result.name == "migrations"
        assert result.status is False
        assert "Pending migrations" in result.details["error"]
        assert result.details["pending_count"] == 2
    
    def test_migrations_running(self, mock_migration_executor, mock_database_connection):
        """Test migration health check when migrations are actively running."""
        # Mock no pending migrations
        mock_migration_executor.return_value.migration_plan.return_value = []
        
        # Mock table lock present (migrations running)
        mock_database_connection.cursor.return_value.__enter__.return_value.fetchone.return_value = (1,)
        
        check = MigrationHealthCheck()
        result = check.check()
        
        assert result.name == "migrations"
        assert result.status is False
        assert "currently running" in result.details["error"]
        assert result.details["lock_count"] == 1

    def test_migrations_lock_check_postgresql_only(self, mock_migration_executor, mock_database_connection):
        """Test that lock check is skipped on non-PostgreSQL databases."""
        # Mock no pending migrations
        mock_migration_executor.return_value.migration_plan.return_value = []
        
        # Simulate non-PostgreSQL database (e.g., SQLite)
        mock_database_connection.vendor = 'sqlite'
        
        check = MigrationHealthCheck()
        result = check.check()
        
        # Should pass without attempting pg_locks query
        assert result.name == "migrations"
        assert result.status is True
        assert result.details["pending_count"] == 0
        assert "lock_count" not in result.details
