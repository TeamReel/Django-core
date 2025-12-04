---
work_package_id: "WP05"
subtasks:
  - "T035"
  - "T036"
  - "T037"
  - "T038"
  - "T039"
  - "T040"
  - "T041"
title: "Constitutional Validation Integration"
phase: "Phase 2 - Core Functionality"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-04"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP05 – Constitutional Validation Integration

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

**Goal**: Integrate check_policy.py subprocess runner, parse validation reports, implement --validate/--force flags, and exit code mapping (ADR-022, US4).

**Success Criteria**:
- ValidationRunner executes check_policy.py as subprocess with timeout
- Validation report parser extracts violations, warnings, passed checks from JSON
- Validation error formatter displays user-friendly report with file paths and line numbers
- --validate/--no-validate flag controls validation execution (default: validate)
- --force flag bypasses validation failures, logs warning, proceeds with generation
- Exit code 3 returned on validation failure (CLI contract)
- Unit tests mock check_policy.py and verify report parsing
- Integration tests verify validation catches intentional violations

**Constitutional Alignment**:
- **Principle V (Security & Privacy)**: Constitutional validation ensures B03 security baseline
- **Principle VI (Performance & Reliability)**: Validation failures block non-compliant code
- **Principle VII (API Design)**: Validation at boundary, clear error messages

---

## Context & Constraints

**Prerequisites**: WP04 (Code Generation) must be complete

**Related Documents**:
- Specification: [spec.md](../../spec.md) (FR-033-040, US4)
- Planning: [plan.md](../../plan.md) (WP05 description)
- ADR-022: [docs/adr/ADR-022-constitutional-validation-integration.md](../../../../../docs/adr/ADR-022-constitutional-validation-integration.md) (post-generation validation)
- Tasks: [tasks.md](../../tasks.md) (WP05 section)

**Architectural Decisions** (ADR-022):
- **Validation Timing**: Post-generation, after atomic move (code is already on disk)
- **Validation Failure Handling**: Exit with code 3, display report, leave code in place
- **Force Flag**: --force bypasses validation, logs warning, exits with code 0
- **Report Format**: JSON output from check_policy.py parsed for display

**Technical Constraints**:
- check_policy.py must exist in project root (dependency from B02)
- Subprocess timeout: 60 seconds max
- JSON parsing for validation report
- Exit code 3 for validation failures (CLI contract)

---

## Subtasks & Detailed Guidance

### Subtask T035 – Implement check_policy.py subprocess runner

**Purpose**: Execute constitutional enforcement engine as subprocess (FR-033).

**Steps**:
1. Create `src/scaffolding/validation/__init__.py`
2. Create `src/scaffolding/validation/runner.py`
3. Implement `ValidationRunner` class with `__init__(self, check_policy_path: Path)`
4. Implement `validate_directory(self, target_dir: Path) -> Dict[str, Any]` method:
   - Run subprocess: `subprocess.run([sys.executable, check_policy_path, target_dir])`
   - Set timeout=60 seconds
   - Capture stdout/stderr
   - Parse JSON output if returncode != 0
   - Return validation report dict
5. Handle subprocess errors: timeout, missing script, non-zero exit

**Files**:
- CREATE: `src/scaffolding/validation/__init__.py`
- CREATE: `src/scaffolding/validation/runner.py`

**Example**:
```python
# src/scaffolding/validation/runner.py
import subprocess
import sys
import json
from pathlib import Path
from typing import Dict, Any


class ValidationRunner:
    """Run constitutional validation via check_policy.py subprocess."""
    
    def __init__(self, check_policy_path: Path):
        """
        Initialize validation runner.
        
        Args:
            check_policy_path: Path to check_policy.py script
        
        Raises:
            FileNotFoundError: If check_policy.py not found
        """
        if not check_policy_path.exists():
            raise FileNotFoundError(f"check_policy.py not found at {check_policy_path}")
        self.check_policy_path = check_policy_path
    
    def validate_directory(self, target_dir: Path) -> Dict[str, Any]:
        """
        Run constitutional validation on directory.
        
        Args:
            target_dir: Directory to validate
        
        Returns:
            Validation report dict with 'passed', 'violations', 'warnings' keys
        
        Raises:
            subprocess.TimeoutExpired: If validation takes >60s
            subprocess.CalledProcessError: If subprocess fails
        """
        try:
            result = subprocess.run(
                [sys.executable, str(self.check_policy_path), str(target_dir)],
                capture_output=True,
                text=True,
                timeout=60,
                check=False  # Don't raise on non-zero exit
            )
            
            if result.returncode == 0:
                # Validation passed
                return {
                    'passed': True,
                    'violations': [],
                    'warnings': []
                }
            else:
                # Validation failed, parse JSON report
                try:
                    report = json.loads(result.stdout)
                    return report
                except json.JSONDecodeError:
                    # Fallback if JSON parsing fails
                    return {
                        'passed': False,
                        'violations': [f"Validation failed: {result.stderr}"],
                        'warnings': []
                    }
        
        except subprocess.TimeoutExpired:
            raise TimeoutError("Constitutional validation timed out after 60 seconds")
```

---

### Subtask T036 – Implement validation report parser (JSON output from check_policy.py) [PARALLEL]

**Purpose**: Extract violations, warnings, passed checks from validation report (FR-039).

**Steps**:
1. In `runner.py`, enhance `validate_directory()` to parse JSON structure
2. Expected JSON format:
   ```json
   {
     "passed": false,
     "violations": [
       {"file": "models.py", "line": 10, "rule": "B03-001", "message": "Missing CSRF protection"}
     ],
     "warnings": [
       {"file": "views.py", "line": 25, "rule": "B04-002", "message": "Missing i18n marker"}
     ],
     "passed_checks": ["B01-001", "B01-002", "B03-002"]
   }
   ```
3. Return parsed dict with violations, warnings, passed_checks lists
4. Handle missing fields gracefully (default to empty lists)

**Files**:
- MODIFY: `src/scaffolding/validation/runner.py`

**Parallel?**: Yes (JSON parsing logic)

---

### Subtask T037 – Implement validation error formatter (user-friendly display) [PARALLEL]

**Purpose**: Format validation violations as clear, actionable report (FR-039).

**Steps**:
1. Create `src/scaffolding/validation/formatter.py`
2. Implement `format_validation_report(report: Dict[str, Any]) -> str` function
3. Format structure:
   - Header: "✗ Constitutional validation failed: X violations, Y warnings"
   - Violations section: "  • file:line - [rule] message" (red)
   - Warnings section: "  • file:line - [rule] message" (yellow)
   - Suggestion: "  → Fix violations or use --force to bypass" (cyan)
4. Use Click color codes from WP01 error formatter
5. Include file paths relative to project root

**Files**:
- CREATE: `src/scaffolding/validation/formatter.py`

**Parallel?**: Yes (formatting utility)

**Example**:
```python
# src/scaffolding/validation/formatter.py
import click
from typing import Dict, Any


def format_validation_report(report: Dict[str, Any]) -> str:
    """
    Format validation report for display.
    
    Args:
        report: Validation report dict
    
    Returns:
        Formatted report string
    """
    violations = report.get('violations', [])
    warnings = report.get('warnings', [])
    
    lines = []
    
    # Header
    violation_count = len(violations)
    warning_count = len(warnings)
    lines.append(click.style(
        f"✗ Constitutional validation failed: {violation_count} violations, {warning_count} warnings",
        fg='red', bold=True
    ))
    
    # Violations
    if violations:
        lines.append(click.style("  Violations:", fg='red'))
        for v in violations:
            file_loc = f"{v.get('file', 'unknown')}:{v.get('line', '?')}"
            rule = v.get('rule', 'UNKNOWN')
            message = v.get('message', 'No message')
            lines.append(f"    • {file_loc} - [{rule}] {message}")
    
    # Warnings
    if warnings:
        lines.append(click.style("  Warnings:", fg='yellow'))
        for w in warnings:
            file_loc = f"{w.get('file', 'unknown')}:{w.get('line', '?')}"
            rule = w.get('rule', 'UNKNOWN')
            message = w.get('message', 'No message')
            lines.append(f"    • {file_loc} - [{rule}] {message}")
    
    # Suggestion
    lines.append(click.style(
        "  → Fix violations or use --force to bypass validation",
        fg='cyan'
    ))
    
    return "\n".join(lines)
```

---

### Subtask T038 – Implement --validate / --no-validate flag behavior [PARALLEL]

**Purpose**: Control validation execution via CLI flag (FR-007).

**Steps**:
1. Flag already defined in WP01 T004 (`app` subcommand)
2. In `CodeGenerator.generate_app()`, check `validate` parameter
3. If `validate=False`, skip validation completely
4. If `validate=True` (default), run ValidationRunner
5. Document flag behavior in CLI help text

**Files**:
- MODIFY: `src/scaffolding/generation/generator.py`

**Parallel?**: Yes (flag integration)

**Example**:
```python
# src/scaffolding/generation/generator.py (update generate_app method)

def generate_app(self, name: str, template: str, project_root: Path, validate: bool = True) -> None:
    """Generate Django app with optional validation."""
    # ... existing code ...
    
    # Atomic move staging → target
    self._atomic_move(staging_dir, target_dir)
    
    # Validate if requested
    if validate:
        runner = ValidationRunner(project_root / 'check_policy.py')
        report = runner.validate_directory(target_dir)
        
        if not report['passed']:
            # Format and display violations
            from scaffolding.validation.formatter import format_validation_report
            error_msg = format_validation_report(report)
            click.echo(error_msg, err=True)
            
            # Exit with validation failure code
            raise ValidationFailure("Constitutional validation failed")
```

---

### Subtask T039 – Implement --force flag (bypass validation failures, ADR-022) [PARALLEL]

**Purpose**: Allow bypassing validation failures with warning (ADR-022).

**Steps**:
1. Add `--force` flag to `app` subcommand in WP01 CLI
2. In `CodeGenerator.generate_app()`, add `force: bool = False` parameter
3. If validation fails and `force=True`:
   - Log warning: "⚠ Validation failed but continuing due to --force flag"
   - Display violations (same as failure case)
   - Continue execution, exit with code 0 (success)
4. If validation fails and `force=False`:
   - Display violations
   - Exit with code 3 (validation failure)

**Files**:
- MODIFY: `src/scaffolding/cli.py` (add --force flag)
- MODIFY: `src/scaffolding/generation/generator.py`

**Parallel?**: Yes (flag integration)

**Example**:
```python
# src/scaffolding/cli.py (update app subcommand)

@scaffold.command()
@click.argument('name')
@click.option('--template', default='minimal')
@click.option('--validate/--no-validate', default=True)
@click.option('--force', is_flag=True, help='Bypass validation failures')
@click.pass_context
def app(ctx: click.Context, name: str, template: str, validate: bool, force: bool) -> None:
    """Generate new Django app/module."""
    exit_code = generate_app(
        name=name,
        template=template,
        validate=validate,
        force=force,
        interactive=ctx.obj['interactive'],
        verbose=ctx.obj['verbose']
    )
    ctx.exit(exit_code)
```

```python
# src/scaffolding/generation/generator.py (update validation logic)

if validate:
    runner = ValidationRunner(project_root / 'check_policy.py')
    report = runner.validate_directory(target_dir)
    
    if not report['passed']:
        # Format and display violations
        error_msg = format_validation_report(report)
        click.echo(error_msg, err=True)
        
        if force:
            # Warning but continue
            click.secho("⚠ Validation failed but continuing due to --force flag", fg='yellow')
        else:
            # Exit with validation failure
            raise ValidationFailure("Constitutional validation failed")
```

---

### Subtask T040 – Implement exit code mapping (validation failure → exit 3) [PARALLEL]

**Purpose**: Return correct exit code for validation failures (CLI contract).

**Steps**:
1. Create `ValidationFailure` exception in `generation/exceptions.py`
2. Raise `ValidationFailure` when validation fails and `force=False`
3. In CLI backend (WP01 `backend.py`), catch `ValidationFailure` and return `EXIT_VALIDATION_FAILURE` (3)
4. Update exit code constants from WP01 if needed

**Files**:
- MODIFY: `src/scaffolding/generation/exceptions.py`
- MODIFY: `src/scaffolding/backend.py` (WP01 backend)

**Parallel?**: Yes (exception handling)

**Example**:
```python
# src/scaffolding/generation/exceptions.py (add exception)

class ValidationFailure(Exception):
    """Raised when constitutional validation fails."""
    pass
```

```python
# src/scaffolding/backend.py (update generate_app function)
from scaffolding.generation.exceptions import ValidationFailure
from scaffolding.utils.exit_codes import EXIT_VALIDATION_FAILURE


def generate_app(name: str, template: str, validate: bool, force: bool, interactive: bool, verbose: bool) -> int:
    """Generate app with validation."""
    try:
        generator = CodeGenerator(renderer)
        generator.generate_app(name, template, project_root, validate, force)
        return EXIT_SUCCESS
    except ValidationFailure:
        return EXIT_VALIDATION_FAILURE
    except ConflictError as e:
        click.secho(str(e), fg='red', err=True)
        return EXIT_CONFLICT
    except Exception as e:
        click.secho(f"Generation failed: {e}", fg='red', err=True)
        return EXIT_SYSTEM_ERROR
```

---

### Subtask T041 – Add unit tests for validation integration with mock check_policy.py [PARALLEL]

**Purpose**: Test validation logic with mocked subprocess.

**Steps**:
1. Create `tests/scaffolding/test_validation.py`
2. Use `unittest.mock.patch` to mock `subprocess.run`
3. Test cases:
   - Validation passes: returncode=0 → report['passed']=True
   - Validation fails: returncode=1, JSON with violations → report parsed correctly
   - Validation timeout: TimeoutExpired raised → clear error
   - check_policy.py missing: FileNotFoundError raised
   - --force flag: validation fails but generation succeeds
   - --no-validate flag: validation skipped entirely
4. Verify exit codes correct for each scenario

**Files**:
- CREATE: `tests/scaffolding/test_validation.py`

**Parallel?**: Yes (can write tests while implementing)

**Example**:
```python
# tests/scaffolding/test_validation.py
import pytest
from unittest.mock import patch, MagicMock
from scaffolding.validation.runner import ValidationRunner


def test_validation_passes(tmp_path):
    """Test validation success."""
    check_policy = tmp_path / 'check_policy.py'
    check_policy.touch()
    
    runner = ValidationRunner(check_policy)
    
    # Mock subprocess returning success
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout='', stderr='')
        
        report = runner.validate_directory(tmp_path)
        
        assert report['passed'] is True
        assert len(report['violations']) == 0


def test_validation_fails_with_violations(tmp_path):
    """Test validation failure with violations."""
    check_policy = tmp_path / 'check_policy.py'
    check_policy.touch()
    
    runner = ValidationRunner(check_policy)
    
    # Mock subprocess returning failure with JSON
    mock_report = {
        "passed": False,
        "violations": [
            {"file": "models.py", "line": 10, "rule": "B03-001", "message": "Missing CSRF"}
        ],
        "warnings": []
    }
    
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout=json.dumps(mock_report),
            stderr=''
        )
        
        report = runner.validate_directory(tmp_path)
        
        assert report['passed'] is False
        assert len(report['violations']) == 1
        assert report['violations'][0]['rule'] == 'B03-001'


def test_validation_timeout(tmp_path):
    """Test validation timeout handling."""
    check_policy = tmp_path / 'check_policy.py'
    check_policy.touch()
    
    runner = ValidationRunner(check_policy)
    
    # Mock subprocess raising timeout
    with patch('subprocess.run') as mock_run:
        mock_run.side_effect = subprocess.TimeoutExpired('cmd', 60)
        
        with pytest.raises(TimeoutError, match="timed out"):
            runner.validate_directory(tmp_path)


def test_force_flag_bypasses_validation_failure(tmp_path):
    """Test --force flag allows generation despite validation failure."""
    # Setup project with validation failure
    # ... setup code ...
    
    # Generate with force=True
    generator = CodeGenerator(renderer)
    generator.generate_app('payments', 'minimal', project_root, validate=True, force=True)
    
    # Verify app created despite validation failure
    assert (project_root / 'src' / 'payments').exists()
```

---

## Risks & Mitigations

**Risk: False positives block legitimate code**
- **Scenario**: Overly strict validation rules reject valid patterns
- **Mitigation**: --force flag (ADR-022), iterative rule refinement, clear error messages

**Risk: check_policy.py not found**
- **Scenario**: Script missing or not in expected location
- **Mitigation**: Check script exists before validation, clear error with path suggestion

**Risk: Validation timeout**
- **Scenario**: Large codebases take too long to validate
- **Mitigation**: 60s timeout, suggest --no-validate for CI/CD if needed

**Risk: JSON parsing errors**
- **Scenario**: check_policy.py output format changes
- **Mitigation**: Fallback to stderr message if JSON parsing fails

---

## Definition of Done Checklist

- [ ] All subtasks (T035-T041) completed
- [ ] ValidationRunner executes check_policy.py as subprocess
- [ ] Validation report parser extracts violations/warnings from JSON
- [ ] Validation error formatter displays user-friendly report
- [ ] --validate/--no-validate flag controls execution
- [ ] --force flag bypasses failures with warning
- [ ] Exit code 3 returned on validation failure
- [ ] Exit code 0 with --force despite failures
- [ ] Unit tests mock check_policy.py and verify behavior
- [ ] Integration tests verify validation catches violations
- [ ] Type hints added to all functions
- [ ] Mypy passes with no type errors
- [ ] tasks.md updated: WP05 section marked complete

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. Run unit tests: `pytest tests/scaffolding/test_validation.py` → all pass
2. Generate app with validation → verify check_policy.py executed
3. Introduce violation in template → verify validation catches it
4. Test --force flag → verify generation succeeds with warning
5. Test --no-validate → verify validation skipped
6. Check exit codes → verify code 3 on validation failure
7. Test timeout → verify clear error after 60s

---

## Activity Log

- 2025-12-04 – system – lane=planned – Prompt created via /spec-kitty.tasks
