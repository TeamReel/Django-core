# How to Write Custom Rules

This guide explains how to create custom rules for the Constitutional Enforcement Engine.

## Overview

Rules are the core enforcement mechanism. They:
- Analyze a `RepositoryContext`
- Generate `CheckResult` objects
- Can run in parallel with other rules
- Should have no side effects

## Rule Interface

Rules must implement the `RuleProtocol`:

```python
from typing import Protocol
from constitution_engine.core.models import CheckResult, RepositoryContext

class RuleProtocol(Protocol):
    """Protocol that all rules must implement."""

    identifier: str          # Unique rule ID
    description: str         # Human-readable description
    severity: Severity      # Default severity level
    category: str           # Rule category
    enabled: bool           # Whether rule is active

    def execute(self, context: RepositoryContext) -> list[CheckResult]:
        """Execute the rule and return results."""
        ...
```

## Basic Rule Example

```python
from pathlib import Path
from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    RepositoryContext,
    Severity,
)

class NoHardcodedSecretsRule:
    """Rule that checks for hardcoded secrets."""

    identifier = "no-hardcoded-secrets"
    description = "Detects potential hardcoded secrets in source files"
    severity = Severity.CRITICAL
    category = "security"
    enabled = True

    # Patterns that might indicate secrets
    SECRET_PATTERNS = [
        "password = ",
        "api_key = ",
        "secret_key = ",
        "private_key = ",
    ]

    def execute(self, context: RepositoryContext) -> list[CheckResult]:
        """Scan files for hardcoded secrets."""
        results = []

        # Get all Python files
        python_files = self._find_python_files(context.root_path)

        for file_path in python_files:
            # Skip test files and migrations
            if "test" in str(file_path) or "migration" in str(file_path):
                continue

            violations = self._check_file(file_path)
            if violations:
                results.append(CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.FAIL,
                    message=f"Found {len(violations)} potential hardcoded secret(s)",
                    affected_paths=[file_path],
                    severity=self.severity,
                    details={"violations": violations}
                ))

        # If no violations found, return success
        if not results:
            results.append(CheckResult(
                rule_identifier=self.identifier,
                status=CheckStatus.PASS,
                message="No hardcoded secrets detected",
                severity=self.severity
            ))

        return results

    def _find_python_files(self, root_path: Path) -> list[Path]:
        """Find all Python files in the repository."""
        return list(root_path.rglob("*.py"))

    def _check_file(self, file_path: Path) -> list[dict]:
        """Check a single file for secret patterns."""
        violations = []

        try:
            content = file_path.read_text()
            for line_num, line in enumerate(content.splitlines(), 1):
                for pattern in self.SECRET_PATTERNS:
                    if pattern.lower() in line.lower():
                        violations.append({
                            "line": line_num,
                            "pattern": pattern,
                            "content": line.strip()[:80]  # First 80 chars
                        })
        except Exception as e:
            # Log error but don't fail the rule
            pass

        return violations
```

## Rule Best Practices

### 1. Always Return Results

Even if everything passes, return a success result:

```python
if not violations:
    return [CheckResult(
        rule_identifier=self.identifier,
        status=CheckStatus.PASS,
        message="All checks passed",
        severity=self.severity
    )]
```

### 2. Handle Errors Gracefully

Don't let exceptions crash the engine:

```python
def execute(self, context: RepositoryContext) -> list[CheckResult]:
    try:
        # Your rule logic
        return self._do_check(context)
    except Exception as e:
        return [CheckResult(
            rule_identifier=self.identifier,
            status=CheckStatus.ERROR,
            message=f"Rule execution failed: {e}",
            severity=Severity.HIGH
        )]
```

### 3. Use Filesystem Only

Never import application code:

```python
# ✅ Good: Read file content
content = file_path.read_text()
if "import django" in content:
    # analyze...

# ❌ Bad: Import the file
import sys
sys.path.insert(0, str(context.root_path))
import mymodule  # DON'T DO THIS
```

### 4. Make Rules Configurable

Accept configuration through metadata:

```python
class CoverageRule:
    """Rule that checks test coverage."""

    identifier = "test-coverage"
    description = "Enforces minimum test coverage"
    severity = Severity.ERROR
    category = "testing"
    enabled = True

    def __init__(self, threshold: int = 75):
        """Initialize rule with configuration."""
        self.threshold = threshold

    def execute(self, context: RepositoryContext) -> list[CheckResult]:
        coverage = self._measure_coverage(context)

        if coverage < self.threshold:
            return [CheckResult(
                rule_identifier=self.identifier,
                status=CheckStatus.FAIL,
                message=f"Coverage {coverage}% is below threshold {self.threshold}%",
                severity=self.severity,
                details={"coverage": coverage, "threshold": self.threshold}
            )]

        return [CheckResult(
            rule_identifier=self.identifier,
            status=CheckStatus.PASS,
            message=f"Coverage {coverage}% meets threshold {self.threshold}%",
            severity=self.severity
        )]
```

### 5. Provide Detailed Information

Include useful details in results:

```python
return [CheckResult(
    rule_identifier=self.identifier,
    status=CheckStatus.FAIL,
    message="Found 3 style violations",
    affected_paths=[Path("src/myfile.py")],
    severity=self.severity,
    details={
        "violations": [
            {"line": 42, "message": "Line too long"},
            {"line": 84, "message": "Missing docstring"},
            {"line": 127, "message": "Unused import"}
        ],
        "total_lines": 200,
        "violation_rate": 0.015
    }
)]
```

## Subprocess-Based Rules

For tools like mypy or ruff:

```python
import subprocess
from constitution_engine.core.models import CheckResult, CheckStatus

class MypyRule:
    """Rule that runs mypy type checker."""

    identifier = "mypy-check"
    description = "Runs mypy static type checker"
    severity = Severity.ERROR
    category = "quality"
    enabled = True

    def execute(self, context: RepositoryContext) -> list[CheckResult]:
        """Run mypy and parse results."""
        try:
            result = subprocess.run(
                ["mypy", str(context.root_path)],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode == 0:
                return [CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.PASS,
                    message="Mypy found no type errors",
                    severity=self.severity
                )]

            # Parse mypy output
            errors = self._parse_mypy_output(result.stdout)

            return [CheckResult(
                rule_identifier=self.identifier,
                status=CheckStatus.FAIL,
                message=f"Mypy found {len(errors)} type error(s)",
                severity=self.severity,
                details={"errors": errors, "output": result.stdout}
            )]

        except FileNotFoundError:
            return [CheckResult(
                rule_identifier=self.identifier,
                status=CheckStatus.SKIP,
                message="Mypy not installed",
                severity=self.severity
            )]
        except subprocess.TimeoutExpired:
            return [CheckResult(
                rule_identifier=self.identifier,
                status=CheckStatus.ERROR,
                message="Mypy execution timed out",
                severity=Severity.HIGH
            )]

    def _parse_mypy_output(self, output: str) -> list[dict]:
        """Parse mypy output into structured errors."""
        errors = []
        for line in output.splitlines():
            if ": error:" in line:
                # Parse format: "file.py:42: error: message"
                parts = line.split(":")
                if len(parts) >= 4:
                    errors.append({
                        "file": parts[0],
                        "line": int(parts[1]),
                        "message": ":".join(parts[3:]).strip()
                    })
        return errors
```

## Registering Rules

### Method 1: Plugin Registry

```python
from constitution_engine.core.plugins import PluginRegistry

registry = PluginRegistry()
registry.register_rule("my-rule", MyCustomRule())
```

### Method 2: Configuration File

Add to `.constitution.yaml`:

```yaml
version: "1.0"

rules:
  enabled:
    - my-custom-rule

  config:
    my-custom-rule:
      threshold: 80
      strict: true
```

### Method 3: Entry Points (Advanced)

In `pyproject.toml`:

```toml
[project.entry-points."constitution_engine.rules"]
my-rule = "mypackage.rules:MyCustomRule"
```

## Testing Rules

Always write tests for your rules:

```python
import pytest
from pathlib import Path
from constitution_engine.core.models import RepositoryContext, CheckStatus

def test_no_hardcoded_secrets_rule():
    """Test the no hardcoded secrets rule."""
    rule = NoHardcodedSecretsRule()

    # Create mock context
    context = RepositoryContext(
        root_path=Path("/tmp/test-repo"),
        detected_languages={"python"}
    )

    # Execute rule
    results = rule.execute(context)

    # Verify results
    assert len(results) > 0
    assert results[0].rule_identifier == "no-hardcoded-secrets"
    assert results[0].status in (CheckStatus.PASS, CheckStatus.FAIL)

def test_rule_handles_errors():
    """Test that rule handles errors gracefully."""
    rule = MyCustomRule()

    # Create context with nonexistent path
    context = RepositoryContext(
        root_path=Path("/nonexistent"),
        detected_languages={"python"}
    )

    # Should not raise exception
    results = rule.execute(context)
    assert len(results) > 0
```

## Advanced Topics

### Parallel-Safe Rules

Rules run in parallel by default. Ensure your rule is thread-safe:

```python
# ✅ Good: No shared state
class SafeRule:
    def execute(self, context):
        results = []  # Local variable
        # Process and return
        return results

# ❌ Bad: Shared mutable state
class UnsafeRule:
    def __init__(self):
        self.results = []  # Shared state!

    def execute(self, context):
        self.results.append(...)  # Race condition!
        return self.results
```

### Context-Aware Rules

Use the `RepositoryContext` to adapt behavior:

```python
def execute(self, context: RepositoryContext) -> list[CheckResult]:
    # Check if this is a Django project
    if "django" in context.tags:
        return self._check_django_specific(context)

    # Check detected languages
    if "python" in context.detected_languages:
        return self._check_python(context)

    # Skip if not applicable
    return [CheckResult(
        rule_identifier=self.identifier,
        status=CheckStatus.SKIP,
        message="Rule not applicable to this project type",
        severity=self.severity
    )]
```

### Using Git Information

```python
def execute(self, context: RepositoryContext) -> list[CheckResult]:
    # Check current branch
    if context.git_branch == "main":
        # Stricter checks on main branch
        self.severity = Severity.CRITICAL

    # Access commit info
    if context.git_commit:
        message = f"Checking commit {context.git_commit[:8]}"

    # Your rule logic here
    return results
```

## Examples

See the built-in rules for more examples:
- `src/constitution_engine/rules/builtins/` (when implemented)
- Test files in `tests/constitution_engine/core/test_rules.py`

## See Also

- [Writing Validators](./writing-validators.md)
- [Writing Reporters](./writing-reporters.md)
- [Writing Adapters](./writing-adapters.md)
- [Main README](../../src/constitution_engine/README.md)
