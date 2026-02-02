"""Base pipeline executor interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum
from typing import Any


class ErrorCategory(Enum):
    """Error classification for retry logic."""

    TRANSIENT = "transient"  # Retry (rate limit, timeout, 429, 503, 504)
    PERMANENT = "permanent"  # Fail (invalid input, auth error, 400, 401, 403)
    UNKNOWN = "unknown"  # Retry with caution (unexpected errors)


@dataclass
class ExecutionResult:
    """Result from pipeline execution."""

    success: bool
    output_type: str  # 'text', 'json', 'image', 'video'
    content: str | None = None  # For text/json outputs
    file_path: str | None = None  # For file outputs
    metadata: dict[str, Any] = field(default_factory=dict)
    actual_cost: Decimal | None = None
    error_message: str | None = None
    error_category: ErrorCategory | None = None


class BasePipelineExecutor(ABC):
    """Abstract base class for pipeline executors.

    All provider-specific executors (OpenAI, LangGraph, etc.) must inherit
    from this class and implement the execute method.
    """

    @abstractmethod
    async def execute(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
        brand_context: dict[str, Any] | None = None,
    ) -> ExecutionResult:
        """Execute the generation pipeline.

        Args:
            template_config: Pipeline configuration from GenerationTemplate.pipeline_config
            input_data: User-provided input data (validated against template schema)
            brand_context: Optional brand identity tokens from B33

        Returns:
            ExecutionResult with success/failure status, output, and cost
        """
        pass

    @abstractmethod
    def calculate_estimated_cost(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
    ) -> Decimal:
        """Calculate estimated cost for credit reservation.

        Args:
            template_config: Pipeline configuration
            input_data: User input data

        Returns:
            Estimated cost in credits
        """
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider identifier (e.g., 'openai', 'langgraph')."""
        pass

    def classify_error(self, exception: Exception) -> ErrorCategory:
        """Classify error for retry logic.

        Args:
            exception: The exception to classify

        Returns:
            ErrorCategory enum value
        """
        error_msg = str(exception).lower()
        error_type = exception.__class__.__name__

        # Transient errors (retry) - rate limits, timeouts, server errors
        if error_type in ["TimeoutError", "ConnectionError", "RateLimitError"] or any(
            keyword in error_msg
            for keyword in ["rate limit", "timeout", "429", "503", "504", "too many"]
        ):
            return ErrorCategory.TRANSIENT

        # Permanent errors (fail) - auth, validation, bad requests
        if error_type in ["AuthenticationError", "BadRequestError", "PermissionError"] or any(
            keyword in error_msg
            for keyword in ["invalid", "unauthorized", "401", "403", "400", "authentication"]
        ):
            return ErrorCategory.PERMANENT

        # Unknown (retry with caution)
        return ErrorCategory.UNKNOWN
