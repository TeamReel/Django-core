"""
Validation report formatting for user-friendly display.

Formats JSON validation reports as colorized, actionable messages.
"""

from typing import Any, Dict

import click


def format_validation_report(report: Dict[str, Any]) -> str:
    """
    Format validation report for display.

    Creates user-friendly, colorized output showing violations and warnings
    with file paths, line numbers, rules, and actionable suggestions.

    Args:
        report: Validation report dict with 'violations' and 'warnings' keys

    Returns:
        Formatted report string with Click color codes

    Example output:
        ✗ Constitutional validation failed: 2 violations, 1 warning

        Violations:
          • models.py:10 - [B03-001] Missing CSRF protection
          • views.py:25 - [B04-002] Missing i18n marker

        Warnings:
          • tests.py:15 - [B05-001] Consider adding docstring

        → Fix violations or use --force to bypass validation
    """
    violations = report.get("violations", [])
    warnings = report.get("warnings", [])

    lines = []

    # Header with counts
    violation_count = len(violations)
    warning_count = len(warnings)

    if violation_count == 0 and warning_count == 0:
        # No issues (shouldn't happen for failure reports, but handle gracefully)
        lines.append(click.style("✓ Constitutional validation passed", fg="green", bold=True))
        return "\n".join(lines)

    # Failure header
    lines.append(
        click.style(
            f"✗ Constitutional validation failed: "
            f"{violation_count} violation{'s' if violation_count != 1 else ''}, "
            f"{warning_count} warning{'s' if warning_count != 1 else ''}",
            fg="red",
            bold=True,
        )
    )
    lines.append("")

    # Violations section
    if violations:
        lines.append(click.style("  Violations:", fg="red", bold=True))
        for v in violations:
            file_name = v.get("file", "unknown")
            line_num = v.get("line", "?")
            rule = v.get("rule", "UNKNOWN")
            message = v.get("message", "No message provided")

            lines.append(
                f"    • {click.style(f'{file_name}:{line_num}', fg='white', bold=True)} "
                f"- [{click.style(rule, fg='red')}] {message}"
            )
        lines.append("")

    # Warnings section
    if warnings:
        lines.append(click.style("  Warnings:", fg="yellow", bold=True))
        for w in warnings:
            file_name = w.get("file", "unknown")
            line_num = w.get("line", "?")
            rule = w.get("rule", "UNKNOWN")
            message = w.get("message", "No message provided")

            lines.append(
                f"    • {click.style(f'{file_name}:{line_num}', fg='white', bold=True)} "
                f"- [{click.style(rule, fg='yellow')}] {message}"
            )
        lines.append("")

    # Actionable suggestion
    lines.append(click.style("  → Fix violations or use --force to bypass validation", fg="cyan"))

    return "\n".join(lines)
