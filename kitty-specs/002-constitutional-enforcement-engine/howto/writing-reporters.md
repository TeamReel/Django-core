# How to Write Custom Reporters

This guide explains how to create custom reporters for the Constitutional Enforcement Engine.

## Overview

Reporters format and output check results. They:
- Receive a list of `CheckResult` objects
- Format results for specific audiences/tools
- Handle output to files, console, or external systems
- Should not modify results (read-only)

## Reporter Interface

Reporters must implement the `ReporterProtocol`:

```python
from typing import Protocol
from constitution_engine.core.models import CheckResult, RepositoryContext

class ReporterProtocol(Protocol):
    """Protocol that all reporters must implement."""
    
    identifier: str          # Unique reporter ID
    description: str         # Human-readable description
    
    def report(
        self,
        results: list[CheckResult],
        context: RepositoryContext
    ) -> None:
        """Generate and output report."""
        ...
```

## Basic Reporter Example

```python
from constitution_engine.core.models import CheckResult, CheckStatus, RepositoryContext

class MarkdownReporter:
    """Reporter that generates Markdown format output."""
    
    identifier = "markdown"
    description = "Generates Markdown formatted reports"
    
    def __init__(self, output_path: str = "constitution-report.md"):
        """Initialize reporter with output configuration."""
        self.output_path = output_path
    
    def report(
        self,
        results: list[CheckResult],
        context: RepositoryContext
    ) -> None:
        """Generate Markdown report."""
        lines = []
        
        # Header
        lines.append("# Constitutional Enforcement Report")
        lines.append("")
        lines.append(f"**Repository:** `{context.root_path}`")
        if context.git_branch:
            lines.append(f"**Branch:** `{context.git_branch}`")
        if context.git_commit:
            lines.append(f"**Commit:** `{context.git_commit}`")
        lines.append("")
        
        # Summary
        summary = self._generate_summary(results)
        lines.append("## Summary")
        lines.append("")
        lines.append(f"- **Total Checks:** {summary['total']}")
        lines.append(f"- **Passed:** ✅ {summary['passed']}")
        lines.append(f"- **Failed:** ❌ {summary['failed']}")
        lines.append(f"- **Skipped:** ⏭️ {summary['skipped']}")
        lines.append(f"- **Errors:** ⚠️ {summary['errors']}")
        lines.append("")
        
        # Details
        lines.append("## Details")
        lines.append("")
        
        for result in results:
            if result.status != CheckStatus.PASS:
                lines.extend(self._format_result(result))
        
        # Write to file
        with open(self.output_path, "w") as f:
            f.write("\n".join(lines))
        
        print(f"Report written to: {self.output_path}")
    
    def _generate_summary(self, results: list[CheckResult]) -> dict:
        """Generate summary statistics."""
        return {
            "total": len(results),
            "passed": sum(1 for r in results if r.status == CheckStatus.PASS),
            "failed": sum(1 for r in results if r.status == CheckStatus.FAIL),
            "skipped": sum(1 for r in results if r.status == CheckStatus.SKIP),
            "errors": sum(1 for r in results if r.status == CheckStatus.ERROR),
        }
    
    def _format_result(self, result: CheckResult) -> list[str]:
        """Format a single result as Markdown."""
        lines = []
        
        # Status emoji
        emoji = {
            CheckStatus.PASS: "✅",
            CheckStatus.FAIL: "❌",
            CheckStatus.SKIP: "⏭️",
            CheckStatus.ERROR: "⚠️",
        }[result.status]
        
        lines.append(f"### {emoji} {result.rule_identifier}")
        lines.append("")
        lines.append(f"**Message:** {result.message}")
        lines.append(f"**Severity:** `{result.severity.value.upper()}`")
        
        if result.affected_paths:
            lines.append("")
            lines.append("**Affected Files:**")
            for path in result.affected_paths:
                lines.append(f"- `{path}`")
        
        if result.details:
            lines.append("")
            lines.append("<details>")
            lines.append("<summary>Additional Details</summary>")
            lines.append("")
            lines.append("```json")
            import json
            lines.append(json.dumps(result.details, indent=2))
            lines.append("```")
            lines.append("</details>")
        
        lines.append("")
        return lines
```

## Reporter Best Practices

### 1. Handle Empty Results

```python
def report(self, results: list[CheckResult], context: RepositoryContext) -> None:
    if not results:
        print("No results to report")
        return
    
    # Generate report
    ...
```

### 2. Make Output Configurable

```python
class ConfigurableReporter:
    def __init__(
        self,
        verbose: bool = False,
        include_passed: bool = False,
        output_file: str | None = None
    ):
        self.verbose = verbose
        self.include_passed = include_passed
        self.output_file = output_file
```

### 3. Handle Write Errors

```python
def report(self, results, context):
    try:
        with open(self.output_file, "w") as f:
            f.write(self._format(results))
    except IOError as e:
        print(f"Error writing report: {e}", file=sys.stderr)
        # Fall back to console output
        print(self._format(results))
```

### 4. Provide Progress Feedback

```python
def report(self, results, context):
    print(f"Generating report for {len(results)} results...")
    
    # Generate report
    report_data = self._format(results)
    
    print(f"Report written to {self.output_file}")
```

## Built-in Reporters

### Console Reporter

Human-readable colored output:

```python
from constitution_engine.reporters import ConsoleReporter

reporter = ConsoleReporter(
    verbose=True,
    color=True
)
reporter.report(results, context)
```

### JSON Reporter

Machine-readable structured output:

```python
from constitution_engine.reporters import JSONReporter

reporter = JSONReporter(
    output_path="report.json",
    indent=2
)
reporter.report(results, context)
```

## Advanced Examples

### HTML Reporter

```python
class HTMLReporter:
    """Generates HTML report with styling."""
    
    identifier = "html"
    description = "Generates styled HTML reports"
    
    def report(self, results, context):
        html = self._generate_html(results, context)
        
        with open("constitution-report.html", "w") as f:
            f.write(html)
    
    def _generate_html(self, results, context):
        return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Constitution Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .pass {{ color: green; }}
        .fail {{ color: red; }}
        .error {{ color: orange; }}
        .skip {{ color: gray; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #4CAF50; color: white; }}
    </style>
</head>
<body>
    <h1>Constitutional Enforcement Report</h1>
    <p><strong>Repository:</strong> {context.root_path}</p>
    
    <h2>Results</h2>
    <table>
        <tr>
            <th>Rule</th>
            <th>Status</th>
            <th>Message</th>
            <th>Severity</th>
        </tr>
        {"".join(self._format_row(r) for r in results)}
    </table>
</body>
</html>
"""
    
    def _format_row(self, result):
        status_class = result.status.value
        return f"""
        <tr class="{status_class}">
            <td>{result.rule_identifier}</td>
            <td>{result.status.value.upper()}</td>
            <td>{result.message}</td>
            <td>{result.severity.value.upper()}</td>
        </tr>
"""
```

### SARIF Reporter

For integration with security tools:

```python
import json
from datetime import datetime

class SARIFReporter:
    """Generates SARIF format for security tools."""
    
    identifier = "sarif"
    description = "Generates SARIF 2.1.0 format output"
    
    def report(self, results, context):
        sarif = {
            "version": "2.1.0",
            "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
            "runs": [{
                "tool": {
                    "driver": {
                        "name": "Constitutional Enforcement Engine",
                        "version": "1.0.0",
                        "informationUri": "https://github.com/TeamReel/django-core"
                    }
                },
                "results": [self._to_sarif_result(r) for r in results if r.is_failure]
            }]
        }
        
        with open("constitution.sarif", "w") as f:
            json.dump(sarif, f, indent=2)
    
    def _to_sarif_result(self, result):
        return {
            "ruleId": result.rule_identifier,
            "message": {"text": result.message},
            "level": self._severity_to_level(result.severity),
            "locations": [
                {
                    "physicalLocation": {
                        "artifactLocation": {"uri": str(path)},
                    }
                }
                for path in result.affected_paths
            ]
        }
    
    def _severity_to_level(self, severity):
        mapping = {
            "low": "note",
            "medium": "warning",
            "high": "error",
            "critical": "error"
        }
        return mapping.get(severity.value, "warning")
```

## Testing Reporters

```python
import pytest
from constitution_engine.core.models import CheckResult, CheckStatus, RepositoryContext

def test_markdown_reporter():
    """Test Markdown reporter generates correct output."""
    reporter = MarkdownReporter(output_path="/tmp/test-report.md")
    
    results = [
        CheckResult(
            rule_identifier="test-rule",
            status=CheckStatus.FAIL,
            message="Test violation",
            severity=Severity.HIGH
        )
    ]
    
    context = RepositoryContext(root_path=Path("/tmp/test"))
    
    reporter.report(results, context)
    
    # Verify file was created
    assert Path("/tmp/test-report.md").exists()
    
    # Verify content
    content = Path("/tmp/test-report.md").read_text()
    assert "test-rule" in content
    assert "Test violation" in content
```

## Registering Reporters

```python
from constitution_engine.core.plugins import PluginRegistry

registry = PluginRegistry()
registry.register_reporter("markdown", MarkdownReporter())
```

## See Also

- [Writing Rules](./writing-rules.md)
- [Writing Validators](./writing-validators.md)
- [Main README](../../src/constitution_engine/README.md)
