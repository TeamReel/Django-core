---
work_package_id: WP02
title: Gemini Retry
lane: "doing"
dependencies: []
requirement_refs:
- FR-003
planning_base_branch: main
merge_target_branch: main
branch_strategy: Create worktree from main, merge back to main when complete
base_branch: main
base_commit: f366e51d20c73aaa3cadaa3a36a7d0d1f2a2d06d
created_at: '2026-03-31T14:34:57.507427+00:00'
subtasks: [T009, T010, T011, T012, T013]
agent: "Bouwer"
shell_pid: "99632"
history:
- date: '2026-03-31T14:10:25Z'
  event: created
  author: spec-kitty
---

# WP02: Gemini Retry

## Objective

Add tenacity retry decorator to all Gemini API calls with:
- **Exponential backoff**: 1s → 2s → 4s
- **Max attempts**: 3
- **Total cap**: 30 seconds
- **Retry on**: RateLimitError, ConnectionError, TimeoutError

This prevents batch job failures when Gemini rate limits kick in (~15-20 requests).

## Context

**Requirements**: FR-003 (Gemini retry with tenacity)

**Current State**: `gemini_image.py` makes direct API calls without retry. When rate limited (429), the entire batch fails.

**Target State**: Transient failures automatically retried with backoff. Users see completed batches, not partial failures.

**Files to Create**:
- `src/media/validation/retry_config.py`

**Files to Modify**:
- `src/generative/services/gemini_image.py` - Add retry decorators

## Implementation Command

```bash
spec-kitty implement WP02
```

---

## Subtasks

### T009: Create retry_config.py module

**Purpose**: Centralized retry configuration that can be reused across AI providers.

**Steps**:
1. Create `src/media/validation/retry_config.py`:
   ```python
   """Retry configurations for AI providers using tenacity."""
   import logging
   from typing import Callable, TypeVar, Any
   
   from tenacity import (
       retry,
       stop_after_attempt,
       stop_after_delay,
       wait_exponential,
       retry_if_exception_type,
       before_sleep_log,
       RetryError,
   )
   
   logger = logging.getLogger(__name__)
   
   # Type var for decorated functions
   F = TypeVar('F', bound=Callable[..., Any])
   
   # Default configuration
   DEFAULT_MAX_ATTEMPTS = 3
   DEFAULT_MAX_DELAY_SECONDS = 30
   DEFAULT_MULTIPLIER = 1  # Base wait time
   DEFAULT_MIN_WAIT = 1    # Minimum 1 second
   DEFAULT_MAX_WAIT = 8    # Maximum 8 seconds per wait
   ```

2. Update `src/media/validation/__init__.py` to export retry config:
   ```python
   from .retry_config import create_retry_decorator, GEMINI_RETRY
   ```

**Validation**:
- [ ] Module imports without errors
- [ ] Constants defined with sensible defaults

---

### T010: Define GEMINI_RETRY decorator with tenacity

**Purpose**: Pre-configured retry decorator specifically for Gemini API calls.

**Steps**:
1. Add to `retry_config.py`:
   ```python
   from google.api_core.exceptions import (
       ResourceExhausted,  # Rate limit
       ServiceUnavailable,
       DeadlineExceeded,
   )
   import requests
   
   # Exception types that should trigger retry
   TRANSIENT_EXCEPTIONS = (
       ResourceExhausted,      # Gemini rate limit (429)
       ServiceUnavailable,     # Temporary service issue (503)
       DeadlineExceeded,       # Timeout
       ConnectionError,        # Network issues
       TimeoutError,           # Python timeout
       requests.ConnectionError,
       requests.Timeout,
   )
   
   def log_retry_attempt(retry_state) -> None:
       """Log retry attempts with useful context."""
       exception = retry_state.outcome.exception()
       attempt = retry_state.attempt_number
       wait_time = retry_state.next_action.sleep if retry_state.next_action else 0
       
       logger.warning(
           "Gemini API retry",
           extra={
               "attempt": attempt,
               "exception_type": type(exception).__name__,
               "exception_message": str(exception)[:200],
               "wait_seconds": f"{wait_time:.1f}",
           }
       )
   
   def create_retry_decorator(
       max_attempts: int = DEFAULT_MAX_ATTEMPTS,
       max_delay: int = DEFAULT_MAX_DELAY_SECONDS,
       exceptions: tuple = TRANSIENT_EXCEPTIONS,
   ) -> Callable[[F], F]:
       """
       Create a retry decorator with custom configuration.
       
       Args:
           max_attempts: Maximum retry attempts (default 3)
           max_delay: Maximum total delay in seconds (default 30)
           exceptions: Tuple of exception types to retry on
           
       Returns:
           Configured retry decorator
       """
       return retry(
           stop=(
               stop_after_attempt(max_attempts) | 
               stop_after_delay(max_delay)
           ),
           wait=wait_exponential(
               multiplier=DEFAULT_MULTIPLIER,
               min=DEFAULT_MIN_WAIT,
               max=DEFAULT_MAX_WAIT,
           ),
           retry=retry_if_exception_type(exceptions),
           before_sleep=log_retry_attempt,
           reraise=True,  # Re-raise the last exception if all retries fail
       )
   
   # Pre-configured decorator for Gemini
   GEMINI_RETRY = create_retry_decorator(
       max_attempts=3,
       max_delay=30,
       exceptions=TRANSIENT_EXCEPTIONS,
   )
   ```

**Edge Cases**:
- Handle both Google API exceptions and generic network errors
- Jitter is built into tenacity's exponential wait
- Total time capped at 30s to prevent blocking user too long

**Validation**:
- [ ] `GEMINI_RETRY` can be used as a decorator
- [ ] Retries on ResourceExhausted (429)
- [ ] Stops after 3 attempts OR 30 seconds

---

### T011: Add retry decorator to gemini_image.py API calls

**Purpose**: Apply the retry decorator to all Gemini API methods.

**Steps**:
1. Read current `src/generative/services/gemini_image.py` structure
2. Import the retry decorator:
   ```python
   from src.media.validation import GEMINI_RETRY
   ```
3. Find API call methods and add decorator:
   ```python
   @GEMINI_RETRY
   def generate_content(self, prompt: str, image: bytes) -> GenerateContentResponse:
       """Generate content with Gemini."""
       # existing implementation
       pass
   
   @GEMINI_RETRY
   def analyze_image(self, image: bytes) -> dict:
       """Analyze image contents."""
       # existing implementation
       pass
   ```

**Note**: Identify which methods make actual API calls vs wrappers. Only decorate the methods that directly call `model.generate_content()` or similar.

**Validation**:
- [ ] All direct API call methods have `@GEMINI_RETRY`
- [ ] Wrapper methods do NOT have retry (avoid double-retry)
- [ ] Imports work correctly

---

### T012: Add logging for retry attempts

**Purpose**: Visible logging when retries occur for debugging and monitoring.

**Steps**:
1. The `log_retry_attempt` callback (T010) handles logging
2. Ensure structlog/logging is configured in gemini_image.py:
   ```python
   import structlog
   
   logger = structlog.get_logger(__name__)
   ```
3. Add success logging after retry recovery:
   ```python
   @GEMINI_RETRY
   def generate_content(self, prompt: str, image: bytes) -> GenerateContentResponse:
       result = self._api_call(prompt, image)
       logger.info(
           "gemini_generate_success",
           prompt_length=len(prompt),
           # Include retry info if available from context
       )
       return result
   ```

**Log Fields**:
- `attempt`: Current attempt number
- `exception_type`: Type of exception that triggered retry
- `wait_seconds`: Backoff wait time
- `status`: "retry" during wait, "success" or "failed" at end

**Validation**:
- [ ] Retry attempts logged with attempt number
- [ ] Final success/failure logged with total attempt count
- [ ] Logs are structured (JSON-able)

---

### T013: Create tests for retry behavior

**Purpose**: Verify retry logic works correctly with mocked API failures.

**Steps**:
1. Create `tests/media/test_retry_config.py`:
   ```python
   import pytest
   from unittest.mock import MagicMock, patch
   from tenacity import RetryError
   
   from src.media.validation.retry_config import (
       create_retry_decorator,
       GEMINI_RETRY,
       TRANSIENT_EXCEPTIONS,
   )
   
   class TestRetryDecorator:
       def test_succeeds_first_try(self):
           """No retry needed when first call succeeds."""
           call_count = 0
           
           @GEMINI_RETRY
           def always_succeeds():
               nonlocal call_count
               call_count += 1
               return "success"
           
           result = always_succeeds()
           assert result == "success"
           assert call_count == 1
       
       def test_retries_on_rate_limit(self):
           """Retries when rate limited, succeeds on second try."""
           from google.api_core.exceptions import ResourceExhausted
           
           call_count = 0
           
           @GEMINI_RETRY
           def fails_once():
               nonlocal call_count
               call_count += 1
               if call_count == 1:
                   raise ResourceExhausted("Rate limit exceeded")
               return "success"
           
           result = fails_once()
           assert result == "success"
           assert call_count == 2
       
       def test_retries_on_connection_error(self):
           """Retries on network errors."""
           call_count = 0
           
           @GEMINI_RETRY
           def network_flaky():
               nonlocal call_count
               call_count += 1
               if call_count < 3:
                   raise ConnectionError("Connection reset")
               return "success"
           
           result = network_flaky()
           assert result == "success"
           assert call_count == 3
       
       def test_gives_up_after_max_attempts(self):
           """Stops retrying after 3 attempts."""
           from google.api_core.exceptions import ResourceExhausted
           
           call_count = 0
           
           @GEMINI_RETRY
           def always_fails():
               nonlocal call_count
               call_count += 1
               raise ResourceExhausted("Rate limit exceeded")
           
           with pytest.raises(ResourceExhausted):
               always_fails()
           
           assert call_count == 3  # Initial + 2 retries
       
       def test_does_not_retry_non_transient_errors(self):
           """Does not retry on non-transient errors like ValueError."""
           call_count = 0
           
           @GEMINI_RETRY
           def raises_value_error():
               nonlocal call_count
               call_count += 1
               raise ValueError("Invalid input")
           
           with pytest.raises(ValueError):
               raises_value_error()
           
           assert call_count == 1  # No retry
       
       def test_custom_retry_config(self):
           """Custom retry decorator with different settings."""
           custom_retry = create_retry_decorator(
               max_attempts=2,
               max_delay=10,
               exceptions=(ValueError,),  # Unusual but for testing
           )
           
           call_count = 0
           
           @custom_retry
           def fails_with_value_error():
               nonlocal call_count
               call_count += 1
               raise ValueError("test")
           
           with pytest.raises(ValueError):
               fails_with_value_error()
           
           assert call_count == 2  # Max 2 attempts
   
   class TestGeminiRetryIntegration:
       """Integration tests with mocked Gemini client."""
       
       @patch('src.generative.services.gemini_image.genai')
       def test_gemini_call_retries_on_429(self, mock_genai):
           """Test that actual Gemini calls retry on rate limit."""
           from google.api_core.exceptions import ResourceExhausted
           
           # Setup mock to fail once then succeed
           call_count = 0
           def mock_generate(*args, **kwargs):
               nonlocal call_count
               call_count += 1
               if call_count == 1:
                   raise ResourceExhausted("429 Resource Exhausted")
               return MagicMock(text="Generated content")
           
           mock_genai.GenerativeModel.return_value.generate_content = mock_generate
           
           # This test would import and call the actual gemini_image function
           # Adjust based on actual function signature
           # from src.generative.services.gemini_image import generate_image
           # result = generate_image(prompt="test")
           # assert result is not None
           pass  # Placeholder - adjust to actual API
   ```

**Validation**:
- [ ] `pytest tests/media/test_retry_config.py` passes
- [ ] Tests cover: success path, retry path, max attempts, non-transient errors
- [ ] Mocking doesn't break production imports

---

## Definition of Done

- [ ] All subtasks (T009-T013) completed
- [ ] `pytest tests/media/test_retry_config.py` passes
- [ ] All Gemini API methods have `@GEMINI_RETRY` decorator
- [ ] Retry attempts logged with structlog
- [ ] Backoff timing verified: 1s → 2s → 4s
- [ ] Total retry time capped at 30s

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Retry causes cascade failures | API hammered | Exponential backoff + jitter |
| 30s cap too short for recovery | Failures not recovered | Monitor and adjust if needed |
| Mock tests don't match production | False confidence | Add integration test with real API in staging |

## Reviewer Guidance

1. **Check exception types**: Ensure all Google API transient exceptions covered
2. **Verify decorator placement**: Only on direct API calls, not wrappers
3. **Log format**: Should be structured for log aggregation
4. **Timing**: Run with stopwatch to verify backoff intervals

## Activity Log

- 2026-03-31T14:34:58Z – Bouwer – shell_pid=98592 – lane=doing – Assigned agent via workflow command
- 2026-03-31T14:45:31Z – Bouwer – shell_pid=98592 – lane=for_review – Ready for review
- 2026-03-31T14:46:23Z – Bouwer – shell_pid=99632 – lane=doing – Started review via workflow command
