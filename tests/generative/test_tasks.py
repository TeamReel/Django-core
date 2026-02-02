from __future__ import annotations

from decimal import Decimal
from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.generative.executors.base import ErrorCategory, ExecutionResult
from src.generative.models import GenerationOutput, OutputType, RequestStatus
from src.generative.tasks import (
    _handle_failure,
    _handle_success,
    _map_output_type,
    _run_async,
    process_generation_request,
)


@pytest.mark.django_db
class TestProcessGenerationRequest:
    def test_run_async_falls_back_to_new_loop(self):
        async def _coro():
            return "ok"

        with patch("src.generative.tasks.asyncio.run", side_effect=RuntimeError("boom")):
            assert _run_async(_coro()) == "ok"

    def test_map_output_type_variants(self):
        assert _map_output_type("json") == OutputType.JSON
        assert _map_output_type("text") == OutputType.TEXT
        assert _map_output_type("image") == OutputType.IMAGE
        assert _map_output_type("video") == OutputType.VIDEO
        assert _map_output_type("something-else") == OutputType.TEXT

    @patch("src.generative.tasks.ExecutorFactory.get_executor")
    def test_success_creates_output_and_completes(self, mock_get_executor, generation_request):
        executor = Mock()
        executor.execute = AsyncMock(
            return_value=ExecutionResult(
                success=True,
                output_type="text",
                content="Generated",
                actual_cost=Decimal("0.0500"),
                metadata={"model": "gpt-4"},
            )
        )
        mock_get_executor.return_value = executor

        process_generation_request.run(generation_request.id)

        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.COMPLETED
        assert generation_request.actual_cost == Decimal("0.0500")
        assert generation_request.started_at is not None
        assert generation_request.completed_at is not None

        output = GenerationOutput.objects.get(request=generation_request)
        assert output.output_type == OutputType.TEXT
        assert output.text_content == "Generated"
        assert output.metadata["model"] == "gpt-4"

    @patch("src.generative.tasks.ExecutorFactory.get_executor")
    def test_file_output_marks_request_failed(self, mock_get_executor, generation_request):
        executor = Mock()
        executor.execute = AsyncMock(
            return_value=ExecutionResult(
                success=True,
                output_type="image",
                file_path="/tmp/fake.png",
            )
        )
        mock_get_executor.return_value = executor

        process_generation_request.run(generation_request.id)

        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.FAILED
        assert GenerationOutput.objects.filter(request=generation_request).count() == 0

    @patch("src.generative.tasks.process_generation_request.apply_async")
    @patch("src.generative.tasks.ExecutorFactory.get_executor")
    def test_transient_error_schedules_retry(
        self, mock_get_executor, mock_apply_async, generation_request
    ):
        executor = Mock()
        executor.execute = AsyncMock(
            return_value=ExecutionResult(
                success=False,
                output_type="text",
                error_message="Rate limit",
                error_category=ErrorCategory.TRANSIENT,
            )
        )
        mock_get_executor.return_value = executor

        process_generation_request.run(generation_request.id)

        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.PENDING
        assert generation_request.retry_count == 1
        mock_apply_async.assert_called_once()

    @patch("src.generative.tasks.process_generation_request.apply_async")
    @patch("src.generative.tasks.ExecutorFactory.get_executor")
    def test_permanent_error_fails_immediately(
        self, mock_get_executor, mock_apply_async, generation_request
    ):
        executor = Mock()
        executor.execute = AsyncMock(
            return_value=ExecutionResult(
                success=False,
                output_type="text",
                error_message="Invalid input",
                error_category=ErrorCategory.PERMANENT,
            )
        )
        mock_get_executor.return_value = executor

        process_generation_request.run(generation_request.id)

        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.FAILED
        assert generation_request.retry_count == 1
        assert generation_request.error_category == "permanent"
        assert "Invalid input" in generation_request.error_message
        assert generation_request.completed_at is not None
        mock_apply_async.assert_not_called()

    @patch("src.generative.tasks.process_generation_request.apply_async")
    @patch("src.generative.tasks.ExecutorFactory.get_executor")
    def test_unknown_error_retries_once_then_fails(
        self, mock_get_executor, mock_apply_async, generation_request
    ):
        executor = Mock()
        executor.execute = AsyncMock(
            return_value=ExecutionResult(
                success=False,
                output_type="text",
                error_message="Weird error",
                error_category=ErrorCategory.UNKNOWN,
            )
        )
        mock_get_executor.return_value = executor

        process_generation_request.run(generation_request.id)

        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.PENDING
        assert generation_request.retry_count == 1
        mock_apply_async.assert_called_once()

        mock_apply_async.reset_mock()

        # Next attempt: unknown should not retry again.
        process_generation_request.run(generation_request.id)

        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.FAILED
        assert generation_request.retry_count == 2
        mock_apply_async.assert_not_called()

    @patch("src.generative.tasks.process_generation_request.apply_async")
    @patch("src.generative.tasks.ExecutorFactory.get_executor")
    def test_max_retries_enforced(self, mock_get_executor, mock_apply_async, generation_request):
        generation_request.retry_count = 5
        generation_request.save(update_fields=["retry_count"])

        executor = Mock()
        executor.execute = AsyncMock(
            return_value=ExecutionResult(
                success=False,
                output_type="text",
                error_message="Still failing",
                error_category=ErrorCategory.TRANSIENT,
            )
        )
        mock_get_executor.return_value = executor

        process_generation_request.run(generation_request.id)

        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.FAILED
        assert generation_request.retry_count == 6
        mock_apply_async.assert_not_called()

    @patch("src.generative.tasks.ExecutorFactory.get_executor")
    def test_idempotency_skips_non_pending(self, mock_get_executor, generation_request):
        generation_request.status = RequestStatus.COMPLETED
        generation_request.save(update_fields=["status"])

        process_generation_request.run(generation_request.id)

        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.COMPLETED
        mock_get_executor.assert_not_called()

    def test_handle_success_is_noop_when_already_completed(self, completed_request):
        before = GenerationOutput.objects.filter(request=completed_request).count()

        _handle_success(
            completed_request.id,
            result=ExecutionResult(success=True, output_type="text", content="ignored"),
            duration_seconds=0.01,
        )

        after = GenerationOutput.objects.filter(request=completed_request).count()
        assert after == before

    @patch("src.generative.tasks.process_generation_request.apply_async")
    def test_handle_failure_is_noop_when_already_failed(self, mock_apply_async, generation_request):
        generation_request.mark_failed("nope")
        before = generation_request.retry_count

        _handle_failure(
            generation_request.id,
            error_message="ignored",
            category=ErrorCategory.TRANSIENT,
            duration_seconds=0.01,
        )

        generation_request.refresh_from_db()
        assert generation_request.retry_count == before
        mock_apply_async.assert_not_called()
