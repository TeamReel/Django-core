"""
Constitutional rule: Required Test Structure (Article IV v1.2.0)

Validates that Django modules have proper test coverage according to Constitution requirements:
- Every src/ module MUST have a tests/ directory
- Required test files: test_models.py, test_api.py, test_serializers.py,
  test_permissions.py, test_managers.py
- Coverage thresholds: models ≥90%, API ≥85%, serializers ≥80%, permissions ≥90%, managers ≥85%
"""

import json
from pathlib import Path
from typing import Any, Dict, List

from constitution_engine.core.interfaces import CheckResult, RuleInterface


class RequiredTestStructureRule(RuleInterface):
    """Validates test structure compliance for Django modules."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.severity = config.get("severity", "high")
        self.required_test_files = [
            "test_models.py",
            "test_api.py",
            "test_serializers.py",
            "test_permissions.py",
            "test_managers.py",
        ]
        self.min_coverage_thresholds = {
            "models.py": 90,
            "managers.py": 85,
            "api/views.py": 85,
            "api/permissions.py": 90,
            "api/serializers.py": 80,
        }

    @property
    def identifier(self) -> str:
        return "required-test-structure"

    @property
    def description(self) -> str:
        return (
            "Validates Django modules have required test files and coverage"
            " (Constitution Article IV v1.2.0)"
        )

    def check(self, context: Dict[str, Any]) -> List[CheckResult]:
        """Check if modules have proper test structure."""
        results = []
        project_root = Path(context.get("project_root", "."))
        src_dir = project_root / "src"

        if not src_dir.exists():
            return results

        # Find all Django app modules (directories with models.py or apps.py)
        for app_dir in src_dir.iterdir():
            if not app_dir.is_dir() or app_dir.name.startswith("_"):
                continue

            # Skip config and non-app directories
            if app_dir.name in ["config", "common", "core"]:
                continue

            # Check if it's a Django app (has models.py or apps.py)
            if not (app_dir / "models.py").exists() and not (app_dir / "apps.py").exists():
                continue

            # Check for tests directory
            tests_dir = app_dir / "tests"
            if not tests_dir.exists():
                results.append(
                    CheckResult(
                        rule_id=self.identifier,
                        severity=self.severity,
                        message=(
                            f"Module '{app_dir.name}' missing tests/ directory"
                            " (Constitution Article IV)"
                        ),
                        file_path=str(app_dir),
                        line_number=None,
                        column_number=None,
                        suggestion=(
                            "Create tests/ directory with required test files: "
                            f"{', '.join(self.required_test_files)}"
                        ),
                    )
                )
                continue

            # Check for required test files
            missing_files = []
            for test_file in self.required_test_files:
                test_path = tests_dir / test_file
                if not test_path.exists():
                    missing_files.append(test_file)

            if missing_files:
                results.append(
                    CheckResult(
                        rule_id=self.identifier,
                        severity=self.severity,
                        message=(
                            f"Module '{app_dir.name}' missing required test files: "
                            f"{', '.join(missing_files)}"
                        ),
                        file_path=str(tests_dir),
                        line_number=None,
                        column_number=None,
                        suggestion=(
                            "Create missing test files according to"
                            " Constitution Article IV v1.2.0"
                        ),
                    )
                )

            # Check for coverage data if available
            coverage_file = project_root / "coverage.json"
            if coverage_file.exists():
                try:
                    with open(coverage_file) as f:
                        coverage_data = json.load(f)

                    # Check coverage for each file type
                    for file_pattern, min_coverage in self.min_coverage_thresholds.items():
                        # Find matching files in coverage data
                        app_pattern = f"src/{app_dir.name}/{file_pattern}"
                        for file_path, file_coverage in coverage_data.get("files", {}).items():
                            if app_pattern in file_path.replace("\\", "/"):
                                actual_coverage = file_coverage.get("summary", {}).get(
                                    "percent_covered", 0
                                )
                                if actual_coverage < min_coverage:
                                    results.append(
                                        CheckResult(
                                            rule_id=self.identifier,
                                            severity="medium",
                                            message=(
                                                f"Module '{app_dir.name}' {file_pattern}: "
                                                f"coverage {actual_coverage:.1f}% < {min_coverage}%"
                                                " (Constitution Article IV)"
                                            ),
                                            file_path=file_path,
                                            line_number=None,
                                            column_number=None,
                                            suggestion=(
                                                f"Increase test coverage to meet"
                                                f" {min_coverage}% threshold"
                                            ),
                                        )
                                    )
                except (json.JSONDecodeError, KeyError):
                    pass  # Coverage data malformed or missing, skip coverage checks

        return results


def create_rule(config: Dict[str, Any]) -> RuleInterface:
    """Factory function to create the rule instance."""
    return RequiredTestStructureRule(config)
