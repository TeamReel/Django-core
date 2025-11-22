"""
JSON reporter for machine-readable output.

Provides structured JSON output for CI/CD systems and downstream tooling.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
)

__all__ = ["JsonReporter"]


class JsonReporter:
    """
    JSON reporter with structured machine-readable output.

    Emits a stable JSON schema suitable for parsing by CI/CD systems
    and downstream analysis tools.
    """

    name = "json"
    identifier = "json"

    def __init__(self, *, pretty: bool = True, include_metadata: bool = True):
        """
        Initialize JSON reporter.

        Args:
            pretty: Whether to pretty-print JSON output
            include_metadata: Whether to include repository metadata
        """
        self.pretty = pretty
        self.include_metadata = include_metadata

    def report(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> str:
        """
        Generate JSON-formatted report.

        Args:
            results: Check results to report
            context: Repository context
            config: Engine configuration

        Returns:
            JSON report string
        """
        report_data = {
            "version": "1.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "results": [self._serialize_result(r) for r in results],
            "summary": self._create_summary(results),
        }

        if self.include_metadata:
            report_data["metadata"] = self._create_metadata(context)

        if self.pretty:
            return json.dumps(report_data, indent=2, sort_keys=False)
        return json.dumps(report_data, sort_keys=False)

    def _serialize_result(self, result: CheckResult) -> dict[str, Any]:
        """
        Serialize a check result to JSON-serializable dict.

        Args:
            result: Check result to serialize

        Returns:
            Dictionary representation
        """
        return {
            "rule_identifier": result.rule_identifier,
            "status": result.status.value,
            "severity": result.severity.value,
            "message": result.message,
            "affected_paths": [p.as_posix() for p in result.affected_paths],
            "details": result.details,
        }

    def _create_summary(self, results: list[CheckResult]) -> dict[str, Any]:
        """
        Create summary statistics.

        Args:
            results: All check results

        Returns:
            Summary dictionary
        """
        total = len(results)
        passed = sum(1 for r in results if r.status == CheckStatus.PASS)
        failed = sum(1 for r in results if r.status == CheckStatus.FAIL)
        errors = sum(1 for r in results if r.status == CheckStatus.ERROR)
        skipped = sum(1 for r in results if r.status == CheckStatus.SKIP)

        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "skipped": skipped,
            "success": failed == 0 and errors == 0,
        }

    def _create_metadata(self, context: RepositoryContext) -> dict[str, Any]:
        """
        Create repository metadata.

        Args:
            context: Repository context

        Returns:
            Metadata dictionary
        """
        metadata: dict[str, Any] = {
            "repository": {
                "root_path": context.root_path.as_posix(),
            }
        }

        # Add git metadata if available
        if hasattr(context, "git_metadata") and context.git_metadata:
            git = context.git_metadata
            metadata["git"] = {
                "branch": getattr(git, "current_branch", None),
                "commit": getattr(git, "current_commit", None),
            }

        # Add language info if available
        if hasattr(context, "languages") and context.languages:
            metadata["languages"] = list(context.languages.keys())

        return metadata

    def write_output(self, report: str, output_path: Path | None = None) -> None:
        """
        Write JSON report to stdout or file.

        Args:
            report: JSON report string
            output_path: Optional file path (None = stdout)
        """
        if output_path:
            output_path.write_text(report, encoding="utf-8")
        else:
            sys.stdout.write(report + "\n")
