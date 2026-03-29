"""
Built-in rule: No Unpinned Production Dependencies

This rule ensures that production dependencies are properly pinned to specific versions.
"""

import re
from pathlib import Path

from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

__all__ = ["PinnedDependenciesRule"]


class PinnedDependenciesRule:
    """
    Constitutional rule: Production dependencies must be pinned.

    This rule checks requirements files and pyproject.toml for unpinned dependencies.
    """

    identifier = "no-unpinned-production-dependencies"
    description = "Ensures production dependencies are pinned to specific versions"
    enabled = True

    def execute(
        self,
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Check for unpinned dependencies.

        Args:
            context: Repository context
            config: Engine configuration

        Returns:
            List of check results
        """
        results = []

        # Check requirements files
        req_patterns = [
            "requirements.txt",
            "requirements/production.txt",
            "requirements/base.txt",
        ]

        for pattern in req_patterns:
            req_file = context.root_path / pattern
            if req_file.exists():
                results.extend(self._check_requirements_file(req_file))

        # Check pyproject.toml
        pyproject_file = context.root_path / "pyproject.toml"
        if pyproject_file.exists():
            results.extend(self._check_pyproject_toml(pyproject_file))

        # If no dependency files found, that's a warning
        if not results:
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.SKIP,
                    message="No dependency files found to check",
                    severity=Severity.WARNING,
                    details={},
                )
            )

        return results

    def _check_requirements_file(self, file_path: Path) -> list[CheckResult]:
        """Check a requirements file for unpinned dependencies."""
        results = []

        try:
            content = file_path.read_text()
            lines = content.split("\n")

            for line_num, line in enumerate(lines, 1):
                # Skip comments and empty lines
                line = line.strip()
                if not line or line.startswith("#"):
                    continue

                # Skip options like -r, -e, --extra-index-url
                if line.startswith("-"):
                    continue

                # Check if dependency is pinned (has ==, >=, <=, ~=, or @)
                if not any(op in line for op in ["==", ">=", "<=", "~=", "@"]):
                    # Extract package name (before any comparison operator)
                    package_name = re.split(r"[<>=!~]", line)[0].strip()

                    results.append(
                        CheckResult(
                            rule_identifier=self.identifier,
                            status=CheckStatus.FAIL,
                            message=f"Unpinned dependency: {package_name}",
                            severity=Severity.ERROR,
                            affected_paths=[file_path],
                            details={
                                "package": package_name,
                                "file": str(file_path.relative_to(file_path.parent.parent)),
                                "line": line_num,
                            },
                        )
                    )

        except Exception as e:
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.ERROR,
                    message=f"Failed to read {file_path.name}: {e}",
                    severity=Severity.ERROR,
                    affected_paths=[file_path],
                    details={},
                )
            )

        return results

    def _check_pyproject_toml(self, file_path: Path) -> list[CheckResult]:
        """Check pyproject.toml for unpinned dependencies."""
        results = []

        try:
            content = file_path.read_text()

            # Simple regex to find dependencies in
            # [project.dependencies] or [tool.poetry.dependencies]
            # This is a simplified check; a full implementation would parse TOML properly
            dependency_pattern = r'^["\']?([a-zA-Z0-9_-]+)["\']?\s*=\s*["\']([^"\']+)["\']'

            for line_num, line in enumerate(content.split("\n"), 1):
                line = line.strip()

                # Look for dependency declarations
                match = re.match(dependency_pattern, line)
                if match:
                    package_name = match.group(1)
                    version_spec = match.group(2)

                    # Check if version is pinned
                    if version_spec.startswith("^") or version_spec == "*":
                        msg = (
                            f"Unpinned dependency in pyproject.toml: "
                            f"{package_name} = {version_spec}"
                        )
                        results.append(
                            CheckResult(
                                rule_identifier=self.identifier,
                                status=CheckStatus.FAIL,
                                message=msg,
                                severity=Severity.ERROR,
                                affected_paths=[file_path],
                                details={
                                    "package": package_name,
                                    "version_spec": version_spec,
                                    "line": line_num,
                                },
                            )
                        )

        except Exception as e:
            results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.ERROR,
                    message=f"Failed to read pyproject.toml: {e}",
                    severity=Severity.ERROR,
                    affected_paths=[file_path],
                    details={},
                )
            )

        return results
