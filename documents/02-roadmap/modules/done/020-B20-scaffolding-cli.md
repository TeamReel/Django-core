# B20: Scaffolding CLI

**Phase:** 5
**Status:** ✅ Done
**Module ID:** 020
**Category:** Platform

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 20. B20 – Core Scaffolding CLI

**Doel**: CLI voor generating new apps/modules en downstream products.

**Status**: ✅ Complete

**Key Features**:
- Click-based CLI framework
- Jinja2 template engine for code generation
- YAML manifests for module definitions
- Scaffold new Django apps
- Scaffold new modules (Bxx/Fxx patterns)
- Generate downstream product structure
- importlib.metadata integration

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Core Scaffolding CLI
*Path: kitty-specs/020-core-scaffolding-cli/spec.md*

**Feature Branch**: `020-core-scaffolding-cli`
**Created**: 2025-12-04
**Status**: Draft
**Input**: User description: "A hybrid scaffolding CLI that generates new Django apps/modules and bootstraps downstream projects following Core-App conventions, security baselines, and i18n patterns, with extensible templates and constitutional enforcement at generation time."

---

## Summary

The Core Scaffolding CLI is a code generation tool that accelerates creation of new Django apps/modules and downstream projects while enforcing Core-App standards. It provides both a Python console script (`django-core-scaffold`) and Django management command (`python manage.py scaffold`) with extensible template support and constitutional validation at generation time.

**Goals**:
- Speed up creation of new apps/modules with consistent, production-ready structure (minutes instead of hours)
- Ensure scaffolded code respects B01 project skeleton, B03 security baseline, i18n, testing, and observability conventions by default
- Provide templates for common patterns: API-first modules, service/logic modules, UI-backed modules
- Enable downstream products to extend/override Core templates with custom patterns
- Integrate constitutional enforcement engine to validate generated code at creation time
- Support both interactive development and CI/CD automation workflows

**Non-Goals**:
- Replace full-featured generic project generators beyond Core-App ecosystem (e.g., cookiecutter, Django's startproject)
- Offer deep, per-field customization of every scaffolding detail (keep it simple and opinionated)
- Implement domain-specific business templates or vertical solutions (stay product-agnostic)
- Support products that completely ignore Core-App conventions (nice side effect, not core requirement)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate New Module in Existing Project (Priority: P1)

A developer working on an existing Core-based project needs to add a new feature module (e.g., "notifications", "billing") following all Core conventions without manually creating boilerplate.

**Why this priority**: Most common use case; directly impacts daily developer productivity and ensures consistency across all Core-based projects.

**Independent Test**: Developer runs `python manage.py scaffold app notifications --template api-first`, CLI generates module structure, developer immediately writes business logic without setting up models/views/tests/i18n boilerplate. Generated code passes linting, type checking, and security validation.

**Acceptance Scenarios**:

1. **Given** developer is in existing Core-based project root, **When** they run `python manage.py scaffold app payments --template api-first`, **Then** CLI creates `src/payments/` directory with models.py, serializers.py, views.py, urls.py, tests/, migrations/, locale/ following B01 structure
2. **Given** scaffolded app is generated, **When** developer runs `ruff check src/payments/`, **Then** no linting errors occur (code passes quality checks by default)
3. **Given** scaffolded app is generated, **When** developer runs `mypy src/payments/`, **Then** no type errors occur (type hints are correct)
4. **Given** scaffolded app is generated, **When** developer runs `python check_policy.py`, **Then** constitutional validation passes (B03 security defaults, B04 i18n patterns present)
5. **Given** scaffolded app includes tests, **When** developer runs `pytest src/payments/tests/`, **Then** placeholder tests execute successfully (testing structure is valid)
6. **Given** developer wants non-interactive usage, **When** they run `python manage.py scaffold app orders --template service --no-interactive`, **Then** app is generated with defaults without prompting

---

### User Story 2 - Bootstrap New Downstream Project (Priority: P2)

A tech lead starting a new product needs to create a complete downstream project based on Core-App skeleton with all foundational modules, configuration, and deployment templates in place.

**Why this priority**: Less frequent than module generation but critical for ecosystem growth; enables rapid product launches while maintaining standards.

**Independent Test**: Run `django-core-scaffold init my-product`, verify complete project structure is created with working Django setup, passing tests, deployment configs, and constitutional compliance.

**Acceptance Scenarios**:

1. **Given** developer is in empty directory, **When** they run `django-core-scaffold init my-product`, **Then** complete project structure is created with src/, tests/, docs/, requirements/, docker-compose.yml, .env.example following B01 skeleton
2. **Given** bootstrapped project is created, **When** developer runs `cd my-product && docker-compose up`, **Then** project starts successfully with database migrations applied
3. **Given** bootstrapped project includes foundational modules, **When** developer inspects src/ directory, **Then** accounts/, audit/, organisations/, permissions/, projects/, settings/ apps are present and configured
4. **Given** bootstrapped project is created, **When** developer runs test suite, **Then** all baseline tests pass (foundational modules are functional)
5. **Given** developer wants custom project name, **When** they run `django-core-scaffold init my-product --project-name "MyProduct"`, **Then** project uses "MyProduct" in settings and documentation instead of default

---

### User Story 3 - Override Core Templates with Custom Patterns (Priority: P2)

A maintainer of a downstream product needs to extend Core scaffolding with company-specific patterns (e.g., custom logging, telemetry, compliance checks) without modifying Core-App templates.

**Why this priority**: Enables downstream customization while preserving Core standards; critical for enterprise adoption.

**Independent Test**: Create custom template directory, configure override path, generate module using custom template, verify custom patterns are present while Core defaults are preserved.

**Acceptance Scenarios**:

1. **Given** downstream product has custom templates in `project_templates/`, **When** developer configures `SCAFFOLD_TEMPLATE_DIRS = ['project_templates/']` in settings, **Then** CLI discovers and lists custom templates alongside Core templates
2. **Given** custom template overrides Core's "api-first" pattern, **When** developer runs `scaffold app analytics --template api-first`, **Then** custom version is used (not Core version)
3. **Given** custom template extends Core template, **When** developer runs `scaffold app reports --template extended-api`, **Then** both Core base patterns and custom extensions are included
4. **Given** custom template directory is misconfigured, **When** CLI attempts template discovery, **Then** clear error message indicates invalid template path or missing required files

---

### User Story 4 - Validate Generated Code Against Constitution (Priority: P1)

A developer scaffolds a new module and wants immediate feedback that generated code complies with B01-B18 standards before committing.

**Why this priority**: Prevents non-compliant code from entering codebase; core value proposition of constitutional enforcement.

**Independent Test**: Generate module, run constitutional validator, verify all checks pass. Introduce intentional violation in template, verify validator catches it.

**Acceptance Scenarios**:

1. **Given** module is scaffolded with `--validate` flag, **When** generation completes, **Then** CLI runs constitutional checks and reports pass/fail status
2. **Given** generated code violates B03 security (e.g., missing CSRF protection), **When** validation runs, **Then** clear error message identifies violation and suggests fix
3. **Given** generated code missing i18n markers, **When** validation runs, **Then** warning is shown recommending gettext usage patterns
4. **Given** developer wants to skip validation, **When** they use `--no-validate` flag, **Then** code is generated without constitutional checks

---

### User Story 5 - Use Template for Common Pattern (Priority: P2)

A developer needs to create a standard API-first module, service module, or UI-backed module using battle-tested patterns without remembering all conventions.

**Why this priority**: Reduces decision fatigue and ensures consistent patterns across team; improves onboarding.

**Independent Test**: Run CLI with `--list-templates`, verify available patterns, generate using specific template, verify expected structure matches pattern.

**Acceptance Scenarios**:

1. **Given** developer runs `python manage.py scaffold --list-templates`, **When** command executes, **Then** CLI displays available templates: "api-first", "service", "ui-backed", "minimal" with descriptions
2. **Given** developer chooses "api-first" template, **When** they run `scaffold app products --template api-first`, **Then** generated app includes models, DRF serializers, viewsets, URL routing, API tests, OpenAPI annotations
3. **Given** developer chooses "service" template, **When** they run `scaffold app calculator --template service`, **Then** generated app includes service classes, unit tests, no views/URLs (business logic focus)
4. **Given** developer chooses "ui-backed" template, **When** they run `scaffold app dashboard --template ui-backed`, **Then** generated app includes views, forms, templates/, static/, frontend tests
5. **Given** developer needs minimal starting point, **When** they run `scaffold app experiments --template minimal`, **Then** generated app includes only models.py, apps.py, tests/ (no API/UI boilerplate)

---

### User Story 6 - Extend Templates via Plugin Packages (Priority: P3)

A tech lead wants to distribute custom scaffolding templates as an installable package so multiple teams can use company-specific patterns.

**Why this priority**: Enables template sharing across organization; nice-to-have for advanced users but not critical for MVP.

**Independent Test**: Create Python package with templates, install it, verify CLI discovers templates, generate using packaged template.

**Acceptance Scenarios**:

1. **Given** custom template package is installed (`pip install mycompany-core-templates`), **When** CLI discovers templates, **Then** package templates appear in `--list-templates` output
2. **Given** template package follows naming convention, **When** developer runs `scaffold app metrics --template mycompany-api`, **Then** CLI uses template from installed package
3. **Given** template package is uninstalled, **When** CLI discovers templates, **Then** package templates are no longer available (no crashes or errors)

---

### User Story 7 - Automate Scaffolding in CI/CD (Priority: P3)

A DevOps engineer wants to automate module generation in CI pipelines (e.g., generate test fixtures, create ephemeral services) using non-interactive mode.

**Why this priority**: Enables automation workflows; important for advanced use cases but not critical for manual development.

**Independent Test**: Run scaffolding command with `--no-interactive` and all required flags, verify successful generation without user prompts.

**Acceptance Scenarios**:

1. **Given** CI script needs to generate test module, **When** script runs `scaffold app testdata --template minimal --no-interactive --skip-validation`, **Then** module is generated without prompting and CI job succeeds
2. **Given** CI script provides invalid template name, **When** command runs with `--no-interactive`, **Then** clear error message is returned and job fails fast (no hanging prompts)
3. **Given** CI needs to generate multiple modules, **When** script loops over `scaffold` commands, **Then** each generation is independent and doesn't pollute shared state

---

### Edge Cases

- **Template conflicts**: What happens when custom template has same name as Core template? (Resolution: custom templates take precedence with warning)
- **Incomplete templates**: How does CLI handle templates missing required files (e.g., no `__template__.yaml` manifest)? (Fail fast with clear error)
- **Name collisions**: What if developer tries to scaffold app with name that already exists in project? (Abort with error, suggest different name)
- **Invalid app names**: How are invalid Django app names handled (e.g., names with hyphens, starting with numbers)? (Validate against Django naming rules, reject with helpful message)
- **Partial failures**: If constitutional validation fails after code generation, is generated code rolled back or left in place? (Leave code, display validation report, let developer fix or delete)
- **Unicode in names**: Can app names contain non-ASCII characters? (Reject non-ASCII per Django conventions, suggest ASCII alternatives)
- **Template inheritance chains**: What happens if custom template extends another custom template that extends Core template? (Support 2-level inheritance max, error on deeper chains)
- **Concurrent generation**: Can two developers scaffold different apps simultaneously in same project? (Yes, no shared state; git merge conflicts resolved normally)

---

## Requirements *(mandatory)*

### Functional Requirements

#### CLI Interface & Execution

- **FR-001**: System MUST provide Python console script entrypoint (`django-core-scaffold`) installable via `pip install` of Core-App package
- **FR-002**: System MUST provide Django management command (`python manage.py scaffold`) when Core-App is in INSTALLED_APPS
- **FR-003**: CLI MUST support subcommands: `scaffold app <name>` (generate module), `scaffold init <name>` (bootstrap project)
- **FR-004**: CLI MUST support `--list-templates` flag to display available templates with descriptions
- **FR-005**: CLI MUST support `--template <name>` flag to specify which template to use (defaults to "minimal")
- **FR-006**: CLI MUST support `--no-interactive` flag for CI/CD automation (use defaults, no prompts)
- **FR-007**: CLI MUST support `--validate` / `--no-validate` flags to control constitutional enforcement checks (default: validate)
- **FR-008**: CLI MUST validate app names against Django naming conventions before generation (reject invalid names with helpful error)

#### Template System

- **FR-009**: System MUST ship Core templates for: "api-first", "service", "ui-backed", "minimal" patterns
- **FR-010**: Each template MUST include manifest file (`__template__.yaml`) defining name, description, variables, required files
- **FR-011**: Templates MUST support variable substitution (e.g., `{{ app_name }}`, `{{ app_label }}`, `{{ project_name }}`)
- **FR-012**: System MUST discover templates from multiple sources in order: (1) project-local `templates/scaffold/`, (2) configured `SCAFFOLD_TEMPLATE_DIRS`, (3) Core-App built-in templates, (4) installed template packages
- **FR-013**: Custom templates MUST be able to override Core templates by name (custom takes precedence)
- **FR-014**: Templates MUST be able to extend other templates via `extends: base-template-name` in manifest (max 2-level inheritance)
- **FR-015**: System MUST support template packages following naming convention: `scaffold_templates` module in installed package

#### Code Generation

- **FR-016**: Generated apps MUST follow B01 Core Project Skeleton structure: models.py, views.py, serializers.py (if API), tests/, locale/, migrations/
- **FR-017**: Generated code MUST include type hints for all function signatures (Python 3.12+ compliance)
- **FR-018**: Generated code MUST pass Ruff linting without errors (Black formatting applied automatically)
- **FR-019**: Generated tests MUST use pytest + pytest-django patterns (no unittest framework)
- **FR-020**: Generated apps MUST include i18n markers (gettext) for user-facing strings following B04 conventions
- **FR-021**: Generated apps MUST include placeholder migrations (empty `migrations/` directory with `__init__.py`)
- **FR-022**: Generated apps MUST register with Django via `apps.py` AppConfig class
- **FR-023**: Generated API apps MUST include DRF serializers, viewsets, URL routing if using "api-first" template
- **FR-024**: Generated service apps MUST include service classes with type hints, unit tests if using "service" template
- **FR-025**: Generated UI apps MUST include templates/, static/, forms.py if using "ui-backed" template

#### Project Initialization (Bootstrap)

- **FR-026**: `scaffold init` command MUST create complete B01 project skeleton: src/, tests/, docs/, requirements/, kitty-specs/, .kittify/
- **FR-027**: Bootstrapped projects MUST include foundational Core apps: accounts, audit, organisations, permissions, projects, settings, security_baseline
- **FR-028**: Bootstrapped projects MUST include deployment templates: Dockerfile, docker-compose.yml, k8s/, nginx/, .env.example from B19
- **FR-029**: Bootstrapped projects MUST include working pytest configuration in `pyproject.toml`
- **FR-030**: Bootstrapped projects MUST include constitutional enforcement files: constitution_engine.yaml, check_policy.py
- **FR-031**: Bootstrapped projects MUST include README.md with quickstart instructions
- **FR-032**: `scaffold init` MUST support `--project-name` flag for custom project display name (defaults to slugified directory name)

#### Constitutional Validation

- **FR-033**: System MUST integrate with constitutional enforcement engine (`check_policy.py`) to validate generated code
- **FR-034**: Validation MUST check B01 structure compliance (directory layout, required files present)
- **FR-035**: Validation MUST check B03 security baseline (no hardcoded secrets, secure defaults present)
- **FR-036**: Validation MUST check i18n pattern compliance (gettext markers present in user-facing strings)
- **FR-037**: Validation MUST check testing structure (tests/ directory present, pytest patterns used)
- **FR-038**: Validation MUST check code quality (Ruff linting passes, type hints present)
- **FR-039**: Validation results MUST be displayed as clear pass/fail report with specific violations and line numbers
- **FR-040**: System MUST exit with code 3 if validation fails (for CI/CD failure detection). CLI follows standard exit code contract: 0=success, 1=user error (invalid input), 2=system error (file I/O failure), 3=validation failure (constitutional checks failed), 4=template not found, 5=conflict (target directory exists). See [contracts/cli-interface.md](../../../../kitty-specs/020-core-scaffolding-cli/contracts/cli-interface.md) for full specification.

#### User Experience

- **FR-041**: CLI MUST provide interactive prompts when `--no-interactive` is not specified (template selection, app name confirmation)
- **FR-042**: CLI MUST display clear progress indicators during generation (files being created, validation running)
- **FR-043**: CLI MUST provide helpful error messages for common mistakes (invalid app name, missing template, name collision)
- **FR-044**: CLI MUST display generated file list and next steps after successful generation
- **FR-045**: CLI MUST support `--help` flag with detailed usage examples for all subcommands
- **FR-046**: CLI MUST support `--version` flag displaying Core-App version

### Key Entities

- **Template**: Represents a scaffolding pattern (e.g., "api-first", "service"). Contains manifest file, template files, variable definitions. Loaded from filesystem or Python packages.
- **TemplateManifest**: Metadata about template (name, description, extends, variables, required files). Stored in `__template__.yaml` within each template directory.
- **GeneratedApp**: Django application created by scaffolding process. Contains models, views, tests, migrations following template structure. Registered in project settings.
- **GeneratedProject**: Complete downstream project bootstrapped by `scaffold init`. Contains Core-App skeleton, foundational modules, deployment configs.
- **ValidationReport**: Results of constitutional enforcement checks. Contains violations (if any), passed checks, warnings. Displayed to user after generation.
- **TemplateVariable**: Substitutable value in templates (e.g., `{{ app_name }}`, `{{ author }}`). Provided via CLI flags or interactive prompts. Validated before substitution.

---

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows (CLI is pure scaffolding infrastructure)
- [x] All functionality is reusable across multiple downstream products (templates are extensible, not product-specific)
- [x] Extension points are clearly documented (template override mechanism, variable substitution, template packages)

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app (scaffolding logic in dedicated module, no coupling to business logic)
- [x] No circular dependencies introduced (CLI depends on constitutional engine, templates are data files)
- [x] Extension points are stable and documented (template discovery, override paths, manifest schema)

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained (CLI uses modern Python features, generated code includes type hints)
- [x] Type hints will be used in core modules (all CLI functions typed, generated code typed)
- [x] Code will be formatted with Black and linted with Ruff (enforced in CI, generated code auto-formatted)

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests (unit tests for template discovery, integration tests for generation, validation tests)
- [x] Coverage targets defined (>80% for CLI logic, 100% for template rendering)
- [x] Integration tests planned for key flows (generate app + validate, bootstrap project + run tests, custom template override)

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained (generated code includes B03 security patterns)
- [x] No secrets in code; env vars/secret managers documented (templates use placeholder values, `.env.example` generated)
- [x] Authentication/authorization handled through centralized mechanisms (generated apps use Core auth patterns)
- [x] No sensitive data will be logged (CLI logs template names and file paths only, no user data)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (CLI is filesystem-based, no database queries during generation)
- [x] Pagination implemented for unbounded responses (not applicable, CLI doesn't serve paginated data)
- [x] Structured logging and metrics hooks included (CLI logs generation events, template discovery, validation results)
- [x] Graceful degradation strategy defined for failure scenarios (partial generation leaves code in place, clear error messages, non-zero exit codes)

### API Design (Principle VII)
- [x] DRF standards followed (generated API apps follow DRF best practices: serializers, viewsets, routers)
- [x] API responses are consistent and documented (generated API endpoints include OpenAPI annotations)
- [x] Breaking changes use versioning or deprecation paths (template schema changes require version bumps, deprecated variables warned)
- [x] Validation occurs at boundary (CLI validates inputs before generation, templates validated before use)

### Documentation (Principle XI)
- [x] Feature documentation plan included (CLI `--help`, template authoring guide, project bootstrap guide)
- [x] Extension guide updates identified (template extension mechanism documented, plugin package format specified)
- [x] ADR planned if major architectural decision involved (ADR-021 for template discovery mechanism, ADR-022 for validation integration)

**Violations Requiring Justification**: None. CLI is infrastructure-only, no constitutional violations introduced.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can scaffold new module in existing project in under 2 minutes (vs. 30+ minutes manual setup)
- **SC-002**: 100% of generated code passes constitutional validation on first generation (no manual fixes required for compliance)
- **SC-003**: Developers can bootstrap complete downstream project in under 5 minutes with working Django setup (vs. hours of manual configuration)
- **SC-004**: Generated apps include all required boilerplate (models, tests, migrations, i18n markers) without manual additions
- **SC-005**: Generated code passes Ruff linting and mypy type checking without errors (no manual formatting or type annotation required)
- **SC-006**: CLI supports CI/CD automation via non-interactive mode with 100% success rate (no hanging prompts or failures)
- **SC-007**: Downstream products can extend Core templates without modifying Core-App codebase (template override mechanism works in production)
- **SC-008**: New developers can generate their first module on day 1 without reading full Core-App documentation (CLI is self-documenting via `--help` and prompts)

---

## Technical Constraints

- CLI must be compatible with Python 3.12+ and Django 5.1+
- Template rendering must use Jinja2 for consistency with Django template patterns
- Constitutional validation must reuse existing `check_policy.py` infrastructure (no duplicate validation logic)
- Generated code must be compatible with all Core-App foundational modules (accounts, audit, organisations, permissions)
- Template manifest schema must be extensible without breaking existing templates (backward compatibility required)
- CLI must work in environments without git (template discovery based on filesystem, not version control)
- Generated apps must work with both SQLite (dev) and PostgreSQL (production) databases
- CLI must handle Windows, macOS, and Linux path conventions correctly

---

## Assumptions

- Developers using CLI have Core-App installed in their Python environment or project dependencies
- Template authors understand Jinja2 syntax and Django app structure conventions
- Downstream products maintain standard Django project layout (src/ directory exists, settings.py discoverable)
- Constitutional enforcement engine (check_policy.py) is available and executable in project environment
- Developers have basic familiarity with Django concepts (apps, models, views, migrations)
- Template packages follow standard Python package structure with `setup.py` or `pyproject.toml`
- Generated code will be version-controlled via git (CLI assumes developers will commit generated files)
- Developers will customize generated boilerplate (CLI provides starting point, not final implementation)

---

## Open Questions for Planning Phase

1. **Template inheritance depth**: Should we support unlimited inheritance chains or limit to 2 levels? (Proposal: limit to 2 for simplicity)
2. **Template versioning**: How do we handle templates changing over time? Should old projects regenerate with old template versions? (Proposal: templates versioned with Core-App, regeneration uses latest)
3. **Validation strictness**: Should validation failures block generation or just warn? (Proposal: block by default, `--force` flag to bypass)
4. **Template testing**: How do we test templates themselves? (Proposal: golden file tests comparing generated output to expected fixtures)
5. **Interactive prompts**: What template variables should have interactive prompts vs. CLI flags? (Proposal: app name interactive, everything else optional flags)
6. **Constitutional rule conflicts**: What if custom template violates Core constitutional rules? (Proposal: validation catches violations regardless of template source)
7. **Template manifest schema**: What's the minimal viable manifest schema for MVP? (Proposal: name, description, extends, variables - ADR-021 to specify)
8. **Migration generation**: Should CLI generate initial migrations for scaffolded models? (Proposal: no, leave to `makemigrations` for flexibility)

---

## Risks

- **Template maintenance burden**: As Core-App evolves, templates need updates. Mitigation: Automated tests for template generation, version templates with Core-App releases.
- **Downstream template fragmentation**: Different teams create incompatible custom templates. Mitigation: Document template authoring best practices, provide template linter.
- **Constitutional validation false positives**: Overly strict validation blocks legitimate code. Mitigation: `--force` flag, clear validation messages, iterative rule refinement.
- **Naming conflicts**: Scaffolded apps conflict with existing apps or Python modules. Mitigation: Pre-generation validation checks for existing directories, import conflicts.
- **Generated code drift**: Developers modify generated code, then regenerate and lose changes. Mitigation: Clear documentation that regeneration is destructive, use git for safety.
- **Template security vulnerabilities**: Malicious template packages could generate unsafe code. Mitigation: Validate template packages at install time, warn about third-party templates.

---

## Dependencies

- **B01 Core Project Skeleton**: CLI must understand and generate B01 structure
- **B03 Core Security Baseline**: Generated code must include B03 security patterns
- **B04 Core Internationalization**: Generated code must include i18n markers following B04 conventions
- **B09 Audit Logging**: Generated apps should integrate with B09 audit system (optional, nice-to-have)
- **B13 API Foundation**: Generated API apps must follow B13 DRF standards
- **B18 Platform Observability**: Generated apps should include B18 logging/metrics hooks (optional)
- **B19 Deployment Templates**: Bootstrapped projects must include B19 Docker/K8s configs
- **Constitutional Enforcement Engine**: CLI depends on `check_policy.py` for validation

---

## Out of Scope (Explicitly Excluded)

- **IDE/editor integrations**: No VS Code extension, PyCharm plugin, or editor-specific tooling
- **GUI interface**: CLI-only, no web UI or graphical configuration tool
- **Database migrations**: CLI generates migration directory but not initial migration files (use `makemigrations`)
- **Frontend scaffolding**: No React/Vue/Angular components, CSS frameworks, or JavaScript tooling (focus on Django backend)
- **Code refactoring**: CLI generates new code only, does not modify or refactor existing code
- **Template marketplace**: No central repository or package index for community templates (just document convention)
- **Multi-language support**: CLI messages in English only (generated code supports i18n via gettext)
- **Cloud deployment**: CLI generates deployment configs but does not deploy to AWS/GCP/Azure
- **Database seeding**: No fixture generation or test data creation (separate concern)
- **Code analysis**: No static analysis beyond constitutional validation (use dedicated tools like SonarQube)

---

## Next Steps

After approval of this specification:

1. **Clarification Phase** (`/spec-kitty.clarify`): Resolve open questions, finalize template manifest schema, validate assumptions with stakeholders
2. **Planning Phase** (`/spec-kitty.plan`): Create ADR-021 (template discovery), ADR-022 (validation integration), define implementation roadmap, identify milestones
3. **Task Breakdown** (`/spec-kitty.tasks`): Break down into work packages (CLI framework, template system, code generation, validation integration, project bootstrap, testing)
4. **Implementation** (`/spec-kitty.implement`): Build CLI, create Core templates, integrate constitutional validation, write comprehensive tests
5. **Review** (`/spec-kitty.review`): Code review, template validation, integration testing, documentation review
6. **Acceptance** (`/spec-kitty.accept`): Validate against success criteria, verify constitutional compliance, prepare for merge

---

## Appendix: Template Structure Example

Example template manifest (`templates/scaffold/api-first/__template__.yaml`):

```yaml
name: api-first
description: "REST API module with Django REST Framework"
extends: minimal
variables:
  app_name:
    type: string
    description: "Django app name (snake_case)"
    required: true
  model_name:
    type: string
    description: "Primary model name (PascalCase)"
    required: false
    default: "Item"
files:
  - models.py
  - serializers.py
  - views.py
  - urls.py
  - tests/test_api.py
  - tests/test_models.py
  - tests/test_serializers.py
```

Example template file (`templates/scaffold/api-first/serializers.py.j2`):

```python
"""
{{ app_name }} serializers.
"""
from rest_framework import serializers
from .models import {{ model_name }}


class {{ model_name }}Serializer(serializers.ModelSerializer):
    """Serializer for {{ model_name }} model."""

    class Meta:
        model = {{ model_name }}
        fields = "__all__"
```

---

**End of Specification**
