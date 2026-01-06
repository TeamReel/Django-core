# ADR-022: Constitutional Validation Integration

**Status**: Proposed
**Date**: 2025-12-04
**Feature**: B20 Core Scaffolding CLI
**Context**: Need to ensure generated code complies with Core-App constitutional principles without manual review

---

## Context

The Core Scaffolding CLI generates Django modules and projects from templates. Generated code must comply with Core-App constitutional principles:
- B01 Core Project Skeleton (directory structure, required files)
- B03 Core Security Baseline (no hardcoded secrets, secure defaults)
- B04 Core Internationalization (gettext markers for user-facing strings)
- Code quality (Ruff linting, type hints, no dead code)
- Testing structure (pytest patterns, test directories)

We need a validation mechanism that:
1. Ensures 100% constitutional compliance on first generation (success criterion SC-002)
2. Prevents non-compliant code from polluting projects
3. Provides clear, actionable feedback on violations
4. Allows explicit opt-out for advanced users (edge cases, experimentation)
5. Integrates with existing `check_policy.py` infrastructure (no duplication)

---

## Decision

Implement **post-generation validation with atomic rollback**:

### Validation Workflow

```
1. User invokes CLI (e.g., django-core-scaffold module payments)
2. Template discovered and rendered to STAGING directory (/tmp/scaffold-{uuid}/)
3. Constitutional validation runs on STAGED files
4. IF validation PASSES:
   - Atomically move staged files to target location
   - Show success message with next steps
   - Exit code 0
5. IF validation FAILS:
   - Delete staged directory (rollback)
   - Show structured violation report
   - Exit code 1 (CI/CD failure detection)
```

**Key Design Decision**: Generate to staging first, validate, then atomically move. Never write directly to project unless validation passes.

---

### Implementation Details

#### 1. Staging Directory

```python
import tempfile
import uuid

def create_staging_dir() -> Path:
    """Create temporary staging directory for generated code."""
    staging_id = uuid.uuid4().hex[:8]
    staging_dir = Path(tempfile.gettempdir()) / f"scaffold-{staging_id}"
    staging_dir.mkdir(parents=True, exist_ok=False)
    return staging_dir
```

**Rationale**:
- Isolated from project directory (no partial state on failure)
- Unique ID prevents collisions if multiple generations run concurrently
- System temp directory automatically cleaned up on reboot

#### 2. Code Generation

```python
def generate_to_staging(template: Template, variables: dict, staging_dir: Path) -> List[Path]:
    """Render all template files to staging directory."""
    generated_files = []

    for template_file in template.files:
        # Render Jinja2 template
        rendered_content = render_template(template_file, variables)

        # Write to staging
        target_path = staging_dir / template_file.relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(rendered_content)

        generated_files.append(target_path)

    return generated_files
```

**Rationale**: All files generated before validation runs. Ensures complete module structure for validation.

#### 3. Constitutional Validation

```python
import subprocess

def validate_code(staging_dir: Path) -> ValidationReport:
    """Run check_policy.py against staged code."""

    # Run constitutional enforcement engine
    result = subprocess.run(
        ["python", "check_policy.py", "--path", str(staging_dir), "--json"],
        capture_output=True,
        text=True,
        timeout=60  # Validation timeout: 1 minute
    )

    # Parse JSON output
    validation_data = json.loads(result.stdout)

    return ValidationReport(
        passed=result.returncode == 0,
        violations=parse_violations(validation_data),
        warnings=parse_warnings(validation_data),
        checks_run=validation_data.get("checks", []),
        execution_time=validation_data.get("execution_time", 0.0)
    )
```

**Validation Checks** (from `check_policy.py`):
- **B01 Structure**: Required directories exist (`tests/`, `migrations/`, `locale/`)
- **B03 Security**: No hardcoded secrets, secure defaults present
- **B04 i18n**: Gettext markers `_()` present in user-facing strings
- **Code Quality**: Ruff linting passes, no syntax errors
- **Type Hints**: Function signatures have type annotations
- **Testing**: Test files follow pytest patterns

**Rationale**: Reuse existing `check_policy.py` infrastructure. No duplicate validation logic.

#### 4. Atomic Move on Success

```python
import shutil

def atomically_move(staging_dir: Path, target_dir: Path):
    """Move staged files to target location atomically."""

    # Verify target doesn't exist (prevent overwrite without --force)
    if target_dir.exists():
        raise FileExistsError(f"Target directory already exists: {target_dir}")

    # Atomic move (rename operation)
    # On same filesystem, this is atomic. On different filesystems, falls back to copy+delete.
    shutil.move(str(staging_dir), str(target_dir))
```

**Rationale**:
- `shutil.move()` is atomic on same filesystem (rename syscall)
- Cross-filesystem fallback ensures portability
- All-or-nothing guarantee: either all files appear or none

#### 5. Rollback on Failure

```python
def rollback_staging(staging_dir: Path):
    """Delete staging directory on validation failure."""
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
```

**Rationale**: Clean up staging directory immediately on failure. Prevents orphaned temp files.

---

### Validation Report Format

```python
@dataclass
class ValidationReport:
    passed: bool
    violations: List[Violation]
    warnings: List[Warning]
    checks_run: List[str]
    execution_time: float

    def format_for_display(self) -> str:
        """Human-readable CLI output."""
        lines = ["", "Constitutional Validation Report", "=" * 40, ""]

        # Show check results
        for check in self.checks_run:
            status = "✅ PASS" if check not in [v.check for v in self.violations] else "❌ FAIL"
            lines.append(f"{status} {check}")

        lines.append("")

        # Show violations
        if self.violations:
            lines.append(f"Violations ({len(self.violations)}):")
            for v in self.violations:
                lines.append(f"  [{v.rule_id}] {v.message}")
                lines.append(f"    File: {v.file_path}")
                lines.append(f"    Line: {v.line_number}")
                lines.append(f"    Code: {v.code_snippet}")
                lines.append(f"    Fix:  {v.suggested_fix}")
                lines.append("")

        # Show result
        result = "✅ PASSED" if self.passed else "❌ FAILED"
        lines.append(f"Validation Result: {result}")

        if not self.passed:
            lines.append("Run with --force to bypass validation (not recommended)")

        return "\n".join(lines)
```

**Example Output**:

```
Constitutional Validation Report
========================================

✅ PASS B01 Structure
✅ PASS B03 Security
❌ FAIL B04 i18n
✅ PASS Code Quality
✅ PASS Testing

Violations (2):
  [B04-001] Missing gettext marker in user-facing string
    File: src/payments/models.py
    Line: 15
    Code: help_text="Payment amount"
    Fix:  help_text=_("Payment amount")

  [B04-002] Missing gettext marker in verbose_name
    File: src/payments/models.py
    Line: 18
    Code: verbose_name="Payment Status"
    Fix:  verbose_name=_("Payment Status")

Validation Result: ❌ FAILED
Run with --force to bypass validation (not recommended)
```

---

### Force Flag (Explicit Opt-Out)

```python
@click.option("--force", is_flag=True, help="Bypass validation (⚠️ generates non-compliant code)")
def module_command(app_name: str, force: bool, ...):
    # ... generate to staging ...

    if not force:
        report = validate_code(staging_dir)
        if not report.passed:
            click.echo(report.format_for_display())
            rollback_staging(staging_dir)
            sys.exit(1)
        else:
            click.echo("✅ Constitutional validation passed")
    else:
        click.secho("⚠️  WARNING: Skipping validation (--force flag)", fg="yellow")
        click.secho("⚠️  Generated code may not comply with Core-App standards", fg="yellow")

    # Move to target
    atomically_move(staging_dir, target_dir)
```

**Rationale**:
- Explicit opt-out requires intentional flag
- Warning message makes consequences clear
- Useful for experimentation, edge cases, prototyping

---

## Consequences

### Positive

✅ **Guarantees compliance**: No non-compliant code reaches project unless explicitly bypassed
✅ **Clean rollback**: Atomic move/rollback prevents partial state
✅ **Clear feedback**: Structured violation report shows exactly what to fix
✅ **Reuses infrastructure**: No duplicate validation logic (uses check_policy.py)
✅ **CI/CD friendly**: Exit code 1 on failure enables automated quality gates
✅ **Escape hatch**: `--force` flag for advanced users and edge cases

### Negative

⚠️ **Validation overhead**: Adds time to generation (typically <5 seconds for module)
⚠️ **Temporary disk usage**: Staging directory uses temp disk space
⚠️ **Coupling to check_policy.py**: CLI depends on external validation script

### Mitigation

- **Performance**: Validation runs in <5 seconds for typical module (acceptable per SC-001: <2 minutes total)
- **Disk usage**: Staging directory cleaned up immediately; uses system temp (auto-cleanup on reboot)
- **Coupling**: check_policy.py is Core-App infrastructure; stable interface

---

## Alternatives Considered

### Alternative 1: Pre-Generation Validation

**Description**: Validate template structure before rendering (check manifest, template syntax).

**Rejected Because**:
- Can't validate final rendered code (variable substitutions, conditional logic)
- Doesn't catch violations introduced by user-provided variables
- Partial validation gives false confidence

### Alternative 2: Post-Generation Validation Without Rollback

**Description**: Generate files directly to target, run validation, show report but leave files.

**Rejected Because**:
- Pollutes project with non-compliant code on failure
- Developer must manually delete files or fix violations
- Confusing state: files exist but shouldn't be used

### Alternative 3: Auto-Fix Violations

**Description**: When validation fails, attempt to automatically fix violations (e.g., add missing `_()` markers).

**Rejected Because**:
- Complex to implement reliably (AST manipulation, edge cases)
- Risk of incorrect fixes breaking code
- Hides problems instead of teaching correct patterns
- Out of scope for MVP

### Alternative 4: Hybrid Validation (Pre + Post)

**Description**: Validate template manifest before rendering, then validate generated code.

**Rejected Because**:
- Adds complexity without significant benefit
- Pre-validation catches only trivial issues (missing files)
- Post-validation is sufficient (catches all issues)

---

## Implementation Notes

### Exit Codes

```python
class ExitCode(Enum):
    SUCCESS = 0              # Generation succeeded, validation passed
    VALIDATION_FAILED = 1    # Constitutional validation failed
    INVALID_INPUT = 2        # Bad app name, missing args
    TEMPLATE_NOT_FOUND = 3   # Requested template doesn't exist
    FILE_CONFLICT = 4        # Target directory already exists
    DIR_EXISTS = 5           # Project init directory exists
```

**Rationale**: Distinct exit codes enable CI/CD scripts to differentiate failure types.

### Configuration

```yaml
# .scaffold.yaml
validation:
  enabled: true              # Enable validation (default: true)
  strict: false              # Fail on warnings, not just errors (default: false)
  timeout: 60                # Validation timeout in seconds (default: 60)
  rules:                     # Specific rules to check (default: all)
    - B01
    - B03
    - B04
```

### Environment Variables

```bash
# Disable validation by default (for rapid prototyping)
export SCAFFOLD_NO_VALIDATE=1

# Enable strict mode (fail on warnings)
export SCAFFOLD_STRICT_VALIDATION=1
```

---

## Testing Strategy

### Unit Tests

```python
def test_validation_passes_compliant_code():
    """Generated code passes all constitutional checks."""
    report = validate_code(staging_dir_with_compliant_code)
    assert report.passed
    assert len(report.violations) == 0

def test_validation_fails_noncompliant_code():
    """Non-compliant code fails validation."""
    report = validate_code(staging_dir_with_missing_i18n)
    assert not report.passed
    assert any(v.rule_id == "B04-001" for v in report.violations)

def test_atomic_move_success():
    """Staging directory moved atomically to target."""
    atomically_move(staging_dir, target_dir)
    assert target_dir.exists()
    assert not staging_dir.exists()

def test_rollback_on_failure():
    """Staging directory deleted on validation failure."""
    rollback_staging(staging_dir)
    assert not staging_dir.exists()
```

### Integration Tests

```python
def test_e2e_generation_with_validation():
    """End-to-end: generate → validate → move."""
    result = cli_runner.invoke(
        ["module", "payments", "--template", "api-first"]
    )
    assert result.exit_code == 0
    assert Path("src/payments").exists()

def test_e2e_validation_failure_rollback():
    """Validation failure rolls back generation."""
    # Use template with intentional violations
    result = cli_runner.invoke(
        ["module", "bad_app", "--template", "non_compliant"]
    )
    assert result.exit_code == 1
    assert not Path("src/bad_app").exists()  # Rolled back

def test_force_flag_bypasses_validation():
    """--force flag skips validation."""
    result = cli_runner.invoke(
        ["module", "experimental", "--template", "non_compliant", "--force"]
    )
    assert result.exit_code == 0
    assert Path("src/experimental").exists()  # Generated despite violations
```

---

## References

- Spec: [spec.md](../spec.md) - FR-033 to FR-040 (Constitutional Validation requirements)
- Research: [research.md](../research.md) - Q2: Constitutional Validation Integration
- Success Criteria: SC-002 (100% constitutional compliance on first generation)
- Constitutional Engine: `check_policy.py` (existing infrastructure)

---

**Decision Makers**: Planning phase architectural decisions
**Stakeholders**: Core-App developers, downstream product teams, DevOps engineers
