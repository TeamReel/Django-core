"""
Integration tests for engine pipeline with rules and validators.

Tests the complete pipeline: pre-validation -> rules -> post-processing.
"""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from constitution_engine.core.engine import Engine
from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)
from constitution_engine.modules.python.builtin.deduplicator import (
    DeduplicatorValidator,
)
from constitution_engine.modules.python.builtin.mypy_rule import MypyRule
from constitution_engine.modules.python.builtin.pinned_dependencies_rule import (
    PinnedDependenciesRule,
)
from constitution_engine.modules.python.builtin.ruff_rule import RuffRule
from constitution_engine.modules.python.builtin.workflow_validator import (
    WorkflowConfigValidator,
)


class TestEngineIntegration:
    """Integration tests for the Engine with rules and validators."""

    def test_engine_with_valid_config_and_passing_rules(self, tmp_path):
        """Test engine pipeline with valid configuration and passing rules."""
        # Create a minimal repository with pinned dependencies
        req_file = tmp_path / "requirements.txt"
        req_file.write_text("django==4.2.0\n")

        config = ConfigurationProfile(
            enabled_rules=[
                "no-disabled-security-rules",
                "mypy-must-pass",
                "ruff-must-pass",
                "no-unpinned-production-dependencies",
            ]
        )
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        # Register validators
        engine.register_validator(WorkflowConfigValidator())
        engine.register_validator(DeduplicatorValidator())

        # Register rules
        engine.register_rule(PinnedDependenciesRule())

        # Mock mypy and ruff to return success
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

            engine.register_rule(MypyRule())
            engine.register_rule(RuffRule())

            # Run the engine
            results = engine.run_once()

            # Should have results from:
            # 1. Workflow validator (PASS)
            # 2. Pinned dependencies rule (PASS - all pinned)
            # 3. Mypy rule (PASS - mocked)
            # 4. Ruff rule (PASS - mocked)
            assert len(results) >= 4

            # No failures expected
            failures = [r for r in results if r.status == CheckStatus.FAIL]
            assert len(failures) == 0

            # Check exit code
            assert engine.get_exit_code(results) == 0

    def test_engine_aborts_on_invalid_config(self, tmp_path):
        """Test that engine aborts rule execution on invalid configuration."""
        config = ConfigurationProfile(
            enabled_rules=["ruff-must-pass"]  # Missing required rules
        )
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        # Register validators
        engine.register_validator(WorkflowConfigValidator())

        # Register a rule (should not execute due to config failure)
        engine.register_rule(PinnedDependenciesRule())

        # Run the engine
        results = engine.run_once()

        # Should have failure results from workflow validator
        failures = [r for r in results if r.status == CheckStatus.FAIL]
        assert len(failures) >= 2  # Missing no-disabled-security-rules and mypy-must-pass

        # Should NOT have results from PinnedDependenciesRule
        pinned_deps_results = [
            r for r in results 
            if r.rule_identifier == "no-unpinned-production-dependencies"
        ]
        assert len(pinned_deps_results) == 0

        # Check exit code
        assert engine.get_exit_code(results) == 1

    def test_engine_deduplicates_results(self, tmp_path):
        """Test that engine deduplicator removes duplicate results."""
        config = ConfigurationProfile(
            enabled_rules=[
                "no-disabled-security-rules",
                "mypy-must-pass",
                "ruff-must-pass",
            ]
        )
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        # Register validators
        engine.register_validator(WorkflowConfigValidator())
        engine.register_validator(DeduplicatorValidator())

        # Mock mypy to return duplicate errors
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = [
                MagicMock(returncode=0),  # mypy --version
                MagicMock(
                    returncode=1,
                    stdout="test.py:1: error: Missing type\ntest.py:1: error: Missing type\n",
                    stderr="",
                ),
                MagicMock(returncode=0),  # ruff --version
                MagicMock(returncode=0, stdout="", stderr=""),  # ruff check
            ]

            engine.register_rule(MypyRule())
            engine.register_rule(RuffRule())

            # Run the engine
            results = engine.run_once()

            # Deduplicator should remove one of the duplicate mypy errors
            # Count failures from mypy
            mypy_failures = [
                r for r in results 
                if r.rule_identifier == "mypy-must-pass" and r.status == CheckStatus.FAIL
            ]
            
            # Should have deduplicated results (not 2x the same error)
            assert len(mypy_failures) <= 1

    def test_engine_with_unpinned_dependencies(self, tmp_path):
        """Test engine detects unpinned dependencies."""
        # Create a repository with unpinned dependency
        req_file = tmp_path / "requirements.txt"
        req_file.write_text("django==4.2.0\nrequests\n")

        config = ConfigurationProfile(
            enabled_rules=[
                "no-disabled-security-rules",
                "mypy-must-pass",
                "ruff-must-pass",
                "no-unpinned-production-dependencies",
            ]
        )
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        # Register validators
        engine.register_validator(WorkflowConfigValidator())
        engine.register_validator(DeduplicatorValidator())

        # Register pinned dependencies rule only
        engine.register_rule(PinnedDependenciesRule())

        # Run the engine
        results = engine.run_once()

        # Should detect the unpinned 'requests' dependency
        unpinned_failures = [
            r for r in results 
            if r.rule_identifier == "no-unpinned-production-dependencies"
            and r.status == CheckStatus.FAIL
            and "requests" in r.message
        ]
        assert len(unpinned_failures) == 1

        # Check exit code
        assert engine.get_exit_code(results) == 1
