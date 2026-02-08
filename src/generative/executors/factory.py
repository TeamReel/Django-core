"""Factory for creating pipeline executors."""

from typing import TYPE_CHECKING, Type

from .base import BasePipelineExecutor
from .openai_executor import OpenAIExecutor

# Lazy import for langgraph to avoid requiring langgraph_sdk in production
# LangGraph is the "20% use case" and may not be installed everywhere
if TYPE_CHECKING:
    pass


def _get_langgraph_executor() -> Type[BasePipelineExecutor]:
    """Lazy loader for LangGraphExecutor to defer langgraph_sdk import."""
    try:
        from .langgraph_executor import LangGraphExecutor

        return LangGraphExecutor
    except ImportError as e:
        raise ImportError(
            "LangGraph SDK is not installed. Install with: pip install langgraph-sdk"
        ) from e


def _get_gemini_image_executor() -> Type[BasePipelineExecutor]:
    """Lazy loader for GeminiImageExecutor to defer google-generativeai import."""
    try:
        from .gemini_image_executor import GeminiImageExecutor

        return GeminiImageExecutor
    except ImportError as e:
        raise ImportError(
            "Google Generative AI is not installed. Install with: "
            "pip install google-generativeai google-cloud-aiplatform"
        ) from e


class ExecutorFactory:
    """Factory for creating pipeline executors based on provider.

    Supports runtime registration of custom executors for extensibility.
    """

    # Only register OpenAI by default; LangGraph and Gemini are lazy-loaded
    _executors: dict[str, Type[BasePipelineExecutor]] = {
        "openai": OpenAIExecutor,
    }
    _lazy_executors: dict[str, callable] = {
        "langgraph": _get_langgraph_executor,
        "gemini": _get_gemini_image_executor,
        "gemini_image": _get_gemini_image_executor,  # Alias for clarity
    }

    @classmethod
    def register_executor(cls, provider: str, executor_class: Type[BasePipelineExecutor]) -> None:
        """Register a custom executor for a provider.

        Args:
            provider: Provider identifier (e.g., 'anthropic', 'cohere')
            executor_class: Executor class (must inherit from BasePipelineExecutor)

        Raises:
            ValueError: If executor_class doesn't inherit from BasePipelineExecutor
        """
        if not issubclass(executor_class, BasePipelineExecutor):
            raise ValueError(f"{executor_class} must inherit from BasePipelineExecutor")
        cls._executors[provider] = executor_class

    @classmethod
    def get_executor(cls, template_config: dict) -> BasePipelineExecutor:
        """Get executor instance for a provider.

        Args:
            template_config: Pipeline configuration (must include 'provider' key)

        Returns:
            Executor instance initialized with template_config

        Raises:
            ValueError: If provider is unknown or not registered
            ImportError: If lazy-loaded provider's dependencies are not installed
        """
        provider = template_config.get("provider")
        if not provider:
            raise ValueError("template_config must contain 'provider' key")

        # Check direct executors first
        if provider in cls._executors:
            executor_class = cls._executors[provider]
            return executor_class()

        # Check lazy-loaded executors
        if provider in cls._lazy_executors:
            executor_class = cls._lazy_executors[provider]()
            return executor_class()

        available = ", ".join(list(cls._executors.keys()) + list(cls._lazy_executors.keys()))
        raise ValueError(f"Unknown provider '{provider}'. Available: {available}")

    @classmethod
    def list_providers(cls) -> list[str]:
        """List all registered providers.

        Returns:
            List of provider identifiers (including lazy-loaded)
        """
        return list(cls._executors.keys()) + list(cls._lazy_executors.keys())
