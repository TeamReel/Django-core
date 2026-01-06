"""
Constitutional Rule: Module README Existence (Article XI)

Validates that every Django app in src/ has a README.md file.
Per Constitution Article XI: "Every Django app in src/ MUST have README.md"
"""

from pathlib import Path
from typing import Any

from constitution_engine.core.interfaces import RuleProtocol
from constitution_engine.core.models import CheckResult, CheckStatus, RepositoryContext, Severity


class ModuleReadmeExistsRule:
    """Ensures every Django app in src/ has README.md (Constitution Article XI)."""

    def __init__(self, config: dict[str, Any] | None = None):
        self.config = config or {}
        self.check_directories = self.config.get("check_directories", ["src/"])
        self.exclude_patterns = self.config.get(
            "exclude_patterns",
            ["__pycache__", "*.egg-info", "htmlcov", "coverage.json", "db.sqlite3"],
        )

    @property
    def identifier(self) -> str:
        return "module-readme-exists"

    @property
    def description(self) -> str:
        return "Every Django app in src/ MUST have README.md (Constitution Article XI)"

    @property
    def severity(self) -> Severity:
        return Severity.HIGH

    def check(self, context: RepositoryContext) -> CheckResult:
        """Check for missing README.md files in src/ modules."""
        repo_root = Path(context.root_path)
        missing_readmes: list[str] = []

        for check_dir in self.check_directories:
            src_path = repo_root / check_dir
            if not src_path.exists() or not src_path.is_dir():
                continue

            # Find all subdirectories in src/
            for module_dir in src_path.iterdir():
                if not module_dir.is_dir():
                    continue

                # Skip excluded patterns
                if any(
                    self._matches_pattern(module_dir.name, pattern)
                    for pattern in self.exclude_patterns
                ):
                    continue

                # Check if README.md exists
                readme_path = module_dir / "README.md"
                if not readme_path.exists():
                    relative_path = module_dir.relative_to(repo_root)
                    missing_readmes.append(str(relative_path))

        if missing_readmes:
            message = (
                f"Missing README.md in {len(missing_readmes)} module(s). "
                f"Constitution Article XI requires all Django apps to have README.md. "
                f"Use template: .github/templates/MODULE_README.md"
            )
            return CheckResult(
                rule_identifier=self.identifier,
                status=CheckStatus.FAIL,
                message=message,
                severity=self.severity,
                affected_paths=missing_readmes,
                details={
                    "missing_count": len(missing_readmes),
                    "missing_modules": missing_readmes,
                    "template_path": ".github/templates/MODULE_README.md",
                    "constitution_article": "Article XI - Documentation and Knowledge Sharing",
                },
            )

        return CheckResult(
            rule_identifier=self.identifier,
            status=CheckStatus.PASS,
            message=f"All modules in {', '.join(self.check_directories)} have README.md",
            severity=self.severity,
            details={
                "checked_directories": self.check_directories,
                "excluded_patterns": self.exclude_patterns,
            },
        )

    def _matches_pattern(self, name: str, pattern: str) -> bool:
        """Simple pattern matching (supports * wildcard)."""
        if "*" in pattern:
            # Simple wildcard matching
            pattern_parts = pattern.split("*")
            if len(pattern_parts) == 2:
                prefix, suffix = pattern_parts
                return name.startswith(prefix) and name.endswith(suffix)
        return name == pattern


# Entry point for plugin discovery
def get_rule() -> RuleProtocol:
    """Entry point for Constitutional Engine plugin system."""
    return ModuleReadmeExistsRule()
