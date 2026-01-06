"""
Constitutional Rule: README Structure Validation (Article XI)

Validates that module README.md files contain all required sections.
Per Constitution Article XI: README must have specific structure.
"""

from pathlib import Path
from typing import Any

from constitution_engine.core.interfaces import RuleProtocol
from constitution_engine.core.models import CheckResult, CheckStatus, RepositoryContext, Severity


class ReadmeStructureRule:
    """Ensures README.md files have required sections (Constitution Article XI)."""

    def __init__(self, config: dict[str, Any] | None = None):
        self.config = config or {}
        self.required_sections = self.config.get(
            "required_sections",
            [
                "## Purpose",
                "## Scope",
                "## Key Components",
                "## Public Interface",
                "## Integration Example",
                "## Related Modules",
                "## Extension Points",
            ],
        )
        self.check_directories = self.config.get("check_directories", ["src/"])

    @property
    def identifier(self) -> str:
        return "readme-structure-valid"

    @property
    def description(self) -> str:
        return "README.md files must contain all required sections per Constitution Article XI"

    @property
    def severity(self) -> Severity:
        return Severity.MEDIUM

    def check(self, context: RepositoryContext) -> CheckResult:
        """Check README.md structure in all modules."""
        repo_root = Path(context.root_path)
        invalid_readmes: dict[str, list[str]] = {}

        for check_dir in self.check_directories:
            src_path = repo_root / check_dir
            if not src_path.exists() or not src_path.is_dir():
                continue

            # Find all README.md files
            for readme_path in src_path.rglob("README.md"):
                # Skip if in excluded directory
                if any(
                    part.startswith("__pycache__") or part.endswith(".egg-info")
                    for part in readme_path.parts
                ):
                    continue

                # Check sections
                missing_sections = self._check_readme_sections(readme_path)
                if missing_sections:
                    relative_path = readme_path.relative_to(repo_root)
                    invalid_readmes[str(relative_path)] = missing_sections

        if invalid_readmes:
            total_issues = sum(len(sections) for sections in invalid_readmes.values())
            message = (
                f"{len(invalid_readmes)} README(s) missing required sections "
                f"({total_issues} total missing sections). "
                f"Constitution Article XI requires specific README structure."
            )
            return CheckResult(
                rule_identifier=self.identifier,
                status=CheckStatus.FAIL,
                message=message,
                severity=self.severity,
                affected_paths=list(invalid_readmes.keys()),
                details={
                    "invalid_readmes": invalid_readmes,
                    "required_sections": self.required_sections,
                    "template_path": ".github/templates/MODULE_README.md",
                    "constitution_article": "Article XI - Documentation and Knowledge Sharing",
                },
            )

        return CheckResult(
            rule_identifier=self.identifier,
            status=CheckStatus.PASS,
            message="All README.md files have required sections",
            severity=self.severity,
            details={
                "required_sections": self.required_sections,
            },
        )

    def _check_readme_sections(self, readme_path: Path) -> list[str]:
        """Check if README has all required sections."""
        try:
            content = readme_path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            # If can't read, consider all sections missing
            return self.required_sections.copy()

        missing_sections = []
        for section in self.required_sections:
            # Check if section header exists (allowing for # variations)
            if section not in content:
                missing_sections.append(section)

        return missing_sections


# Entry point for plugin discovery
def get_rule() -> RuleProtocol:
    """Entry point for Constitutional Engine plugin system."""
    return ReadmeStructureRule()
