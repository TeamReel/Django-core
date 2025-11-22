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
- `enabled` (bool): Whether rule is enabled by default

### Required Methods

- `execute(context, config) -> list[CheckResult]`: Execute rule logic

## Creating a Validator Plugin

Validators implement the `ValidatorProtocol` interface.

### Minimal Validator Example

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
            results: Check results from rules
            context: Repository information
            config: Engine configuration

        Returns:
            Additional check results or modified results
        """
        # Your validation logic here
        validated_results = []

        # Example: Filter out duplicate results
        seen = set()
        for result in results:
            key = (result.rule_id, result.message, result.file_path)
            if key not in seen:
                validated_results.append(result)
                seen.add(key)

        return validated_results
```

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

## Example: Complete Rule Plugin

See `src/constitution_engine/modules/python/builtin/no_disabled_security.py` for a complete example of a production-ready rule plugin.

## Support

For questions or issues:
1. Check logs in `constitution_engine.core.plugins` logger
2. Review test cases in `tests/constitution_engine/core/test_plugins.py`
3. Consult the core interfaces in `src/constitution_engine/core/interfaces.py`

---

**Last Updated**: 2025-11-22
**Engine Version**: 0.1.0 (WP03)
