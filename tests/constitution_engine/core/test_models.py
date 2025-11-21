"""
Tests for core data models.
"""

from pathlib import Path

import pytest

from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    ConstitutionRule,
    RepositoryContext,
    Severity,
)


class TestConstitutionRule:
    """Tests for ConstitutionRule dataclass."""

    def test_create_valid_rule(self):
        """Test creating a valid constitutional rule."""
        rule = ConstitutionRule(
            identifier="TEST-001",
            description="Test rule",
            severity=Severity.ERROR,
            category="test",
            enabled=True,
        )

        assert rule.identifier == "TEST-001"
        assert rule.description == "Test rule"
        assert rule.severity == Severity.ERROR
        assert rule.category == "test"
        assert rule.enabled is True

    def test_rule_defaults(self):
        """Test rule default values."""
        rule = ConstitutionRule(
            identifier="TEST-002",
            description="Test rule with defaults",
        )

        assert rule.severity == Severity.ERROR
        assert rule.category is None
        assert rule.enabled is True

    def test_rule_validation_empty_identifier(self):
        """Test that empty identifier raises error."""
        with pytest.raises(ValueError, match="identifier cannot be empty"):
            ConstitutionRule(identifier="", description="Test")

    def test_rule_validation_empty_description(self):
        """Test that empty description raises error."""
        with pytest.raises(ValueError, match="description cannot be empty"):
            ConstitutionRule(identifier="TEST-003", description="")


class TestCheckResult:
    """Tests for CheckResult dataclass."""

    def test_create_valid_result(self):
        """Test creating a valid check result."""
        result = CheckResult(
            rule_identifier="TEST-001",
            status=CheckStatus.PASS,
            message="Check passed",
            affected_paths=[Path("src/test.py")],
            severity=Severity.INFO,
            details={"count": 1},
        )

        assert result.rule_identifier == "TEST-001"
        assert result.status == CheckStatus.PASS
        assert result.message == "Check passed"
        assert len(result.affected_paths) == 1
        assert result.severity == Severity.INFO
        assert result.details == {"count": 1}

    def test_result_defaults(self):
        """Test check result default values."""
        result = CheckResult(
            rule_identifier="TEST-002",
            status=CheckStatus.FAIL,
            message="Check failed",
        )

        assert result.affected_paths == []
        assert result.severity == Severity.ERROR
        assert result.details == {}

    def test_result_is_failure(self):
        """Test is_failure property."""
        fail_result = CheckResult(
            rule_identifier="TEST-003",
            status=CheckStatus.FAIL,
            message="Failed",
        )
        error_result = CheckResult(
            rule_identifier="TEST-004",
            status=CheckStatus.ERROR,
            message="Error",
        )
        pass_result = CheckResult(
            rule_identifier="TEST-005",
            status=CheckStatus.PASS,
            message="Passed",
        )

        assert fail_result.is_failure is True
        assert error_result.is_failure is True
        assert pass_result.is_failure is False

    def test_result_is_success(self):
        """Test is_success property."""
        pass_result = CheckResult(
            rule_identifier="TEST-006",
            status=CheckStatus.PASS,
            message="Passed",
        )
        fail_result = CheckResult(
            rule_identifier="TEST-007",
            status=CheckStatus.FAIL,
            message="Failed",
        )

        assert pass_result.is_success is True
        assert fail_result.is_success is False

    def test_result_validation_empty_identifier(self):
        """Test that empty rule identifier raises error."""
        with pytest.raises(ValueError, match="identifier cannot be empty"):
            CheckResult(
                rule_identifier="",
                status=CheckStatus.PASS,
                message="Test",
            )

    def test_result_validation_empty_message(self):
        """Test that empty message raises error."""
        with pytest.raises(ValueError, match="message cannot be empty"):
            CheckResult(
                rule_identifier="TEST-008",
                status=CheckStatus.PASS,
                message="",
            )


class TestConfigurationProfile:
    """Tests for ConfigurationProfile dataclass."""

    def test_create_default_config(self):
        """Test creating configuration with defaults."""
        config = ConfigurationProfile()

        assert config.enabled_rules == []
        assert config.target_directories == [Path(".")]
        assert "venv/" in config.excluded_patterns
        assert config.constitution_path is None
        assert config.spec_kitty_enabled is True
        assert config.fail_on_warning is False
        assert config.config_source is None

    def test_create_custom_config(self):
        """Test creating configuration with custom values."""
        config = ConfigurationProfile(
            enabled_rules=["RULE-001", "RULE-002"],
            target_directories=[Path("src"), Path("tests")],
            excluded_patterns=["*.tmp"],
            constitution_path=Path(".kittify/constitution.md"),
            spec_kitty_enabled=False,
            fail_on_warning=True,
            config_source=Path("config.yaml"),
        )

        assert len(config.enabled_rules) == 2
        assert len(config.target_directories) == 2
        assert config.excluded_patterns == ["*.tmp"]
        assert config.constitution_path == Path(".kittify/constitution.md")
        assert config.spec_kitty_enabled is False
        assert config.fail_on_warning is True


class TestRepositoryContext:
    """Tests for RepositoryContext dataclass."""

    def test_create_valid_context(self, tmp_path):
        """Test creating a valid repository context."""
        context = RepositoryContext(
            root_path=tmp_path,
            detected_languages={"python", "javascript"},
            has_git=True,
            spec_kitty_features=[tmp_path / "kitty-specs/001-feature"],
            constitution_file=tmp_path / ".kittify/constitution.md",
            metadata={"version": "1.0"},
        )

        assert context.root_path == tmp_path
        assert "python" in context.detected_languages
        assert context.has_git is True
        assert len(context.spec_kitty_features) == 1
        assert context.metadata["version"] == "1.0"

    def test_context_defaults(self, tmp_path):
        """Test context default values."""
        context = RepositoryContext(root_path=tmp_path)

        assert context.detected_languages == set()
        assert context.has_git is False
        assert context.spec_kitty_features == []
        assert context.constitution_file is None
        assert context.metadata == {}

    def test_context_validation_nonexistent_path(self):
        """Test that nonexistent path raises error."""
        with pytest.raises(ValueError, match="does not exist"):
            RepositoryContext(root_path=Path("/nonexistent/path"))

    def test_context_validation_relative_path(self, tmp_path):
        """Test that relative path raises error."""
        with pytest.raises(ValueError, match="must be absolute"):
            RepositoryContext(root_path=Path("relative/path"))
