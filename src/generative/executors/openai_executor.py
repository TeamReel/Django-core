"""OpenAI pipeline executor for simple completions."""

from decimal import Decimal
from typing import Any

import openai
from django.conf import settings

from .base import BasePipelineExecutor, ErrorCategory, ExecutionResult


class OpenAIExecutor(BasePipelineExecutor):
    """Executor for OpenAI completions (80% use case).

    Uses OpenAI's Chat Completions API for simple prompt-based generation.
    Supports GPT-4, GPT-4 Turbo, and GPT-3.5 Turbo models.
    """

    # Pricing per 1K tokens (USD) - update monthly via cron (WP07)
    PRICING = {
        "gpt-4": {"input": 0.03, "output": 0.06},
        "gpt-4-turbo": {"input": 0.01, "output": 0.03},
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
        "gpt-4o": {"input": 0.005, "output": 0.015},  # GPT-4 Optimized
    }

    @property
    def provider_name(self) -> str:
        """Return provider identifier."""
        return "openai"

    def _get_client(self) -> openai.OpenAI:
        """Get OpenAI client with API key from settings."""
        api_key = getattr(settings, "OPENAI_API_KEY", None)
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured in settings")
        return openai.OpenAI(api_key=api_key)

    async def execute(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
        brand_context: dict[str, Any] | None = None,
    ) -> ExecutionResult:
        """Execute OpenAI completion.

        Args:
            template_config: Must include 'model' (required), optional 'temperature', 'max_tokens'
            input_data: Must include 'prompt' field (validated against template schema)
            brand_context: Optional brand identity tokens (injected into system message)

        Returns:
            ExecutionResult with text output or error
        """
        try:
            # Extract config
            model = template_config.get("model", "gpt-4")
            temperature = template_config.get("temperature", 0.7)
            max_tokens = template_config.get("max_tokens", 500)
            system_message = template_config.get("system_message", "You are a helpful assistant.")

            # Inject brand context if provided
            if brand_context:
                system_message = self._inject_brand_context(system_message, brand_context)

            # Build messages
            messages = self._build_messages(input_data, system_message)

            # Call OpenAI API
            client = self._get_client()
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            # Extract output
            output_text = response.choices[0].message.content

            # Compute actual cost
            cost = self._compute_cost(
                model, response.usage.prompt_tokens, response.usage.completion_tokens
            )

            return ExecutionResult(
                success=True,
                output_type="text",
                content=output_text,
                actual_cost=cost,
                metadata={
                    "model": model,
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                    "finish_reason": response.choices[0].finish_reason,
                },
            )

        except openai.RateLimitError as e:
            return ExecutionResult(
                success=False,
                output_type="text",
                error_message=f"OpenAI rate limit: {str(e)}",
                error_category=ErrorCategory.TRANSIENT,
            )
        except openai.AuthenticationError as e:
            return ExecutionResult(
                success=False,
                output_type="text",
                error_message=f"OpenAI authentication error: {str(e)}",
                error_category=ErrorCategory.PERMANENT,
            )
        except openai.BadRequestError as e:
            return ExecutionResult(
                success=False,
                output_type="text",
                error_message=f"OpenAI bad request: {str(e)}",
                error_category=ErrorCategory.PERMANENT,
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                output_type="text",
                error_message=f"OpenAI execution error: {str(e)}",
                error_category=self.classify_error(e),
            )

    def calculate_estimated_cost(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
    ) -> Decimal:
        """Estimate cost based on input length and model.

        Uses rough heuristic: 1 word ≈ 1.3 tokens
        Assumes max_tokens for output estimation

        Args:
            template_config: Pipeline config with 'model' and 'max_tokens'
            input_data: Input data with 'prompt' field

        Returns:
            Estimated cost in USD (converted to Decimal)
        """
        model = template_config.get("model", "gpt-4")
        max_tokens = template_config.get("max_tokens", 500)

        # Estimate input tokens (rough: 1 word = 1.3 tokens)
        prompt = input_data.get("prompt", "")
        word_count = len(prompt.split())
        estimated_input_tokens = int(word_count * 1.3)

        # Use max_tokens as worst-case output estimate
        estimated_output_tokens = max_tokens

        # Calculate cost
        cost = self._compute_cost(model, estimated_input_tokens, estimated_output_tokens)

        # Add 20% buffer for safety
        return Decimal(str(cost * Decimal("1.2")))

    def _build_messages(self, input_data: dict[str, Any], system_message: str) -> list:
        """Convert input_data to OpenAI message format.

        Args:
            input_data: Must contain 'prompt' key
            system_message: System prompt (may include brand context)

        Returns:
            List of message dicts for OpenAI API
        """
        prompt = input_data.get("prompt", "")
        if not prompt:
            raise ValueError("input_data must contain 'prompt' field")

        return [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ]

    def _inject_brand_context(self, system_message: str, brand_context: dict) -> str:
        """Inject brand identity tokens into system message.

        Args:
            system_message: Original system prompt
            brand_context: Brand identity tokens (colors, fonts, tone)

        Returns:
            Enhanced system message with brand context
        """
        brand_tokens = brand_context.get("tokens", {})
        if not brand_tokens:
            return system_message

        # Build brand context string
        brand_info = []
        if "brand_name" in brand_tokens:
            brand_info.append(f"Brand: {brand_tokens['brand_name']}")
        if "tone" in brand_tokens:
            brand_info.append(f"Tone: {brand_tokens['tone']}")
        if "primary_color" in brand_tokens:
            brand_info.append(f"Primary Color: {brand_tokens['primary_color']}")

        if brand_info:
            context_block = "\n\nBrand Context:\n" + "\n".join(brand_info)
            return system_message + context_block

        return system_message

    def _compute_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> Decimal:
        """Compute cost from token usage and model pricing.

        Args:
            model: Model name (gpt-4, gpt-3.5-turbo, etc.)
            prompt_tokens: Input token count
            completion_tokens: Output token count

        Returns:
            Cost in USD as Decimal (4 decimal places)
        """
        pricing = self.PRICING.get(model, {"input": 0.01, "output": 0.03})

        input_cost = (Decimal(prompt_tokens) / 1000) * Decimal(str(pricing["input"]))
        output_cost = (Decimal(completion_tokens) / 1000) * Decimal(str(pricing["output"]))

        total_cost = input_cost + output_cost
        return total_cost.quantize(Decimal("0.0001"))  # Round to 4 decimals
