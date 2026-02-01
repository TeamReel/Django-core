---
work_package_id: "WP03"
subtasks:
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
title: "Pipeline Executors"
phase: "Phase 2 - Pipeline Execution"
lane: "doing"
assignee: ""
agent: "claude"
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

# Work Package Prompt: WP03 – Pipeline Executors

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: Update `review_status: acknowledged` when you begin addressing feedback.

---

## Review Feedback

*[Empty - populated by `/spec-kitty.review` if work needs changes]*

---

## Objectives & Success Criteria

**Outcomes**:
1. BasePipelineExecutor ABC with execute() contract
2. OpenAIExecutor for simple completions (80% use case)
3. LangGraphExecutor for stateful workflows (20% use case)
4. Factory pattern for executor instantiation
5. Graph registry for custom LangGraph workflows
6. Error handling with transient/permanent/unknown classification
7. Cost tracking (input/output tokens, provider pricing)
8. Executor tests achieve >80% coverage

**Success Metrics**:
- OpenAI executor generates text from prompt
- LangGraph executor invokes graph and returns result
- Factory instantiates correct executor based on provider
- Error classification works (API rate limit → transient, invalid prompt → permanent)

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (models exist)
- OpenAI API key configured in settings
- LangGraph SDK installed (`langgraph-sdk`)
- LangGraph server running locally (development) or deployed (production)

**Supporting Documents**:
- [spec.md](../spec.md) - FR-011 to FR-015 (executor requirements)
- [research.md](../research.md) - Decision 1 (LangGraph SDK vs Cloud), Decision 5 (80/20 provider split)
- [plan.md](../plan.md) - Phase 3 implementation details

**Architectural Decisions**:
- LangGraph SDK (local execution) over Cloud API → no vendor lock-in, full control
- 80/20 provider split: OpenAI for speed, LangGraph for complexity
- Factory pattern: Executor instantiation via `get_executor(pipeline_config)`
- Graph registry: Decorator-based registration for custom graphs

**Constraints**:
- Product-agnostic: No TeamReel-specific executor logic (extend via custom graphs)
- Error classification: Must distinguish transient (retry) vs permanent (fail)
- Cost tracking: Track input/output tokens, compute cost from provider pricing

---

## Subtasks & Detailed Guidance

### Subtask T018 – Create BasePipelineExecutor ABC

**Purpose**: Define executor contract with execute() method

**Steps**:
1. Create `src/generative/executors/base.py`:
   ```python
   from abc import ABC, abstractmethod
   from typing import Dict, Any, Tuple
   from enum import Enum

   class ErrorCategory(Enum):
       """Error classification for retry logic."""
       TRANSIENT = "transient"  # Retry (rate limit, timeout)
       PERMANENT = "permanent"  # Fail (invalid input, auth error)
       UNKNOWN = "unknown"      # Retry with caution

   class ExecutionResult:
       """Wrapper for executor output."""
       def __init__(
           self,
           success: bool,
           output: Any = None,
           error: str = None,
           error_category: ErrorCategory = None,
           cost: float = 0.0,
           metadata: Dict[str, Any] = None
       ):
           self.success = success
           self.output = output
           self.error = error
           self.error_category = error_category
           self.cost = cost
           self.metadata = metadata or {}

   class BasePipelineExecutor(ABC):
       """Abstract base for pipeline executors."""

       def __init__(self, pipeline_config: Dict[str, Any]):
           self.config = pipeline_config

       @abstractmethod
       def execute(self, input_data: Dict[str, Any]) -> ExecutionResult:
           """Execute pipeline and return result.

           Args:
               input_data: Input matching template's input_schema

           Returns:
               ExecutionResult with output or error
           """
           pass

       def classify_error(self, exception: Exception) -> ErrorCategory:
           """Classify error for retry logic."""
           error_msg = str(exception).lower()

           # Transient errors (retry)
           if any(x in error_msg for x in ['rate limit', 'timeout', '429', '503', '504']):
               return ErrorCategory.TRANSIENT

           # Permanent errors (fail)
           if any(x in error_msg for x in ['invalid', 'unauthorized', '401', '403', '400']):
               return ErrorCategory.PERMANENT

           # Unknown (retry with caution)
           return ErrorCategory.UNKNOWN
   ```

**Files**: `src/generative/executors/base.py`

**Parallel?**: No (required for T019-T020)

**Notes**:
- Use dataclass-style `ExecutionResult` for structured output
- `classify_error()` shared logic for transient/permanent distinction
- Cost tracking: Executors compute cost from token usage

---

### Subtask T019 – Implement OpenAIExecutor

**Purpose**: Execute simple completions via OpenAI API

**Steps**:
1. Create `src/generative/executors/openai.py`:
   ```python
   import openai
   from django.conf import settings
   from .base import BasePipelineExecutor, ExecutionResult, ErrorCategory

   class OpenAIExecutor(BasePipelineExecutor):
       """Executor for OpenAI completions."""

       def __init__(self, pipeline_config: dict):
           super().__init__(pipeline_config)
           self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
           self.model = pipeline_config.get('model', 'gpt-4')
           self.temperature = pipeline_config.get('temperature', 0.7)
           self.max_tokens = pipeline_config.get('max_tokens', 500)

       def execute(self, input_data: dict) -> ExecutionResult:
           """Execute OpenAI completion."""
           try:
               # Build messages from input_data
               messages = self._build_messages(input_data)

               # Call OpenAI API
               response = self.client.chat.completions.create(
                   model=self.model,
                   messages=messages,
                   temperature=self.temperature,
                   max_tokens=self.max_tokens
               )

               # Extract output
               output = response.choices[0].message.content

               # Compute cost
               cost = self._compute_cost(
                   response.usage.prompt_tokens,
                   response.usage.completion_tokens
               )

               return ExecutionResult(
                   success=True,
                   output={'text': output, 'format': 'text'},
                   cost=cost,
                   metadata={
                       'model': self.model,
                       'prompt_tokens': response.usage.prompt_tokens,
                       'completion_tokens': response.usage.completion_tokens,
                       'finish_reason': response.choices[0].finish_reason
                   }
               )
           except openai.RateLimitError as e:
               return ExecutionResult(
                   success=False,
                   error=str(e),
                   error_category=ErrorCategory.TRANSIENT
               )
           except openai.AuthenticationError as e:
               return ExecutionResult(
                   success=False,
                   error=str(e),
                   error_category=ErrorCategory.PERMANENT
               )
           except Exception as e:
               return ExecutionResult(
                   success=False,
                   error=str(e),
                   error_category=self.classify_error(e)
               )

       def _build_messages(self, input_data: dict) -> list:
           """Convert input_data to OpenAI message format."""
           prompt = input_data.get('prompt', '')
           system_message = self.config.get('system_message', 'You are a helpful assistant.')

           return [
               {'role': 'system', 'content': system_message},
               {'role': 'user', 'content': prompt}
           ]

       def _compute_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
           """Compute cost from token usage and model pricing."""
           # Pricing per 1K tokens (as of 2024)
           pricing = {
               'gpt-4': {'input': 0.03, 'output': 0.06},
               'gpt-4-turbo': {'input': 0.01, 'output': 0.03},
               'gpt-3.5-turbo': {'input': 0.0005, 'output': 0.0015},
           }

           model_pricing = pricing.get(self.model, {'input': 0.01, 'output': 0.03})
           cost = (prompt_tokens / 1000 * model_pricing['input']) + \
                  (completion_tokens / 1000 * model_pricing['output'])
           return round(cost, 4)
   ```

2. Add to `src/generative/executors/__init__.py`:
   ```python
   from .base import BasePipelineExecutor, ExecutionResult, ErrorCategory
   from .openai import OpenAIExecutor

   __all__ = ['BasePipelineExecutor', 'ExecutionResult', 'ErrorCategory', 'OpenAIExecutor']
   ```

**Files**: `src/generative/executors/openai.py`, `src/generative/executors/__init__.py`

**Parallel?**: After T018

**Notes**:
- Use OpenAI's Python SDK (add `openai` to requirements)
- Cost computation uses hardcoded pricing (update monthly via cron job in WP07)
- Handle rate limits (HTTP 429) as transient errors

---

### Subtask T020 – Implement LangGraphExecutor

**Purpose**: Execute stateful workflows via LangGraph SDK

**Steps**:
1. Create `src/generative/executors/langgraph_executor.py`:
   ```python
   from langgraph_sdk import get_client
   from django.conf import settings
   from .base import BasePipelineExecutor, ExecutionResult, ErrorCategory

   class LangGraphExecutor(BasePipelineExecutor):
       """Executor for LangGraph workflows."""

       def __init__(self, pipeline_config: dict):
           super().__init__(pipeline_config)
           self.client = get_client(url=settings.LANGGRAPH_API_URL)
           self.graph_id = pipeline_config['graph_id']
           self.assistant_id = pipeline_config.get('assistant_id')

       def execute(self, input_data: dict) -> ExecutionResult:
           """Execute LangGraph workflow."""
           try:
               # Create thread
               thread = self.client.threads.create()

               # Run graph
               run = self.client.runs.create(
                   thread_id=thread['thread_id'],
                   assistant_id=self.assistant_id or self.graph_id,
                   input=input_data
               )

               # Wait for completion
               run = self.client.runs.wait(
                   thread_id=thread['thread_id'],
                   run_id=run['run_id']
               )

               # Extract output
               if run['status'] == 'success':
                   output = run.get('output', {})
                   return ExecutionResult(
                       success=True,
                       output=output,
                       cost=self._compute_cost(run),
                       metadata={
                           'graph_id': self.graph_id,
                           'thread_id': thread['thread_id'],
                           'run_id': run['run_id']
                       }
                   )
               else:
                   return ExecutionResult(
                       success=False,
                       error=run.get('error', 'Unknown error'),
                       error_category=ErrorCategory.UNKNOWN
                   )
           except Exception as e:
               return ExecutionResult(
                   success=False,
                   error=str(e),
                   error_category=self.classify_error(e)
               )

       def _compute_cost(self, run: dict) -> float:
           """Compute cost from run metadata."""
           # LangGraph runs may include token usage in metadata
           usage = run.get('usage', {})
           prompt_tokens = usage.get('prompt_tokens', 0)
           completion_tokens = usage.get('completion_tokens', 0)

           # Use estimated cost from template if no usage data
           if prompt_tokens == 0 and completion_tokens == 0:
               return self.config.get('estimated_cost', 0.0)

           # Use similar pricing as OpenAI (adjust per provider)
           cost = (prompt_tokens / 1000 * 0.01) + (completion_tokens / 1000 * 0.03)
           return round(cost, 4)
   ```

2. Update `src/generative/executors/__init__.py`:
   ```python
   from .langgraph_executor import LangGraphExecutor

   __all__ = ['BasePipelineExecutor', 'ExecutionResult', 'ErrorCategory', 'OpenAIExecutor', 'LangGraphExecutor']
   ```

**Files**: `src/generative/executors/langgraph_executor.py`, `__init__.py`

**Parallel?**: After T018 (can parallelize with T019)

**Notes**:
- Use LangGraph SDK's synchronous wait (async variant exists for Celery)
- Cost computation may fall back to estimated_cost if usage data unavailable
- Add `langgraph-sdk` to requirements

---

### Subtask T021 – Create executor factory

**Purpose**: Instantiate correct executor based on provider

**Steps**:
1. Create `src/generative/executors/factory.py`:
   ```python
   from .base import BasePipelineExecutor
   from .openai import OpenAIExecutor
   from .langgraph_executor import LangGraphExecutor

   class ExecutorFactory:
       """Factory for creating pipeline executors."""

       _executors = {
           'openai': OpenAIExecutor,
           'langgraph': LangGraphExecutor,
       }

       @classmethod
       def register_executor(cls, provider: str, executor_class: type):
           """Register custom executor."""
           if not issubclass(executor_class, BasePipelineExecutor):
               raise ValueError(f"{executor_class} must inherit from BasePipelineExecutor")
           cls._executors[provider] = executor_class

       @classmethod
       def get_executor(cls, pipeline_config: dict) -> BasePipelineExecutor:
           """Get executor instance for provider."""
           provider = pipeline_config.get('provider')
           if provider not in cls._executors:
               raise ValueError(f"Unknown provider: {provider}")

           executor_class = cls._executors[provider]
           return executor_class(pipeline_config)
   ```

2. Usage example:
   ```python
   from src.generative.executors.factory import ExecutorFactory

   executor = ExecutorFactory.get_executor({'provider': 'openai', 'model': 'gpt-4'})
   result = executor.execute({'prompt': 'Hello, world!'})
   ```

**Files**: `src/generative/executors/factory.py`

**Parallel?**: After T019, T020

**Notes**: Factory supports runtime registration of custom executors (e.g., Anthropic)

---

### Subtask T022 – Implement LangGraph graph registry

**Purpose**: Decorator-based registration for custom LangGraph workflows

**Steps**:
1. Create `src/generative/graphs/registry.py`:
   ```python
   from typing import Dict, Callable

   class GraphRegistry:
       """Registry for custom LangGraph workflow definitions."""

       _graphs: Dict[str, Callable] = {}

       @classmethod
       def register(cls, graph_id: str):
           """Decorator to register a graph builder."""
           def decorator(func: Callable):
               cls._graphs[graph_id] = func
               return func
           return decorator

       @classmethod
       def get_graph(cls, graph_id: str) -> Callable:
           """Get graph builder by ID."""
           if graph_id not in cls._graphs:
               raise ValueError(f"Graph not registered: {graph_id}")
           return cls._graphs[graph_id]

       @classmethod
       def list_graphs(cls) -> list:
           """List all registered graph IDs."""
           return list(cls._graphs.keys())
   ```

2. Example custom graph:
   ```python
   # src/generative/graphs/example.py
   from langgraph.graph import StateGraph
   from .registry import GraphRegistry

   @GraphRegistry.register('example_workflow')
   def build_example_graph():
       """Build example stateful workflow."""
       graph = StateGraph()
       # Define nodes, edges, etc.
       return graph.compile()
   ```

**Files**: `src/generative/graphs/registry.py`, `src/generative/graphs/example.py`

**Parallel?**: After T020

**Notes**: Registry pattern allows product-specific graphs (e.g., TeamReel's match analysis graph)

---

### Subtask T023 – Add error classification logic

**Purpose**: Implement comprehensive error classification

**Steps**:
1. Update `src/generative/executors/base.py`:
   ```python
   def classify_error(self, exception: Exception) -> ErrorCategory:
       """Enhanced error classification."""
       error_msg = str(exception).lower()
       error_type = type(exception).__name__

       # Transient errors (retry)
       transient_patterns = [
           'rate limit', 'timeout', '429', '503', '504',
           'connection', 'network', 'temporary'
       ]
       if any(p in error_msg for p in transient_patterns):
           return ErrorCategory.TRANSIENT

       # Permanent errors (fail immediately)
       permanent_patterns = [
           'invalid', 'unauthorized', '401', '403', '400',
           'authentication', 'permission', 'not found', '404'
       ]
       if any(p in error_msg for p in permanent_patterns):
           return ErrorCategory.PERMANENT

       # Type-based classification
       if error_type in ['ValueError', 'TypeError', 'KeyError']:
           return ErrorCategory.PERMANENT

       # Unknown (retry with caution)
       return ErrorCategory.UNKNOWN
   ```

**Files**: `src/generative/executors/base.py`

**Parallel?**: After T018

**Notes**: Error classification drives retry logic in WP04

---

### Subtask T024 – Implement cost tracking

**Purpose**: Track input/output tokens and compute provider-specific cost

**Steps**:
1. Update executors to track cost in `ExecutionResult.cost`
2. Create `src/generative/utils/pricing.py`:
   ```python
   PRICING_MODELS = {
       'openai': {
           'gpt-4': {'input': 0.03, 'output': 0.06},
           'gpt-4-turbo': {'input': 0.01, 'output': 0.03},
           'gpt-3.5-turbo': {'input': 0.0005, 'output': 0.0015},
       },
       'anthropic': {
           'claude-3-opus': {'input': 0.015, 'output': 0.075},
           'claude-3-sonnet': {'input': 0.003, 'output': 0.015},
       },
   }

   def get_model_pricing(provider: str, model: str) -> dict:
       """Get pricing for provider/model."""
       return PRICING_MODELS.get(provider, {}).get(model, {'input': 0.01, 'output': 0.03})
   ```

**Files**: `src/generative/utils/pricing.py`, update executor classes

**Parallel?**: After T019, T020

**Notes**: Pricing updated monthly via cron job (WP07)

---

### Subtask T025 – Add executor logging

**Purpose**: Structured logging for executor operations

**Steps**:
1. Update executors to log execution:
   ```python
   import logging

   logger = logging.getLogger('generative.executors')

   class OpenAIExecutor(BasePipelineExecutor):
       def execute(self, input_data: dict) -> ExecutionResult:
           logger.info(f"Executing OpenAI completion with model={self.model}")
           try:
               # ... existing code
               logger.info(f"OpenAI completion success, cost={result.cost}")
               return result
           except Exception as e:
               logger.error(f"OpenAI execution failed: {e}", exc_info=True)
               # ... existing error handling
   ```

**Files**: Update `openai.py`, `langgraph_executor.py`

**Parallel?**: After T019, T020

**Notes**: Use structured logging for production debugging

---

### Subtask T026 – Write executor tests

**Purpose**: Achieve >80% executor test coverage

**Steps**:
1. Create `tests/generative/test_executors.py`:
   ```python
   import pytest
   from unittest.mock import Mock, patch
   from src.generative.executors import OpenAIExecutor, LangGraphExecutor, ExecutorFactory, ErrorCategory

   @pytest.mark.django_db
   class TestOpenAIExecutor:
       @patch('openai.OpenAI')
       def test_execute_success(self, mock_openai):
           """Test successful OpenAI execution."""
           mock_client = Mock()
           mock_response = Mock()
           mock_response.choices = [Mock(message=Mock(content='Generated text'), finish_reason='stop')]
           mock_response.usage = Mock(prompt_tokens=10, completion_tokens=20)
           mock_client.chat.completions.create.return_value = mock_response
           mock_openai.return_value = mock_client

           executor = OpenAIExecutor({'provider': 'openai', 'model': 'gpt-4'})
           result = executor.execute({'prompt': 'Hello'})

           assert result.success is True
           assert result.output['text'] == 'Generated text'
           assert result.cost > 0

       @patch('openai.OpenAI')
       def test_rate_limit_error(self, mock_openai):
           """Test rate limit classified as transient."""
           mock_client = Mock()
           mock_client.chat.completions.create.side_effect = openai.RateLimitError('Rate limit')
           mock_openai.return_value = mock_client

           executor = OpenAIExecutor({'provider': 'openai', 'model': 'gpt-4'})
           result = executor.execute({'prompt': 'Hello'})

           assert result.success is False
           assert result.error_category == ErrorCategory.TRANSIENT

   @pytest.mark.django_db
   class TestLangGraphExecutor:
       @patch('langgraph_sdk.get_client')
       def test_execute_success(self, mock_get_client):
           """Test successful LangGraph execution."""
           mock_client = Mock()
           mock_client.threads.create.return_value = {'thread_id': '123'}
           mock_client.runs.create.return_value = {'run_id': '456'}
           mock_client.runs.wait.return_value = {
               'status': 'success',
               'output': {'result': 'Generated'},
               'usage': {'prompt_tokens': 10, 'completion_tokens': 20}
           }
           mock_get_client.return_value = mock_client

           executor = LangGraphExecutor({'provider': 'langgraph', 'graph_id': 'test_graph'})
           result = executor.execute({'input': 'test'})

           assert result.success is True
           assert result.output['result'] == 'Generated'

   class TestExecutorFactory:
       def test_get_openai_executor(self):
           """Test factory creates OpenAI executor."""
           executor = ExecutorFactory.get_executor({'provider': 'openai', 'model': 'gpt-4'})
           assert isinstance(executor, OpenAIExecutor)

       def test_unknown_provider(self):
           """Test factory raises error for unknown provider."""
           with pytest.raises(ValueError, match='Unknown provider'):
               ExecutorFactory.get_executor({'provider': 'unknown'})
   ```

2. Run tests: `pytest tests/generative/test_executors.py -v`

**Files**: `tests/generative/test_executors.py`

**Parallel?**: After T018-T025

**Notes**: Mock external APIs (OpenAI, LangGraph) to avoid real API calls in CI

---

## Definition of Done Checklist

- [x] BasePipelineExecutor ABC with execute() contract
- [x] OpenAIExecutor implemented with cost tracking
- [x] LangGraphExecutor implemented with SDK integration
- [x] ExecutorFactory for provider-based instantiation
- [x] GraphRegistry for custom LangGraph workflows
- [x] Error classification logic (transient/permanent/unknown)
- [x] Cost tracking with provider-specific pricing
- [x] Structured logging added to executors
- [x] Executor tests written with >80% coverage
- [x] All tests pass: `pytest tests/generative/test_executors.py`

---

## Review Guidance

**Acceptance Checkpoints**:
1. Run OpenAI executor manually: Verify real API call generates text
2. Test error classification: Rate limit → transient, invalid prompt → permanent
3. Check cost computation: Verify token-based pricing calculation
4. Test factory: Verify correct executor instantiated for provider

**Critical Validations**:
- Executors return `ExecutionResult` with success/error/cost
- Error classification drives retry logic (verified in WP04)
- Cost tracking accurate (compare with OpenAI dashboard)

---

## Activity Log

- 2026-02-01T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2026-02-01T20:22:48Z – claude – shell_pid=13948 – lane=doing – Started implementation: Pipeline Executors
