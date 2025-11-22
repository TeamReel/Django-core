"""
Tests for error handling functionality - T017

Tests comprehensive error handling with clear, actionable messages
for missing/misconfigured files as specified in WP02.
"""

from pathlib import Path
from unittest.mock import patch

import pytest
from constitution_engine.core.errors import (
    ConfigurationFileError,
    EngineError,
    ErrorHandler,
    RepositoryError,
    UserFriendlyErrorContext,
    ValidationError,
    format_user_friendly_error,
)


class TestEngineError:
    """Test base EngineError functionality."""

    def test_basic_error(self):
        """Test basic error creation."""
        error = EngineError("Something went wrong")

        assert str(error) == "Something went wrong"
        assert error.message == "Something went wrong"
        assert error.suggestion is None
        assert error.error_code is None
        assert error.context == {}

    def test_error_with_suggestion(self):
        """Test error with suggestion."""
        error = EngineError(
            message="Config file not found",
            suggestion="Create a constitution_engine.yaml file",
            error_code="CONFIG_MISSING",
        )

        expected_message = (
            "Error: Config file not found\n"
            "Suggestion: Create a constitution_engine.yaml file\n"
            "Error Code: CONFIG_MISSING"
        )

        assert error.get_user_friendly_message() == expected_message

    def test_error_with_context(self):
        """Test error with context information."""
        context = {"path": "/some/path", "operation": "read"}
        error = EngineError(message="Operation failed", context=context)

        assert error.context == context


class TestConfigurationFileError:
    """Test configuration file error handling."""

    def test_config_error_with_path(self):
        """Test configuration error with file path."""
        config_path = Path("/path/to/config.yaml")
        error = ConfigurationFileError(
            message="Invalid YAML syntax",
            config_path=config_path,
            suggestion="Check YAML formatting",
        )

        assert error.config_path == config_path
        assert str(config_path) in error.context["config_path"]
        assert "Invalid YAML syntax" in error.get_user_friendly_message()
        assert "Check YAML formatting" in error.get_user_friendly_message()


class TestRepositoryError:
    """Test repository error handling."""

    def test_repo_error_with_path(self):
        """Test repository error with path."""
        repo_path = Path("/path/to/repo")
        error = RepositoryError(
            message="Repository not found",
            repo_path=repo_path,
            suggestion="Check the repository path",
        )

        assert error.repo_path == repo_path
        assert str(repo_path) in error.context["repo_path"]


class TestValidationError:
    """Test validation error handling."""

    def test_validation_error_with_path(self):
        """Test validation error with path."""
        error = ValidationError(
            message="Invalid configuration",
            validation_path="rules[0].identifier",
            suggestion="Provide a valid rule identifier",
        )

        assert error.validation_path == "rules[0].identifier"
        assert "rules[0].identifier" in error.context["validation_path"]


class TestErrorHandler:
    """Test ErrorHandler utility functions."""

    def test_handle_missing_config_file(self):
        """Test missing configuration file error."""
        search_paths = [Path("/path1"), Path("/path2")]
        error = ErrorHandler.handle_missing_config_file(search_paths)

        assert isinstance(error, ConfigurationFileError)
        assert error.error_code == "CONFIG_FILE_NOT_FOUND"
        assert "No configuration file found" in error.message
        assert "constitution_engine.yaml" in error.suggestion
        assert "/path1, /path2" in error.suggestion

    def test_handle_invalid_config_file(self):
        """Test invalid configuration file error."""
        config_path = Path("/path/to/config.yaml")
        original_error = ValueError("Invalid YAML")

        error = ErrorHandler.handle_invalid_config_file(config_path, original_error)

        assert isinstance(error, ConfigurationFileError)
        assert error.error_code == "CONFIG_FILE_INVALID"
        assert error.config_path == config_path
        assert "Configuration file is invalid" in error.message
        assert "Check the configuration file syntax" in error.suggestion
        assert str(config_path) in error.suggestion

    def test_handle_missing_repository(self):
        """Test missing repository error."""
        repo_path = Path("/missing/repo")
        error = ErrorHandler.handle_missing_repository(repo_path)

        assert isinstance(error, RepositoryError)
        assert error.error_code == "REPOSITORY_NOT_FOUND"
        assert error.repo_path == repo_path
        assert "Repository path does not exist" in error.message
        assert "Check that the path exists" in error.suggestion

    def test_handle_invalid_repository(self):
        """Test invalid repository error."""
        repo_path = Path("/invalid/repo")
        reason = "not a directory"

        error = ErrorHandler.handle_invalid_repository(repo_path, reason)

        assert isinstance(error, RepositoryError)
        assert error.error_code == "REPOSITORY_INVALID"
        assert error.repo_path == repo_path
        assert "Repository path is invalid" in error.message
        assert "must be a directory" in error.suggestion

    def test_handle_missing_constitution(self):
        """Test missing constitution file error."""
        repo_path = Path("/repo")
        expected_paths = ["CONSTITUTION.md", "constitution.md"]

        error = ErrorHandler.handle_missing_constitution(repo_path, expected_paths)

        assert isinstance(error, RepositoryError)
        assert error.error_code == "CONSTITUTION_NOT_FOUND"
        assert error.repo_path == repo_path
        assert "Constitution file not found" in error.message
        assert "CONSTITUTION.md" in error.suggestion
        assert "constitution.md" in error.suggestion
        assert "Example constitution file content" in error.suggestion

    def test_handle_configuration_validation_error(self):
        """Test configuration validation error."""
        validation_errors = ["Rule identifier missing", "Invalid validator config"]
        config_path = Path("/config.yaml")

        error = ErrorHandler.handle_configuration_validation_error(validation_errors, config_path)

        assert isinstance(error, ValidationError)
        assert error.error_code == "CONFIG_VALIDATION_FAILED"
        assert "Configuration validation failed with 2 errors" in error.message
        assert "Rule identifier missing" in error.message
        assert "Invalid validator config" in error.message
        assert "Fix the configuration issues" in error.suggestion
        assert str(config_path) in error.suggestion

    def test_handle_single_validation_error(self):
        """Test single configuration validation error."""
        validation_errors = ["Rule identifier missing"]

        error = ErrorHandler.handle_configuration_validation_error(validation_errors)

        assert "Configuration validation failed: Rule identifier missing" in error.message

    def test_handle_permission_error(self):
        """Test permission error handling."""
        path = Path("/restricted/file")
        operation = "read"

        error = ErrorHandler.handle_permission_error(path, operation)

        assert error.error_code == "PERMISSION_DENIED"
        assert "Permission denied: cannot read" in error.message
        assert "Check file/directory permissions" in error.suggestion
        assert str(path) in error.suggestion

    def test_handle_dependency_error(self):
        """Test dependency error handling."""
        dependency = "pyyaml"
        operation = "YAML parsing"
        install_command = "pip install PyYAML"

        error = ErrorHandler.handle_dependency_error(dependency, operation, install_command)

        assert error.error_code == "DEPENDENCY_MISSING"
        assert f"Required dependency '{dependency}' not available" in error.message
        assert install_command in error.suggestion

    def test_handle_dependency_error_default_install(self):
        """Test dependency error with default install command."""
        dependency = "some_package"
        operation = "some operation"

        error = ErrorHandler.handle_dependency_error(dependency, operation)

        assert f"pip install {dependency}" in error.suggestion


class TestFormatUserFriendlyError:
    """Test format_user_friendly_error function."""

    def test_format_engine_error(self):
        """Test formatting EngineError."""
        error = EngineError(
            message="Test error", suggestion="Test suggestion", error_code="TEST_ERROR"
        )

        formatted = format_user_friendly_error(error)
        assert "Error: Test error" in formatted
        assert "Suggestion: Test suggestion" in formatted
        assert "Error Code: TEST_ERROR" in formatted

    def test_format_file_not_found_error(self):
        """Test formatting FileNotFoundError."""
        error = FileNotFoundError("/missing/file")
        formatted = format_user_friendly_error(error)

        assert "Repository path does not exist" in formatted
        assert "Check that the path exists" in formatted

    def test_format_permission_error(self):
        """Test formatting PermissionError."""
        error = PermissionError("/restricted/file")
        formatted = format_user_friendly_error(error)

        assert "Permission denied" in formatted
        assert "Check file/directory permissions" in formatted

    def test_format_value_error(self):
        """Test formatting ValueError."""
        error = ValueError("Invalid input value")
        formatted = format_user_friendly_error(error)

        assert "Invalid input: Invalid input value" in formatted
        assert "Check your input values" in formatted

    def test_format_generic_error(self):
        """Test formatting generic exception."""
        error = RuntimeError("Something unexpected happened")
        formatted = format_user_friendly_error(error)

        assert "Unexpected error: Something unexpected happened" in formatted
        assert "Check the logs for more details" in formatted


class TestUserFriendlyErrorContext:
    """Test UserFriendlyErrorContext context manager."""

    def test_no_exception(self):
        """Test context manager with no exception."""
        with UserFriendlyErrorContext("test operation"):
            pass  # No exception should occur

    def test_engine_error_passthrough(self):
        """Test that EngineError passes through unchanged."""
        original_error = EngineError("Original engine error")

        with pytest.raises(EngineError) as exc_info:
            with UserFriendlyErrorContext("test operation"):
                raise original_error

        assert exc_info.value is original_error

    def test_convert_generic_error(self):
        """Test converting generic error to EngineError."""
        with pytest.raises(EngineError) as exc_info:
            with UserFriendlyErrorContext("test operation"):
                raise ValueError("Some value error")

        engine_error = exc_info.value
        assert "Failed to test operation" in engine_error.message
        assert engine_error.error_code == "OPERATION_FAILED"
        assert "test operation" in engine_error.context["operation"]
        assert isinstance(engine_error.__cause__, ValueError)

    @patch("constitution_engine.core.errors.logger")
    def test_logging(self, mock_logger):
        """Test that errors are logged."""
        with pytest.raises(EngineError):
            with UserFriendlyErrorContext("test operation", mock_logger):
                raise ValueError("Test error")

        mock_logger.error.assert_called_once()
        call_args = mock_logger.error.call_args
        assert "Error during test operation" in call_args[0][0]
        assert "Test error" in call_args[0][0]


class TestErrorIntegration:
    """Test error handling integration scenarios."""

    def test_config_file_workflow_errors(self):
        """Test complete configuration file error workflow."""
        # Missing config file
        search_paths = [Path("/search1"), Path("/search2")]
        missing_error = ErrorHandler.handle_missing_config_file(search_paths)

        message = missing_error.get_user_friendly_message()
        assert "No configuration file found" in message
        assert "constitution_engine.yaml" in message
        assert "/search1, /search2" in message

        # Invalid config file
        config_path = Path("/config.yaml")
        yaml_error = ValueError("Invalid YAML: line 5")
        invalid_error = ErrorHandler.handle_invalid_config_file(config_path, yaml_error)

        message = invalid_error.get_user_friendly_message()
        assert "Configuration file is invalid" in message
        assert "Check the configuration file syntax" in message
        assert str(config_path) in message

    def test_repository_workflow_errors(self):
        """Test complete repository error workflow."""
        repo_path = Path("/repo")

        # Missing repository
        missing_error = ErrorHandler.handle_missing_repository(repo_path)
        message = missing_error.get_user_friendly_message()
        assert "Repository path does not exist" in message
        assert str(repo_path) in message

        # Invalid repository
        invalid_error = ErrorHandler.handle_invalid_repository(repo_path, "not a directory")
        message = invalid_error.get_user_friendly_message()
        assert "Repository path is invalid" in message
        assert "must be a directory" in message

        # Missing constitution
        constitution_error = ErrorHandler.handle_missing_constitution(
            repo_path, ["CONSTITUTION.md"]
        )
        message = constitution_error.get_user_friendly_message()
        assert "Constitution file not found" in message
        assert "CONSTITUTION.md" in message
        assert "Example constitution file content" in message

    def test_validation_workflow_errors(self):
        """Test complete validation error workflow."""
        errors = [
            "rules[0].identifier is required",
            "validators[1].name is invalid",
            "reporters[0].enabled must be boolean",
        ]

        validation_error = ErrorHandler.handle_configuration_validation_error(errors)
        message = validation_error.get_user_friendly_message()

        assert "Configuration validation failed with 3 errors" in message
        assert "rules[0].identifier is required" in message
        assert "validators[1].name is invalid" in message
        assert "reporters[0].enabled must be boolean" in message
        assert "Fix the configuration issues" in message


if __name__ == "__main__":
    pytest.main([__file__])
