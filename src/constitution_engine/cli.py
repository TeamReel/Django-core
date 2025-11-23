"""
Command-line interface for the Constitutional Enforcement Engine.

This module provides the main CLI entry point for running the engine from the command line
or CI/CD environments like GitHub Actions.
"""

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import NoReturn

from constitution_engine.core.integration import run_with_config
from constitution_engine.core.models import CheckStatus, Severity

__all__ = ["main", "cli"]


def is_github_actions() -> bool:
    """
    Check if running in GitHub Actions environment.

    Returns:
        True if GITHUB_ACTIONS environment variable is set
    """
    return os.getenv("GITHUB_ACTIONS") == "true"


def emit_github_annotation(
    level: str,
    message: str,
    file: str | None = None,
    line: int | None = None,
) -> None:
    """
    Emit a GitHub Actions workflow command annotation.

    Args:
        level: Annotation level ("error", "warning", "notice")
        message: Annotation message
        file: Optional file path
        line: Optional line number
    """
    parts = [f"::{level}"]

    if file or line:
        params = []
        if file:
            params.append(f"file={file}")
        if line:
            params.append(f"line={line}")
        parts[0] += f" {','.join(params)}"

    parts.append(f"::{message}")
    print("".join(parts))


def emit_github_summary(results: list) -> None:
    """
    Emit a GitHub Actions job summary.

    Args:
        results: List of CheckResult objects
    """
    summary_file = os.getenv("GITHUB_STEP_SUMMARY")
    if not summary_file:
        return

    # Count results by status
    pass_count = sum(1 for r in results if r.status == CheckStatus.PASS)
    fail_count = sum(1 for r in results if r.status == CheckStatus.FAIL)
    error_count = sum(1 for r in results if r.status == CheckStatus.ERROR)
    skip_count = sum(1 for r in results if r.status == CheckStatus.SKIP)

    total = len(results)
    success = fail_count == 0 and error_count == 0

    with open(summary_file, "a", encoding="utf-8") as f:
        f.write("# Constitutional Enforcement Results\n\n")

        if success:
            f.write("✅ **All checks passed!**\n\n")
        else:
            f.write("❌ **Constitutional violations detected**\n\n")

        f.write("## Summary\n\n")
        f.write(f"- ✅ Passed: {pass_count}\n")
        f.write(f"- ❌ Failed: {fail_count}\n")
        f.write(f"- 🔥 Errors: {error_count}\n")
        f.write(f"- ⏭️ Skipped: {skip_count}\n")
        f.write(f"- 📊 Total: {total}\n\n")

        # Show failures
        if fail_count > 0 or error_count > 0:
            f.write("## Violations\n\n")
            for result in results:
                if result.status in (CheckStatus.FAIL, CheckStatus.ERROR):
                    severity_emoji = {
                        "low": "ℹ️",
                        "medium": "⚠️",
                        "high": "❌",
                        "critical": "🚨",
                    }.get(result.severity.value.lower(), "❓")

                    f.write(f"### {severity_emoji} {result.rule_identifier}\n\n")
                    f.write(f"**Severity**: {result.severity.value}\n\n")
                    f.write(f"**Message**: {result.message}\n\n")

                    if result.affected_paths:
                        f.write("**Affected files**:\n")
                        for path in result.affected_paths[:5]:  # Limit to 5 files
                            f.write(f"- `{path}`\n")
                        if len(result.affected_paths) > 5:
                            f.write(f"- ... and {len(result.affected_paths) - 5} more\n")
                        f.write("\n")


def setup_logging(verbose: bool = False) -> None:
    """
    Configure logging for the CLI.

    Args:
        verbose: If True, set DEBUG level; otherwise INFO
    """
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        format="%(levelname)s: %(message)s",
        level=level,
    )


def parse_args(args: list[str] | None = None) -> argparse.Namespace:
    """
    Parse command-line arguments.

    Args:
        args: List of arguments to parse (defaults to sys.argv[1:])

    Returns:
        Parsed arguments namespace
    """
    parser = argparse.ArgumentParser(
        prog="constitution-engine",
        description=(
            "Constitutional Enforcement Engine - "
            "Validate repositories against constitutional rules"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with default configuration
  constitution-engine

  # Run with explicit config file
  constitution-engine --config .constitution.yaml

  # Run with specific output format
  constitution-engine --output json

  # Fail on high severity violations
  constitution-engine --fail-on high

  # Run in verbose mode
  constitution-engine --verbose

Environment Variables:
  CONSTITUTION_CONFIG     Path to configuration file
  CONSTITUTION_REPO_PATH  Path to repository (default: current directory)
  CONSTITUTION_FAIL_ON    Minimum severity to fail on (low, medium, high, critical)
        """,
    )

    parser.add_argument(
        "--config",
        "-c",
        type=Path,
        default=None,
        help=(
            "Path to configuration file (default: search for "
            ".constitution.yaml in current and parent directories)"
        ),
    )

    parser.add_argument(
        "--repo-path",
        "-r",
        type=Path,
        default=Path.cwd(),
        help=("Path to repository to analyze (default: current directory)"),
    )

    parser.add_argument(
        "--output",
        "-o",
        choices=["console", "json", "both"],
        default="console",
        help="Output format (default: console)",
    )

    parser.add_argument(
        "--fail-on",
        choices=["low", "medium", "high", "critical", "never"],
        default="high",
        help="Minimum severity level to fail on (default: high)",
    )

    parser.add_argument(
        "--no-git",
        action="store_true",
        help="Disable Git metadata collection",
    )

    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging",
    )

    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 0.1.0",
    )

    return parser.parse_args(args)


def should_fail(
    results: list,
    fail_on: str,
) -> bool:
    """
    Determine if the engine should exit with failure based on results.

    Args:
        results: List of CheckResult objects
        fail_on: Minimum severity to fail on ("low", "medium", "high", "critical", "never")

    Returns:
        True if should fail, False otherwise
    """
    if fail_on == "never":
        return False

    # Map fail_on to severity threshold
    severity_order = {
        "low": 0,
        "medium": 1,
        "high": 2,
        "critical": 3,
    }

    threshold = severity_order.get(fail_on, 2)  # Default to "high"

    # Check if any failing result meets or exceeds threshold
    for result in results:
        if result.status in (CheckStatus.FAIL, CheckStatus.ERROR):
            result_severity = result.severity.value.lower()
            if result_severity in severity_order:
                if severity_order[result_severity] >= threshold:
                    return True

    return False


def cli(args: list[str] | None = None) -> int:
    """
    Main CLI function that runs the engine and returns exit code.

    Args:
        args: Command-line arguments (defaults to sys.argv[1:])

    Returns:
        Exit code (0 for success, 1 for failure, 2 for error)
    """
    parsed_args = parse_args(args)
    setup_logging(parsed_args.verbose)

    logger = logging.getLogger(__name__)

    try:
        # Resolve paths
        repo_path = parsed_args.repo_path.resolve()
        config_path = parsed_args.config.resolve() if parsed_args.config else None

        logger.info(f"Analyzing repository: {repo_path}")
        if config_path:
            logger.info(f"Using configuration: {config_path}")

        # Run engine
        results, reports, exit_code = run_with_config(
            repo_path=repo_path,
            config_path=config_path,
            include_git_metadata=not parsed_args.no_git,
        )

        # Count results by status
        pass_count = sum(1 for r in results if r.status == CheckStatus.PASS)
        fail_count = sum(1 for r in results if r.status == CheckStatus.FAIL)
        error_count = sum(1 for r in results if r.status == CheckStatus.ERROR)

        logger.info(f"Results: {pass_count} passed, {fail_count} failed, {error_count} errors")

        # GitHub Actions integration
        if is_github_actions():
            for result in results:
                if result.status == CheckStatus.FAIL:
                    # Determine annotation level based on severity
                    level = (
                        "error"
                        if result.severity in (Severity.HIGH, Severity.CRITICAL)
                        else "warning"
                    )
                    file_path = str(result.affected_paths[0]) if result.affected_paths else None
                    emit_github_annotation(
                        level=level,
                        message=f"[{result.rule_identifier}] {result.message}",
                        file=file_path,
                    )
                elif result.status == CheckStatus.ERROR:
                    emit_github_annotation(
                        level="error",
                        message=f"[{result.rule_identifier}] Check error: {result.message}",
                    )

            # Emit step summary
            emit_github_summary(results)

        # Determine exit code
        if error_count > 0:
            logger.error("Errors encountered during checks")
            return 2

        if should_fail(results, parsed_args.fail_on):
            logger.error("Constitutional violations detected")
            return 1

        logger.info("All checks passed")
        return 0

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        if is_github_actions():
            emit_github_annotation(
                level="error",
                message=f"Configuration file not found: {e}",
            )
        return 2
    except Exception as e:
        logger.error(f"Error running engine: {e}")
        if parsed_args.verbose:
            logger.exception("Detailed error:")
        if is_github_actions():
            emit_github_annotation(
                level="error",
                message=f"Engine execution failed: {e}",
            )
        return 2


def main() -> NoReturn:
    """
    Main entry point for the CLI.

    Calls cli() and exits with the returned exit code.
    """
    sys.exit(cli())


if __name__ == "__main__":
    main()
