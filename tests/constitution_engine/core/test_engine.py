"""
Tests for core engine orchestrator.
"""

from pathlib import Path

from constitution_engine.core.engine import Engine
from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)


class StubRule:
    """Stub rule for testing."""

    def __init__(self, identifier: str, results: list[CheckResult]) -> None:
        self.identifier = identifier
        self.description = f"Stub rule {identifier}"
        self.enabled = True
        self._results = results

    def execute(
        self, context: RepositoryContext, config: ConfigurationProfile
    ) -> list[CheckResult]:
        return self._results


class StubValidator:
    """Stub validator for testing."""

    def __init__(self, identifier: str, results: list[CheckResult]) -> None:
        self.identifier = identifier
        self.description = f"Stub validator {identifier}"
        self._results = results

    def validate(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        return self._results


class StubReporter:
    """Stub reporter for testing."""

    def __init__(self, name: str) -> None:
        self.name = name
        self.last_report: str | None = None
        self.last_output_path: Path | None = None

    def report(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> str:
        report = f"Report from {self.name}: {len(results)} results"
        self.last_report = report
        return report

    def write_output(self, report: str, output_path: Path | None = None) -> None:
        self.last_output_path = output_path


class TestEngine:
    """Tests for Engine class."""

    def test_engine_initialization(self, tmp_path):
        """Test engine initialization."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)

        engine = Engine(config=config, context=context)

        assert engine.config == config
        assert engine.context == context

    def test_register_rule(self, tmp_path):
        """Test registering a rule."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        rule = StubRule("TEST-001", [])
        engine.register_rule(rule)

        assert len(engine._rules) == 1

    def test_register_validator(self, tmp_path):
        """Test registering a validator."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        validator = StubValidator("VAL-001", [])
        engine.register_validator(validator)

        assert len(engine._validators) == 1

    def test_register_reporter(self, tmp_path):
        """Test registering a reporter."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        reporter = StubReporter("test-reporter")
        engine.register_reporter(reporter)

        assert len(engine._reporters) == 1

    def test_run_once_no_rules(self, tmp_path):
        """Test running engine with no rules."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        results = engine.run_once()

        assert results == []

    def test_run_once_with_passing_rule(self, tmp_path):
        """Test running engine with a passing rule."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        pass_result = CheckResult(
            rule_identifier="TEST-001",
            status=CheckStatus.PASS,
            message="Test passed",
        )
        rule = StubRule("TEST-001", [pass_result])
        engine.register_rule(rule)

        results = engine.run_once()

        assert len(results) == 1
        assert results[0].status == CheckStatus.PASS

    def test_run_once_with_failing_rule(self, tmp_path):
        """Test running engine with a failing rule."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        fail_result = CheckResult(
            rule_identifier="TEST-002",
            status=CheckStatus.FAIL,
            message="Test failed",
        )
        rule = StubRule("TEST-002", [fail_result])
        engine.register_rule(rule)

        results = engine.run_once()

        assert len(results) == 1
        assert results[0].status == CheckStatus.FAIL

    def test_run_once_with_validator(self, tmp_path):
        """Test running engine with a validator."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        rule_result = CheckResult(
            rule_identifier="TEST-003",
            status=CheckStatus.PASS,
            message="Rule passed",
        )
        validator_result = CheckResult(
            rule_identifier="VAL-001",
            status=CheckStatus.PASS,
            message="Validator passed",
        )

        rule = StubRule("TEST-003", [rule_result])
        validator = StubValidator("VAL-001", [validator_result])

        engine.register_rule(rule)
        engine.register_validator(validator)

        results = engine.run_once()

        assert len(results) == 2

    def test_run_once_respects_enabled_rules(self, tmp_path):
        """Test that engine respects enabled_rules configuration."""
        config = ConfigurationProfile(enabled_rules=["TEST-004"])
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        result1 = CheckResult(
            rule_identifier="TEST-004",
            status=CheckStatus.PASS,
            message="Enabled rule",
        )
        result2 = CheckResult(
            rule_identifier="TEST-005",
            status=CheckStatus.PASS,
            message="Disabled rule",
        )

        rule1 = StubRule("TEST-004", [result1])
        rule2 = StubRule("TEST-005", [result2])

        engine.register_rule(rule1)
        engine.register_rule(rule2)

        results = engine.run_once()

        assert len(results) == 1
        assert results[0].rule_identifier == "TEST-004"

    def test_get_exit_code_all_pass(self, tmp_path):
        """Test exit code when all checks pass."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        results = [
            CheckResult(
                rule_identifier="TEST-006",
                status=CheckStatus.PASS,
                message="Passed",
            )
        ]

        exit_code = engine.get_exit_code(results)

        assert exit_code == 0

    def test_get_exit_code_with_failure(self, tmp_path):
        """Test exit code when there are failures."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        results = [
            CheckResult(
                rule_identifier="TEST-007",
                status=CheckStatus.FAIL,
                message="Failed",
            )
        ]

        exit_code = engine.get_exit_code(results)

        assert exit_code == 1

    def test_get_exit_code_fail_on_warning(self, tmp_path):
        """Test exit code when fail_on_warning is True."""
        config = ConfigurationProfile(fail_on_warning=True)
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        results = [
            CheckResult(
                rule_identifier="TEST-008",
                status=CheckStatus.PASS,
                message="Passed with warning",
                severity=Severity.WARNING,
            )
        ]

        exit_code = engine.get_exit_code(results)

        assert exit_code == 1

    def test_run_and_report(self, tmp_path):
        """Test run_and_report generates reports."""
        config = ConfigurationProfile()
        context = RepositoryContext(root_path=tmp_path)
        engine = Engine(config=config, context=context)

        pass_result = CheckResult(
            rule_identifier="TEST-009",
            status=CheckStatus.PASS,
            message="Test passed",
        )
        rule = StubRule("TEST-009", [pass_result])
        reporter = StubReporter("test-reporter")

        engine.register_rule(rule)
        engine.register_reporter(reporter)

        results, reports = engine.run_and_report()

        assert len(results) == 1
        assert len(reports) == 1
        assert "1 results" in reports[0]
        assert reporter.last_report is not None
