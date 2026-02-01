"""Base pipeline executor interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass
class ExecutionResult:
    """Result from pipeline execution."""

    success: bool
    output_type: str  # 'text', 'json', 'image', 'video'
    content: str | None = None  # For text/json outputs
    file_path: str | None = None  # For file outputs
    metadata: dict[str, Any] | None = None
    actual_cost: Decimal | None = None
    error_message: str | None = None
    error_category: str | None = None  # 'transient', 'permanent', 'unknown'


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
