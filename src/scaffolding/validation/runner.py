"""
Constitutional validation subprocess runner.

Executes check_policy.py as subprocess and parses JSON validation reports.
"""

import json
import logging
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger(__name__)


class ValidationRunner:
    """
    Run constitutional validation via check_policy.py subprocess.

    Executes the constitutional enforcement engine as a subprocess,
    captures output, and parses JSON validation reports (ADR-022).
    """

    def __init__(self, check_policy_path: Path):
        """
        Initialize validation runner.

        Args:
            check_policy_path: Path to check_policy.py script

        Raises:
            FileNotFoundError: If check_policy.py not found at given path
        """
        if not check_policy_path.exists():
            raise FileNotFoundError(
                f"check_policy.py not found at {check_policy_path}. "
                "Ensure the constitutional enforcement engine is installed."
            )
        self.check_policy_path = check_policy_path

    def validate_directory(self, target_dir: Path) -> Dict[str, Any]:
        """
        Run constitutional validation on directory.

        Executes check_policy.py as subprocess with 60-second timeout,
        captures JSON output, and returns parsed validation report.

        Args:
            target_dir: Directory to validate (generated app/project)

        Returns:
            Validation report dict with keys:
            - 'passed': bool - Whether validation passed
            - 'violations': list - List of violation dicts with file/line/rule/message
            - 'warnings': list - List of warning dicts with file/line/rule/message
            - 'passed_checks': list - List of passed check rule IDs

        Raises:
            TimeoutError: If validation takes longer than 60 seconds
            subprocess.CalledProcessError: If subprocess fails to execute
        """
        logger.debug(
            f"Running constitutional validation on {target_dir} " f"using {self.check_policy_path}"
        )

        try:
            result = subprocess.run(
                [sys.executable, str(self.check_policy_path), str(target_dir)],
                capture_output=True,
                text=True,
                timeout=60,
                check=False,  # Don't raise on non-zero exit (validation failure)
            )

            if result.returncode == 0:
                # Validation passed
                logger.info("Constitutional validation passed")
                return {
                    "passed": True,
                    "violations": [],
                    "warnings": [],
                    "passed_checks": [],
                }
            else:
                # Validation failed, parse JSON report
                logger.warning(f"Constitutional validation failed (exit code {result.returncode})")
                try:
                    report = json.loads(result.stdout)

                    # Ensure all required keys exist with defaults
                    report.setdefault("passed", False)
                    report.setdefault("violations", [])
                    report.setdefault("warnings", [])
                    report.setdefault("passed_checks", [])

                    logger.debug(
                        f"Parsed validation report: "
                        f"{len(report['violations'])} violations, "
                        f"{len(report['warnings'])} warnings"
                    )

                    return report

                except json.JSONDecodeError as e:
                    # Fallback if JSON parsing fails
                    logger.error(f"Failed to parse validation JSON output: {e}")
                    return {
                        "passed": False,
                        "violations": [
                            {
                                "file": "unknown",
                                "line": 0,
                                "rule": "PARSE_ERROR",
                                "message": f"Validation failed: {result.stderr or 'Unknown error'}",
                            }
                        ],
                        "warnings": [],
                        "passed_checks": [],
                    }

        except subprocess.TimeoutExpired:
            logger.error("Constitutional validation timed out after 60 seconds")
            raise TimeoutError(
                "Constitutional validation timed out after 60 seconds. "
                "Use --no-validate to skip validation for large codebases."
            ) from None

        except Exception as e:
            logger.error(f"Unexpected error during validation: {e}")
            raise
