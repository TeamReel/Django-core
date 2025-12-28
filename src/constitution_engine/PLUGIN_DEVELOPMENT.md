# Plugin Development Guide

**Constitutional Enforcement Engine - Plugin System**

This guide explains how to develop, register, and use plugins for the Constitutional Enforcement Engine.

## Overview

The Constitutional Enforcement Engine uses a plugin architecture to discover and load:
- **Rules**: Check specific conditions in a repository
- **Validators**: Post-process results or perform workflow validation
- **Reporters**: Format and output check results
- **Modules**: Extended functionality and integrations

## Plugin Discovery

The engine discovers plugins through two mechanisms:

### 1. Built-in Plugins

Built-in plugins are automatically discovered from `src/constitution_engine/modules/python/builtin/`.

**Location**: `src/constitution_engine/modules/python/builtin/`

**Discovery Process**:
1. Engine scans all `.py` files in the builtin directory
2. Inspects classes for protocol compliance
3. Registers classes with `identifier` attribute

### 2. Entry Point Plugins (External)

External plugins can register via Python entry points in `pyproject.toml`.

**Example `pyproject.toml` declaration**:
```toml
[project.entry-points."constitution_engine.plugins"]
my_custom_rule = "my_package.rules:MyCustomRule"
my_validator = "my_package.validators:MyValidator"
```

**Security**: Only whitelisted modules can be loaded. Use `registry.add_to_whitelist(module_path)` to allow external plugins.

## Creating a Rule Plugin

Rules implement the `RuleProtocol` interface.

### Minimal Rule Example

```python
from constitution_engine.core.interfaces import RuleProtocol
from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

class MyCustomRule:
    """My custom rule description."""

    identifier = "my-custom-rule"
    description = "Checks something important"
    enabled = True

    def execute(
        self,
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Execute the rule logic.

        Args:
            context: Information about the repository
            config: Engine configuration

        Returns:
            List of check results
        """
        results = []

        # Your rule logic here
        if some_condition:
            results.append(
                CheckResult(
                    rule_id=self.identifier,
                    severity=Severity.ERROR,
                    message="Something is wrong",
                    file_path=None,
                    line_number=None,
                )
            )

        return results
```

### Required Attributes

- `identifier` (str): Unique rule ID (e.g., "no-secrets-in-code")
- `description` (str): Human-readable description

### CheckResult Model

**IMPORTANT**: Rules must return `CheckResult` objects with the correct fields:

```python
from constitution_engine.core.models import CheckResult, CheckStatus, Severity
from pathlib import Path

# Correct CheckResult usage
result = CheckResult(
    rule_identifier="my-rule-id",      # Required: string identifier
    status=CheckStatus.FAIL,            # Required: PASS, FAIL, SKIP, or ERROR
    message="Descriptive error message",# Required: string message
    affected_paths=[Path("file.py")],   # Required: list of Path objects (can be empty)
    severity=Severity.ERROR,            # Required: INFO, WARNING, ERROR, or CRITICAL
    details={"key": "value"},           # Required: dict for additional context (can be empty)
)
```

**Common Mistakes**:
- Using `identifier` instead of `rule_identifier`
- Using `location` instead of `affected_paths`
- Using `metadata` instead of `details`
- Forgetting to import and use `CheckStatus` enum

### Real-World Rule Examples

#### Example 1: Subprocess-Based Rule (mypy_rule.py)

```python
"""Constitutional rule enforcing mypy type checking."""

import subprocess
from pathlib import Path

from constitution_engine.core.interfaces import RuleProtocol
from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

class MypyRule:
    """Ensures all Python code passes mypy type checking."""

    identifier = "mypy-must-pass"
    description = "All Python code must pass mypy type checking"
    enabled = True

    def execute(
        self, context: RepositoryContext, config: ConfigurationProfile
    ) -> list[CheckResult]:
        """Run mypy and return results."""
        try:
            # Check if mypy is available
            subprocess.run(
                ["mypy", "--version"],
                capture_output=True,
                check=True,
                timeout=5,
            )
        except FileNotFoundError:
            return [
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.SKIP,
                    message="Mypy is not installed. Install with: pip install mypy",
                    affected_paths=[],
                    severity=Severity.INFO,
                    details={"reason": "tool_not_found"},
                )
            ]

        try:
            # Run mypy
            result = subprocess.run(
                ["mypy", str(context.root_path)],
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode == 0:
                return [
                    CheckResult(
                        rule_identifier=self.identifier,
                        status=CheckStatus.PASS,
                        message="Mypy type checking passed",
                        affected_paths=[],
                        severity=Severity.INFO,
                        details={"stdout": result.stdout},
                    )
                ]

            # Parse errors
            return [
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.FAIL,
                    message=f"Mypy type checking failed:\n{result.stdout}",
                    affected_paths=[],
                    severity=Severity.ERROR,
                    details={"stdout": result.stdout, "stderr": result.stderr},
                )
            ]

        except subprocess.TimeoutExpired:
            return [
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.ERROR,
                    message="Mypy execution timed out after 60 seconds",
                    affected_paths=[],
                    severity=Severity.ERROR,
                    details={"timeout": 60},
                )
            ]
```

**Key Lessons**:
- Use `CheckStatus.SKIP` when tool is unavailable
- Use `CheckStatus.ERROR` for execution failures
- Use `CheckStatus.FAIL` for violations
- Handle subprocess timeouts and errors
- Include diagnostic info in `details`

#### Example 2: File Parsing Rule (pinned_dependencies_rule.py)

```python
"""Constitutional rule ensuring production dependencies are pinned."""

import re
from pathlib import Path

from constitution_engine.core.interfaces import RuleProtocol
from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

class PinnedDependenciesRule:
    """Ensures production dependencies are pinned to specific versions."""

    identifier = "no-unpinned-production-dependencies"
    description = "Production dependencies must be pinned to specific versions"
    enabled = True

    def execute(
        self, context: RepositoryContext, config: ConfigurationProfile
    ) -> list[CheckResult]:
        """Check for unpinned dependencies."""
        results = []

        # Check requirements files
        req_files = [
            context.root_path / "requirements.txt",
            context.root_path / "requirements" / "production.txt",
            context.root_path / "requirements" / "base.txt",
        ]

        found_any = False
        for req_file in req_files:
            if req_file.exists():
                found_any = True
                results.extend(self._check_requirements_file(req_file))

        # Check pyproject.toml
        pyproject = context.root_path / "pyproject.toml"
        if pyproject.exists():
            found_any = True
            results.extend(self._check_pyproject(pyproject))

        if not found_any:
            return [
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.SKIP,
                    message="No dependency files found",
                    affected_paths=[],
                    severity=Severity.INFO,
                    details={},
                )
            ]

        if not results:
            # All dependencies are pinned
            return [
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.PASS,
                    message="All production dependencies are properly pinned",
                    affected_paths=[],
                    severity=Severity.INFO,
                    details={},
                )
            ]

        return results

    def _check_requirements_file(self, file_path: Path) -> list[CheckResult]:
        """Check a requirements.txt file for unpinned dependencies."""
        results = []
        content = file_path.read_text()

        for line_num, line in enumerate(content.splitlines(), start=1):
            line = line.strip()

            # Skip comments and empty lines
            if not line or line.startswith("#"):
                continue

            # Pattern: package_name==version
            if "==" not in line:
                results.append(
                    CheckResult(
                        rule_identifier=self.identifier,
                        status=CheckStatus.FAIL,
                        message=f"Unpinned dependency in {file_path.name}: {line}",
                        affected_paths=[file_path],
                        severity=Severity.ERROR,
                        details={
                            "file": str(file_path),
                            "line": line_num,
                            "dependency": line,
                        },
                    )
                )

        return results

    def _check_pyproject(self, file_path: Path) -> list[CheckResult]:
        """Check pyproject.toml for unpinned dependencies."""
        results = []
        content = file_path.read_text()

        # Look for caret (^) or wildcard (*) version specs
        unpinned_pattern = re.compile(r'["\'][\^*][\d\.]')

        for line_num, line in enumerate(content.splitlines(), start=1):
            if unpinned_pattern.search(line):
                results.append(
                    CheckResult(
                        rule_identifier=self.identifier,
                        status=CheckStatus.FAIL,
                        message=f"Unpinned dependency in pyproject.toml: {line.strip()}",
                        affected_paths=[file_path],
                        severity=Severity.ERROR,
                        details={
                            "file": str(file_path),
                            "line": line_num,
                            "content": line.strip(),
                        },
                    )
                )

        return results
```

**Key Lessons**:
- Multiple files can be checked in one rule
- Use `affected_paths` to indicate which files have issues
- Include file path and line number in `details`
- Return PASS result when all checks succeed
- Skip entire rule if no relevant files exist

- `enabled` (bool): Whether rule is enabled by default

### Required Methods

- `execute(context, config) -> list[CheckResult]`: Execute rule logic

## Creating a Validator Plugin

Validators implement the `ValidatorProtocol` interface. There are two types of validators:

1. **Pre-execution validators**: Run before rules to validate configuration
2. **Post-processing validators**: Run after rules to filter/modify results

### Validator Protocol

```python
from constitution_engine.core.interfaces import ValidatorProtocol
from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    RepositoryContext,
)

class MyCustomValidator:
    """My custom validator description."""

    identifier = "my-custom-validator"
    description = "Validates check results"

    def validate(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Validate results or perform additional checks.

        Args:
            results: Check results from rules (may be empty for pre-validators)
            context: Repository information
            config: Engine configuration

        Returns:
            List of check results (original + validation results for pre-validators,
            or modified/filtered results for post-processors)
        """
        # Your validation logic here
        return results
```

### Example 1: Pre-Execution Validator (workflow_validator.py)

```python
"""Pre-execution validator for workflow configuration."""

from constitution_engine.core.interfaces import ValidatorProtocol
from constitution_engine.core.models import (
    CheckResult,
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)

class WorkflowConfigValidator:
    """Validates workflow configuration before rule execution."""

    identifier = "workflow-config-validator"
    description = "Validates configuration before executing rules"

    def validate(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """Validate configuration and return validation results."""
        validation_results = []

        # Check 1: Ensure required constitutional rules are present
        required_rules = [
            "no-disabled-security-rules",
            "mypy-must-pass",
            "ruff-must-pass",
        ]

        for rule_id in required_rules:
            if rule_id not in config.enabled_rules:
                validation_results.append(
                    CheckResult(
                        rule_identifier=self.identifier,
                        status=CheckStatus.FAIL,
                        message=f"Required constitutional rule is not enabled: {rule_id}",
                        affected_paths=[],
                        severity=Severity.HIGH,
                        details={
                            "rule_id": rule_id,
                            "category": "missing_required_rule",
                        },
                    )
                )

        # Check 2: Detect duplicate rule IDs
        rule_counts = {}
        for rule_id in config.enabled_rules:
            rule_counts[rule_id] = rule_counts.get(rule_id, 0) + 1

        for rule_id, count in rule_counts.items():
            if count > 1:
                validation_results.append(
                    CheckResult(
                        rule_identifier=self.identifier,
                        status=CheckStatus.FAIL,
                        message=f"Duplicate rule ID in configuration: {rule_id} (appears {count} times)",
                        affected_paths=[],
                        severity=Severity.HIGH,
                        details={"rule_id": rule_id, "count": count},
                    )
                )

        if not validation_results:
            # Configuration is valid
            validation_results.append(
                CheckResult(
                    rule_identifier=self.identifier,
                    status=CheckStatus.PASS,
                    message="Workflow configuration is valid",
                    affected_paths=[],
                    severity=Severity.LOW,
                    details={"passed": True},
                )
            )

        # Append to existing results (which will be empty for pre-validators)
        return results + validation_results
```

**Key Lessons**:
- Pre-validators receive empty `results` list
- Return validation failures as CheckResults
- Engine checks for failures and may abort rule execution
- Include PASS result when validation succeeds

### Example 2: Post-Processing Validator (deduplicator.py)

```python
"""Post-processing validator for removing duplicate check results."""

from constitution_engine.core.interfaces import ValidatorProtocol
from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    RepositoryContext,
)

class DeduplicatorValidator:
    """Removes duplicate check results based on unique key."""

    identifier = "duplicate-deduplicator"
    description = "Removes duplicate check results"

    def validate(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """Remove duplicate results and return deduplicated list."""
        seen_keys = set()
        deduplicated = []

        for result in results:
            # Create unique key from result attributes
            key = self._make_result_key(result)

            if key not in seen_keys:
                seen_keys.add(key)
                deduplicated.append(result)

        return deduplicated

    def _make_result_key(self, result: CheckResult) -> tuple:
        """Create a unique key for a check result."""
        # Convert paths to strings for hashability
        path_strs = tuple(str(p) for p in result.affected_paths)

        return (
            result.rule_identifier,
            result.severity,
            result.message,
            path_strs,
        )
```

**Key Lessons**:
- Post-processors receive all results from rules and pre-validators
- Can modify, filter, or transform the results list
- Return the modified list (not results + new_results)
- Don't add validation results, just return processed results

### Validator Types in Engine Pipeline

The engine runs validators in two phases:

1. **Phase 0 (Pre-execution)**:
   - Runs validators with `identifier == "workflow-config-validator"`
   - Receives empty results list
   - If any failures, abort rule execution

2. **Phase 2 (Post-processing)**:
   - Runs all other validators
   - Receives results from rules + pre-validators
   - Each validator processes the output of the previous one

### Required Attributes

- `identifier` (str): Unique validator ID
- `description` (str): Human-readable description

### Required Methods

- `validate(results, context, config) -> list[CheckResult]`: Validation logic

## Creating a Reporter Plugin

Reporters implement the `ReporterProtocol` interface.

### Minimal Reporter Example

```python
from pathlib import Path
from typing import Optional

from constitution_engine.core.interfaces import ReporterProtocol
from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    RepositoryContext,
)

class MyCustomReporter:
    """My custom reporter description."""

    name = "my-custom-reporter"

    def report(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> str:
        """
        Generate a report from check results.

        Args:
            results: Check results to report
            context: Repository information
            config: Engine configuration

        Returns:
            Report string
        """
        lines = [
            f"=== Report for {context.root_path} ===",
            f"Total results: {len(results)}",
            ""
        ]

        for result in results:
            lines.append(f"[{result.severity.name}] {result.message}")

        return "\n".join(lines)

    def write_output(
        self,
        report: str,
        output_path: Optional[Path] = None,
    ) -> None:
        """
        Write report to file or stdout.

        Args:
            report: Report string to output
            output_path: Optional file path for output
        """
        if output_path:
            output_path.write_text(report)
        else:
            print(report)
```

### Required Attributes

- `name` (str): Reporter name (e.g., "console", "json")

### Required Methods

- `report(results, context, config) -> str`: Generate report
- `write_output(report, output_path)`: Output report

## Plugin Registration

### Automatic Registration (Built-in)

1. Create your plugin file in `src/constitution_engine/modules/python/builtin/`
2. Define your plugin class implementing the appropriate protocol
3. Add `identifier` attribute and required methods
4. Plugin will be auto-discovered on engine initialization

### Manual Registration

```python
from constitution_engine.core.plugins import (
    PluginMetadata,
    get_global_registry,
)

# Create metadata
metadata = PluginMetadata(
    identifier="my-rule",
    plugin_type="rule",
    module_path="my_package.rules",
    class_name="MyRule",
    description="My rule description",
    enabled=True,
    is_builtin=False,
)

# Register with global registry
registry = get_global_registry()
registry.register_rule(metadata)

# Whitelist if external
registry.add_to_whitelist("my_package.rules")
```

### Configuration-Based Selection

Enable specific plugins in your configuration file:

```yaml
rules:
  - identifier: my-custom-rule
    enabled: true
    parameters:
      threshold: 10

validators:
  - identifier: my-custom-validator
    enabled: true

reporters:
  - name: console
    enabled: true
  - name: json
    enabled: true
    parameters:
      output_file: "results.json"
```

## Plugin Metadata

All plugins are registered with metadata:

```python
@dataclass
class PluginMetadata:
    identifier: str          # Unique plugin ID
    plugin_type: str        # "rule", "validator", "reporter", "module"
    module_path: str        # Python module path
    class_name: str         # Class name within module
    description: str = ""   # Human-readable description
    enabled: bool = True    # Default enabled state
    is_builtin: bool = True # Whether it's a built-in plugin
    tags: list[str] = []    # Optional categorization tags
```

## Security & Safety

### Whitelist System

Only whitelisted modules can be loaded to prevent arbitrary code execution.

**Built-in modules**: Automatically whitelisted (all `constitution_engine.*` packages)

**External modules**: Must be explicitly whitelisted:

```python
registry = get_global_registry()
registry.add_to_whitelist("trusted_package.plugins")
```

### Constitutional Compliance

Plugins must not:
- Disable critical security rules
- Bypass constitutional requirements
- Leak sensitive information
- Execute untrusted code

## Testing Your Plugin

### Unit Test Template

```python
import pytest
from constitution_engine.core.models import (
    ConfigurationProfile,
    RepositoryContext,
    Severity,
)
from my_package.rules import MyCustomRule

def test_my_custom_rule():
    """Test the custom rule."""
    rule = MyCustomRule()

    # Create test context
    context = RepositoryContext(
        root_path=Path("/fake/repo"),
        files=[],
        languages={},
    )

    # Create test config
    config = ConfigurationProfile(
        enabled_rules=["my-custom-rule"],
    )

    # Execute rule
    results = rule.execute(context, config)

    # Assert results
    assert len(results) > 0
    assert results[0].severity == Severity.ERROR
```

### Integration Test Template

```python
def test_plugin_discovery_finds_my_rule():
    """Test that plugin discovery finds the custom rule."""
    from constitution_engine.core.plugins import (
        discover_builtin_plugins,
        get_global_registry,
    )

    registry = PluginRegistry()
    # Set as global for test
    import constitution_engine.core.plugins as plugins_module
    old_registry = plugins_module._global_registry
    plugins_module._global_registry = registry

    try:
        discover_builtin_plugins()
        rules = registry.list_rules()
        rule_ids = [r.identifier for r in rules]

        assert "my-custom-rule" in rule_ids
    finally:
        plugins_module._global_registry = old_registry
```

## Best Practices

1. **Single Responsibility**: Each rule checks one thing
2. **Clear Messages**: Provide actionable error messages
3. **Fail Fast**: Return early when checks pass
4. **Type Hints**: Use type hints for all parameters
5. **Logging**: Use `logger.debug()` for diagnostic information
6. **Documentation**: Document parameters and behavior
7. **Testing**: Include unit and integration tests
8. **Versioning**: Consider compatibility with engine versions

## Troubleshooting

### Plugin Not Discovered

- Check file is in correct directory (`modules/python/builtin/`)
- Verify class has `identifier` attribute
- Ensure class implements required protocol methods
- Check logs for discovery errors

### Plugin Not Loading

- Verify module is whitelisted
- Check for import errors in plugin module
- Ensure all dependencies are installed
- Review error logs for details

### Plugin Not Executing

- Confirm plugin is enabled in configuration
- Check `enabled_rules` list includes your rule
- Verify rule's `enabled` attribute is `True`
- Review engine logs for registration messages

## Advanced Topics

### Dynamic Plugin Loading

```python
from constitution_engine.core.plugins import discover_entry_point_plugins

# Discover plugins from entry points
discover_entry_point_plugins(group="constitution_engine.plugins")
```

### Custom Plugin Groups

```python
# Discover from custom entry point group
discover_entry_point_plugins(group="my_app.constitution_plugins")
```

### Plugin Caching

```python
# Clear cached plugin instances
registry = get_global_registry()
registry.clear_cache()
```

## Example Plugins

See the following for complete production-ready examples:
- **Rules**: `src/constitution_engine/modules/python/builtin/mypy_rule.py`
- **Rules**: `src/constitution_engine/modules/python/builtin/pinned_dependencies_rule.py`
- **Validators**: `src/constitution_engine/modules/python/builtin/workflow_validator.py`
- **Validators**: `src/constitution_engine/modules/python/builtin/deduplicator.py`

## Testing Your Plugins

### Unit Tests

```python
import pytest
from pathlib import Path
from constitution_engine.core.models import (
    CheckStatus,
    ConfigurationProfile,
    RepositoryContext,
)
from my_package.rules import MyRule

def test_my_rule_passes():
    """Test rule with passing condition."""
    rule = MyRule()
    context = RepositoryContext(root_path=Path("/tmp/test"))
    config = ConfigurationProfile()

    results = rule.execute(context, config)

    assert len(results) == 1
    assert results[0].status == CheckStatus.PASS

def test_my_rule_fails():
    """Test rule with failing condition."""
    rule = MyRule()
    context = RepositoryContext(root_path=Path("/tmp/test"))
    config = ConfigurationProfile()

    results = rule.execute(context, config)

    assert any(r.status == CheckStatus.FAIL for r in results)
```

### Integration Tests

```python
def test_plugin_discovery():
    """Test that plugin discovery finds the rule."""
    from constitution_engine.core.plugins import (
        discover_builtin_plugins,
        get_global_registry,
    )

    registry = get_global_registry()
    discover_builtin_plugins()

    rules = registry.list_rules()
    rule_ids = [r.identifier for r in rules]

    assert "my-rule-id" in rule_ids
```

## Support

For questions or issues:
1. Check logs in `constitution_engine.core.plugins` logger
2. Review test cases in `tests/constitution_engine/core/test_plugins.py`
3. Review test cases in `tests/constitution_engine/core/test_rules.py`
4. Review test cases in `tests/constitution_engine/core/test_validators.py`
5. Consult the core interfaces in `src/constitution_engine/core/interfaces.py`

---

**Last Updated**: 2025-11-22
**Engine Version**: 0.1.0 (WP04 - Rules & Validators)
