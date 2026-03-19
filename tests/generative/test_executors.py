"""
Tests for pipeline executors.

Tests cover:
- BasePipelineExecutor error classification
- OpenAIExecutor execution and cost tracking
- LangGraphExecutor SDK integration
- ExecutorFactory provider routing
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

import src.generative.executors.openai_executor as openai_executor_module

from src.generative.executors import (
    BasePipelineExecutor,
    ErrorCategory,
    ExecutionResult,
)
from src.generative.executors.factory import ExecutorFactory
from src.generative.executors.langgraph_executor import LangGraphExecutor
from src.generative.executors.openai_executor import OpenAIExecutor


class ConcreteExecutor(BasePipelineExecutor):
    """Concrete implementation for testing base class."""

    @property
    def provider_name(self) -> str:
        return "test"

    async def execute(self, template_config, input_data, brand_context=None):
        return ExecutionResult(
            success=True,
            output_type="text",
            content="test output",
            actual_cost=Decimal("0.01"),
        )

    def calculate_estimated_cost(self, template_config, input_data):
        return Decimal("0.01")


class TestBasePipelineExecutor:
    """Test BasePipelineExecutor abstract base class."""

    def test_classify_error_timeout(self):
        """Test timeout errors classified as TRANSIENT."""
        executor = ConcreteExecutor()
        error = TimeoutError("Request timed out")
        category = executor.classify_error(error)
        assert category == ErrorCategory.TRANSIENT

    def test_classify_error_by_name(self):
        """Test error classification by class name."""
        executor = ConcreteExecutor()

        # Test error message patterns (since we can't modify __name__)
        error = Exception("OpenAI API rate limit exceeded")
        category = executor.classify_error(error)
        assert category == ErrorCategory.TRANSIENT

        # Test authentication pattern
        error2 = Exception("OpenAI API authentication failed")
        category2 = executor.classify_error(error2)
        assert category2 == ErrorCategory.PERMANENT

        # Test invalid pattern
        error3 = Exception("Invalid parameters provided")
        category3 = executor.classify_error(error3)
        assert category3 == ErrorCategory.PERMANENT

    def test_classify_error_unknown(self):
        """Test unknown errors classified as UNKNOWN."""
        executor = ConcreteExecutor()
        error = ValueError("Something went wrong")
        category = executor.classify_error(error)
        assert category == ErrorCategory.UNKNOWN


class TestOpenAIExecutor:
    """Test OpenAI executor."""

    @pytest.fixture
    def executor(self):
        """Create OpenAI executor instance."""
        return OpenAIExecutor()

    def test_provider_name(self, executor):
        """Test provider name property."""
        assert executor.provider_name == "openai"

    def test_compute_cost_gpt4(self, executor):
        """Test cost computation for GPT-4."""
        cost = executor._compute_cost(model="gpt-4", prompt_tokens=100, completion_tokens=50)

        # GPT-4: $0.03 per 1K prompt, $0.06 per 1K completion
        expected = Decimal("100") * Decimal("0.03") / Decimal("1000") + Decimal("50") * Decimal(
            "0.06"
        ) / Decimal("1000")
        assert cost == expected

    def test_compute_cost_gpt35(self, executor):
        """Test cost computation for GPT-3.5."""
        cost = executor._compute_cost(
            model="gpt-3.5-turbo", prompt_tokens=1000, completion_tokens=500
        )

        # GPT-3.5: $0.0005 per 1K prompt, $0.0015 per 1K completion
        # 1000 * 0.0005/1000 + 500 * 0.0015/1000 = 0.0005 + 0.00075 = 0.00125, rounded to 0.0012
        assert cost == Decimal("0.0012")

    def test_compute_cost_unknown_model(self, executor):
        """Test cost computation for unknown model uses default pricing."""
        cost = executor._compute_cost(
            model="unknown-model", prompt_tokens=1000, completion_tokens=500
        )

        # Should default to {"input": 0.01, "output": 0.03}
        # 1000 * 0.01/1000 + 500 * 0.03/1000 = 0.01 + 0.015 = 0.025
        assert cost == Decimal("0.0250")

    def test_calculate_estimated_cost(self, executor, valid_openai_config):
        """Test cost estimation."""
        input_data = {"prompt": "This is a test prompt with some words"}

        cost = executor.calculate_estimated_cost(valid_openai_config, input_data)

        assert isinstance(cost, Decimal)
        assert cost > Decimal("0")

    def test_get_client_requires_api_key(self, executor, settings):
        """Test OpenAI API key is required."""
        settings.OPENAI_API_KEY = None
        with pytest.raises(ValueError, match="OPENAI_API_KEY not configured"):
            executor._get_client()

    def test_build_messages_requires_prompt(self, executor):
        """Test prompt is required for message building."""
        with pytest.raises(ValueError, match="must contain 'prompt'"):
            executor._build_messages(input_data={}, system_message="sys")

    def test_inject_brand_context(self, executor):
        """Test brand context injection appends tokens."""
        system_message = "Base system"

        # No tokens -> unchanged
        assert (
            executor._inject_brand_context(system_message, brand_context={"tokens": {}})
            == system_message
        )

        # With tokens -> appended
        updated = executor._inject_brand_context(
            system_message,
            brand_context={
                "tokens": {
                    "brand_name": "TeamReel",
                    "tone": "direct",
                    "primary_color": "#123456",
                }
            },
        )
        assert "Brand Context:" in updated
        assert "Brand: TeamReel" in updated
        assert "Tone: direct" in updated
        assert "Primary Color: #123456" in updated

    @pytest.mark.asyncio
    async def test_execute_success(self, executor, valid_openai_config, settings):
        """Test successful OpenAI execution with mocked API."""
        settings.OPENAI_API_KEY = "test-key"
        with patch("src.generative.executors.openai_executor.openai.OpenAI") as mock_openai_class:
            # Mock the client and response
            mock_client = MagicMock()
            mock_openai_class.return_value = mock_client

            mock_response = MagicMock()
            mock_response.choices = [
                MagicMock(message=MagicMock(content="Generated text"), finish_reason="stop")
            ]
            mock_response.usage = MagicMock(
                prompt_tokens=100, completion_tokens=50, total_tokens=150
            )
            mock_client.chat.completions.create.return_value = mock_response

            # Execute
            result = await executor.execute(
                template_config=valid_openai_config, input_data={"prompt": "Test prompt"}
            )

            # Verify
            assert result.success is True
            assert result.output_type == "text"
            assert result.content == "Generated text"
            assert result.actual_cost > Decimal("0")
            assert result.error_message is None

    @pytest.mark.asyncio
    async def test_execute_rate_limit_error(
        self, executor, valid_openai_config, settings, monkeypatch
    ):
        """Test OpenAI rate limit maps to TRANSIENT."""
        settings.OPENAI_API_KEY = "test-key"

        RateLimitError = type("RateLimitError", (Exception,), {})
        monkeypatch.setattr(openai_executor_module.openai, "RateLimitError", RateLimitError)

        with patch("src.generative.executors.openai_executor.openai.OpenAI") as mock_openai_class:
            mock_client = MagicMock()
            mock_openai_class.return_value = mock_client
            mock_client.chat.completions.create.side_effect = RateLimitError("rate limit")

            result = await executor.execute(
                template_config=valid_openai_config, input_data={"prompt": "Test prompt"}
            )

            assert result.success is False
            assert result.error_category == ErrorCategory.TRANSIENT

    @pytest.mark.asyncio
    async def test_execute_auth_error(self, executor, valid_openai_config, settings, monkeypatch):
        """Test OpenAI auth errors map to PERMANENT."""
        settings.OPENAI_API_KEY = "test-key"

        AuthenticationError = type("AuthenticationError", (Exception,), {})
        monkeypatch.setattr(
            openai_executor_module.openai, "AuthenticationError", AuthenticationError
        )

        with patch("src.generative.executors.openai_executor.openai.OpenAI") as mock_openai_class:
            mock_client = MagicMock()
            mock_openai_class.return_value = mock_client
            mock_client.chat.completions.create.side_effect = AuthenticationError("bad key")

            result = await executor.execute(
                template_config=valid_openai_config, input_data={"prompt": "Test prompt"}
            )

            assert result.success is False
            assert result.error_category == ErrorCategory.PERMANENT

    @pytest.mark.asyncio
    async def test_execute_bad_request_error(
        self, executor, valid_openai_config, settings, monkeypatch
    ):
        """Test OpenAI bad request maps to PERMANENT."""
        settings.OPENAI_API_KEY = "test-key"

        BadRequestError = type("BadRequestError", (Exception,), {})
        monkeypatch.setattr(openai_executor_module.openai, "BadRequestError", BadRequestError)

        with patch("src.generative.executors.openai_executor.openai.OpenAI") as mock_openai_class:
            mock_client = MagicMock()
            mock_openai_class.return_value = mock_client
            mock_client.chat.completions.create.side_effect = BadRequestError("invalid")

            result = await executor.execute(
                template_config=valid_openai_config, input_data={"prompt": "Test prompt"}
            )

            assert result.success is False
            assert result.error_category == ErrorCategory.PERMANENT


class TestLangGraphExecutor:
    """Test LangGraph executor."""

    @pytest.fixture
    def executor(self):
        """Create LangGraph executor instance."""
        return LangGraphExecutor()

    def test_provider_name(self, executor):
        """Test provider name property."""
        assert executor.provider_name == "langgraph"

    def test_calculate_estimated_cost_with_config(self, executor, valid_langgraph_config):
        """Test cost estimation from template config."""
        config_with_cost = {**valid_langgraph_config, "estimated_cost": 0.10}

        cost = executor.calculate_estimated_cost(config_with_cost, {})

        assert cost == Decimal("0.10")

    def test_calculate_estimated_cost_default(self, executor):
        """Test default cost estimation when no estimated_cost is provided."""
        config_without_cost = {"provider": "langgraph", "graph_id": "test_graph"}

        cost = executor.calculate_estimated_cost(config_without_cost, {})

        assert cost == Decimal("1.00")

    @pytest.mark.asyncio
    async def test_execute_success(self, executor, valid_langgraph_config):
        """Test successful LangGraph execution with mocked SDK."""
        with patch("src.generative.executors.langgraph_executor.get_client") as mock_get_client:
            # Mock the client
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            # Mock thread creation
            mock_client.threads.create.return_value = {"thread_id": "test-thread-123"}

            # Mock run execution
            mock_client.runs.create.return_value = {"run_id": "test-run-456"}
            mock_client.runs.wait.return_value = {
                "status": "success",
                "output": {"output": "Generated workflow result"},
                "run_id": "test-run-456",
            }

            # Execute
            result = await executor.execute(
                template_config=valid_langgraph_config, input_data={"prompt": "Test prompt"}
            )

            # Verify
            assert result.success is True
            assert result.output_type == "json"
            assert result.content is not None
            assert result.error_message is None

    @pytest.mark.asyncio
    async def test_execute_missing_graph_id(self, executor):
        """Test missing graph_id returns failure result."""
        result = await executor.execute(template_config={"provider": "langgraph"}, input_data={})
        assert result.success is False
        assert result.error_category == ErrorCategory.UNKNOWN

    @pytest.mark.asyncio
    async def test_execute_run_failure(self, executor, valid_langgraph_config):
        """Test non-success status returns error result."""
        with patch("src.generative.executors.langgraph_executor.get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            mock_client.threads.create.return_value = {"thread_id": "test-thread-123"}
            mock_client.runs.create.return_value = {"run_id": "test-run-456"}
            mock_client.runs.wait.return_value = {"status": "error", "error": "boom"}

            result = await executor.execute(
                template_config=valid_langgraph_config, input_data={"prompt": "Test prompt"}
            )

            assert result.success is False
            assert result.error_category == ErrorCategory.UNKNOWN
            assert "execution failed" in (result.error_message or "").lower()

    @pytest.mark.asyncio
    async def test_execute_connection_error(self, executor, valid_langgraph_config):
        """Test connection errors map to TRANSIENT."""
        with patch.object(executor, "_get_client", side_effect=ConnectionError("down")):
            result = await executor.execute(template_config=valid_langgraph_config, input_data={})
            assert result.success is False
            assert result.error_category == ErrorCategory.TRANSIENT

    def test_compute_cost_with_usage(self, executor):
        """Test usage-based cost computation path."""
        cost = executor._compute_cost({"usage": {"prompt_tokens": 1000, "completion_tokens": 500}})
        assert cost == Decimal("0.0300")

    def test_compute_cost_fallback_estimated_cost(self, executor):
        """Test fallback uses estimated_cost when usage is absent."""
        cost = executor._compute_cost({"estimated_cost": 1.25})
        assert cost == Decimal("1.2500")


class TestExecutorFactory:
    """Test executor factory."""

    def test_get_executor_openai(self, valid_openai_config):
        """Test getting OpenAI executor."""
        executor = ExecutorFactory.get_executor(valid_openai_config)

        assert isinstance(executor, OpenAIExecutor)
        assert executor.provider_name == "openai"

    def test_get_executor_langgraph(self, valid_langgraph_config):
        """Test getting LangGraph executor."""
        executor = ExecutorFactory.get_executor(valid_langgraph_config)

        assert isinstance(executor, LangGraphExecutor)
        assert executor.provider_name == "langgraph"

    def test_get_executor_unknown_provider(self):
        """Test unknown provider raises ValueError."""
        with pytest.raises(ValueError, match="Unknown provider"):
            ExecutorFactory.get_executor({"provider": "unknown-provider"})

    def test_get_executor_missing_provider_key(self):
        """Test missing provider key raises ValueError."""
        with pytest.raises(ValueError, match="must contain 'provider'"):
            ExecutorFactory.get_executor({})

    def test_register_executor_requires_subclass(self):
        """Test register_executor enforces BasePipelineExecutor inheritance."""

        class NotAnExecutor:
            pass

        with pytest.raises(ValueError, match="must inherit from BasePipelineExecutor"):
            ExecutorFactory.register_executor("nope", NotAnExecutor)  # type: ignore[arg-type]

    def test_register_custom_executor(self):
        """Test registering custom executor."""

        class CustomExecutor(BasePipelineExecutor):
            @property
            def provider_name(self) -> str:
                return "custom"

            async def execute(self, template_config, input_data, brand_context=None):
                return ExecutionResult(
                    success=True,
                    output_type="text",
                    content="Custom output",
                    actual_cost=Decimal("0.01"),
                )

            def calculate_estimated_cost(self, template_config, input_data):
                return Decimal("0.01")

        # Register custom executor
        ExecutorFactory.register_executor("custom", CustomExecutor)

        # Verify it's in the list
        assert "custom" in ExecutorFactory.list_providers()

        # Verify we can get it
        executor = ExecutorFactory.get_executor({"provider": "custom"})
        assert isinstance(executor, CustomExecutor)

    def test_list_providers(self):
        """Test listing available providers."""
        providers = ExecutorFactory.list_providers()

        assert "openai" in providers
        assert "langgraph" in providers
        assert isinstance(providers, list)
