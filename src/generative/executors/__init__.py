"""Pipeline executors for different AI providers.

NOTE: ExecutorFactory and specific executors (OpenAIExecutor, LangGraphExecutor) are
lazy-loaded to avoid requiring external dependencies (openai, langgraph_sdk) at import time.
This allows the generative app to be registered with Celery without crashing if these
optional dependencies are not installed.

Usage:
    from src.generative.executors.base import ErrorCategory, ExecutionResult
    from src.generative.executors.factory import ExecutorFactory  # Only when needed
"""

from src.generative.executors.base import (
    BasePipelineExecutor,
    ErrorCategory,
    ExecutionResult,
)

# Factory and executors are NOT imported here to avoid loading openai/langgraph at import time
# Import them directly when needed:
#   from src.generative.executors.factory import ExecutorFactory
#   from src.generative.executors.openai_executor import OpenAIExecutor

__all__ = [
    "BasePipelineExecutor",
    "ExecutionResult",
    "ErrorCategory",
]
