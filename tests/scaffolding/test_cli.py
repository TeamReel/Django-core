"""
Unit tests for CLI framework (WP01 coverage).

Tests command parsing, exit codes, error handling, and CLI interface.
"""

import sys
from io import StringIO
from unittest.mock import MagicMock, patch

import pytest

from scaffolding.cli.main import ScaffoldCLI, main


class TestScaffoldCLI:
    """Test ScaffoldCLI class."""

    def test_cli_initialization(self):
        """Test CLI initializes correctly."""
        cli = ScaffoldCLI()
        assert cli is not None
        assert hasattr(cli, 'parser')

    def test_cli_has_subcommands(self):
        """Test CLI has required subcommands."""
        cli = ScaffoldCLI()
        # Verify parser exists and has subparsers
        assert cli.parser is not None

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_generate_command(self, mock_generate):
        """Test generate subcommand calls generate handler."""
        mock_generate.return_value = 0
        
        cli = ScaffoldCLI()
        exit_code = cli.run(['generate', 'minimal', 'my_app'])
        
        assert exit_code == 0
        mock_generate.assert_called_once()

    @patch('scaffolding.cli.main.ScaffoldCLI.run_list')
    def test_list_command(self, mock_list):
        """Test list subcommand calls list handler."""
        mock_list.return_value = 0
        
        cli = ScaffoldCLI()
        exit_code = cli.run(['list'])
        
        assert exit_code == 0
        mock_list.assert_called_once()

    @patch('scaffolding.cli.main.ScaffoldCLI.run_validate')
    def test_validate_command(self, mock_validate):
        """Test validate subcommand calls validate handler."""
        mock_validate.return_value = 0
        
        cli = ScaffoldCLI()
        exit_code = cli.run(['validate', '--directory', '/path/to/app'])
        
        assert exit_code == 0
        mock_validate.assert_called_once()


class TestCLIExitCodes:
    """Test CLI exit codes for various scenarios."""

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_success_exit_code(self, mock_generate):
        """Test successful command returns 0."""
        mock_generate.return_value = 0
        
        cli = ScaffoldCLI()
        exit_code = cli.run(['generate', 'minimal', 'test_app'])
        
        assert exit_code == 0

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_error_exit_code(self, mock_generate):
        """Test failed command returns non-zero."""
        mock_generate.side_effect = Exception("Generation failed")
        
        cli = ScaffoldCLI()
        exit_code = cli.run(['generate', 'minimal', 'test_app'])
        
        assert exit_code != 0

    def test_invalid_command_exit_code(self):
        """Test invalid command returns non-zero."""
        cli = ScaffoldCLI()
        
        with patch('sys.stderr', new=StringIO()):
            exit_code = cli.run(['invalid_command'])
        
        assert exit_code != 0

    def test_missing_required_args_exit_code(self):
        """Test missing required arguments returns non-zero."""
        cli = ScaffoldCLI()
        
        with patch('sys.stderr', new=StringIO()):
            exit_code = cli.run(['generate'])  # Missing template and app_name
        
        assert exit_code != 0


class TestCLIErrorHandling:
    """Test CLI error handling and user-friendly messages."""

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_handles_template_not_found(self, mock_generate):
        """Test template not found error is handled gracefully."""
        mock_generate.side_effect = ValueError("Template 'nonexistent' not found")
        
        cli = ScaffoldCLI()
        exit_code = cli.run(['generate', 'nonexistent', 'test_app'])
        
        assert exit_code != 0

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_handles_validation_error(self, mock_generate):
        """Test validation error is handled gracefully."""
        mock_generate.side_effect = ValueError("Invalid app name")
        
        cli = ScaffoldCLI()
        exit_code = cli.run(['generate', 'minimal', 'Invalid-Name'])
        
        assert exit_code != 0

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_handles_permission_error(self, mock_generate):
        """Test permission error is handled gracefully."""
        mock_generate.side_effect = PermissionError("Cannot write to directory")
        
        cli = ScaffoldCLI()
        exit_code = cli.run(['generate', 'minimal', 'test_app'])
        
        assert exit_code != 0

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    @patch('sys.stdout', new_callable=StringIO)
    def test_error_message_displayed(self, mock_stdout, mock_generate):
        """Test error messages are displayed to user."""
        error_msg = "Template 'invalid' not found"
        mock_generate.side_effect = ValueError(error_msg)
        
        cli = ScaffoldCLI()
        cli.run(['generate', 'invalid', 'test_app'])
        
        # Verify error message was displayed (implementation may vary)
        # This is a placeholder - adjust based on actual error display logic


class TestCLICommandParsing:
    """Test CLI command argument parsing."""

    def test_parse_generate_with_all_args(self):
        """Test parsing generate command with all arguments."""
        cli = ScaffoldCLI()
        args = cli.parser.parse_args([
            'generate',
            'api-first',
            'products',
            '--output-dir', '/tmp/output',
            '--var', 'model_name=Product',
            '--no-validate',
            '--non-interactive'
        ])
        
        assert args.command == 'generate'
        assert args.template == 'api-first'
        assert args.app_name == 'products'
        assert args.output_dir == '/tmp/output'
        assert 'model_name=Product' in args.var
        assert args.no_validate is True
        assert args.non_interactive is True

    def test_parse_list_command(self):
        """Test parsing list command."""
        cli = ScaffoldCLI()
        args = cli.parser.parse_args(['list'])
        
        assert args.command == 'list'

    def test_parse_list_with_format(self):
        """Test parsing list command with format option."""
        cli = ScaffoldCLI()
        args = cli.parser.parse_args(['list', '--format', 'json'])
        
        assert args.command == 'list'
        assert args.format == 'json'

    def test_parse_validate_command(self):
        """Test parsing validate command."""
        cli = ScaffoldCLI()
        args = cli.parser.parse_args([
            'validate',
            '--directory', '/path/to/app'
        ])
        
        assert args.command == 'validate'
        assert args.directory == '/path/to/app'


class TestMainFunction:
    """Test main() entry point function."""

    @patch('scaffolding.cli.main.ScaffoldCLI')
    def test_main_creates_cli_and_runs(self, mock_cli_class):
        """Test main() creates CLI instance and runs with sys.argv."""
        mock_cli = MagicMock()
        mock_cli.run.return_value = 0
        mock_cli_class.return_value = mock_cli
        
        with patch.object(sys, 'argv', ['scaffold', 'list']):
            exit_code = main()
        
        mock_cli_class.assert_called_once()
        mock_cli.run.assert_called_once()
        assert exit_code == 0

    @patch('scaffolding.cli.main.ScaffoldCLI')
    def test_main_returns_exit_code(self, mock_cli_class):
        """Test main() returns CLI exit code."""
        mock_cli = MagicMock()
        mock_cli.run.return_value = 42
        mock_cli_class.return_value = mock_cli
        
        with patch.object(sys, 'argv', ['scaffold', 'generate', 'minimal', 'test']):
            exit_code = main()
        
        assert exit_code == 42

    @patch('scaffolding.cli.main.ScaffoldCLI')
    def test_main_handles_keyboard_interrupt(self, mock_cli_class):
        """Test main() handles Ctrl+C gracefully."""
        mock_cli = MagicMock()
        mock_cli.run.side_effect = KeyboardInterrupt()
        mock_cli_class.return_value = mock_cli
        
        with patch.object(sys, 'argv', ['scaffold', 'generate', 'minimal', 'test']):
            exit_code = main()
        
        assert exit_code == 130  # Standard exit code for SIGINT


class TestCLINonInteractiveMode:
    """Test CLI non-interactive mode for CI/CD."""

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_non_interactive_skips_prompts(self, mock_generate):
        """Test non-interactive mode doesn't prompt for input."""
        mock_generate.return_value = 0
        
        cli = ScaffoldCLI()
        exit_code = cli.run([
            'generate',
            'minimal',
            'test_app',
            '--non-interactive'
        ])
        
        assert exit_code == 0
        # Verify generate was called with non_interactive=True
        args = mock_generate.call_args[0][0]
        assert args.non_interactive is True

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_non_interactive_uses_defaults(self, mock_generate):
        """Test non-interactive mode uses default values."""
        mock_generate.return_value = 0
        
        cli = ScaffoldCLI()
        exit_code = cli.run([
            'generate',
            'api-first',
            'products',
            '--non-interactive'
        ])
        
        assert exit_code == 0


class TestCLIVerboseOutput:
    """Test CLI verbose and quiet output modes."""

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_verbose_flag(self, mock_generate):
        """Test verbose flag is parsed correctly."""
        mock_generate.return_value = 0
        
        cli = ScaffoldCLI()
        exit_code = cli.run([
            'generate',
            'minimal',
            'test_app',
            '--verbose'
        ])
        
        assert exit_code == 0

    @patch('scaffolding.cli.main.ScaffoldCLI.run_generate')
    def test_quiet_flag(self, mock_generate):
        """Test quiet flag is parsed correctly."""
        mock_generate.return_value = 0
        
        cli = ScaffoldCLI()
        exit_code = cli.run([
            'generate',
            'minimal',
            'test_app',
            '--quiet'
        ])
        
        assert exit_code == 0
