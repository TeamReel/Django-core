---
work_package_id: "WP04"
subtasks:
  - "T027"
  - "T028"
  - "T029"
  - "T030"
  - "T031"
  - "T032"
  - "T033"
  - "T034"
  - "T035"
title: "Async Processing & Retry Logic"
phase: "Phase 2 - Pipeline Execution"
lane: "doing"
assignee: ""
agent: "github-copilot"
shell_pid: "13948"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-01T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP04 – Async Processing & Retry Logic

## Review Feedback

*[Empty - populated by `/spec-kitty.review` if work needs changes]*

---

## Objectives & Success Criteria

**Outcomes**:
1. Celery task `process_generation_request` handles async execution
2. Retry logic with exponential backoff for transient errors
3. Max retry limit enforcement (5 attempts)
4. Error classification drives retry decisions
5. Status transitions tracked (pending → processing → completed/failed)
6. Timestamp tracking (started_at, completed_at)
7. Celery tests achieve >80% coverage

**Success Metrics**:
- Task executes executor and updates request status
- Transient errors trigger retry with backoff
- Permanent errors fail immediately
- Max 5 retries enforced, then fail

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (models exist)
- WP03 complete (executors exist)
- Celery configured with Redis/RabbitMQ
- B15 Background Tasks module exists

**Supporting Documents**:
- [spec.md](../spec.md) - FR-016 to FR-020 (async requirements)
- [plan.md](../plan.md) - Phase 4 implementation details

**Architectural Decisions**:
- Exponential backoff: 2^retry_count seconds (2s, 4s, 8s, 16s, 32s)
- Max retries: 5 attempts (configurable)
- Error categories: TRANSIENT → retry, PERMANENT → fail, UNKNOWN → retry once

**Constraints**:
- Idempotent task execution (handle duplicate task invocations)
- Atomic status updates (prevent race conditions)
- Credit settlement on completion (WP05 integration point)

---

## Subtasks & Detailed Guidance

### Subtask T027 – Create Celery task

**Purpose**: Async task to process generation requests

**Steps**:
1. Create `src/generative/tasks.py`:
   ```python
   from celery import shared_task
   from django.utils import timezone
   from .models import GenerationRequest, GenerationOutput
   from .executors.factory import ExecutorFactory
   import logging

   logger = logging.getLogger('generative.tasks')

   @shared_task(bind=True, max_retries=5)
   def process_generation_request(self, request_id: int):
       """Process generation request asynchronously.

       Args:
           request_id: GenerationRequest ID
       """
       try:
           request = GenerationRequest.objects.select_for_update().get(id=request_id)

           # Check if already processed
           if request.status != 'pending':
               logger.warning(f"Request {request_id} already processed (status={request.status})")
               return

           # Update status to processing
           request.status = 'processing'
           request.started_at = timezone.now()
           request.save()

           # Get executor
           executor = ExecutorFactory.get_executor(request.template.pipeline_config)

           # Execute pipeline
           logger.info(f"Executing request {request_id} with {request.template.pipeline_config['provider']}")
           result = executor.execute(request.input_data)

           if result.success:
               # Save output
               GenerationOutput.objects.create(
                   request=request,
                   output_type=result.output.get('format', 'text'),
                   text_content=result.output.get('text'),
                   metadata=result.metadata
               )

               # Update request
               request.status = 'completed'
               request.actual_cost = result.cost
               request.completed_at = timezone.now()
               request.save()

               logger.info(f"Request {request_id} completed, cost={result.cost}")
           else:
               # Handle error
               self._handle_error(request, result)

       except Exception as e:
           logger.error(f"Unexpected error processing request {request_id}: {e}", exc_info=True)
           self._handle_unexpected_error(request_id, e)

   def _handle_error(self, request, result):
       """Handle execution error with retry logic."""
       from .executors.base import ErrorCategory

       request.error_message = result.error
       request.error_category = result.error_category.value
       request.retry_count += 1

       # Update metadata with retry history
       if 'retry_history' not in request.metadata:
           request.metadata['retry_history'] = []
       request.metadata['retry_history'].append({
           'attempt': request.retry_count,
           'error': result.error,
           'category': result.error_category.value,
           'timestamp': timezone.now().isoformat()
       })

       # Decide retry or fail
       if result.error_category == ErrorCategory.PERMANENT:
           request.status = 'failed'
           request.completed_at = timezone.now()
           logger.error(f"Request {request.id} failed permanently: {result.error}")
       elif request.retry_count >= 5:
           request.status = 'failed'
           request.completed_at = timezone.now()
           logger.error(f"Request {request.id} failed after max retries")
       else:
           request.status = 'pending'  # Reset to pending for retry
           logger.warning(f"Request {request.id} retry {request.retry_count}/5")
           # Schedule retry with exponential backoff
           delay = 2 ** request.retry_count  # 2s, 4s, 8s, 16s, 32s
           process_generation_request.apply_async((request.id,), countdown=delay)

       request.save()

   def _handle_unexpected_error(self, request_id, exception):
       """Handle unexpected errors."""
       try:
           request = GenerationRequest.objects.get(id=request_id)
           request.status = 'failed'
           request.error_message = str(exception)
           request.error_category = 'unknown'
           request.completed_at = timezone.now()
           request.save()
       except Exception as e:
           logger.error(f"Failed to update request {request_id}: {e}")
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: No (core async logic)

**Notes**:
- Use `select_for_update()` to lock row during processing
- Idempotency check: Skip if status != 'pending'
- Exponential backoff: 2^retry_count seconds

---

### Subtask T028 – Implement retry logic

**Purpose**: Retry transient errors with exponential backoff

**Steps**:
1. Update `_handle_error()` in `tasks.py`:
   - Transient → retry with backoff
   - Permanent → fail immediately
   - Unknown → retry once, then fail
2. Add retry configuration:
   ```python
   MAX_RETRIES = 5
   BACKOFF_BASE = 2  # Exponential base

   # In _handle_error:
   delay = BACKOFF_BASE ** request.retry_count
   process_generation_request.apply_async((request.id,), countdown=delay)
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: After T027

**Notes**: Already implemented in T027's `_handle_error()` method

---

### Subtask T029 – Add status transition tracking

**Purpose**: Track status changes with timestamps

**Steps**:
1. Update `GenerationRequest` model to track transitions:
   ```python
   # In models.py
   def transition_to(self, new_status: str):
       """Transition to new status with timestamp."""
       old_status = self.status
       self.status = new_status

       if new_status == 'processing':
           self.started_at = timezone.now()
       elif new_status in ['completed', 'failed', 'cancelled']:
           self.completed_at = timezone.now()

       self.save()

       logger.info(f"Request {self.id}: {old_status} → {new_status}")
   ```

2. Use in task:
   ```python
   request.transition_to('processing')
   # ... execute
   request.transition_to('completed')
   ```

**Files**: `src/generative/models.py`, `src/generative/tasks.py`

**Parallel?**: After T027

**Notes**: Centralize status transitions for audit trail

---

### Subtask T030 – Implement max retry enforcement

**Purpose**: Fail request after 5 retry attempts

**Steps**:
1. Already implemented in T027's `_handle_error()`:
   ```python
   if request.retry_count >= 5:
       request.status = 'failed'
       request.completed_at = timezone.now()
   ```

2. Make configurable:
   ```python
   # settings.py
   GENERATIVE_MAX_RETRIES = 5

   # In tasks.py
   from django.conf import settings
   max_retries = settings.GENERATIVE_MAX_RETRIES
   ```

**Files**: `settings.py`, `src/generative/tasks.py`

**Parallel?**: After T027

**Notes**: Use settings for environment-specific retry limits

---

### Subtask T031 – Add error classification integration

**Purpose**: Use executor error categories to drive retry decisions

**Steps**:
1. Integrate with WP03's `ErrorCategory`:
   ```python
   from .executors.base import ErrorCategory

   if result.error_category == ErrorCategory.PERMANENT:
       # Fail immediately
   elif result.error_category == ErrorCategory.TRANSIENT:
       # Retry with backoff
   elif result.error_category == ErrorCategory.UNKNOWN:
       # Retry once, then fail
       if request.retry_count >= 1:
           request.status = 'failed'
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: After T027, T028 (needs WP03 complete)

**Notes**: Already implemented in T027's `_handle_error()` method

---

### Subtask T032 – Add metadata tracking

**Purpose**: Track retry history and execution details in metadata JSON field

**Steps**:
1. Store retry history:
   ```python
   request.metadata['retry_history'] = [
       {
           'attempt': 1,
           'error': 'Rate limit exceeded',
           'category': 'transient',
           'timestamp': '2024-01-01T12:00:00Z'
       },
       # ... more attempts
   ]
   ```

2. Store execution details:
   ```python
   request.metadata['execution'] = {
       'provider': 'openai',
       'model': 'gpt-4',
       'prompt_tokens': 100,
       'completion_tokens': 200,
       'duration_seconds': 2.5
   }
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: After T027

**Notes**: Metadata useful for debugging and analytics

---

### Subtask T033 – Implement idempotency checks

**Purpose**: Handle duplicate task invocations safely

**Steps**:
1. Check status before processing:
   ```python
   request = GenerationRequest.objects.select_for_update().get(id=request_id)

   if request.status != 'pending':
       logger.warning(f"Request {request_id} already processed")
       return  # Skip duplicate task
   ```

2. Use database locks:
   ```python
   # select_for_update() locks row until transaction commits
   with transaction.atomic():
       request = GenerationRequest.objects.select_for_update().get(id=request_id)
       # ... process
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: After T027

**Notes**: Already implemented in T027 with `select_for_update()`

---

### Subtask T034 – Add task monitoring

**Purpose**: Log task execution for debugging and monitoring

**Steps**:
1. Add structured logging:
   ```python
   logger.info(f"Task started: request={request_id}, provider={provider}")
   logger.info(f"Task completed: request={request_id}, cost={cost}, duration={duration}s")
   logger.error(f"Task failed: request={request_id}, error={error}, category={category}")
   ```

2. Add Celery task events:
   ```python
   @shared_task(bind=True, max_retries=5, track_started=True)
   def process_generation_request(self, request_id):
       # Track in Celery monitoring tools (Flower, etc.)
       pass
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: After T027

**Notes**: Enable Celery monitoring with `track_started=True`

---

### Subtask T035 – Write task tests

**Purpose**: Achieve >80% task test coverage

**Steps**:
1. Create `tests/generative/test_tasks.py`:
   ```python
   import pytest
   from unittest.mock import Mock, patch
   from src.generative.tasks import process_generation_request
   from src.generative.models import GenerationRequest, GenerationOutput
   from src.generative.executors.base import ExecutionResult, ErrorCategory

   @pytest.mark.django_db
   class TestProcessGenerationRequest:
       @patch('src.generative.tasks.ExecutorFactory.get_executor')
       def test_success_creates_output(self, mock_factory, request):
           """Test successful execution creates output."""
           mock_executor = Mock()
           mock_executor.execute.return_value = ExecutionResult(
               success=True,
               output={'text': 'Generated', 'format': 'text'},
               cost=0.05
           )
           mock_factory.return_value = mock_executor

           process_generation_request(request.id)

           request.refresh_from_db()
           assert request.status == 'completed'
           assert request.actual_cost == 0.05
           assert GenerationOutput.objects.filter(request=request).exists()

       @patch('src.generative.tasks.ExecutorFactory.get_executor')
       def test_transient_error_retries(self, mock_factory, request):
           """Test transient error triggers retry."""
           mock_executor = Mock()
           mock_executor.execute.return_value = ExecutionResult(
               success=False,
               error='Rate limit',
               error_category=ErrorCategory.TRANSIENT
           )
           mock_factory.return_value = mock_executor

           with patch('src.generative.tasks.process_generation_request.apply_async') as mock_retry:
               process_generation_request(request.id)

               request.refresh_from_db()
               assert request.status == 'pending'
               assert request.retry_count == 1
               assert mock_retry.called

       @patch('src.generative.tasks.ExecutorFactory.get_executor')
       def test_permanent_error_fails(self, mock_factory, request):
           """Test permanent error fails immediately."""
           mock_executor = Mock()
           mock_executor.execute.return_value = ExecutionResult(
               success=False,
               error='Invalid input',
               error_category=ErrorCategory.PERMANENT
           )
           mock_factory.return_value = mock_executor

           process_generation_request(request.id)

           request.refresh_from_db()
           assert request.status == 'failed'
           assert request.retry_count == 1
           assert request.error_category == 'permanent'

       @patch('src.generative.tasks.ExecutorFactory.get_executor')
       def test_max_retries_enforced(self, mock_factory, request):
           """Test request fails after max retries."""
           request.retry_count = 5
           request.save()

           mock_executor = Mock()
           mock_executor.execute.return_value = ExecutionResult(
               success=False,
               error='Still failing',
               error_category=ErrorCategory.TRANSIENT
           )
           mock_factory.return_value = mock_executor

           process_generation_request(request.id)

           request.refresh_from_db()
           assert request.status == 'failed'
           assert request.retry_count == 6

       def test_idempotency(self, request):
           """Test duplicate task invocations skipped."""
           request.status = 'completed'
           request.save()

           process_generation_request(request.id)  # Should skip

           request.refresh_from_db()
           assert request.status == 'completed'  # Unchanged
   ```

2. Run tests: `pytest tests/generative/test_tasks.py -v`

**Files**: `tests/generative/test_tasks.py`

**Parallel?**: After T027-T034

**Notes**: Mock `ExecutorFactory` to avoid real API calls

---

## Definition of Done Checklist

- [x] Celery task `process_generation_request` implemented
- [x] Retry logic with exponential backoff
- [x] Max retry limit (5 attempts) enforced
- [x] Error classification drives retry decisions
- [x] Status transitions tracked with timestamps
- [x] Metadata tracking (retry history, execution details)
- [x] Idempotency checks prevent duplicate execution
- [x] Task monitoring with structured logging
- [x] Task tests written with >80% coverage
- [x] All tests pass: `pytest tests/generative/test_tasks.py`

---

## Review Guidance

**Acceptance Checkpoints**:
1. Submit request via API → verify task executes asynchronously
2. Simulate transient error → verify retry with backoff (check logs)
3. Simulate permanent error → verify immediate failure (no retry)
4. Submit 6 failing requests → verify max retries enforced
5. Check Celery monitoring (Flower) → verify task tracking

**Critical Validations**:
- Transient errors retry with exponential backoff (2s, 4s, 8s, 16s, 32s)
- Permanent errors fail immediately (no retry)
- Max 5 retries enforced, then fail
- Status transitions logged with timestamps

---

## Activity Log

- 2026-02-01T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2026-02-01T21:01:11Z – github-copilot – shell_pid=13948 – lane=doing – Started implementation
