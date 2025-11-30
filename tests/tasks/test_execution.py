"""Integration tests for task execution with real Redis."""

import time

import pytest


@pytest.mark.integration
@pytest.mark.skipif(
    not pytest.config.getoption("--integration", default=False),
    reason="Integration tests disabled by default",
)
class TestTaskExecution:
    """Test actual task execution with Redis broker."""

    def test_task_executes_asynchronously(self, redis_config):
        """Test task executes in background worker."""
        from tasks.examples.hello_world import hello_world

        # Trigger task asynchronously
        result = hello_world.delay("Integration Test")

        # Wait for completion (with timeout)
        timeout = 10
        start = time.time()
        while not result.ready() and (time.time() - start) < timeout:
            time.sleep(0.1)

        assert result.successful()
        assert result.result == "Hello, Integration Test!"

    def test_task_status_queryable(self, redis_config):
        """Test task status can be queried via task ID."""
        from celery.result import AsyncResult
        from tasks.examples.hello_world import add_numbers

        result = add_numbers.delay(10, 5)
        task_id = result.id

        # Query status via task ID
        queried_result = AsyncResult(task_id)

        # Wait for completion
        queried_result.get(timeout=10)

        assert queried_result.status == "SUCCESS"
        assert queried_result.result == 15

    def test_failed_task_creates_failure_status(self, redis_config):
        """Test failed task creates FAILURE status."""
        from celery import shared_task

        # Define task that will fail
        @shared_task
        def failing_task():
            raise ValueError("Test failure")

        result = failing_task.delay()

        # Wait for failure
        with pytest.raises(ValueError):
            result.get(timeout=10, propagate=True)

        assert result.status == "FAILURE"
        assert "Test failure" in str(result.result)

    def test_multiple_tasks_execute_concurrently(self, redis_config):
        """Test multiple tasks can run concurrently."""
        from tasks.examples.hello_world import add_numbers

        # Launch multiple tasks
        results = [add_numbers.delay(i, i + 1) for i in range(5)]

        # Wait for all to complete
        for i, result in enumerate(results):
            value = result.get(timeout=10)
            expected = i + (i + 1)
            assert value == expected
