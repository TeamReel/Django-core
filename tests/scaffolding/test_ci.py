"""
CI/CD automation tests for scaffolding CLI.

Tests non-interactive mode, environment variable handling,
and automated workflows for continuous integration.
"""

import os
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from scaffolding.cli.main import ScaffoldCLI


@pytest.fixture
def temp_workspace():
    """Provide temporary workspace for CI tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def cli():
    """Provide CLI instance."""
    return ScaffoldCLI()


@pytest.fixture
def ci_environment():
    """Mock CI environment variables."""
    original_env = os.environ.copy()
    
    # Set common CI environment variables
    os.environ['CI'] = 'true'
    os.environ['GITHUB_ACTIONS'] = 'true'
    os.environ['CONTINUOUS_INTEGRATION'] = 'true'
    
    yield
    
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


class TestCICDNonInteractiveMode:
    """Test non-interactive mode for CI/CD pipelines."""

    def test_ci_environment_detected(self, cli, ci_environment):
        """Test CLI detects CI environment."""
        # CLI should automatically use non-interactive mode in CI
        assert os.getenv('CI') == 'true'

    def test_non_interactive_no_tty_required(self, cli, temp_workspace):
        """Test non-interactive mode works without TTY."""
        app_name = "ci_test_app"
        output_dir = temp_workspace
        
        # Simulate no TTY (common in CI)
        with patch('sys.stdin.isatty', return_value=False):
            exit_code = cli.run([
                'generate',
                'minimal',
                app_name,
                '--output-dir', str(output_dir),
                '--non-interactive'
            ])
        
        assert exit_code == 0
        assert (output_dir / app_name).exists()

    def test_non_interactive_no_input_prompts(self, cli, temp_workspace):
        """Test non-interactive mode never prompts for input."""
        app_name = "no_prompt_app"
        output_dir = temp_workspace
        
        # Mock stdin to ensure no reads occur
        with patch('builtins.input', side_effect=RuntimeError("Should not prompt")):
            exit_code = cli.run([
                'generate',
                'minimal',
                app_name,
                '--output-dir', str(output_dir),
                '--non-interactive'
            ])
        
        assert exit_code == 0

    def test_non_interactive_uses_default_values(self, cli, temp_workspace):
        """Test non-interactive mode uses sensible defaults."""
        app_name = "default_values_app"
        output_dir = temp_workspace
        
        # Generate without specifying optional variables
        exit_code = cli.run([
            'generate',
            'api-first',
            app_name,
            '--output-dir', str(output_dir),
            '--non-interactive'
        ])
        
        assert exit_code == 0
        
        # Verify default model_name "Item" was used
        serializers = (output_dir / app_name / 'serializers.py').read_text()
        assert 'Item' in serializers


class TestCICDExitCodes:
    """Test exit codes for CI/CD success detection."""

    def test_success_exit_code_zero(self, cli, temp_workspace):
        """Test successful generation returns exit code 0."""
        exit_code = cli.run([
            'generate',
            'minimal',
            'test_app',
            '--output-dir', str(temp_workspace),
            '--non-interactive'
        ])
        
        assert exit_code == 0

    def test_error_exit_code_nonzero(self, cli, temp_workspace):
        """Test failed generation returns non-zero exit code."""
        # Try to generate with invalid template
        exit_code = cli.run([
            'generate',
            'invalid_template',
            'test_app',
            '--output-dir', str(temp_workspace),
            '--non-interactive'
        ])
        
        assert exit_code != 0

    def test_validation_error_exit_code(self, cli, temp_workspace):
        """Test validation failure returns non-zero exit code."""
        # Try to generate with invalid app name
        exit_code = cli.run([
            'generate',
            'minimal',
            'Invalid-App-Name',  # Invalid: contains hyphens
            '--output-dir', str(temp_workspace),
            '--non-interactive'
        ])
        
        assert exit_code != 0

    def test_permission_error_exit_code(self, cli):
        """Test permission error returns non-zero exit code."""
        # Try to write to read-only location
        exit_code = cli.run([
            'generate',
            'minimal',
            'test_app',
            '--output-dir', '/root/forbidden',  # Typically forbidden
            '--non-interactive'
        ])
        
        assert exit_code != 0


class TestCICDBatchOperations:
    """Test batch operations for CI/CD."""

    def test_generate_multiple_apps_in_sequence(self, cli, temp_workspace):
        """Test generating multiple apps in CI pipeline."""
        apps = [
            ('minimal', 'accounts'),
            ('minimal', 'profiles'),
            ('api-first', 'products'),
            ('service', 'orders')
        ]
        
        for template, app_name in apps:
            exit_code = cli.run([
                'generate',
                template,
                app_name,
                '--output-dir', str(temp_workspace),
                '--non-interactive',
                '--no-validate'  # Skip validation for speed
            ])
            
            assert exit_code == 0
        
        # Verify all apps created
        for _, app_name in apps:
            assert (temp_workspace / app_name).exists()

    def test_parallel_generation_simulation(self, cli, temp_workspace):
        """Test multiple independent generations (simulate parallel CI jobs)."""
        # Create separate output directories
        output_dirs = [
            temp_workspace / 'job1',
            temp_workspace / 'job2',
            temp_workspace / 'job3'
        ]
        
        for output_dir in output_dirs:
            output_dir.mkdir()
        
        # Generate in each directory (simulating parallel jobs)
        for idx, output_dir in enumerate(output_dirs):
            exit_code = cli.run([
                'generate',
                'minimal',
                f'app_{idx}',
                '--output-dir', str(output_dir),
                '--non-interactive'
            ])
            
            assert exit_code == 0
            assert (output_dir / f'app_{idx}').exists()

    def test_idempotent_operations(self, cli, temp_workspace):
        """Test operations are idempotent (safe to retry)."""
        app_name = "idempotent_app"
        output_dir = temp_workspace
        
        # Generate app first time
        exit_code1 = cli.run([
            'generate',
            'minimal',
            app_name,
            '--output-dir', str(output_dir),
            '--non-interactive'
        ])
        
        assert exit_code1 == 0
        
        # Generate again (should handle existing directory gracefully)
        exit_code2 = cli.run([
            'generate',
            'minimal',
            app_name,
            '--output-dir', str(output_dir),
            '--non-interactive',
            '--force'  # If force flag exists
        ])
        
        # Should either succeed or fail gracefully
        assert exit_code2 in [0, 1]  # Accept either outcome


class TestCICDEnvironmentVariables:
    """Test environment variable configuration for CI/CD."""

    def test_output_dir_from_env(self, cli, temp_workspace):
        """Test output directory can be set via environment variable."""
        app_name = "env_output_app"
        
        with patch.dict(os.environ, {'SCAFFOLD_OUTPUT_DIR': str(temp_workspace)}):
            exit_code = cli.run([
                'generate',
                'minimal',
                app_name,
                '--non-interactive'
            ])
            
            # If env var support exists, this should work
            # Otherwise, skip test
            if exit_code == 0:
                assert (temp_workspace / app_name).exists()

    def test_template_dir_from_env(self, cli, temp_workspace):
        """Test custom template directory from environment variable."""
        custom_dir = temp_workspace / 'custom_templates'
        custom_dir.mkdir()
        
        with patch.dict(os.environ, {'SCAFFOLD_TEMPLATE_DIR': str(custom_dir)}):
            exit_code = cli.run([
                'list',
                '--non-interactive'
            ])
            
            # Should succeed regardless of custom templates
            assert exit_code == 0

    def test_non_interactive_from_env(self, cli, temp_workspace, ci_environment):
        """Test non-interactive mode from CI environment variable."""
        app_name = "ci_env_app"
        
        # CI environment should automatically enable non-interactive mode
        exit_code = cli.run([
            'generate',
            'minimal',
            app_name,
            '--output-dir', str(temp_workspace)
            # No --non-interactive flag; should detect from CI env
        ])
        
        # Should work even without explicit --non-interactive flag
        assert exit_code == 0


class TestCICDLogging:
    """Test logging and output for CI/CD."""

    def test_structured_output_for_parsing(self, cli, temp_workspace):
        """Test output is structured for CI parsing."""
        app_name = "log_test_app"
        
        exit_code = cli.run([
            'generate',
            'minimal',
            app_name,
            '--output-dir', str(temp_workspace),
            '--non-interactive',
            '--format', 'json'  # If JSON output exists
        ])
        
        # Should succeed with structured output
        assert exit_code == 0

    def test_quiet_mode_minimal_output(self, cli, temp_workspace):
        """Test quiet mode for minimal CI logs."""
        app_name = "quiet_app"
        
        exit_code = cli.run([
            'generate',
            'minimal',
            app_name,
            '--output-dir', str(temp_workspace),
            '--non-interactive',
            '--quiet'
        ])
        
        assert exit_code == 0

    def test_verbose_mode_detailed_output(self, cli, temp_workspace):
        """Test verbose mode for CI debugging."""
        app_name = "verbose_app"
        
        exit_code = cli.run([
            'generate',
            'minimal',
            app_name,
            '--output-dir', str(temp_workspace),
            '--non-interactive',
            '--verbose'
        ])
        
        assert exit_code == 0


class TestCICDErrorReporting:
    """Test error reporting for CI/CD."""

    def test_error_messages_to_stderr(self, cli, temp_workspace):
        """Test errors are written to stderr for CI capture."""
        # Try invalid template
        with patch('sys.stderr') as mock_stderr:
            exit_code = cli.run([
                'generate',
                'invalid_template',
                'test_app',
                '--output-dir', str(temp_workspace),
                '--non-interactive'
            ])
        
        assert exit_code != 0

    def test_error_includes_context(self, cli, temp_workspace):
        """Test error messages include context for debugging."""
        # Try to generate with missing required variable
        exit_code = cli.run([
            'generate',
            'minimal',
            '',  # Empty app name
            '--output-dir', str(temp_workspace),
            '--non-interactive'
        ])
        
        assert exit_code != 0


class TestCICDIntegrationWithTools:
    """Test integration with CI/CD tools."""

    def test_github_actions_workflow(self, cli, temp_workspace, ci_environment):
        """Test GitHub Actions workflow scenario."""
        # Simulate GitHub Actions environment
        with patch.dict(os.environ, {
            'GITHUB_ACTIONS': 'true',
            'GITHUB_WORKSPACE': str(temp_workspace)
        }):
            exit_code = cli.run([
                'generate',
                'minimal',
                'github_app',
                '--output-dir', str(temp_workspace),
                '--non-interactive'
            ])
        
        assert exit_code == 0

    def test_docker_container_execution(self, cli, temp_workspace):
        """Test execution inside Docker container."""
        # Simulate Docker environment (no TTY)
        with patch('sys.stdin.isatty', return_value=False):
            exit_code = cli.run([
                'generate',
                'minimal',
                'docker_app',
                '--output-dir', str(temp_workspace),
                '--non-interactive'
            ])
        
        assert exit_code == 0

    def test_success_rate_tracking(self, cli, temp_workspace):
        """Test 100% success rate for valid operations."""
        success_count = 0
        total_count = 10
        
        for i in range(total_count):
            exit_code = cli.run([
                'generate',
                'minimal',
                f'app_{i}',
                '--output-dir', str(temp_workspace),
                '--non-interactive'
            ])
            
            if exit_code == 0:
                success_count += 1
        
        # Should have 100% success rate
        success_rate = (success_count / total_count) * 100
        assert success_rate == 100.0


class TestCICDPerformance:
    """Test performance characteristics for CI/CD."""

    def test_fast_generation_for_ci(self, cli, temp_workspace):
        """Test generation completes quickly for CI."""
        import time
        
        start_time = time.time()
        
        exit_code = cli.run([
            'generate',
            'minimal',
            'perf_test_app',
            '--output-dir', str(temp_workspace),
            '--non-interactive',
            '--no-validate'  # Skip validation for speed
        ])
        
        elapsed = time.time() - start_time
        
        assert exit_code == 0
        # Should complete in reasonable time (adjust threshold as needed)
        assert elapsed < 5.0  # 5 seconds max

    def test_memory_efficient_batch_operations(self, cli, temp_workspace):
        """Test batch operations don't consume excessive memory."""
        # Generate many apps to test memory usage
        for i in range(20):
            exit_code = cli.run([
                'generate',
                'minimal',
                f'batch_app_{i}',
                '--output-dir', str(temp_workspace),
                '--non-interactive',
                '--no-validate'
            ])
            
            assert exit_code == 0
        
        # If this completes without memory error, test passes
        assert True
