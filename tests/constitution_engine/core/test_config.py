"""
Tests for configuration schema and validation.

Tests T010 (configuration schema), T011 (config loader), T013 (validation).
"""

import os
import tempfile
from pathlib import Path

import pytest
from constitution_engine.core.config import (
    AdapterConfig,
    ConfigSchema,
    ConfigurationError,
    ModuleConfig,
    ReporterConfig,
    RuleConfig,
    ValidatorConfig,
)
from constitution_engine.core.loaders import (
    YamlConfigLoader,
    load_config_from_file,
    load_config_with_overrides,
)
from constitution_engine.core.validation import (
    ConfigValidator,
    ValidationResult,
    validate_config_schema,
)


class TestConfigSchema:
    """Tests for ConfigSchema data structure."""

    def test_config_schema_creation(self):
        """Test creating a basic config schema."""
        config = ConfigSchema()

        assert config.fail_fast is False
        assert config.constitution_path is None
        assert config.target_directories == []
        assert config.exclude_patterns == []
        assert config.rules == []
        assert config.validators == []
        assert config.reporters == []
        assert config.modules == []
        assert config.adapters == []
        assert config.environment_overrides == {}
        assert config.metadata == {}

    def test_config_schema_path_normalization(self):
        """Test that string paths are converted to Path objects."""
        config = ConfigSchema(
            constitution_path="constitution.md", target_directories=["src", "tests"]
        )

        assert isinstance(config.constitution_path, Path)
        assert config.constitution_path == Path("constitution.md")
        assert all(isinstance(p, Path) for p in config.target_directories)
        assert config.target_directories == [Path("src"), Path("tests")]

    def test_config_schema_with_components(self):
        """Test config schema with various components."""
        rule = RuleConfig(identifier="TEST-001")
        validator = ValidatorConfig(identifier="VAL-001")
        reporter = ReporterConfig(name="console")
        module = ModuleConfig(name="python")
        adapter = AdapterConfig(name="git")

        config = ConfigSchema(
            rules=[rule],
            validators=[validator],
            reporters=[reporter],
            modules=[module],
            adapters=[adapter],
        )

        assert len(config.rules) == 1
        assert config.rules[0].identifier == "TEST-001"
        assert len(config.validators) == 1
        assert config.validators[0].identifier == "VAL-001"
        assert len(config.reporters) == 1
        assert config.reporters[0].name == "console"
        assert len(config.modules) == 1
        assert config.modules[0].name == "python"
        assert len(config.adapters) == 1
        assert config.adapters[0].name == "git"

    def test_get_enabled_components(self):
        """Test filtering enabled components."""
        config = ConfigSchema(
            rules=[
                RuleConfig(identifier="ENABLED-001", enabled=True),
                RuleConfig(identifier="DISABLED-001", enabled=False),
            ],
            validators=[
                ValidatorConfig(identifier="VAL-001", enabled=True),
                ValidatorConfig(identifier="VAL-002", enabled=False),
            ],
            reporters=[
                ReporterConfig(name="console", enabled=True),
                ReporterConfig(name="json", enabled=False),
            ],
        )

        enabled_rules = config.get_enabled_rules()
        assert len(enabled_rules) == 1
        assert enabled_rules[0].identifier == "ENABLED-001"

        enabled_validators = config.get_enabled_validators()
        assert len(enabled_validators) == 1
        assert enabled_validators[0].identifier == "VAL-001"

        enabled_reporters = config.get_enabled_reporters()
        assert len(enabled_reporters) == 1
        assert enabled_reporters[0].name == "console"

    def test_get_enabled_adapters_by_priority(self):
        """Test that adapters are sorted by priority."""
        config = ConfigSchema(
            adapters=[
                AdapterConfig(name="low-priority", priority=1),
                AdapterConfig(name="high-priority", priority=10),
                AdapterConfig(name="disabled", priority=5, enabled=False),
                AdapterConfig(name="medium-priority", priority=5),
            ]
        )

        enabled_adapters = config.get_enabled_adapters()
        assert len(enabled_adapters) == 3  # disabled adapter excluded
        assert enabled_adapters[0].name == "high-priority"
        assert enabled_adapters[1].name == "medium-priority"
        assert enabled_adapters[2].name == "low-priority"

    def test_constitutional_compliance_validation(self):
        """Test that constitutional rules cannot be disabled."""
        # This test now ensures that attempting to disable constitutional rules
        # at schema construction time raises an error immediately.
        with pytest.raises(ConfigurationError) as exc_info:
            ConfigSchema(
                rules=[
                    RuleConfig(identifier="CONST-001", enabled=False),
                ]
            )

        assert "Constitutional rules cannot be disabled" in str(exc_info.value)
        assert "CONST-001" in str(exc_info.value)


class TestRuleConfig:
    """Tests for RuleConfig data structure."""

    def test_rule_config_creation(self):
        """Test creating a rule config."""
        rule = RuleConfig(identifier="TEST-001")

        assert rule.identifier == "TEST-001"
        assert rule.enabled is True
        assert rule.severity is None
        assert rule.parameters == {}
        assert rule.description is None

    def test_rule_config_validation(self):
        """Test rule config validation."""
        with pytest.raises(ConfigurationError):
            RuleConfig(identifier="")  # Empty identifier

        with pytest.raises(ConfigurationError):
            RuleConfig(identifier="TEST-001", severity="invalid")  # Invalid severity

    def test_rule_config_with_parameters(self):
        """Test rule config with custom parameters."""
        rule = RuleConfig(
            identifier="TEST-001",
            enabled=False,
            severity="high",
            parameters={"timeout": 30},
            description="Test rule",
        )

        assert rule.identifier == "TEST-001"
        assert rule.enabled is False
        assert rule.severity == "high"
        assert rule.parameters["timeout"] == 30
        assert rule.description == "Test rule"


class TestModuleConfig:
    """Tests for ModuleConfig data structure."""

    def test_module_config_builtin(self):
        """Test builtin module config."""
        module = ModuleConfig(name="python", source_type="builtin")

        assert module.name == "python"
        assert module.enabled is True
        assert module.source_type == "builtin"
        assert module.source_location is None

    def test_module_config_path(self):
        """Test path-based module config."""
        module = ModuleConfig(
            name="custom", source_type="path", source_location="/path/to/module.py"
        )

        assert module.name == "custom"
        assert module.source_type == "path"
        assert isinstance(module.source_location, Path)
        # On Windows, paths use backslashes; compare using Path for portability
        assert module.source_location == Path("/path/to/module.py")

    def test_module_config_validation(self):
        """Test module config validation."""
        with pytest.raises(ConfigurationError):
            ModuleConfig(name="")  # Empty name

        with pytest.raises(ConfigurationError):
            ModuleConfig(name="test", source_type="invalid")  # Invalid source type

        with pytest.raises(ConfigurationError):
            ModuleConfig(name="test", source_type="path")  # Missing source_location


class TestConfigLoaders:
    """Tests for configuration file loaders."""

    def test_yaml_config_loader_basic(self):
        """Test loading basic YAML configuration."""
        yaml_content = """
fail_fast: true
constitution_path: constitution.md
target_directories:
  - src
  - tests
exclude_patterns:
  - "*.pyc"
  - __pycache__
rules:
  - identifier: TEST-001
    enabled: true
    severity: high
reporters:
  - name: console
    enabled: true
"""

        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write(yaml_content)
            f.flush()

        try:
            loader = YamlConfigLoader(apply_env_overrides=False)
            config = loader.load(Path(f.name))

            assert config.fail_fast is True
            assert config.constitution_path == Path("constitution.md")
            assert len(config.target_directories) == 2
            assert Path("src") in config.target_directories
            assert Path("tests") in config.target_directories
            assert "*.pyc" in config.exclude_patterns
            assert "__pycache__" in config.exclude_patterns
            assert len(config.rules) == 1
            assert config.rules[0].identifier == "TEST-001"
            assert config.rules[0].enabled is True
            assert config.rules[0].severity == "high"
            assert len(config.reporters) == 1
            assert config.reporters[0].name == "console"

        finally:
            os.unlink(f.name)

    def test_yaml_config_loader_environment_overrides(self):
        """Test YAML loader with environment variable overrides."""
        yaml_content = """
fail_fast: false
rules:
  - identifier: TEST-001
    enabled: true
"""

        # Set environment variables
        os.environ["CE_FAIL_FAST"] = "true"
        os.environ["CE_TARGET_DIRECTORIES"] = "src,tests,docs"
        os.environ["CE_RULE_TEST_001_ENABLED"] = "false"

        try:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
                f.write(yaml_content)
                f.flush()

            try:
                loader = YamlConfigLoader(apply_env_overrides=True)
                config = loader.load(Path(f.name))

                assert config.fail_fast is True  # Overridden by env var
                assert len(config.target_directories) == 3  # Set by env var
                assert Path("src") in config.target_directories
                assert Path("tests") in config.target_directories
                assert Path("docs") in config.target_directories

                # Rule override
                test_rule = next((r for r in config.rules if r.identifier == "TEST-001"), None)
                assert test_rule is not None
                assert test_rule.enabled is False  # Overridden by env var

            finally:
                os.unlink(f.name)

        finally:
            # Clean up environment variables
            for var in ["CE_FAIL_FAST", "CE_TARGET_DIRECTORIES", "CE_RULE_TEST_001_ENABLED"]:
                os.environ.pop(var, None)

    def test_load_config_from_file_auto_detect(self):
        """Test auto-detection of configuration file format."""
        yaml_content = """
fail_fast: true
rules:
  - identifier: YAML-001
    enabled: true
"""

        with tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False) as f:
            f.write(yaml_content)
            f.flush()

        try:
            config = load_config_from_file(Path(f.name))
            assert config.fail_fast is True
            assert len(config.rules) == 1
            assert config.rules[0].identifier == "YAML-001"
        finally:
            os.unlink(f.name)

    def test_load_config_with_overrides_file_discovery(self):
        """Test automatic configuration file discovery."""
        yaml_content = """
fail_fast: true
rules:
  - identifier: DISCOVERED-001
    enabled: true
"""

        with tempfile.TemporaryDirectory() as temp_dir:
            config_file = Path(temp_dir) / "constitution_engine.yaml"
            with open(config_file, "w") as f:
                f.write(yaml_content)

            config = load_config_with_overrides(
                search_paths=[Path(temp_dir)], apply_env_overrides=False
            )

            assert config.fail_fast is True
            assert len(config.rules) == 1
            assert config.rules[0].identifier == "DISCOVERED-001"

    def test_load_config_with_overrides_no_file(self):
        """Test loading default config when no file is found."""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = load_config_with_overrides(
                search_paths=[Path(temp_dir)], apply_env_overrides=False
            )

            # Should return default configuration
            assert config.fail_fast is False
            assert config.constitution_path is None
            assert config.target_directories == []
            assert config.rules == []


class TestConfigValidation:
    """Tests for configuration validation."""

    def test_validation_result_basic(self):
        """Test basic ValidationResult functionality."""
        result = ValidationResult()

        assert result.is_valid is True
        assert result.has_warnings is False

        result.add_error("Test error", "test.path")
        assert result.is_valid is False
        assert len(result.errors) == 1

        result.add_warning("Test warning", "test.path")
        assert result.has_warnings is True
        assert len(result.warnings) == 1

    def test_config_validator_basic_structure(self):
        """Test validation of basic configuration structure."""
        validator = ConfigValidator()

        # Valid configuration
        config = ConfigSchema(fail_fast=True)
        result = validator.validate(config)
        assert result.is_valid

        # Invalid exclude pattern
        config = ConfigSchema(exclude_patterns=["", "valid-pattern"])
        result = validator.validate(config)
        assert not result.is_valid
        assert any("empty or invalid" in error.message for error in result.errors)

    def test_config_validator_constitutional_compliance(self):
        """Test validation of constitutional compliance."""
        validator = ConfigValidator()
        # Try to disable constitutional rule: this should now raise immediately
        with pytest.raises(ConfigurationError):
            ConfigSchema(rules=[RuleConfig(identifier="CONST-001", enabled=False)])

        # Valid constitutional rule
        config = ConfigSchema(rules=[RuleConfig(identifier="CONST-001", enabled=True)])
        result = validator.validate(config)
        # Should have warnings about missing other constitutional rules
        assert result.has_warnings

    def test_config_validator_duplicate_identifiers(self):
        """Test validation catches duplicate identifiers."""
        validator = ConfigValidator()

        config = ConfigSchema(
            rules=[
                RuleConfig(identifier="DUPLICATE"),
                RuleConfig(identifier="DUPLICATE"),
            ]
        )

        result = validator.validate(config)
        assert not result.is_valid
        assert any("Duplicate rule identifier" in error.message for error in result.errors)

    def test_config_validator_invalid_severity(self):
        """Test validation catches invalid severity levels."""
        validator = ConfigValidator()

        # Creating a RuleConfig with invalid severity should now raise
        with pytest.raises(ConfigurationError):
            ConfigSchema(rules=[RuleConfig(identifier="TEST-001", severity="invalid-severity")])

    def test_config_validator_path_validation(self, tmp_path):
        """Test validation of file and directory paths."""
        validator = ConfigValidator()

        # Create test files
        constitution_file = tmp_path / "constitution.md"
        constitution_file.write_text("# Constitution")
        target_dir = tmp_path / "src"
        target_dir.mkdir()

        # Valid paths
        config = ConfigSchema(constitution_path=constitution_file, target_directories=[target_dir])
        result = validator.validate(config)
        assert result.is_valid

        # Invalid paths
        config = ConfigSchema(
            constitution_path=tmp_path / "nonexistent.md",
            target_directories=[tmp_path / "nonexistent"],
        )
        result = validator.validate(config)
        assert result.has_warnings  # Should warn about nonexistent paths

    def test_config_validator_consistency_checks(self):
        """Test consistency validation."""
        validator = ConfigValidator()

        # All reporters disabled
        config = ConfigSchema(
            reporters=[
                ReporterConfig(name="console", enabled=False),
                ReporterConfig(name="json", enabled=False),
            ]
        )
        result = validator.validate(config)
        assert result.has_warnings
        assert any("All reporters are disabled" in warning.message for warning in result.warnings)

    def test_validate_config_schema_function(self):
        """Test the validate_config_schema convenience function."""
        config = ConfigSchema()

        # Should pass validation
        result = validate_config_schema(config, raise_on_error=False)
        assert result.is_valid

        # Test raising on error
        invalid_config = ConfigSchema(exclude_patterns=[""])

        with pytest.raises(ConfigurationError):
            validate_config_schema(invalid_config, raise_on_error=True)
