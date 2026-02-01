"""LangGraph pipeline executor for stateful workflows."""

from decimal import Decimal
from typing import Any

from django.conf import settings
from langgraph_sdk import get_client

from .base import BasePipelineExecutor, ErrorCategory, ExecutionResult


class LangGraphExecutor(BasePipelineExecutor):
    """Executor for LangGraph stateful workflows (20% use case).

    Uses LangGraph SDK for complex multi-step AI workflows.
    Supports StateGraph execution with thread management.
    """

    @property
    def provider_name(self) -> str:
        """Return provider identifier."""
        return "langgraph"

    def _get_client(self):
        """Get LangGraph SDK client."""
        api_url = getattr(settings, "LANGGRAPH_API_URL", "http://localhost:8123")
        return get_client(url=api_url)

    async def execute(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
        brand_context: dict[str, Any] | None = None,
    ) -> ExecutionResult:
        """Execute LangGraph workflow.

        Args:
            template_config: Must include 'graph_id' (required), optional 'assistant_id'
            input_data: Graph input (schema defined by graph)
            brand_context: Optional brand identity tokens (passed in input)

        Returns:
            ExecutionResult with graph output or error
        """
        try:
            # Extract config
            graph_id = template_config.get("graph_id")
            if not graph_id:
                raise ValueError("template_config must contain 'graph_id'")

            assistant_id = template_config.get("assistant_id", graph_id)

            # Inject brand context if provided
            if brand_context:
                input_data = {**input_data, "brand_context": brand_context}

            # Get client
            client = self._get_client()

            # Create thread for this execution
            thread = client.threads.create()

            # Run graph
            run = client.runs.create(
                thread_id=thread["thread_id"],
                assistant_id=assistant_id,
                input=input_data,
            )

            # Wait for completion (blocking - use async variant in Celery tasks)
            run = client.runs.wait(
                thread_id=thread["thread_id"],
                run_id=run["run_id"],
            )

            # Check execution status
            if run["status"] == "success":
                output = run.get("output", {})
                cost = self._compute_cost(run)

                return ExecutionResult(
                    success=True,
                    output_type="json",  # LangGraph outputs are typically structured
                    content=str(output),
                    actual_cost=cost,
                    metadata={
                        "graph_id": graph_id,
                        "thread_id": thread["thread_id"],
                        "run_id": run["run_id"],
                        "status": run["status"],
                    },
                )
            else:
                error_msg = run.get("error", "Unknown error")
                return ExecutionResult(
                    success=False,
                    output_type="json",
                    error_message=f"LangGraph execution failed: {error_msg}",
                    error_category=ErrorCategory.UNKNOWN,
                )

        except ConnectionError as e:
            return ExecutionResult(
                success=False,
                output_type="json",
                error_message=f"LangGraph connection error: {str(e)}",
                error_category=ErrorCategory.TRANSIENT,
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                output_type="json",
                error_message=f"LangGraph execution error: {str(e)}",
                error_category=self.classify_error(e),
            )

    def calculate_estimated_cost(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
    ) -> Decimal:
        """Estimate cost for LangGraph execution.

        LangGraph workflows can vary significantly in cost based on:
        - Number of nodes executed
        - LLM calls per node
        - Model selection per node

        For now, use a fixed estimate or template-provided value.

        Args:
            template_config: Pipeline config (may include 'estimated_cost')
            input_data: Graph input

        Returns:
            Estimated cost in USD
        """
        # Use template-provided estimate if available
        estimated = template_config.get("estimated_cost", "1.00")
        return Decimal(str(estimated))

    def _compute_cost(self, run: dict) -> Decimal:
        """Compute actual cost from run metadata.

        Args:
            run: LangGraph run result with metadata

        Returns:
            Actual cost in USD
        """
        # LangGraph may include usage data in run metadata
        usage = run.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)

        if prompt_tokens > 0 or completion_tokens > 0:
            # Use average pricing (mix of GPT-4 and GPT-3.5)
            input_cost = (Decimal(prompt_tokens) / 1000) * Decimal("0.015")  # Average
            output_cost = (Decimal(completion_tokens) / 1000) * Decimal("0.03")  # Average
            total = input_cost + output_cost
            return total.quantize(Decimal("0.0001"))

        # Fall back to estimated cost if no usage data
        estimated_cost = run.get("estimated_cost", 0.5)
        return Decimal(str(estimated_cost)).quantize(Decimal("0.0001"))
