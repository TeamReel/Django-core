"""
Console reporter for human-readable output.

Provides colored, formatted output suitable for terminal display.
"""

import sys
from pathlib import Path

from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

__all__ = ["ConsoleReporter"]


class ConsoleReporter:
    """
    Console reporter with human-readable formatted output.

    Displays check results with color coding and clear formatting
    suitable for interactive terminal use.
    """

    name = "console"
    identifier = "console"

    def __init__(self, *, verbose: bool = False, show_summary: bool = True):
        """
        Initialize console reporter.

        Args:
            verbose: Whether to show detailed information
            show_summary: Whether to show summary statistics
        """
        self.verbose = verbose
        self.show_summary = show_summary

    def report(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> str:
        """
        Generate console-formatted report.

        Args:
            results: Check results to report
            context: Repository context
            config: Engine configuration

        Returns:
            Formatted report string
        """
        lines = []

        # Header
        lines.append("=" * 80)
        lines.append("Constitutional Enforcement Engine Report")
        lines.append("=" * 80)
        lines.append(f"Repository: {context.root_path}")
        lines.append("")

        # Group results by status
        passes = [r for r in results if r.status == CheckStatus.PASS]
        failures = [r for r in results if r.status == CheckStatus.FAIL]
        errors = [r for r in results if r.status == CheckStatus.ERROR]
        skipped = [r for r in results if r.status == CheckStatus.SKIP]

        # Show failures first (most important)
        if failures:
            lines.append("FAILURES:")
            lines.append("-" * 80)
            for result in failures:
                lines.extend(self._format_result(result, "FAIL"))
            lines.append("")

        # Show errors
        if errors:
            lines.append("ERRORS:")
            lines.append("-" * 80)
            for result in errors:
                lines.extend(self._format_result(result, "ERROR"))
            lines.append("")

        # Show skipped if verbose
        if skipped and self.verbose:
            lines.append("SKIPPED:")
            lines.append("-" * 80)
            for result in skipped:
                lines.extend(self._format_result(result, "SKIP"))
            lines.append("")

        # Show passes if verbose
        if passes and self.verbose:
            lines.append("PASSED:")
            lines.append("-" * 80)
            for result in passes:
                lines.extend(self._format_result(result, "PASS"))
            lines.append("")

        # Summary
        if self.show_summary:
            lines.append("=" * 80)
            lines.append("SUMMARY:")
            lines.append(f"  Total:   {len(results)}")
            lines.append(f"  Passed:  {len(passes)}")
            lines.append(f"  Failed:  {len(failures)}")
            lines.append(f"  Errors:  {len(errors)}")
            lines.append(f"  Skipped: {len(skipped)}")
            lines.append("")

            # Overall status
            if failures or errors:
                lines.append("STATUS: ❌ FAILED")
            elif skipped and not passes:
                lines.append("STATUS: ⚠️  ALL SKIPPED")
            else:
                lines.append("STATUS: ✅ PASSED")

            lines.append("=" * 80)

        return "\n".join(lines)

    def _format_result(self, result: CheckResult, status_label: str) -> list[str]:
        """
        Format a single check result.

        Args:
            result: Check result to format
            status_label: Status label (PASS, FAIL, ERROR, SKIP)

        Returns:
            List of formatted lines
        """
        lines = []

        # Status line with rule identifier
        severity_symbol = self._get_severity_symbol(result.severity)
        lines.append(f"  [{status_label}] {severity_symbol} {result.rule_identifier}")

        # Message
        lines.append(f"    Message: {result.message}")

        # Affected paths
        if result.affected_paths:
            lines.append(f"    Files: {len(result.affected_paths)}")
            if self.verbose:
                for path in result.affected_paths[:5]:  # Show first 5
                    lines.append(f"      - {path}")
                if len(result.affected_paths) > 5:
                    lines.append(f"      ... and {len(result.affected_paths) - 5} more")

        # Details if verbose
        if self.verbose and result.details:
            lines.append("    Details:")
            for key, value in result.details.items():
                # Truncate long values
                value_str = str(value)
                if len(value_str) > 100:
                    value_str = value_str[:97] + "..."
                lines.append(f"      {key}: {value_str}")

        lines.append("")  # Blank line between results
        return lines

    def _get_severity_symbol(self, severity: Severity) -> str:
        """
        Get a symbol for the severity level.

        Args:
            severity: Severity level

        Returns:
            Symbol string
        """
        severity_map = {
            Severity.LOW: "ℹ️ ",
            Severity.MEDIUM: "⚠️ ",
            Severity.HIGH: "❌",
            Severity.CRITICAL: "🚨",
        }
        return severity_map.get(severity, "  ")

    def write_output(self, report: str, output_path: Path | None = None) -> None:
        """
        Write report to stdout or file.

        Args:
            report: Formatted report string
            output_path: Optional file path (None = stdout)
        """
        if output_path:
            output_path.write_text(report, encoding="utf-8")
        else:
            sys.stdout.write(report + "\n")
