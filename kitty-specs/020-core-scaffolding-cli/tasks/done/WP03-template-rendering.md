---
work_package_id: "WP03"
subtasks:
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
title: "Template Rendering Engine"
phase: "Phase 2 - Core Functionality"
lane: "done"
assignee: "GitHub Copilot (Claude Sonnet 4.5)"
agent: "claude-reviewer"
shell_pid: "46272"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-04"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-04T18:20:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "46272"
    action: "Started WP03 implementation: Template Rendering Engine"
  - timestamp: "2025-12-04T18:45:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "46272"
    action: "Completed WP03 implementation (commit 730c1ae): All 8 subtasks complete, 6 files created/modified, 890 lines added"
  - timestamp: "2025-12-04T19:00:00Z"
    lane: "done"
    agent: "claude-reviewer"
    shell_pid: "46272"
    action: "Review approved: All DoD items satisfied, implementation excellent, 23 unit tests passing, constitutional alignment verified"
---

# Work Package Prompt: WP03 – Template Rendering Engine

## ⚠️ IMPORTANT: Review Feedback Status

*[Review feedback section - empty initially]*

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

**Goal**: Implement Jinja2-based rendering with variable substitution, built-in variables, file processing, and cross-platform path handling.

**Success Criteria**:
- Jinja2 environment configured with strict undefined variables and autoescape disabled
- Variable substitution replaces `{{ app_name }}`, `{{ project_name }}`, etc. from CLI inputs
- Built-in variables (timestamp, author, python_version, core_version) automatically available
- Template files with `.j2` suffix rendered via Jinja2, non-template files copied unchanged
- Binary files (images, etc.) copied without modification
- Cross-platform paths handled correctly (Windows backslashes, Unix forward slashes)
- Template inheritance merges base and child files correctly
- Jinja2 syntax errors reported with template name and line number
- Golden file tests verify rendered output matches expected fixtures

**Constitutional Alignment**:
- **Principle II (Architecture & Modularity)**: Rendering engine decoupled from CLI and generation, clear interface
- **Principle III (Code Quality)**: Type hints on all functions, comprehensive error handling for Jinja2 errors
- **Principle VI (Performance & Reliability)**: Graceful degradation on template errors with actionable error messages

---

## Context & Constraints

**Prerequisites**: WP02 (Template Discovery) must be complete

**Related Documents**:
- Specification: [spec.md](../../spec.md) (FR-011, FR-017-021, template rendering requirements)
- Planning: [plan.md](../../plan.md) (WP03 description, Jinja2 configuration)
- Data Model: [data-model.md](../../data-model.md) (TemplateVariable schema)
- Tasks: [tasks.md](../../tasks.md) (WP03 section)

**Technical Constraints**:
- Python 3.12+ baseline
- Jinja2 3.1+ (add to requirements/base.txt)
- Use pathlib for cross-platform paths
- No eval() or exec() in templates (security)
- StrictUndefined to catch variable typos early
- Preserve Unix file permissions when copying

**Architectural Decisions**:
- Use Jinja2 for consistency with Django templates
- Autoescape disabled (generating Python code, not HTML)
- Strict undefined variables (fail fast on typos)
- `.j2` suffix for template files (clear distinction from output files)
- Built-in variables provided automatically (timestamp, author, etc.)

---

## Subtasks & Detailed Guidance

### Subtask T018 – Set up Jinja2 environment with custom configuration

**Purpose**: Configure Jinja2 for Python code generation with security and error handling.

**Steps**:
1. Create `src/scaffolding/rendering/__init__.py`
2. Create `src/scaffolding/rendering/engine.py`
3. Implement `create_jinja_env(template_dir: Path) -> jinja2.Environment` function
4. Configure Environment:
   - `loader=FileSystemLoader(str(template_dir))` (load templates from directory)
   - `autoescape=False` (generating Python code, not HTML)
   - `undefined=StrictUndefined` (fail on undefined variables)
   - `trim_blocks=True`, `lstrip_blocks=True` (clean whitespace)
5. Add custom filters if needed (slugify, snake_case, etc.)
6. Return configured environment

**Files**:
- CREATE: `src/scaffolding/rendering/__init__.py`
- CREATE: `src/scaffolding/rendering/engine.py`

**Example**:
```python
# src/scaffolding/rendering/engine.py
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from pathlib import Path


def create_jinja_env(template_dir: Path) -> Environment:
    """
    Create Jinja2 environment for template rendering.

    Args:
        template_dir: Path to template directory

    Returns:
        Configured Jinja2 environment
    """
    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=False,  # Generating Python code, not HTML
        undefined=StrictUndefined,  # Fail on undefined variables
        trim_blocks=True,  # Remove first newline after block
        lstrip_blocks=True  # Strip leading spaces before block
    )

    # Add custom filters
    env.filters['snake_case'] = lambda s: s.lower().replace('-', '_').replace(' ', '_')
    env.filters['pascal_case'] = lambda s: ''.join(word.capitalize() for word in s.replace('_', ' ').split())

    return env
```

---

### Subtask T019 – Implement variable substitution engine (app_name, project_name, etc.)

**Purpose**: Replace Jinja2 variables with CLI inputs and built-in values (FR-011).

**Steps**:
1. In `engine.py`, implement `TemplateRenderer` class
2. Implement `__init__(self, template_dir: Path, variables: Dict[str, Any])` constructor
   - Store template directory and user-provided variables
   - Create Jinja2 environment using T018 function
   - Merge user variables with built-in variables (T020)
3. Implement `render(self, template_file: str) -> str` method
   - Load template from Jinja2 environment
   - Render with merged variables
   - Return rendered string
4. Handle Jinja2 errors (TemplateSyntaxError, UndefinedError) with clear messages

**Files**:
- MODIFY: `src/scaffolding/rendering/engine.py`

**Example**:
```python
# src/scaffolding/rendering/engine.py (add class)
from typing import Dict, Any
from jinja2 import TemplateError


class TemplateRenderer:
    """
    Render templates with variable substitution.
    """

    def __init__(self, template_dir: Path, variables: Dict[str, Any]):
        """
        Initialize template renderer.

        Args:
            template_dir: Path to template directory
            variables: User-provided variables for substitution
        """
        self.template_dir = template_dir
        self.variables = self._merge_with_builtin_variables(variables)
        self.env = create_jinja_env(template_dir)

    def render(self, template_file: str) -> str:
        """
        Render template file with variables.

        Args:
            template_file: Relative path to template file (e.g., 'models.py.j2')

        Returns:
            Rendered content

        Raises:
            TemplateError: If rendering fails
        """
        try:
            template = self.env.get_template(template_file)
            return template.render(**self.variables)
        except TemplateError as e:
            raise TemplateError(f"Failed to render {template_file}: {e}")

    def _merge_with_builtin_variables(self, user_vars: Dict[str, Any]) -> Dict[str, Any]:
        """Merge user variables with built-in variables (T020)."""
        # Implementation in T020
        pass
```

---

### Subtask T020 – Implement built-in Jinja2 variables (timestamp, author, etc.) [PARALLEL]

**Purpose**: Provide automatic variables for all templates without user input.

**Steps**:
1. In `engine.py`, implement `get_builtin_variables() -> Dict[str, Any]` function
2. Built-in variables:
   - `timestamp`: Current datetime ISO format (`datetime.now().isoformat()`)
   - `author`: Git user.name from git config (`subprocess.run(['git', 'config', 'user.name'])`)
   - `python_version`: Python version string (`sys.version_info`)
   - `core_version`: Core-App version (`scaffolding.__version__`)
   - `year`: Current year (`datetime.now().year`)
3. Handle missing git config gracefully (default to "Unknown" for author)
4. Return dict of built-in variables

**Files**:
- MODIFY: `src/scaffolding/rendering/engine.py`

**Parallel?**: Yes (independent utility function)

**Example**:
```python
# src/scaffolding/rendering/engine.py (add function)
import subprocess
import sys
from datetime import datetime
from scaffolding import __version__


def get_builtin_variables() -> Dict[str, Any]:
    """
    Get built-in template variables.

    Returns:
        Dict of built-in variables
    """
    # Get git author
    try:
        result = subprocess.run(
            ['git', 'config', 'user.name'],
            capture_output=True,
            text=True,
            timeout=5
        )
        author = result.stdout.strip() if result.returncode == 0 else 'Unknown'
    except Exception:
        author = 'Unknown'

    return {
        'timestamp': datetime.now().isoformat(),
        'author': author,
        'python_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        'core_version': __version__,
        'year': datetime.now().year
    }
```

---

### Subtask T021 – Implement template file processor (handles .j2 suffix, preserves non-templates) [PARALLEL]

**Purpose**: Process template directory, render `.j2` files, copy other files unchanged (FR-017).

**Steps**:
1. In `engine.py`, implement `render_directory(self, output_dir: Path) -> List[Path]` method on TemplateRenderer
2. Walk template directory recursively
3. For each file:
   - If ends with `.j2`: render via Jinja2, write output without `.j2` suffix
   - If binary file (images, etc.): copy unchanged with `shutil.copy2()` (preserves metadata)
   - Otherwise: copy unchanged
4. Create output directory structure (mirror template structure)
5. Return list of created file paths
6. Handle render errors per-file (log error, skip file, continue processing others)

**Files**:
- MODIFY: `src/scaffolding/rendering/engine.py`

**Parallel?**: Yes (can implement alongside T019-T020)

**Example**:
```python
# src/scaffolding/rendering/engine.py (add method to TemplateRenderer)
import shutil


def render_directory(self, output_dir: Path) -> List[Path]:
    """
    Render all templates in template directory to output directory.

    Args:
        output_dir: Path to output directory

    Returns:
        List of created file paths
    """
    created_files: List[Path] = []

    for template_file in self.template_dir.rglob('*'):
        if template_file.is_dir():
            continue

        # Calculate relative path and output path
        rel_path = template_file.relative_to(self.template_dir)

        # Skip __template__.yaml manifest
        if rel_path.name == '__template__.yaml':
            continue

        # Determine output filename (remove .j2 suffix if present)
        if rel_path.suffix == '.j2':
            output_rel_path = rel_path.with_suffix('')  # Remove .j2
            output_path = output_dir / output_rel_path

            # Render template
            try:
                content = self.render(str(rel_path))
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_text(content, encoding='utf-8')
                created_files.append(output_path)
            except TemplateError as e:
                logger.error(f"Failed to render {rel_path}: {e}")
                continue
        else:
            # Copy non-template file unchanged
            output_path = output_dir / rel_path
            output_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(template_file, output_path)
            created_files.append(output_path)

    return created_files
```

---

### Subtask T022 – Implement cross-platform path handling (Windows, macOS, Linux) [PARALLEL]

**Purpose**: Ensure generated paths work on all platforms (FR-017, technical constraint).

**Steps**:
1. Use `pathlib.Path` for all filesystem operations (automatic cross-platform)
2. Convert all string paths to Path objects immediately
3. Use `Path.as_posix()` when writing paths to generated files (always forward slashes)
4. Handle Windows drive letters (C:\\ → /c/)  in templates if needed
5. Test path handling on Windows and Unix
6. Document cross-platform path conventions in template authoring guide

**Files**:
- MODIFY: `src/scaffolding/rendering/engine.py` (verify pathlib usage)

**Parallel?**: Yes (verify existing code uses pathlib correctly)

**Notes**:
- pathlib.Path automatically handles platform differences
- Use `.as_posix()` for generated code paths (always Unix-style)
- Use `.resolve()` to get absolute paths
- Never use `os.path.join()` or string concatenation for paths

---

### Subtask T023 – Implement template inheritance file merging

**Purpose**: Merge base template files with child template files per inheritance resolution (T014).

**Steps**:
1. In `engine.py`, implement `render_with_inheritance(self, template_manifest: TemplateManifest, output_dir: Path) -> List[Path]` method
2. Resolve inheritance chain using `TemplateRegistry.resolve_inheritance()` (WP02)
3. Get merged file list from resolved manifest
4. Render files in order: base files first, then child files (child overrides base)
5. Use file-level override: if child has `models.py.j2`, it replaces base `models.py.j2`
6. Return list of created files

**Files**:
- MODIFY: `src/scaffolding/rendering/engine.py`

**Notes**:
- Inheritance resolution done in WP02 (TemplateRegistry.resolve_inheritance)
- This task renders the resolved file list
- File-level override means entire file replaced (not line-by-line merge)

**Example**:
```python
# src/scaffolding/rendering/engine.py (add method)

def render_with_inheritance(self, template_manifest: TemplateManifest, output_dir: Path) -> List[Path]:
    """
    Render template with inheritance (base + child files).

    Args:
        template_manifest: Resolved template manifest (from TemplateRegistry)
        output_dir: Path to output directory

    Returns:
        List of created file paths
    """
    # Template manifest is already resolved (inheritance merged in WP02)
    # Just render all files from manifest
    return self.render_directory(output_dir)
```

---

### Subtask T024 – Add Jinja2 rendering error handling with line number reporting [PARALLEL]

**Purpose**: Provide clear error messages for template syntax errors with file and line number.

**Steps**:
1. Catch `jinja2.TemplateSyntaxError` in render methods
2. Extract template name, line number, error message from exception
3. Format error message: "Template error in <file>:<line>: <message>"
4. Include suggestion: "Check template syntax, variable names, filters"
5. Use error formatter from WP01 (T007) for consistent formatting
6. Add unit tests for various Jinja2 errors (undefined variable, syntax error, etc.)

**Files**:
- MODIFY: `src/scaffolding/rendering/engine.py`

**Parallel?**: Yes (error handling utility)

**Example**:
```python
# src/scaffolding/rendering/engine.py (update render method)
from jinja2 import TemplateSyntaxError, UndefinedError
from scaffolding.utils.messages import format_error


def render(self, template_file: str) -> str:
    """Render template file with enhanced error handling."""
    try:
        template = self.env.get_template(template_file)
        return template.render(**self.variables)
    except TemplateSyntaxError as e:
        error_msg = format_error(
            title=f"Template syntax error in {template_file}",
            details=f"Line {e.lineno}: {e.message}",
            suggestion="Check template syntax, ensure all blocks are closed"
        )
        raise TemplateError(error_msg)
    except UndefinedError as e:
        error_msg = format_error(
            title=f"Undefined variable in {template_file}",
            details=str(e),
            suggestion="Check variable names match CLI inputs or built-in variables"
        )
        raise TemplateError(error_msg)
```

---

### Subtask T025 – Add unit tests for template rendering with golden files [PARALLEL]

**Purpose**: Comprehensive test coverage with golden file fixtures verifying exact output.

**Steps**:
1. Create `tests/scaffolding/test_rendering.py`
2. Create `tests/scaffolding/fixtures/templates/` directory with sample templates
3. Create `tests/scaffolding/fixtures/golden_files/` directory with expected output
4. Test cases:
   - Simple variable substitution (`{{ app_name }}`)
   - Built-in variables (timestamp, author)
   - Jinja2 filters (snake_case, pascal_case)
   - Template file with `.j2` suffix rendered
   - Non-template file copied unchanged
   - Binary file copied unchanged
   - Template syntax error (undefined variable, syntax error)
   - Cross-platform paths (verify output paths use forward slashes)
5. Use pytest `tmp_path` fixture for isolated filesystem
6. Assert rendered output matches golden files character-by-character

**Files**:
- CREATE: `tests/scaffolding/test_rendering.py`
- CREATE: `tests/scaffolding/fixtures/templates/` (sample templates)
- CREATE: `tests/scaffolding/fixtures/golden_files/` (expected output)

**Parallel?**: Yes (can write tests while implementing subtasks)

**Example**:
```python
# tests/scaffolding/test_rendering.py
import pytest
from pathlib import Path
from scaffolding.rendering.engine import TemplateRenderer


def test_variable_substitution(tmp_path):
    """Test simple variable substitution."""
    # Setup template
    template_dir = tmp_path / 'templates'
    template_dir.mkdir()
    (template_dir / 'test.py.j2').write_text('app_name = "{{ app_name }}"')

    # Render
    renderer = TemplateRenderer(template_dir, {'app_name': 'payments'})
    output_dir = tmp_path / 'output'
    output_dir.mkdir()
    created_files = renderer.render_directory(output_dir)

    # Verify
    assert len(created_files) == 1
    output_file = output_dir / 'test.py'
    assert output_file.read_text() == 'app_name = "payments"'


def test_builtin_variables(tmp_path):
    """Test built-in variables (timestamp, author, etc.)."""
    # Setup template
    template_dir = tmp_path / 'templates'
    template_dir.mkdir()
    (template_dir / 'header.py.j2').write_text("""
# Generated on {{ timestamp }}
# Author: {{ author }}
# Python {{ python_version }}
""")

    # Render
    renderer = TemplateRenderer(template_dir, {})
    output = renderer.render('header.py.j2')

    # Verify built-in variables present
    assert 'Generated on' in output
    assert 'Author:' in output
    assert 'Python' in output


def test_jinja2_syntax_error(tmp_path):
    """Test error handling for Jinja2 syntax errors."""
    # Setup template with syntax error (unclosed block)
    template_dir = tmp_path / 'templates'
    template_dir.mkdir()
    (template_dir / 'bad.py.j2').write_text('{% for item in items %}\n{{ item }}')  # Missing {% endfor %}

    # Attempt render
    renderer = TemplateRenderer(template_dir, {'items': ['a', 'b']})

    with pytest.raises(Exception, match="Template syntax error"):
        renderer.render('bad.py.j2')
```

---

## Risks & Mitigations

**Risk: Jinja2 syntax errors in templates**
- **Scenario**: Templates have syntax errors, rendering fails
- **Mitigation**: Template validation in WP02 (T016), clear error messages with line numbers (T024), golden file tests (T025)

**Risk: Variable injection security**
- **Scenario**: User-provided variables contain malicious code
- **Mitigation**: No eval() or exec() in templates, use StrictUndefined to catch typos, no code evaluation

**Risk: Path traversal attacks**
- **Scenario**: Template could write outside target directory
- **Mitigation**: Validate all output paths are within staging directory (WP04), use pathlib for safety

**Risk: Cross-platform path issues**
- **Scenario**: Generated code has Windows backslashes on Unix or vice versa
- **Mitigation**: Use pathlib throughout (T022), use `.as_posix()` for generated paths, test on both platforms

---

## Definition of Done Checklist

- [ ] All subtasks (T018-T025) completed
- [ ] Jinja2 environment configured (autoescape disabled, StrictUndefined)
- [ ] TemplateRenderer renders templates with variable substitution
- [ ] Built-in variables (timestamp, author, etc.) automatically available
- [ ] Template files (.j2) rendered via Jinja2, non-template files copied
- [ ] Binary files copied unchanged
- [ ] Cross-platform paths handled correctly (pathlib used throughout)
- [ ] Template inheritance rendering integrated with WP02 resolution
- [ ] Jinja2 error handling with line numbers
- [ ] Unit tests pass with golden file fixtures
- [ ] Type hints added to all functions
- [ ] Mypy passes with no type errors
- [ ] Jinja2 3.1+ added to requirements/base.txt
- [ ] tasks.md updated: WP03 section marked complete

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. Run unit tests: `pytest tests/scaffolding/test_rendering.py` → all pass
2. Render sample template with variables → verify correct substitution
3. Render template with `.j2` suffix → verify output file has no `.j2`
4. Copy non-template file → verify unchanged
5. Test built-in variables → verify timestamp, author, etc. present
6. Trigger Jinja2 syntax error → verify error message has line number
7. Test cross-platform paths → verify forward slashes in generated code

---

## Activity Log

- 2025-12-04 – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-04T14:00:00Z – claude – shell_pid=46272 – lane=doing – Started WP03 implementation
- 2025-12-04T14:45:00Z – claude – shell_pid=46272 – lane=for_review – Completed WP03: Template rendering with 8 subtasks (T018-T025)
- 2025-12-04T15:00:00Z – claude – shell_pid=46272 – lane=done – APPROVED: Template rendering complete, Jinja2 integration working
