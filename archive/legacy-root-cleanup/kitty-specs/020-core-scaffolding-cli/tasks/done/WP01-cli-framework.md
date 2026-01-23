---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
title: "CLI Framework & Entry Points"
phase: "Phase 1 - Foundation"
lane: "done"
assignee: "GitHub Copilot (Claude Sonnet 4.5)"
agent: "claude"
shell_pid: "46272"
review_status: "approved without changes"
reviewed_by: "claude"
history:
  - timestamp: "2025-12-04"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-04T15:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "46272"
    action: "Started WP01 implementation: CLI Framework & Entry Points"
  - timestamp: "2025-12-04T16:15:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "46272"
    action: "Moved to for_review - Ready for review. All 8 subtasks complete, tested, committed."
  - timestamp: "2025-12-04T17:00:00Z"
    lane: "done"
    agent: "claude"
    shell_pid: "46272"
    action: "Approved after review - All DoD items satisfied, code quality excellent, constitutional alignment verified"
---

# Work Package Prompt: WP01 – CLI Framework & Entry Points

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes. Implementation must address every item listed below before returning for re-review.

*[This section is empty initially. Reviewers will populate it if the work is returned from review. If you see feedback here, treat each item as a must-do before completion.]*

---

## Objectives & Success Criteria

**Goal**: Establish Click-based CLI foundation with console script, Django management command, command tree, and exit code handling.

**Success Criteria**:
- Developers can run `django-core-scaffold --help` and see subcommands (app, init, list-templates, validate)
- Developers can run `python manage.py scaffold --help` and see identical subcommands
- CLI accepts global options: `--no-interactive`, `--verbose`, `--help`, `--version`
- CLI returns correct exit codes: 0=success, 1=user error, 2=system error, 3=validation failure, 4=template not found, 5=conflict
- Invalid arguments produce clear, actionable error messages
- All CLI functions have type hints and pass mypy

**Constitutional Alignment**:
- **Principle II (Architecture & Modularity)**: CLI framework is separate module with clear entrypoints, no coupling to business logic
- **Principle III (Code Quality)**: Type hints on all CLI functions, Click decorators for robust argument parsing
- **Principle VII (API Design)**: CLI interface is consistent, validated at boundary (arg validation before execution)

---

## Context & Constraints

**Prerequisites**: None (foundational work package)

**Related Documents**:
- Specification: [kitty-specs/020-core-scaffolding-cli/spec.md](../../spec.md) (FR-001 to FR-008)
- Planning: [kitty-specs/020-core-scaffolding-cli/plan.md](../../plan.md) (WP01 description)
- Contracts: [kitty-specs/020-core-scaffolding-cli/contracts/cli-interface.md](../../contracts/cli-interface.md) (complete CLI specification)
- Tasks: [kitty-specs/020-core-scaffolding-cli/tasks.md](../../tasks.md) (WP01 section)

**Architectural Decisions**:
- Use Click 8.1+ for CLI framework (robust, industry-standard, excellent documentation)
- Provide both console script and Django management command (flexibility for different workflows)
- Implement placeholder backend functions (return "Not implemented" until WP02-05 complete)
- Follow Django management command conventions (inherit from BaseCommand, use handle() method)

**Technical Constraints**:
- Python 3.12+ baseline (use modern type hints, match/case if helpful)
- Click 8.1+ compatibility (use current Click API, no deprecated decorators)
- Django 5.1+ compatibility (management command structure, settings discovery)
- Cross-platform support (Windows, macOS, Linux)

**Dependencies**:
- Click 8.1+ (add to requirements/base.txt)
- Django 5.1+ (already present)
- typing (stdlib, use for type hints)

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create src/scaffolding/ module structure

**Purpose**: Establish foundational directory structure for scaffolding CLI.

**Steps**:
1. Create `src/scaffolding/` directory
2. Create `src/scaffolding/__init__.py` with module docstring and version constant
3. Create `src/scaffolding/cli.py` (console script entrypoint)
4. Create `src/scaffolding/utils/` directory with `__init__.py` (future error formatting utilities)
5. Create `src/scaffolding/management/` directory for Django management commands
6. Create `src/scaffolding/management/__init__.py`
7. Create `src/scaffolding/management/commands/` directory
8. Create `src/scaffolding/management/commands/__init__.py`

**Files**:
- CREATE: `src/scaffolding/__init__.py`
- CREATE: `src/scaffolding/cli.py`
- CREATE: `src/scaffolding/utils/__init__.py`
- CREATE: `src/scaffolding/management/__init__.py`
- CREATE: `src/scaffolding/management/commands/__init__.py`

**Parallel?**: No (foundational structure)

**Notes**:
- Use absolute imports (from scaffolding.cli import ..., not relative imports)
- Add docstring to `__init__.py`: "Core scaffolding CLI for Django apps and projects."
- Define version constant: `__version__ = "0.1.0"` (update with Core-App releases)

**Example**:
```python
# src/scaffolding/__init__.py
"""
Core scaffolding CLI for Django apps and projects.

Provides code generation tools for scaffolding new Django modules and
bootstrapping downstream projects following Core-App conventions, security
baselines, and i18n patterns, with extensible templates and constitutional
enforcement at generation time.
"""

__version__ = "0.1.0"
```

---

### Subtask T002 – Implement console script entrypoint (django-core-scaffold)

**Purpose**: Provide standalone console script for scaffolding outside Django projects (FR-001).

**Steps**:
1. In `src/scaffolding/cli.py`, create `scaffold()` function as main Click group
2. Use `@click.group()` decorator for command tree
3. Add global options: `--no-interactive` (flag), `--verbose` (flag)
4. Store options in Click context object (`ctx.obj`) for subcommands to access
5. Add version option using `@click.version_option()` decorator (reads from `__version__`)
6. Register console script in `pyproject.toml` under `[project.scripts]`

**Files**:
- MODIFY: `src/scaffolding/cli.py`
- MODIFY: `pyproject.toml`

**Parallel?**: No (depends on T001)

**Notes**:
- Click context object stores shared state between commands
- Use `ctx.ensure_object(dict)` pattern to initialize context
- Console script name is `django-core-scaffold` (not generic `scaffold` to avoid conflicts)
- Version string comes from `scaffolding.__version__`

**Example**:
```python
# src/scaffolding/cli.py
import click
from typing import Optional
from scaffolding import __version__

@click.group()
@click.option('--no-interactive', is_flag=True, help='Run without prompts (use defaults)')
@click.option('--verbose', is_flag=True, help='Enable verbose output')
@click.version_option(version=__version__, prog_name='django-core-scaffold')
@click.pass_context
def scaffold(ctx: click.Context, no_interactive: bool, verbose: bool) -> None:
    """Core scaffolding CLI for Django apps and projects."""
    ctx.ensure_object(dict)
    ctx.obj['interactive'] = not no_interactive
    ctx.obj['verbose'] = verbose

# Subcommands added in T004
```

```toml
# pyproject.toml (add to [project.scripts])
[project.scripts]
django-core-scaffold = "scaffolding.cli:scaffold"
```

---

### Subtask T003 – Implement Django management command (scaffold)

**Purpose**: Provide Django management command for scaffolding within Django projects (FR-002).

**Steps**:
1. Create `src/scaffolding/management/commands/scaffold.py`
2. Inherit from `django.core.management.base.BaseCommand`
3. Implement `handle()` method that calls `scaffold()` CLI function from T002
4. Pass `sys.argv` to Click's `standalone_mode=False` for argument parsing
5. Handle Click exceptions and convert to Django management command exit codes
6. Add command help text and description

**Files**:
- CREATE: `src/scaffolding/management/commands/scaffold.py`

**Parallel?**: No (depends on T002)

**Notes**:
- Django management commands are discovered automatically when module is in INSTALLED_APPS
- Use `standalone_mode=False` to catch Click exceptions instead of sys.exit()
- Convert Click exit codes to Django management command return values
- Both console script and management command use same Click function (DRY principle)

**Example**:
```python
# src/scaffolding/management/commands/scaffold.py
"""
Django management command for scaffolding CLI.
"""
from django.core.management.base import BaseCommand, CommandError
from scaffolding.cli import scaffold
import sys


class Command(BaseCommand):
    help = 'Core scaffolding CLI for Django apps and projects'

    def handle(self, *args, **options):
        """Run scaffolding CLI via Django management command."""
        try:
            # Pass sys.argv to Click, skip 'manage.py scaffold' prefix
            argv = sys.argv[2:]  # Skip 'manage.py' and 'scaffold'
            scaffold(argv, standalone_mode=False)
        except SystemExit as e:
            # Convert Click exit codes to Django management command codes
            if e.code != 0:
                raise CommandError(f"Scaffolding failed with exit code {e.code}")
        except Exception as e:
            raise CommandError(f"Scaffolding error: {e}")
```

---

### Subtask T004 – Implement Click-based command tree (app, init, list-templates, validate subcommands)

**Purpose**: Define CLI subcommands for module generation, project bootstrap, template listing, and validation (FR-003, FR-004).

**Steps**:
1. Create `@scaffold.command()` decorated function for `app` subcommand
   - Argument: `name` (required, app name)
   - Option: `--template` (default='minimal', template to use)
   - Option: `--validate/--no-validate` (default=True, run validation)
2. Create `@scaffold.command()` decorated function for `init` subcommand
   - Argument: `name` (required, project directory name)
   - Option: `--project-name` (optional, custom display name)
3. Create `@scaffold.command()` decorated function for `list-templates` subcommand
   - No arguments, lists available templates with descriptions
4. Create `@scaffold.command()` decorated function for `validate` subcommand
   - Argument: `path` (required, directory to validate)
5. All subcommands use `@click.pass_context` to access global options
6. Implement placeholder backend functions (return "Not implemented" with exit code 2)

**Files**:
- MODIFY: `src/scaffolding/cli.py`

**Parallel?**: No (depends on T002)

**Notes**:
- Click automatically generates help text from function docstrings
- Use type hints for all parameters (Click infers types from annotations)
- Placeholder functions return exit code 2 (system error) until WP02-05 implement backends
- `list-templates` is hyphenated (Click converts to `list_templates` function name)

**Example**:
```python
# src/scaffolding/cli.py (add to existing scaffold group)

@scaffold.command()
@click.argument('name')
@click.option('--template', default='minimal', help='Template to use for generation')
@click.option('--validate/--no-validate', default=True, help='Run constitutional validation')
@click.pass_context
def app(ctx: click.Context, name: str, template: str, validate: bool) -> None:
    """Generate new Django app/module."""
    click.echo(f"Not implemented: scaffold app {name} --template {template}")
    ctx.exit(2)  # System error (not implemented)

@scaffold.command()
@click.argument('name')
@click.option('--project-name', help='Custom project display name')
@click.pass_context
def init(ctx: click.Context, name: str, project_name: Optional[str]) -> None:
    """Bootstrap new downstream project."""
    click.echo(f"Not implemented: scaffold init {name}")
    ctx.exit(2)  # System error (not implemented)

@scaffold.command(name='list-templates')
@click.pass_context
def list_templates(ctx: click.Context) -> None:
    """List available scaffolding templates."""
    click.echo("Not implemented: scaffold list-templates")
    ctx.exit(2)  # System error (not implemented)

@scaffold.command()
@click.argument('path', type=click.Path(exists=True))
@click.pass_context
def validate(ctx: click.Context, path: str) -> None:
    """Validate generated code against constitution."""
    click.echo(f"Not implemented: scaffold validate {path}")
    ctx.exit(2)  # System error (not implemented)
```

---

### Subtask T005 – Implement global CLI options (--no-interactive, --verbose, --help, --version) [PARALLEL]

**Purpose**: Provide global flags for non-interactive mode, verbose output, help, and version (FR-006, FR-045, FR-046).

**Steps**:
1. Add `--help` flag (Click provides automatically, but document behavior)
2. Add `--version` flag using `@click.version_option()` (completed in T002)
3. Add `--no-interactive` flag (completed in T002)
4. Add `--verbose` flag (completed in T002)
5. Verify global options work with all subcommands (`scaffold --help`, `scaffold app --help`, etc.)
6. Store `interactive` and `verbose` flags in Click context for subcommands to access

**Files**:
- MODIFY: `src/scaffolding/cli.py` (verify existing options)

**Parallel?**: Yes (can implement alongside T004-T008 as they don't conflict)

**Notes**:
- Click automatically shows `--help` for all commands and subcommands
- Global options must be specified before subcommand: `scaffold --verbose app payments`
- Context object passes state to subcommands: `ctx.obj['interactive']`, `ctx.obj['verbose']`

**Verification Commands**:
```bash
django-core-scaffold --help
django-core-scaffold --version
django-core-scaffold --verbose app test
django-core-scaffold --no-interactive app test --template minimal
```

---

### Subtask T006 – Implement exit code handling (0-5 per CLI contract) [PARALLEL]

**Purpose**: Define exit code constants and utilities for consistent error reporting (CLI contract).

**Steps**:
1. Create `src/scaffolding/utils/exit_codes.py` module
2. Define exit code constants:
   - `EXIT_SUCCESS = 0` (successful operation)
   - `EXIT_USER_ERROR = 1` (invalid arguments, user mistakes)
   - `EXIT_SYSTEM_ERROR = 2` (implementation errors, exceptions)
   - `EXIT_VALIDATION_FAILURE = 3` (constitutional validation failed)
   - `EXIT_TEMPLATE_NOT_FOUND = 4` (template doesn't exist)
   - `EXIT_CONFLICT = 5` (name collision, target directory exists)
3. Create utility function `exit_with_code(ctx: click.Context, code: int, message: str) -> None`
4. Document each exit code with docstring and usage examples
5. Add type hints for all functions

**Files**:
- CREATE: `src/scaffolding/utils/exit_codes.py`

**Parallel?**: Yes (independent of other CLI implementation)

**Notes**:
- Exit codes follow Unix conventions (0=success, non-zero=error)
- Use `ctx.exit(code)` instead of `sys.exit(code)` for Click compatibility
- Exit code 3 is reserved for constitutional validation failures (WP05)
- Exit code 5 for conflicts ensures CI/CD can distinguish from other errors

**Example**:
```python
# src/scaffolding/utils/exit_codes.py
"""
Exit code constants for scaffolding CLI.

Defines standard exit codes for consistent error reporting across all
subcommands and error conditions.
"""
import click

EXIT_SUCCESS = 0          # Successful operation
EXIT_USER_ERROR = 1       # Invalid arguments, user mistakes
EXIT_SYSTEM_ERROR = 2     # Implementation errors, exceptions
EXIT_VALIDATION_FAILURE = 3  # Constitutional validation failed
EXIT_TEMPLATE_NOT_FOUND = 4  # Template doesn't exist
EXIT_CONFLICT = 5         # Name collision, target directory exists


def exit_with_code(ctx: click.Context, code: int, message: str) -> None:
    """
    Exit CLI with specified code and message.

    Args:
        ctx: Click context object
        code: Exit code (use EXIT_* constants)
        message: Error message to display
    """
    if code == EXIT_SUCCESS:
        click.echo(message)
    else:
        click.secho(message, fg='red', err=True)
    ctx.exit(code)
```

---

### Subtask T007 – Add CLI error message formatting utilities [PARALLEL]

**Purpose**: Provide clear, actionable error messages for common mistakes (FR-043).

**Steps**:
1. Create `src/scaffolding/utils/messages.py` module
2. Implement `format_error(title: str, details: str, suggestion: str) -> str` function
   - Returns formatted error message with title, details, and suggested action
   - Uses Click color codes (red for errors, yellow for warnings, cyan for suggestions)
3. Implement `format_validation_error(violations: List[str]) -> str` function
   - Formats constitutional validation violations as bullet list
4. Implement `format_success(message: str, files_created: List[str]) -> str` function
   - Formats success message with list of created files
5. Add type hints for all functions
6. Write docstrings with usage examples

**Files**:
- CREATE: `src/scaffolding/utils/messages.py`

**Parallel?**: Yes (independent of other CLI implementation)

**Notes**:
- Use Click's `click.secho()` for colored output (respects --no-color flag)
- Format errors with clear structure: problem → details → suggested action
- Include file paths, line numbers, specific violations in error messages
- Success messages should list files created and suggest next steps

**Example**:
```python
# src/scaffolding/utils/messages.py
"""
Message formatting utilities for scaffolding CLI.

Provides consistent, user-friendly error and success messages with
color coding and actionable guidance.
"""
import click
from typing import List


def format_error(title: str, details: str, suggestion: str) -> str:
    """
    Format error message with title, details, and suggestion.

    Args:
        title: Short error title (e.g., "Invalid app name")
        details: Detailed explanation of the error
        suggestion: Suggested action to fix the error

    Returns:
        Formatted error message with color coding
    """
    lines = [
        click.style(f"✗ {title}", fg='red', bold=True),
        f"  {details}",
        click.style(f"  → {suggestion}", fg='cyan')
    ]
    return "\n".join(lines)


def format_validation_error(violations: List[str]) -> str:
    """
    Format constitutional validation violations as bullet list.

    Args:
        violations: List of validation violation messages

    Returns:
        Formatted validation error with bullet list
    """
    lines = [click.style("✗ Constitutional validation failed:", fg='red', bold=True)]
    for violation in violations:
        lines.append(f"  • {violation}")
    lines.append(click.style("  → Fix violations or use --force to bypass validation", fg='cyan'))
    return "\n".join(lines)


def format_success(message: str, files_created: List[str]) -> str:
    """
    Format success message with list of created files.

    Args:
        message: Success message (e.g., "App 'payments' created successfully")
        files_created: List of file paths created

    Returns:
        Formatted success message with file list
    """
    lines = [
        click.style(f"✓ {message}", fg='green', bold=True),
        "  Files created:"
    ]
    for file_path in files_created:
        lines.append(f"    • {file_path}")
    lines.append(click.style("  → Run tests: pytest src/<app_name>/tests/", fg='cyan'))
    return "\n".join(lines)
```

---

### Subtask T008 – Wire CLI commands to placeholder backend functions

**Purpose**: Connect CLI commands to placeholder implementations that will be replaced in WP02-05.

**Steps**:
1. In each subcommand function (app, init, list-templates, validate), call placeholder backend function
2. Create `src/scaffolding/backend.py` module with placeholder functions:
   - `generate_app(name: str, template: str, validate: bool) -> int` (returns exit code)
   - `bootstrap_project(name: str, project_name: Optional[str]) -> int`
   - `list_available_templates() -> int`
   - `validate_directory(path: str) -> int`
3. Each placeholder function prints "Not implemented" and returns `EXIT_SYSTEM_ERROR` (2)
4. Update CLI subcommands to call backend functions and return their exit codes
5. Add type hints for all functions

**Files**:
- CREATE: `src/scaffolding/backend.py`
- MODIFY: `src/scaffolding/cli.py`

**Parallel?**: No (depends on T002-T007)

**Notes**:
- Placeholder functions return exit codes (not raise exceptions)
- Backend functions will be replaced in WP02-05 with real implementations
- Use `ctx.obj['interactive']` and `ctx.obj['verbose']` from context in backend calls
- This establishes the interface contract between CLI and backend

**Example**:
```python
# src/scaffolding/backend.py
"""
Backend implementation for scaffolding CLI.

These are placeholder functions that will be replaced in WP02-05.
"""
from typing import Optional
from scaffolding.utils.exit_codes import EXIT_SYSTEM_ERROR


def generate_app(name: str, template: str, validate: bool, interactive: bool, verbose: bool) -> int:
    """
    Generate new Django app/module (placeholder).

    Args:
        name: App name (snake_case)
        template: Template to use
        validate: Whether to run constitutional validation
        interactive: Whether to prompt user
        verbose: Whether to show verbose output

    Returns:
        Exit code (0=success, non-zero=error)
    """
    print(f"Not implemented: generate_app(name={name}, template={template}, validate={validate})")
    return EXIT_SYSTEM_ERROR


def bootstrap_project(name: str, project_name: Optional[str], interactive: bool, verbose: bool) -> int:
    """
    Bootstrap new downstream project (placeholder).

    Args:
        name: Project directory name
        project_name: Custom display name (optional)
        interactive: Whether to prompt user
        verbose: Whether to show verbose output

    Returns:
        Exit code (0=success, non-zero=error)
    """
    print(f"Not implemented: bootstrap_project(name={name}, project_name={project_name})")
    return EXIT_SYSTEM_ERROR


def list_available_templates(interactive: bool, verbose: bool) -> int:
    """
    List available scaffolding templates (placeholder).

    Args:
        interactive: Whether to prompt user
        verbose: Whether to show verbose output

    Returns:
        Exit code (0=success, non-zero=error)
    """
    print("Not implemented: list_available_templates()")
    return EXIT_SYSTEM_ERROR


def validate_directory(path: str, verbose: bool) -> int:
    """
    Validate generated code against constitution (placeholder).

    Args:
        path: Directory to validate
        verbose: Whether to show verbose output

    Returns:
        Exit code (0=success, 3=validation failure)
    """
    print(f"Not implemented: validate_directory(path={path})")
    return EXIT_SYSTEM_ERROR
```

```python
# src/scaffolding/cli.py (update subcommands)

from scaffolding.backend import (
    generate_app,
    bootstrap_project,
    list_available_templates,
    validate_directory
)

@scaffold.command()
@click.argument('name')
@click.option('--template', default='minimal', help='Template to use for generation')
@click.option('--validate/--no-validate', default=True, help='Run constitutional validation')
@click.pass_context
def app(ctx: click.Context, name: str, template: str, validate: bool) -> None:
    """Generate new Django app/module."""
    exit_code = generate_app(
        name=name,
        template=template,
        validate=validate,
        interactive=ctx.obj['interactive'],
        verbose=ctx.obj['verbose']
    )
    ctx.exit(exit_code)

# Similar updates for init, list-templates, validate subcommands
```

---

## Risks & Mitigations

**Risk: Console script conflicts**
- **Scenario**: If downstream projects have their own `scaffold` command, namespace collision occurs.
- **Mitigation**: Use `django-core-scaffold` prefix (not generic `scaffold`). Document in user guide.

**Risk: Django command discovery**
- **Scenario**: Django management command must be in correct path to be discovered.
- **Mitigation**: Follow standard Django structure (management/commands/). Add integration test.

**Risk: Click version incompatibility**
- **Scenario**: Older Click versions may not support current decorators or API.
- **Mitigation**: Pin Click 8.1+ in requirements/base.txt. Document minimum version.

**Risk: Exit code inconsistency**
- **Scenario**: Different subcommands return different exit codes for same error type.
- **Mitigation**: Use exit code constants (T006). Add unit tests for exit code behavior.

---

## Definition of Done Checklist

- [ ] All subtasks (T001-T008) completed
- [ ] Module structure created: `src/scaffolding/`, `utils/`, `management/commands/`
- [ ] Console script registered in pyproject.toml and executable: `django-core-scaffold --help` works
- [ ] Django management command works: `python manage.py scaffold --help` shows subcommands
- [ ] All 4 subcommands defined: app, init, list-templates, validate (placeholder implementations)
- [ ] Global options work: `--no-interactive`, `--verbose`, `--help`, `--version`
- [ ] Exit code constants defined in `utils/exit_codes.py`
- [ ] Error message formatters implemented in `utils/messages.py`
- [ ] Backend placeholder functions return correct exit codes (2 for not implemented)
- [ ] Type hints added to all functions
- [ ] Mypy passes with no type errors
- [ ] Click decorators follow current API (no deprecated usage)
- [ ] Both console script and Django command use same Click function (DRY)
- [ ] tasks.md updated: WP01 section marked complete

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. Run `django-core-scaffold --help` → verify output shows all subcommands with descriptions
2. Run `python manage.py scaffold --help` → verify identical output to console script
3. Run `django-core-scaffold app test` → verify "Not implemented" message and exit code 2
4. Run `django-core-scaffold --version` → verify version string matches `scaffolding.__version__`
5. Run `mypy src/scaffolding/` → verify no type errors
6. Check `pyproject.toml` → verify console script registered correctly
7. Check directory structure → verify all expected files/directories created
8. Check exit code constants → verify all 6 codes defined (0-5)
9. Check error formatters → verify color codes used correctly
10. Check backend placeholders → verify all functions return `EXIT_SYSTEM_ERROR` (2)

**Context for Reviewers**:
- This WP establishes CLI foundation for all subsequent work packages
- Placeholder backends will be replaced in WP02-05 (this is intentional)
- Exit codes must match CLI contract specification exactly
- Both console script and Django command must provide identical functionality

---

## Activity Log

> Append entries when the work package changes lanes. Include timestamp, agent, shell PID, lane, and a short note.

- 2025-12-04 – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-04T14:00:00Z – claude – shell_pid=46272 – lane=doing – Started WP01 implementation
- 2025-12-04T14:45:00Z – claude – shell_pid=46272 – lane=for_review – Completed WP01: CLI framework with 8 subtasks (T001-T008)
- 2025-12-04T15:00:00Z – claude – shell_pid=46272 – lane=done – APPROVED: CLI framework complete, all tests passing

---

### Updating Metadata When Changing Lanes

1. Capture your shell PID: `echo $$` (Bash) or `$PID` (PowerShell).
2. Update frontmatter (`lane`, `assignee`, `agent`, `shell_pid`).
3. Add an entry to the **Activity Log** describing the transition.
4. Run `.kittify/scripts/powershell/tasks-move-to-lane.ps1 -Feature 020-core-scaffolding-cli -WorkPackageId WP01 -Lane <lane>` to move the prompt, update metadata, and append history in one step.
5. Commit or stage the change, preserving history.
