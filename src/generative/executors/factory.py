"""Factory for creating pipeline executors."""

from typing import Type

from .base import BasePipelineExecutor
from .langgraph_executor import LangGraphExecutor
from .openai_executor import OpenAIExecutor


class ExecutorFactory:
    """Factory for creating pipeline executors based on provider.

    Supports runtime registration of custom executors for extensibility.
    """

    _executors: dict[str, Type[BasePipelineExecutor]] = {
        "openai": OpenAIExecutor,
        "langgraph": LangGraphExecutor,
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
        """
        provider = template_config.get("provider")
        if not provider:
            raise ValueError("template_config must contain 'provider' key")

        if provider not in cls._executors:
            available = ", ".join(cls._executors.keys())
            raise ValueError(f"Unknown provider '{provider}'. Available: {available}")

        executor_class = cls._executors[provider]
        return executor_class()

    @classmethod
    def list_providers(cls) -> list[str]:
        """List all registered providers.

        Returns:
            List of provider identifiers
        """
        return list(cls._executors.keys())
