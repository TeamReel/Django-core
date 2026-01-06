"""
Constitutional Rule: Required Documentation Files (Article XI)

Validates that required documentation files exist per Constitution Article XI.
This includes extension guides, ADR index, and other mandatory documents.
"""

from pathlib import Path
from typing import Any

from constitution_engine.core.interfaces import RuleProtocol
from constitution_engine.core.models import CheckResult, CheckStatus, RepositoryContext, Severity


class RequiredDocsRule:
    """Ensures required documentation files exist (Constitution Article XI)."""

    def __init__(self, config: dict[str, Any] | None = None):
        self.config = config or {}
        self.required_files = self.config.get(
            "required_files",
            [
                {
                    "path": "documents/06-workflow/extending-core.md",
                    "description": "Extension Guide (how to build downstream products)",
                    "article": "Article XI Section 2",
                },
                {
                    "path": "documents/03-system/architecture-decisions.md",
                    "description": "ADR Index (architecture decision records)",
                    "article": "Article XI Section 3",
                },
                {
                    "path": ".github/templates/MODULE_README.md",
                    "description": "Module README template",
                    "article": "Article XI Section 1",
                },
            ],
        )

    @property
    def identifier(self) -> str:
        return "required-docs-exist"

    @property
    def description(self) -> str:
        return "Required documentation files MUST exist per Constitution Article XI"

    @property
    def severity(self) -> Severity:
        return Severity.HIGH

    def check(self, context: RepositoryContext) -> CheckResult:
        """Check for missing required documentation files."""
        repo_root = Path(context.root_path)
        missing_files: list[dict[str, str]] = []

        for file_spec in self.required_files:
            file_path = repo_root / file_spec["path"]
            if not file_path.exists():
                missing_files.append(file_spec)

        if missing_files:
            message = (
                f"Missing {len(missing_files)} required documentation file(s). "
                f"Constitution Article XI mandates these files exist."
            )
            affected_paths = [f["path"] for f in missing_files]

            return CheckResult(
                rule_identifier=self.identifier,
                status=CheckStatus.FAIL,
                message=message,
                severity=self.severity,
                affected_paths=affected_paths,
                details={
                    "missing_files": missing_files,
                    "constitution_article": "Article XI - Documentation and Knowledge Sharing",
                    "remediation": "Create missing files following constitution requirements",
                },
            )

        return CheckResult(
            rule_identifier=self.identifier,
            status=CheckStatus.PASS,
            message="All required documentation files exist",
            severity=self.severity,
            details={
                "checked_files": [f["path"] for f in self.required_files],
            },
        )


# Entry point for plugin discovery
def get_rule() -> RuleProtocol:
    """Entry point for Constitutional Engine plugin system."""
    return RequiredDocsRule()
