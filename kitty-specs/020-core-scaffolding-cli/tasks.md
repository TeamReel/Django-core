# B20: Core Scaffolding CLI - Task Breakdown
*Feature: kitty-specs/020-core-scaffolding-cli*
*Branch: 020-core-scaffolding-cli*
*Generated: 2025-12-04*

---

## Overview

This document breaks down B20 Core Scaffolding CLI into implementable work packages, derived from the specification (7 user stories, 46 functional requirements) and planning documents (8 planned work packages). Each work package is independently testable and aligns with constitutional principles.

**Feature Summary**: Code generation CLI for scaffolding Django modules and bootstrapping projects following Core-App standards with extensible templates and constitutional validation.

**Primary Success Criteria**:
- SC-001: Scaffold module in <2 minutes with 100% constitutional compliance
- SC-002: Bootstrap project in <5 minutes with working Django setup
- SC-003: 100% CI/CD automation success rate

**MVP Scope**: WP01-WP02 (CLI framework + template discovery) provide foundational platform. WP03-WP05 deliver core functionality. WP06-WP08 add polish and content.

---

## Work Package Summary

| ID | Title | Priority | Dependencies | Parallel-Safe | Estimated Days |
|----|-------|----------|--------------|---------------|----------------|
| WP01 | CLI Framework & Entry Points | P0 | None | No | 3-4 |
| WP02 | Template Discovery System | P0 | WP01 | No | 4-5 |
| WP03 | Template Rendering Engine | P1 | WP02 | No | 3-4 |
| WP04 | Code Generation & Atomic Rollback | P1 | WP03 | No | 6-8 |
| WP05 | Constitutional Validation Integration | P1 | WP04 | No | 3-4 |
| WP06 | Interactive UX & Prompts | P2 | WP04 | Partial | 2-3 |
| WP07 | Core Built-in Templates | P2 | WP03 | Yes | 5-6 |
| WP08 | Testing & Documentation | P3 | WP01-07 | Partial | 4-5 |

**Total Estimated Effort**: 30-40 days

---

## Subtask Index

All subtasks are listed here for quick reference. See work package sections below for detailed context, dependencies, and constitutional alignment.

| ID | Summary | Work Package | Priority | Parallel |
|----|---------|--------------|----------|----------|
| T001 | Create src/scaffolding/ module structure | WP01 | P0 | No |
| T002 | Implement console script entrypoint (django-core-scaffold) | WP01 | P0 | No |
| T003 | Implement Django management command (scaffold) | WP01 | P0 | No |
| T004 | Implement Click-based command tree (app, init, list-templates, validate subcommands) | WP01 | P0 | No |
| T005 | Implement global CLI options (--no-interactive, --verbose, --help, --version) | WP01 | P0 | [P] |
| T006 | Implement exit code handling (0-5 per CLI contract) | WP01 | P0 | [P] |
| T007 | Add CLI error message formatting utilities | WP01 | P0 | [P] |
| T008 | Wire CLI commands to placeholder backend functions | WP01 | P0 | No |
| T009 | Create TemplateRegistry class with singleton pattern | WP02 | P0 | No |
| T010 | Implement hybrid discovery strategy (ADR-021 precedence order) | WP02 | P0 | No |
| T011 | Implement filesystem template loader (scans directories) | WP02 | P0 | [P] |
| T012 | Implement plugin package loader (importlib.metadata discovery) | WP02 | P0 | [P] |
| T013 | Implement YAML manifest parser (TemplateManifest schema) | WP02 | P0 | [P] |
| T014 | Implement template inheritance resolver (max depth 2, ADR-021) | WP02 | P0 | No |
| T015 | Implement template conflict detection (custom overrides Core with warning) | WP02 | P0 | [P] |
| T016 | Implement template validation (manifest schema compliance) | WP02 | P0 | [P] |
| T017 | Add unit tests for TemplateRegistry with mock filesystem | WP02 | P0 | [P] |
| T018 | Set up Jinja2 environment with custom configuration | WP03 | P1 | No |
| T019 | Implement variable substitution engine (app_name, project_name, etc.) | WP03 | P1 | No |
| T020 | Implement built-in Jinja2 variables (timestamp, author, python_version) | WP03 | P1 | [P] |
| T021 | Implement template file processor (handles .j2 suffix, preserves non-templates) | WP03 | P1 | [P] |
| T022 | Implement cross-platform path handling (Windows, macOS, Linux) | WP03 | P1 | [P] |
| T023 | Implement template inheritance file merging | WP03 | P1 | No |
| T024 | Add Jinja2 rendering error handling with line number reporting | WP03 | P1 | [P] |
| T025 | Add unit tests for template rendering with golden files | WP03 | P1 | [P] |
| T026 | Implement staging directory creation (mkdtemp) | WP04 | P1 | No |
| T027 | Implement file builder (writes rendered templates to staging) | WP04 | P1 | No |
| T028 | Implement atomic move operation (staging → target with rollback) | WP04 | P1 | No |
| T029 | Implement rollback mechanism (cleanup staging on failure, ADR-022) | WP04 | P1 | No |
| T030 | Implement file permission preservation (chmod, metadata) | WP04 | P1 | [P] |
| T031 | Implement pre-generation conflict detection (existing directory check) | WP04 | P1 | [P] |
| T032 | Implement app name validation (Django naming conventions, FR-008) | WP04 | P1 | [P] |
| T033 | Implement project name validation and sanitization | WP04 | P1 | [P] |
| T034 | Add integration tests for code generation with rollback scenarios | WP04 | P1 | [P] |
| T026a | Create project bootstrap template with B01 skeleton + stable foundational apps (FR-027) | WP04 | P1 | No |
| T026b | Integrate B19 deployment templates into project bootstrap (FR-028) | WP04 | P1 | [P] |
| T035 | Implement check_policy.py subprocess runner | WP05 | P1 | No |
| T036 | Implement validation report parser (JSON output from check_policy.py) | WP05 | P1 | [P] |
| T037 | Implement validation error formatter (user-friendly display) | WP05 | P1 | [P] |
| T038 | Implement --validate / --no-validate flag behavior | WP05 | P1 | [P] |
| T039 | Implement --force flag (bypass validation failures, ADR-022) | WP05 | P1 | [P] |
| T040 | Implement exit code mapping (validation failure → exit 3) | WP05 | P1 | [P] |
| T041 | Add unit tests for validation integration with mock check_policy.py | WP05 | P1 | [P] |
| T042 | Implement TTY detection (sys.stdout.isatty()) | WP06 | P2 | [P] |
| T043 | Implement Click interactive prompts (template selection, app name) | WP06 | P2 | [P] |
| T044 | Implement auto-detection logic (interactive in terminal, non-interactive in CI) | WP06 | P2 | [P] |
| T045 | Implement progress indicators (file creation, validation running) | WP06 | P2 | [P] |
| T046 | Implement post-generation summary (files created, next steps) | WP06 | P2 | [P] |
| T047 | Add manual UX tests (interactive prompts, progress display) | WP06 | P2 | [P] |
| T048 | Create "minimal" template (models.py, apps.py, tests/) | WP07 | P2 | Yes |
| T049 | Create "api-first" template (extends minimal, adds DRF boilerplate) | WP07 | P2 | Yes |
| T050 | Create "service" template (extends minimal, adds service classes) | WP07 | P2 | Yes |
| T051 | Create "ui-backed" template (extends minimal, adds views/forms/templates) | WP07 | P2 | Yes |
| T052 | Add __template__.yaml manifest for each template | WP07 | P2 | [P] |
| T053 | Add golden file tests for all 4 templates (FR-018, FR-019) | WP07 | P2 | [P] |
| T054 | Validate templates pass Ruff, mypy, check_policy.py | WP07 | P2 | [P] |
| T055 | Write unit tests for CLI framework (WP01 coverage) | WP08 | P3 | [P] |
| T056 | Write unit tests for template discovery (WP02 coverage) | WP08 | P3 | [P] |
| T057 | Write unit tests for template rendering (WP03 coverage) | WP08 | P3 | [P] |
| T058 | Write integration tests for end-to-end generation (US1 acceptance) | WP08 | P3 | [P] |
| T059 | Write integration tests for project bootstrap (US2 acceptance) | WP08 | P3 | [P] |
| T060 | Write integration tests for custom template override (US3 acceptance) | WP08 | P3 | [P] |
| T061 | Write CI/CD automation tests (US7 acceptance) | WP08 | P3 | [P] |
| T062 | Write user documentation (CLI usage guide, template authoring guide) | WP08 | P3 | [P] |
| T063 | Write developer documentation (architecture, extension guide) | WP08 | P3 | [P] |
| T064 | Update Core-App README with scaffolding CLI section | WP08 | P3 | [P] |
| T065 | Create quickstart tutorial with examples | WP08 | P3 | [P] |

---

## Work Package Breakdown

---

### WP01: CLI Framework & Entry Points

**Goal**: Establish Click-based CLI foundation with console script, Django management command, command tree, and exit code handling.

**Priority**: P0 (foundational; all other WPs depend on this)

**Independent Test**: Run `django-core-scaffold --help` and `python manage.py scaffold --help`, verify subcommands appear. Run with invalid arguments, verify correct exit codes.

**Constitutional Alignment**:
- **Principle II (Architecture & Modularity)**: CLI framework is separate module with clear entrypoints, no coupling to business logic.
- **Principle III (Code Quality)**: Type hints on all CLI functions, Click decorators for robust argument parsing.
- **Principle VII (API Design)**: CLI interface is consistent, validated at boundary (arg validation before execution).

**Subtasks**:
- [X] T001: Create src/scaffolding/ module structure (\_\_init\_\_.py, cli.py, utils/)
- [X] T002: Implement console script entrypoint (django-core-scaffold) in pyproject.toml [console_scripts] (FR-001)
- [X] T003: Implement Django management command (python manage.py scaffold) in scaffolding/management/commands/scaffold.py (FR-002)
- [X] T004: Implement Click-based command tree with subcommands: app, init, list-templates, validate (FR-003, FR-004)
- [X] T005: [P] Implement global CLI options: --no-interactive, --verbose, --help, --version (FR-006, FR-045, FR-046)
- [X] T006: [P] Implement exit code handling: 0=success, 1=user error, 2=system error, 3=validation failure, 4=template not found, 5=conflict (CLI contract)
- [X] T007: [P] Add CLI error message formatting utilities (clear, actionable error messages per FR-043)
- [X] T008: Wire CLI commands to placeholder backend functions (returns "Not implemented" for now, replaced in later WPs)

**Implementation Sketch**:
```python
# src/scaffolding/cli.py
import click
from typing import Optional

@click.group()
@click.option('--no-interactive', is_flag=True, help='Run without prompts')
@click.option('--verbose', is_flag=True, help='Enable verbose output')
@click.version_option()
def scaffold(no_interactive: bool, verbose: bool) -> None:
    """Core scaffolding CLI for Django apps and projects."""
    ctx = click.get_current_context()
    ctx.ensure_object(dict)
    ctx.obj['interactive'] = not no_interactive
    ctx.obj['verbose'] = verbose

@scaffold.command()
@click.argument('name')
@click.option('--template', default='minimal', help='Template to use')
@click.option('--validate/--no-validate', default=True, help='Run validation')
@click.pass_context
def app(ctx: click.Context, name: str, template: str, validate: bool) -> None:
    """Generate new Django app/module."""
    # Implementation in WP04
    raise NotImplementedError("WP04")

@scaffold.command()
@click.argument('name')
@click.option('--project-name', help='Custom project display name')
@click.pass_context
def init(ctx: click.Context, name: str, project_name: Optional[str]) -> None:
    """Bootstrap new downstream project."""
    # Implementation in WP04
    raise NotImplementedError("WP04")
```

**Files Created/Modified**:
- CREATE: src/scaffolding/\_\_init\_\_.py
- CREATE: src/scaffolding/cli.py
- CREATE: src/scaffolding/management/commands/scaffold.py
- MODIFY: pyproject.toml ([project.scripts])

**Dependencies**:
- Click 8.1+ (add to requirements/base.txt)
- Django 5.1+ (already present)

**Risks**:
- **Console script conflicts**: If downstream projects have their own `scaffold` command, namespace collision. **Mitigation**: Use `django-core-scaffold` prefix (not generic `scaffold`).
- **Django command discovery**: Django management command must be in correct path. **Mitigation**: Follow standard Django structure (management/commands/).

**Prompt File**: See [tasks/planned/WP01-cli-framework.md](tasks/planned/WP01-cli-framework.md)

---

### WP02: Template Discovery System

**Goal**: Implement hybrid template discovery with TemplateRegistry, filesystem/plugin loaders, YAML manifest parsing, and inheritance resolution (ADR-021).

**Priority**: P0 (foundational; WP03-07 depend on template loading)

**Independent Test**: Create mock templates in filesystem and plugin package, run discovery, verify correct precedence order and inheritance resolution.

**Constitutional Alignment**:
- **Principle I (Product-Agnostic)**: Template system is extensible, no product-specific logic. Plugin packages enable ecosystem growth.
- **Principle II (Architecture & Modularity)**: TemplateRegistry is decoupled from CLI, clear loader interface, single responsibility.
- **Principle III (Code Quality)**: Type hints on all functions, schema validation for manifests, comprehensive error handling.

**Subtasks**:
- [ ] T009: Create TemplateRegistry class with singleton pattern (central registry of all discovered templates)
- [ ] T010: Implement hybrid discovery strategy: (1) project-local, (2) SCAFFOLD_TEMPLATE_DIRS, (3) Core built-in, (4) plugin packages (ADR-021, FR-012)
- [ ] T011: [P] Implement filesystem template loader (scans directories for __template__.yaml, loads template metadata)
- [ ] T012: [P] Implement plugin package loader (uses importlib.metadata to find installed packages with scaffold_templates module, FR-015)
- [ ] T013: [P] Implement YAML manifest parser (validates TemplateManifest schema: name, description, extends, variables, files per data-model.md)
- [ ] T014: Implement template inheritance resolver (resolves `extends` chains, max depth 2, file-level override, ADR-021, FR-014)
- [ ] T015: [P] Implement template conflict detection (custom templates override Core templates by name, warning logged, FR-013)
- [ ] T016: [P] Implement template validation (checks manifest schema compliance, required files present, variables defined)
- [ ] T017: [P] Add unit tests for TemplateRegistry with mock filesystem and plugin packages (test precedence, inheritance, conflicts)

**Implementation Sketch**:
```python
# src/scaffolding/templates/registry.py
from dataclasses import dataclass
from typing import Dict, List, Optional
import yaml

@dataclass
class TemplateManifest:
    name: str
    description: str
    extends: Optional[str]
    variables: Dict[str, dict]
    files: List[str]
    
    @classmethod
    def from_yaml(cls, path: Path) -> 'TemplateManifest':
        with open(path) as f:
            data = yaml.safe_load(f)
        # Validate schema
        return cls(**data)

class TemplateRegistry:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._templates = {}
        return cls._instance
    
    def discover(self) -> None:
        """Discover templates from all sources in precedence order."""
        # 1. Project-local templates/scaffold/
        # 2. SCAFFOLD_TEMPLATE_DIRS from settings
        # 3. Core built-in templates
        # 4. Plugin packages (importlib.metadata)
        pass
    
    def resolve_inheritance(self, template_name: str) -> TemplateManifest:
        """Resolve template inheritance chain (max depth 2)."""
        pass
```

**Files Created/Modified**:
- CREATE: src/scaffolding/templates/\_\_init\_\_.py
- CREATE: src/scaffolding/templates/registry.py
- CREATE: src/scaffolding/templates/loaders.py
- CREATE: src/scaffolding/templates/manifest.py
- CREATE: tests/scaffolding/test_registry.py

**Dependencies**:
- PyYAML 6.0+ (add to requirements/base.txt)
- importlib.metadata (stdlib)

**Risks**:
- **Template fragmentation**: Teams create incompatible templates. **Mitigation**: Document manifest schema, provide linter.
- **Inheritance complexity**: Deep chains are hard to debug. **Mitigation**: Limit to 2 levels (ADR-021), clear error messages.
- **Plugin conflicts**: Two packages provide same template name. **Mitigation**: Project-local templates always win, log warnings.

**Prompt File**: See [tasks/planned/WP02-template-discovery.md](tasks/planned/WP02-template-discovery.md)

---

### WP03: Template Rendering Engine

**Goal**: Implement Jinja2-based rendering with variable substitution, built-in variables, file processing, and cross-platform path handling.

**Priority**: P1 (core functionality; WP04 depends on rendering)

**Independent Test**: Render mock template with variables, verify output matches expected golden file. Test cross-platform path handling on Windows and Unix.

**Constitutional Alignment**:
- **Principle II (Architecture & Modularity)**: Rendering engine is decoupled from CLI and generation, clear interface.
- **Principle III (Code Quality)**: Type hints on all functions, comprehensive error handling for Jinja2 syntax errors.
- **Principle VI (Performance & Reliability)**: Graceful degradation on template errors with line number reporting.

**Subtasks**:
- [ ] T018: Set up Jinja2 environment with custom configuration (autoescape=False for Python code, strict undefined variables)
- [ ] T019: Implement variable substitution engine (replaces {{ app_name }}, {{ project_name }}, etc. from CLI inputs, FR-011)
- [ ] T020: [P] Implement built-in Jinja2 variables: timestamp, author (from git config), python_version, core_version
- [ ] T021: [P] Implement template file processor (handles .j2 suffix, preserves non-template files unchanged, binary files copied)
- [ ] T022: [P] Implement cross-platform path handling (use pathlib, normalize Windows backslashes, preserve Unix permissions)
- [ ] T023: Implement template inheritance file merging (base files + override files = merged output)
- [ ] T024: [P] Add Jinja2 rendering error handling with line number reporting (clear error messages for syntax errors, undefined variables)
- [ ] T025: [P] Add unit tests for template rendering with golden files (compare rendered output to expected fixtures, test edge cases)

**Implementation Sketch**:
```python
# src/scaffolding/rendering/engine.py
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from pathlib import Path
from typing import Dict, Any

class TemplateRenderer:
    def __init__(self, template_dir: Path):
        self.env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=False,
            undefined=StrictUndefined
        )
    
    def render_file(self, template_path: str, variables: Dict[str, Any]) -> str:
        """Render single template file with variables."""
        template = self.env.get_template(template_path)
        return template.render(**variables)
    
    def render_directory(self, template_name: str, variables: Dict[str, Any], output_dir: Path) -> None:
        """Render all files in template directory to output directory."""
        # Walk template files
        # Render .j2 files with Jinja2
        # Copy non-template files unchanged
        # Create directory structure
        pass
```

**Files Created/Modified**:
- CREATE: src/scaffolding/rendering/\_\_init\_\_.py
- CREATE: src/scaffolding/rendering/engine.py
- CREATE: src/scaffolding/rendering/variables.py
- CREATE: tests/scaffolding/test_rendering.py
- CREATE: tests/scaffolding/fixtures/templates/ (golden file fixtures)

**Dependencies**:
- Jinja2 3.1+ (add to requirements/base.txt)

**Risks**:
- **Jinja2 syntax errors**: Templates with syntax errors fail rendering. **Mitigation**: Template validation in WP02, clear error messages with line numbers.
- **Variable injection**: User-provided variables could contain malicious code. **Mitigation**: No eval() or exec() in templates, use StrictUndefined to catch typos.
- **Path traversal**: Template could write outside target directory. **Mitigation**: Validate all output paths are within staging directory.

**Prompt File**: See [tasks/planned/WP03-template-rendering.md](tasks/planned/WP03-template-rendering.md)

---

### WP04: Code Generation & Atomic Rollback

**Goal**: Implement staging directory, file builder, atomic move operation, rollback mechanism, and pre-generation validation (ADR-022).

**Priority**: P1 (core functionality; delivers US1, US2 core requirements)

**Independent Test**: Generate module, verify files created in staging, trigger validation failure, verify rollback cleans up staging.

**Constitutional Alignment**:
- **Principle II (Architecture & Modularity)**: Generation logic is decoupled from CLI and rendering, clear separation of concerns.
- **Principle VI (Performance & Reliability)**: Atomic operations with rollback ensure no partial failures leave system in inconsistent state.
- **Principle VII (API Design)**: Validation at boundary (pre-generation checks for name collisions, invalid names).

**Subtasks**:
- [ ] T026: Implement staging directory creation (mkdtemp for isolation, cleaned up after success or failure, ADR-022)
- [ ] T027: Implement file builder (writes rendered templates to staging directory, preserves structure)
- [ ] T028: Implement atomic move operation (staging → target with shutil.move, all-or-nothing, ADR-022)
- [ ] T029: Implement rollback mechanism (cleanup staging on failure, log reason, ADR-022)
- [ ] T030: [P] Implement file permission preservation (chmod, owner/group metadata on Unix)
- [ ] T031: [P] Implement pre-generation conflict detection (check if target directory exists, abort with error, FR-008, edge case)
- [ ] T032: [P] Implement app name validation (Django naming conventions: snake_case, no hyphens, no starting with numbers, FR-008)
- [ ] T033: [P] Implement project name validation and sanitization (slugify for directory name, preserve display name separately, FR-032)
- [ ] T034: [P] Add integration tests for code generation with rollback scenarios (success path, validation failure, name collision, partial rendering failure)
- [ ] T026a: Create project bootstrap template with B01 skeleton + stable foundational apps (accounts, audit, organisations, permissions, projects, settings, security_baseline) following FR-027 (minimal scope: standard skeleton + stable apps only, no advanced composition or domain presets)
- [ ] T026b: [P] Integrate B19 deployment templates (Dockerfile, docker-compose.yml, k8s/, nginx/, .env.example) into project bootstrap template following FR-028

**Implementation Sketch**:
```python
# src/scaffolding/generation/generator.py
import shutil
import tempfile
from pathlib import Path
from typing import Dict, Any

class CodeGenerator:
    def __init__(self, renderer: TemplateRenderer):
        self.renderer = renderer
    
    def generate_app(self, app_name: str, template: str, project_root: Path, validate: bool = True) -> None:
        """Generate Django app with atomic rollback."""
        # Validate app name
        self._validate_app_name(app_name)
        
        # Check for conflicts
        target_dir = project_root / 'src' / app_name
        if target_dir.exists():
            raise ConflictError(f"App {app_name} already exists")
        
        # Create staging directory
        staging_dir = Path(tempfile.mkdtemp(prefix='scaffold_'))
        try:
            # Render template to staging
            variables = {'app_name': app_name, ...}
            self.renderer.render_directory(template, variables, staging_dir)
            
            # Run validation if requested
            if validate:
                self._validate_generated_code(staging_dir)
            
            # Atomic move staging → target
            shutil.move(str(staging_dir), str(target_dir))
        except Exception as e:
            # Rollback: cleanup staging
            shutil.rmtree(staging_dir, ignore_errors=True)
            raise
```

**Files Created/Modified**:
- CREATE: src/scaffolding/generation/\_\_init\_\_.py
- CREATE: src/scaffolding/generation/generator.py
- CREATE: src/scaffolding/generation/validation.py
- CREATE: tests/scaffolding/test_generation.py

**Dependencies**:
- tempfile (stdlib)
- shutil (stdlib)

**Risks**:
- **Partial failures**: Rendering succeeds but validation fails, staging left on disk. **Mitigation**: Cleanup in finally block (ADR-022).
- **Permission errors**: Target directory not writable. **Mitigation**: Check permissions before generation, clear error message.
- **Disk space**: Staging directory fills disk. **Mitigation**: Check available space before generation, cleanup on failure.

**Prompt File**: See [tasks/planned/WP04-code-generation.md](tasks/planned/WP04-code-generation.md)

---

### WP05: Constitutional Validation Integration

**Goal**: Integrate check_policy.py subprocess runner, parse validation reports, implement --validate/--force flags, and exit code mapping (ADR-022).

**Priority**: P1 (core value proposition; delivers US4 requirements)

**Independent Test**: Generate code with intentional violation, verify validation catches it and reports clearly. Test --force flag bypasses validation.

**Constitutional Alignment**:
- **Principle V (Security & Privacy)**: Constitutional validation ensures generated code follows security baseline (B03).
- **Principle VI (Performance & Reliability)**: Validation failures block generation, prevent non-compliant code from entering codebase.
- **Principle VII (API Design)**: Validation at boundary, clear error messages with actionable guidance.

**Subtasks**:
- [ ] T035: Implement check_policy.py subprocess runner (subprocess.run with timeout, capture stdout/stderr, FR-033)
- [ ] T036: [P] Implement validation report parser (parse JSON output from check_policy.py, extract violations/warnings/passed checks, FR-039)
- [ ] T037: [P] Implement validation error formatter (user-friendly display with file paths, line numbers, specific violations, FR-039)
- [ ] T038: [P] Implement --validate / --no-validate flag behavior (default=validate, skip validation if --no-validate, FR-007)
- [ ] T039: [P] Implement --force flag (bypass validation failures, log warning, proceed with generation, ADR-022)
- [ ] T040: [P] Implement exit code mapping: validation failure → exit 3 (CLI contract, FR-040)
- [ ] T041: [P] Add unit tests for validation integration with mock check_policy.py (test success, failure, timeout, parsing errors)

**Implementation Sketch**:
```python
# src/scaffolding/validation/runner.py
import subprocess
import json
from pathlib import Path
from typing import Dict, Any

class ValidationRunner:
    def __init__(self, check_policy_path: Path):
        self.check_policy_path = check_policy_path
    
    def validate_directory(self, target_dir: Path) -> Dict[str, Any]:
        """Run check_policy.py on generated code, return validation report."""
        result = subprocess.run(
            [sys.executable, str(self.check_policy_path), str(target_dir)],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            return {'passed': True, 'violations': []}
        else:
            # Parse JSON output
            report = json.loads(result.stdout)
            return report
    
    def format_violations(self, report: Dict[str, Any]) -> str:
        """Format validation violations for user-friendly display."""
        # FR-039: Display file paths, line numbers, specific violations
        pass
```

**Files Created/Modified**:
- CREATE: src/scaffolding/validation/\_\_init\_\_.py
- CREATE: src/scaffolding/validation/runner.py
- CREATE: src/scaffolding/validation/formatter.py
- CREATE: tests/scaffolding/test_validation.py

**Dependencies**:
- check_policy.py (must be in project root, dependency from B02)

**Risks**:
- **False positives**: Validation catches legitimate patterns as violations. **Mitigation**: --force flag (ADR-022), iterative rule refinement.
- **check_policy.py not found**: Script missing or not executable. **Mitigation**: Check script exists before validation, clear error message.
- **Validation timeout**: Large codebases take too long. **Mitigation**: 60s timeout, skip validation for non-interactive CI/CD.

**Prompt File**: See [tasks/planned/WP05-validation-integration.md](tasks/planned/WP05-validation-integration.md)

---

### WP06: Interactive UX & Prompts

**Goal**: Implement TTY detection, Click interactive prompts, auto-detection logic, progress indicators, and post-generation summary.

**Priority**: P2 (user experience; enhances US1-US7 but not critical for functionality)

**Independent Test**: Run CLI in terminal (TTY), verify interactive prompts appear. Run in CI (no TTY), verify non-interactive defaults used.

**Constitutional Alignment**:
- **Principle VII (API Design)**: Interactive prompts provide guidance, non-interactive mode enables automation (both supported).
- **Principle XI (Documentation)**: CLI is self-documenting via prompts and help messages, reduces need for external docs.

**Subtasks**:
- [ ] T042: [P] Implement TTY detection (sys.stdout.isatty(), used for auto-detection logic)
- [ ] T043: [P] Implement Click interactive prompts (template selection from list, app name confirmation, FR-041)
- [ ] T044: [P] Implement auto-detection logic (interactive in terminal, non-interactive in CI/CD, FR-041, FR-042)
- [ ] T045: [P] Implement progress indicators (spinner for file creation, validation running, FR-042)
- [ ] T046: [P] Implement post-generation summary (list of files created, next steps, FR-044)
- [ ] T047: [P] Add manual UX tests (interactive prompts, progress display, summary formatting)

**Implementation Sketch**:
```python
# src/scaffolding/ux/prompts.py
import click
import sys

def auto_interactive() -> bool:
    """Auto-detect if running in interactive terminal."""
    return sys.stdout.isatty()

def prompt_template_selection(available_templates: List[str]) -> str:
    """Prompt user to select template from list."""
    if not auto_interactive():
        return 'minimal'  # Default for non-interactive
    
    return click.prompt(
        'Select template',
        type=click.Choice(available_templates),
        default='minimal'
    )

def show_progress(message: str) -> None:
    """Show progress indicator."""
    if auto_interactive():
        with click.progressbar(length=100, label=message) as bar:
            # Update bar as work progresses
            pass
    else:
        click.echo(message)
```

**Files Created/Modified**:
- CREATE: src/scaffolding/ux/\_\_init\_\_.py
- CREATE: src/scaffolding/ux/prompts.py
- CREATE: src/scaffolding/ux/progress.py
- CREATE: tests/scaffolding/test_ux.py

**Dependencies**:
- Click 8.1+ (already in WP01)

**Risks**:
- **TTY detection issues**: Some CI environments report as TTY. **Mitigation**: Respect --no-interactive flag explicitly, override auto-detection.
- **Progress overhead**: Progress indicators slow down fast operations. **Mitigation**: Only show progress for operations >1s.

**Prompt File**: See [tasks/planned/WP06-interactive-ux.md](tasks/planned/WP06-interactive-ux.md)

---

### WP07: Core Built-in Templates

**Goal**: Create 4 Core templates (minimal, api-first, service, ui-backed) with manifests, Jinja2 templates, and golden file tests (FR-009).

**Priority**: P2 (content delivery; provides value but WP01-06 are functional without templates)

**Independent Test**: Generate module with each template, verify structure matches spec. Run Ruff, mypy, check_policy.py on generated code, verify 100% pass.

**Constitutional Alignment**:
- **Principle III (Code Quality)**: All generated code includes type hints, passes Ruff/mypy, formatted with Black.
- **Principle IV (Testing)**: Generated code includes pytest test structure, placeholder tests.
- **Principle V (Security & Privacy)**: Generated code follows B03 security baseline (secure defaults, no secrets).

**Subtasks**:
- [ ] T048: Create "minimal" template (models.py, apps.py, tests/, migrations/, locale/, \_\_init\_\_.py, FR-016, FR-017)
- [ ] T049: Create "api-first" template (extends minimal, adds serializers.py, views.py, urls.py, API tests, FR-023)
- [ ] T050: Create "service" template (extends minimal, adds services.py with type hints, unit tests, no views, FR-024)
- [ ] T051: Create "ui-backed" template (extends minimal, adds views.py, forms.py, templates/, static/, frontend tests, FR-025)
- [ ] T052: [P] Add \_\_template\_\_.yaml manifest for each template (name, description, extends, variables, files per data-model.md)
- [ ] T053: [P] Add golden file tests for all 4 templates (generate with fixtures, compare output to expected files, FR-018, FR-019)
- [ ] T054: [P] Validate templates with explicit smoke tests: for each of 4 templates (minimal, api-first, service, ui-backed), generate test app in temp directory → run `ruff check` → run `pytest` → run `check_policy.py` → verify all pass (exit 0) to ensure generated code is functionally runnable, not just syntactically valid (100% compliance for all generated code, SC-002)

**Implementation Sketch**:
```yaml
# src/scaffolding/built_in_templates/minimal/__template__.yaml
name: minimal
description: "Minimal Django app with models, tests, i18n"
extends: null
variables:
  app_name:
    type: string
    description: "Django app name (snake_case)"
    required: true
files:
  - __init__.py
  - apps.py
  - models.py
  - tests/__init__.py
  - tests/test_models.py
  - migrations/__init__.py
  - locale/.gitkeep
```

```python
# src/scaffolding/built_in_templates/minimal/models.py.j2
"""
{{ app_name }} models.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _


# Example model - replace with your business logic
class ExampleModel(models.Model):
    """Example model for {{ app_name }}."""
    
    name = models.CharField(
        _("name"),
        max_length=255,
        help_text=_("Name of the example")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("example")
        verbose_name_plural = _("examples")
    
    def __str__(self) -> str:
        return self.name
```

**Files Created/Modified**:
- CREATE: src/scaffolding/built_in_templates/minimal/\_\_template\_\_.yaml
- CREATE: src/scaffolding/built_in_templates/minimal/*.j2 (8-10 template files)
- CREATE: src/scaffolding/built_in_templates/api-first/\_\_template\_\_.yaml
- CREATE: src/scaffolding/built_in_templates/api-first/*.j2 (12-15 template files)
- CREATE: src/scaffolding/built_in_templates/service/\_\_template\_\_.yaml
- CREATE: src/scaffolding/built_in_templates/service/*.j2 (8-10 template files)
- CREATE: src/scaffolding/built_in_templates/ui-backed/\_\_template\_\_.yaml
- CREATE: src/scaffolding/built_in_templates/ui-backed/*.j2 (15-20 template files)
- CREATE: tests/scaffolding/fixtures/golden_files/ (expected output for all templates)
- CREATE: tests/scaffolding/test_templates.py

**Dependencies**:
- Django REST Framework 3.14+ (for api-first template serializers/viewsets)

**Risks**:
- **Template maintenance**: Core changes require template updates. **Mitigation**: Automated tests catch breaking changes, version templates with Core.
- **Template drift**: Generated code diverges from Core conventions. **Mitigation**: Golden file tests ensure consistency, CI validates templates.

**Prompt File**: See [tasks/planned/WP07-core-templates.md](tasks/planned/WP07-core-templates.md)

---

### WP08: Testing & Documentation

**Goal**: Comprehensive test suite (unit, integration, E2E), user documentation (CLI guide, template authoring), and developer documentation (architecture, extension guide).

**Priority**: P3 (quality & polish; deliverable after WP01-07 are functional)

**Independent Test**: Run pytest with coverage, verify >80% coverage. Read documentation, verify all examples work.

**Constitutional Alignment**:
- **Principle IV (Testing)**: Comprehensive test suite with unit, integration, and E2E tests (SC-006).
- **Principle XI (Documentation)**: User guide, template authoring guide, extension guide (SC-008).

**Subtasks**:
- [ ] T055: [P] Write unit tests for CLI framework (WP01 coverage: command parsing, exit codes, error handling)
- [ ] T056: [P] Write unit tests for template discovery (WP02 coverage: registry, loaders, inheritance, conflicts)
- [ ] T057: [P] Write unit tests for template rendering (WP03 coverage: Jinja2, variables, file processing)
- [ ] T058: [P] Write integration tests for end-to-end generation (US1 acceptance: scaffold app → validate → tests pass)
- [ ] T059: [P] Write integration tests for project bootstrap (US2 acceptance: scaffold init → docker-compose up → tests pass)
- [ ] T060: [P] Write integration tests for custom template override (US3 acceptance: custom template → custom patterns present)
- [ ] T061: [P] Write CI/CD automation tests (US7 acceptance: non-interactive mode → success rate 100%)
- [ ] T062: [P] Write user documentation (CLI usage guide: all subcommands, flags, examples; template authoring guide: manifest schema, Jinja2 patterns)
- [ ] T063: [P] Write developer documentation (architecture overview: components, data flow; extension guide: custom templates, plugin packages)
- [ ] T064: [P] Update Core-App README with scaffolding CLI section (quickstart, link to docs)
- [ ] T065: [P] Create quickstart tutorial with examples (scaffold first app, bootstrap project, customize template)

**Implementation Sketch**:
```python
# tests/scaffolding/test_integration.py
import pytest
from pathlib import Path

def test_scaffold_app_end_to_end(tmp_path):
    """Test US1: Generate module in existing project."""
    # Setup mock project
    project_root = tmp_path / 'myproject'
    project_root.mkdir()
    
    # Run CLI
    result = run_cli(['app', 'payments', '--template', 'api-first'], cwd=project_root)
    
    # Verify structure created
    app_dir = project_root / 'src' / 'payments'
    assert app_dir.exists()
    assert (app_dir / 'models.py').exists()
    assert (app_dir / 'serializers.py').exists()
    
    # Verify code quality
    assert run_ruff(app_dir).returncode == 0
    assert run_mypy(app_dir).returncode == 0
    assert run_check_policy(app_dir).returncode == 0
    
    # Verify tests pass
    assert run_pytest(app_dir).returncode == 0
```

**Files Created/Modified**:
- CREATE: tests/scaffolding/test_cli.py (unit tests for WP01)
- CREATE: tests/scaffolding/test_integration.py (E2E tests for US1-7)
- CREATE: docs/scaffolding/cli-guide.md (user documentation)
- CREATE: docs/scaffolding/template-authoring.md (template guide)
- CREATE: docs/scaffolding/architecture.md (developer docs)
- CREATE: docs/scaffolding/extension-guide.md (customization guide)
- MODIFY: README.md (add scaffolding section)

**Dependencies**:
- pytest-cov (add to requirements/local.txt)

**Risks**:
- **Test maintenance**: Tests break when Core conventions change. **Mitigation**: Use fixtures, parameterized tests, golden files.
- **Documentation drift**: Docs become outdated. **Mitigation**: Include docs in PR checklist, CI checks examples.

**Prompt File**: See [tasks/planned/WP08-testing-documentation.md](tasks/planned/WP08-testing-documentation.md)

---

## Constitutional Alignment Summary

All 8 work packages align with Core-App constitutional principles:

- **Principle I (Product-Agnostic)**: CLI is pure infrastructure, extensible templates enable ecosystem growth (WP02, WP07).
- **Principle II (Architecture & Modularity)**: Clear separation of concerns across WPs, decoupled components (WP01-06).
- **Principle III (Code Quality)**: Type hints, Ruff/mypy compliance, comprehensive error handling (all WPs).
- **Principle IV (Testing)**: Unit, integration, E2E tests with >80% coverage (WP08).
- **Principle V (Security & Privacy)**: Constitutional validation enforces B03 security baseline (WP05, WP07).
- **Principle VI (Performance & Reliability)**: Atomic operations, graceful degradation, clear error messages (WP04, WP06).
- **Principle VII (API Design)**: Consistent CLI interface, validation at boundary, self-documenting (WP01, WP06).
- **Principle XI (Documentation)**: Comprehensive user and developer docs, self-documenting CLI (WP06, WP08).

**No constitutional violations introduced.**

---

## Dependencies Between Work Packages

```
WP01 (CLI Framework)
  ↓
WP02 (Template Discovery)
  ↓
WP03 (Template Rendering)
  ↓
WP04 (Code Generation) ←—————— WP06 (Interactive UX) [partial parallel]
  ↓
WP05 (Validation Integration)
  ↓
WP07 (Core Templates) [parallel with WP08]
  ↓
WP08 (Testing & Documentation)
```

**Critical Path**: WP01 → WP02 → WP03 → WP04 → WP05 (must be sequential)

**Parallelization Opportunities**:
- WP06 can partially overlap with WP04 (prompts independent of generation logic)
- WP07 can start after WP03 (template authoring doesn't require generation/validation)
- WP08 tests can be written incrementally as WPs complete

**MVP Scope**: WP01-WP02 deliver foundational platform. WP03-WP05 deliver core functionality (scaffold + validate). WP06-WP08 add polish and content.

---

## Risks & Mitigation

### Technical Risks

- **Template maintenance burden**: Core changes require template updates. **Mitigation**: Automated golden file tests, version templates with Core releases.
- **Template fragmentation**: Teams create incompatible templates. **Mitigation**: Document manifest schema, provide template linter, encourage plugin packages.
- **Constitutional validation false positives**: Overly strict rules block legitimate code. **Mitigation**: --force flag (ADR-022), iterative rule refinement, clear error messages.
- **Cross-platform path issues**: Windows vs Unix path conventions. **Mitigation**: Use pathlib throughout, comprehensive cross-platform tests.

### Process Risks

- **Scope creep**: Requests for deep customization, IDE integrations, GUI. **Mitigation**: Enforce "out of scope" section, focus on CLI MVP.
- **Dependency delays**: Check_policy.py changes break validation integration. **Mitigation**: Mock check_policy.py in tests, document expected JSON schema.
- **Template design debates**: Teams disagree on "best" patterns. **Mitigation**: Document Core templates as opinionated starting points, extensibility allows overrides.

### User Adoption Risks

- **Learning curve**: New developers struggle with CLI. **Mitigation**: Self-documenting prompts (WP06), quickstart tutorial (WP08).
- **Downstream resistance**: Teams prefer their own tooling. **Mitigation**: Make CLI optional, provide migration guide, highlight time savings.

---

## Acceptance Criteria (from spec.md)

All work packages contribute to these measurable success criteria:

- **SC-001**: Scaffold module in <2 minutes (WP01-05 deliver core generation speed)
- **SC-002**: 100% constitutional compliance on first generation (WP05 + WP07 ensure validation passes)
- **SC-003**: Bootstrap project in <5 minutes (WP04 project init command)
- **SC-004**: Generated code includes all boilerplate (WP07 templates)
- **SC-005**: Generated code passes Ruff/mypy (WP07 templates + WP05 validation)
- **SC-006**: CI/CD automation 100% success (WP01 --no-interactive + WP08 tests)
- **SC-007**: Downstream products extend templates (WP02 discovery + WP03 rendering)
- **SC-008**: New developers scaffold on day 1 (WP06 prompts + WP08 docs)

---

## Next Steps

After completion of task breakdown:

1. **Commit tasks.md and prompts**: Commit this file and all 8 WP prompt files to feature branch.
2. **Begin Implementation** (`/spec-kitty.implement`): Start with WP01 (CLI Framework & Entry Points).
3. **Incremental Delivery**: Complete WPs sequentially (WP01 → WP02 → ... → WP08), commit after each WP.
4. **Testing**: Run pytest after each WP, ensure >80% coverage incrementally.
5. **Review** (`/spec-kitty.review`): Code review after WP05 (core functionality complete).
6. **Acceptance** (`/spec-kitty.accept`): Validate against 8 success criteria after WP08 complete.
7. **Merge** (`/spec-kitty.merge`): Merge to main after acceptance validation passes.

---

**End of Task Breakdown**
