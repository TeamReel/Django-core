# Implementation Plan: Core Scaffolding CLI
*Path: kitty-specs/020-core-scaffolding-cli/plan.md*

**Branch**: `020-core-scaffolding-cli` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `kitty-specs/020-core-scaffolding-cli/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

The Core Scaffolding CLI is a code generation tool that accelerates creation of new Django apps/modules and downstream projects while enforcing Core-App standards. It provides both a Python console script (`django-core-scaffold`) and Django management command (`python manage.py scaffold`) with extensible template support and constitutional validation at generation time.

**Primary Requirement**: Enable developers to scaffold production-ready Django modules in under 2 minutes with zero manual boilerplate, achieving 100% constitutional compliance on first generation.

**Technical Approach**:
- **Template Discovery**: Hybrid discovery system (project-local → configured dirs → Core built-in → plugin packages) optimized for day-1 usability
- **Constitutional Validation**: Post-generation validation with atomic rollback (temporary staging → validate → move or rollback)
- **Template Inheritance**: File-level inheritance with 2-level maximum depth for predictable customization
- **Interactive UX**: Smart hybrid mode with TTY auto-detection (interactive by default, non-interactive in CI/CD)

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Jinja2 3.1+, Click 8.1+, PyYAML 6.0+, importlib.metadata (stdlib)
**Storage**: File-based (YAML manifests, Jinja2 templates, generated code) - no database persistence required
**Testing**: pytest 8.0+, pytest-django, pytest-click for CLI testing
**Target Platform**: Cross-platform (Windows, macOS, Linux) with proper path handling
**Project Type**: Single project (CLI tool with Django integration)
**Performance Goals**: Module generation <2 minutes, project bootstrap <5 minutes, template discovery <500ms
**Constraints**: 
- Must reuse existing `check_policy.py` for constitutional validation (no duplicate logic)
- Must work in environments without git (filesystem-based template discovery)
- Generated code must be compatible with both SQLite (dev) and PostgreSQL (production)
- CLI must handle Windows, macOS, and Linux path conventions correctly
**Scale/Scope**: 
- 4 Core built-in templates (minimal, api-first, service, ui-backed)
- Support 10+ custom templates per project
- 100+ module generations per developer per year
- 10+ project bootstraps per quarter across ecosystem

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [x] **Core Focus**: Feature aligns with core concerns (developer tooling, code generation infrastructure)
- [x] **Downstream Extension**: Custom templates enable product-specific patterns via documented extension points

### II. Architecture and Modularity
- [x] **Single Responsibility**: CLI module focused solely on scaffolding; template system, validator, and generator are separate concerns
- [x] **Stable APIs**: Template manifest schema, CLI interface, and validation contracts documented
- [x] **Minimal Dependencies**: Only necessary dependencies (Jinja2, Click, PyYAML); all widely-used and stable
- [x] **No Circular Deps**: CLI → Templates → Generator → Validator (linear dependency graph)
- [x] **No Downstream Imports**: Core scaffolding does not import from product-specific projects

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained throughout CLI and generated code
- [x] **Type Hints**: All CLI modules will use comprehensive type hints; generated code includes type hints
- [x] **Black Formatting**: All code formatted with Black; generated code auto-formatted
- [x] **Ruff Linting**: Ruff as primary linter for CLI and generated code validation
- [x] **No Dead Code**: Template discovery removes unused templates; validation catches unused imports
- [x] **Readable Code**: CLI commands, template loaders, and generators kept small and focused
- [x] **Curated Dependencies**: Jinja2, Click, PyYAML justified (industry standards); no heavyweight dependencies

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework for CLI logic and generated code validation
- [x] **Test Coverage**: Unit tests for template discovery, integration tests for generation, golden file tests for templates
- [x] **Regression Tests**: Template validation tests prevent breaking changes; generation tests catch regressions
- [x] **Deterministic**: All tests deterministic (no network, no random, fixed timestamps in templates)
- [x] **Coverage Thresholds**: Target >80% for CLI logic, 100% for template rendering paths
- [x] **Integration Tests**: End-to-end tests for module generation → validation → files created

### V. Security and Privacy
- [x] **Secure Defaults**: Generated code includes CSRF, secure cookies, ALLOWED_HOSTS from B03 templates
- [x] **DEBUG Off**: Generated projects have DEBUG disabled in production templates
- [x] **No Secrets**: Templates use placeholder values; `.env.example` generated with placeholders
- [x] **Dependency Scanning**: CI scans Jinja2, Click, PyYAML; generated projects include dependency scanning
- [x] **Centralized Auth**: Generated apps use Core auth patterns (no new auth mechanisms)
- [x] **No Sensitive Logging**: CLI logs template names and file paths only; no user-provided variable values logged

### VI. Performance and Reliability
- [x] **No N+1 Queries**: CLI is filesystem-based; no database queries during generation
- [x] **Pagination**: Not applicable (CLI doesn't serve paginated data)
- [x] **Explicit Caching**: Template discovery caches manifests in memory (explicit, documented)
- [x] **Structured Logging**: CLI logs generation events, template discovery, validation results with structured format
- [x] **Health Checks**: Not applicable (CLI tool, not long-running service)
- [x] **Metrics Hooks**: Generation metrics (time, files created, validation results) logged for observability
- [x] **Graceful Degradation**: Atomic rollback on validation failure ensures clean state; clear error messages

### VII. UX and API Design
- [x] **DRF Required**: Generated API modules follow DRF standards (serializers, viewsets, routers)
- [x] **Consistent Responses**: Generated API endpoints use consistent response format from B13
- [x] **Versioning Strategy**: Template schema changes require version bumps; deprecated variables warned
- [x] **Clear Errors**: CLI error messages clear and actionable (no data leaks, suggest fixes)
- [x] **Boundary Validation**: CLI validates inputs before generation; templates validated at discovery time

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: CLI available via `pip install django-core-app`; zero configuration for Core templates
- [x] **Mandatory Tools**: Generated code configured for Black, Ruff, mypy, pytest
- [x] **Pre-commit Hooks**: Generated projects include pre-commit config matching CI
- [x] **Type Checking**: Generated code passes mypy cleanly; CLI itself fully typed
- [x] **Task Scripts**: `--help` flag provides comprehensive usage; `list-templates` for discovery
- [x] **Developer Docs**: quickstart.md, CLI interface contract, template authoring guide

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `020-core-scaffolding-cli` branch
- [x] **Linked to Spec**: PR will reference spec.md and plan.md
- [x] **Focused PRs**: Work packages broken into focused PRs (WP01-WP08)
- [x] **main Stable**: No direct commits to main; all work via feature branch

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest for CLI code; template validation tests in CI
- [x] **Merge Gates**: All CI checks must pass; template generation tests must succeed
- [x] **Scripted Deployment**: CLI deployed via pip package; release process scripted

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: quickstart.md, contracts/, research.md, data-model.md all in kitty-specs/
- [x] **App README**: CLI module will have README with usage examples
- [x] **Getting Started**: quickstart.md covers common workflows with examples
- [x] **Extension Guide**: Template authoring guide documents override mechanism, inheritance, variables
- [x] **Spec Sync**: Implementation keeps spec.md, plan.md, tasks.md synchronized
- [x] **ADR Required**: ADR-021 (template discovery), ADR-022 (validation integration) will be created

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
- [x] **Template Updates**: No template changes required to constitution or spec-kitty templates

### Violations Requiring Justification

**None**: All constitutional principles satisfied. No violations or exceptions required.

**Constitution Check Status**: ✅ PASS (All 12 principles verified - zero violations)

## Project Structure

### Documentation (this feature)

```
kitty-specs/020-core-scaffolding-cli/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file - implementation plan
├── research.md          # Phase 0 - architectural decisions and research findings
├── data-model.md        # Phase 1 - template manifest schema, entities
├── quickstart.md        # Phase 1 - developer guide for using CLI
├── contracts/           # Phase 1 - API and CLI interface contracts
│   └── cli-interface.md
├── checklists/          # Quality validation
│   └── requirements.md  # Spec quality checklist (13/13 passed)
└── tasks.md             # Phase 2 - work packages (NOT yet created - next phase)
```

### Source Code (repository root)

```
# Single project structure - CLI tool with Django integration

src/
└── scaffolding/                      # New CLI module
    ├── __init__.py
    ├── cli.py                        # Click commands (console script entry point)
    ├── management/
    │   └── commands/
    │       └── scaffold.py           # Django management command
    ├── templates/                    # Template discovery and loading
    │   ├── __init__.py
    │   ├── registry.py               # TemplateRegistry
    │   ├── loaders.py                # FileSystemLoader, PackageLoader
    │   └── manifest.py               # TemplateManifest parsing
    ├── generator/                    # Code generation engine
    │   ├── __init__.py
    │   ├── renderer.py               # Jinja2 rendering
    │   ├── builder.py                # File creation, staging
    │   └── atomizer.py               # Atomic move/rollback
    ├── validation/                   # Constitutional validation
    │   ├── __init__.py
    │   ├── runner.py                 # check_policy.py integration
    │   └── reporter.py               # ValidationReport formatting
    ├── built_in_templates/           # Core templates (package data)
    │   ├── minimal/
    │   │   ├── __template__.yaml
    │   │   ├── apps.py.j2
    │   │   ├── models.py.j2
    │   │   └── ...
    │   ├── api-first/
    │   │   ├── __template__.yaml
    │   │   ├── serializers.py.j2
    │   │   ├── views.py.j2
    │   │   └── ...
    │   ├── service/
    │   └── ui-backed/
    ├── config/                       # Configuration loading
    │   ├── __init__.py
    │   └── loader.py                 # .scaffold.yaml, pyproject.toml
    └── utils/                        # Shared utilities
        ├── __init__.py
        ├── paths.py                  # Cross-platform path handling
        └── validators.py             # App name validation

tests/
└── scaffolding/                      # CLI tests
    ├── __init__.py
    ├── conftest.py                   # pytest fixtures
    ├── test_cli.py                   # Click command tests
    ├── test_templates.py             # Template discovery tests
    ├── test_generator.py             # Code generation tests
    ├── test_validation.py            # Constitutional validation tests
    ├── test_e2e.py                   # End-to-end integration tests
    ├── fixtures/                     # Test fixtures
    │   ├── templates/                # Test templates
    │   └── expected_output/          # Golden files for comparison
    └── integration/                  # Integration tests
        ├── test_module_generation.py
        └── test_project_bootstrap.py

docs/
├── scaffolding-cli.md                # User-facing CLI documentation
└── template-authoring.md             # Template authoring guide

# pyproject.toml updated with console script entry point:
# [project.scripts]
# django-core-scaffold = "scaffolding.cli:main"
```

**Structure Decision**: Single project structure chosen because:
- CLI is pure Python tool (no frontend/backend split)
- Integrates with Django but doesn't require web application architecture
- All code lives in `src/scaffolding/` module
- Tests mirror source structure in `tests/scaffolding/`
- Clear separation: CLI (cli.py), Templates (templates/), Generator (generator/), Validation (validation/)

## Complexity Tracking

**No violations** - Constitution check passed all 12 principles with zero exceptions required.

---

## Implementation Roadmap

### Phase 0: Research & Discovery ✅ COMPLETE

**Deliverables**:
- [x] research.md with all architectural decisions documented
- [x] Template discovery strategy defined (hybrid, day-1 optimized)
- [x] Constitutional validation approach defined (post-generation with atomic rollback)
- [x] Template inheritance model defined (file-level, 2-level max)
- [x] Interactive UX strategy defined (smart hybrid with auto-detection)
- [x] Technology stack confirmed (Jinja2, Click, PyYAML)

**Key Decisions**:
1. **Template Discovery**: Hybrid precedence (project → configured → Core → packages)
2. **Validation Timing**: Post-generation with staging + atomic move/rollback
3. **Template Inheritance**: File-level override, max depth 2
4. **Interactive Mode**: Auto-detect TTY, smart hybrid behavior

---

### Phase 1: Design & Contracts ✅ COMPLETE

**Deliverables**:
- [x] data-model.md with template manifest schema, entities
- [x] contracts/cli-interface.md with complete CLI specification
- [x] quickstart.md with developer workflows and examples
- [x] Agent context updated (technologies added to copilot-instructions.md)

**Key Artifacts**:
- Template manifest schema (YAML format, validated via pydantic/dataclasses)
- CLI commands: `module`, `init`, `list-templates`, `validate`
- Exit codes: 0 (success), 1 (validation fail), 2 (invalid input), 3 (template not found), 4 (conflict), 5 (dir exists)
- Built-in templates: minimal, api-first, service, ui-backed

---

### Phase 2: ADR Creation & Planning Finalization (CURRENT PHASE)

**Deliverables**:
- [ ] ADR-021: Template Discovery Mechanism
  * Document precedence order (project → configured → Core → packages)
  * Define package naming convention (`scaffold_templates` entry point group)
  * Specify template resolution algorithm
  * Document override behavior and conflict handling
  * Rationale: Why hybrid approach over filesystem-only or package-only

- [ ] ADR-022: Constitutional Validation Integration
  * Document validation timing (post-generation)
  * Specify atomic rollback mechanism (staging directory → validate → move/rollback)
  * Define validation report format
  * Document `--force` flag behavior and warnings
  * Rationale: Why post-generation with rollback over pre-generation or hybrid

**Status**: Ready to create ADRs (all planning questions resolved)

---

### Phase 3: Work Package Breakdown (NEXT PHASE - `/spec-kitty.tasks`)

**Planned Work Packages** (8 WPs estimated):

1. **WP01: CLI Framework & Entry Points**
   - Console script setup (`django-core-scaffold`)
   - Django management command (`python manage.py scaffold`)
   - Click command structure
   - Global options (--help, --version, --verbose)
   - Exit code handling

2. **WP02: Template Discovery System**
   - TemplateRegistry implementation
   - FileSystemLoader (project-local, configured dirs, Core built-in)
   - PackageLoader (entry point discovery)
   - Template manifest parsing (YAML → TemplateManifest)
   - Inheritance chain resolution (max depth 2)

3. **WP03: Template Rendering Engine**
   - Jinja2 integration
   - Variable substitution
   - Built-in variables (app_name, year, author)
   - Template file processing (.j2 extension stripping)
   - Cross-platform path handling

4. **WP04: Code Generation & Atomic Rollback**
   - File builder (staging directory creation)
   - Atomic move mechanism
   - Rollback on validation failure
   - Permission preservation
   - Conflict detection (app already exists)

5. **WP05: Constitutional Validation Integration**
   - check_policy.py subprocess runner
   - Validation report parsing
   - Error formatting (file, line, rule, suggestion)
   - `--force` flag implementation
   - Exit code handling (0/1)

6. **WP06: Interactive UX & Prompts**
   - TTY detection
   - Click prompts (template selection, variables)
   - Auto-detection logic (interactive vs. non-interactive)
   - `--interactive` / `--no-interactive` flags
   - Progress indicators

7. **WP07: Core Built-in Templates**
   - minimal template (basic Django app)
   - api-first template (DRF module)
   - service template (business logic)
   - ui-backed template (Django templates/forms)
   - Golden file tests for each template

8. **WP08: Testing & Documentation**
   - Unit tests (template discovery, rendering, validation)
   - Integration tests (module generation, project bootstrap)
   - End-to-end tests (CLI invocation → files created)
   - User documentation (CLI usage, template authoring)
   - Developer documentation (extending CLI, plugin packages)

---

### Phase 4: Implementation (FUTURE - `/spec-kitty.implement`)

**Strategy**: Implement work packages sequentially, each followed by review and testing.

**Estimated Duration**: 4-6 weeks (8 work packages × 3-5 days each)

---

### Phase 5: Review & Acceptance (FUTURE - `/spec-kitty.review`, `/spec-kitty.accept`)

**Acceptance Criteria** (from spec.md):
- [x] SC-001: Module generation <2 minutes
- [x] SC-002: 100% constitutional compliance on first generation
- [x] SC-003: Project bootstrap <5 minutes
- [x] SC-004: Generated code includes all required boilerplate
- [x] SC-005: Generated code passes Ruff/mypy
- [x] SC-006: CI/CD automation 100% success rate
- [x] SC-007: Downstream template override without Core changes
- [x] SC-008: Day-1 developer can generate module without docs

---

## Risk Mitigation (from research.md)

### Risk 1: Template Maintenance Burden
**Mitigation**: Golden file tests for each Core template, version templates with Core-App, CI validation on every PR

### Risk 2: Downstream Template Fragmentation
**Mitigation**: Template authoring guide, manifest validation at discovery time, curated examples

### Risk 3: Constitutional Validation False Positives
**Mitigation**: Clear error messages, `--force` flag for opt-out, iterative rule refinement

### Risk 4: Template Security Vulnerabilities
**Mitigation**: check_policy.py catches common issues, warn on third-party templates, sandboxed Jinja2 rendering

---

## Next Steps

1. ✅ **Phase 0 Complete**: research.md created with all architectural decisions
2. ✅ **Phase 1 Complete**: data-model.md, contracts/, quickstart.md created
3. **Phase 2 In Progress**: Create ADR-021 and ADR-022
4. **Phase 2 Next**: Update agent context via `update-agent-context.ps1`
5. **Phase 2 Final**: Commit plan.md with all Phase 0-1 artifacts
6. **Phase 3 Next**: Run `/spec-kitty.tasks` to create tasks.md with work package breakdown

---

## Dependencies

From spec.md:
- **B01 Core Project Skeleton**: CLI generates B01-compliant structure ✅
- **B03 Core Security Baseline**: Generated code includes B03 patterns ✅
- **B04 Core Internationalization**: Generated code includes i18n markers ✅
- **B09 Audit Logging**: Optional integration (nice-to-have)
- **B13 API Foundation**: Generated API modules follow B13 DRF standards ✅
- **B18 Platform Observability**: Optional logging/metrics hooks
- **B19 Deployment Templates**: Bootstrapped projects include B19 configs ✅
- **Constitutional Enforcement Engine**: CLI depends on check_policy.py ✅

All critical dependencies satisfied. Optional dependencies (B09, B18) can be added in future iterations.

---

**Planning Status**: ✅ Phase 0-1 Complete | ⏳ Phase 2 ADRs Pending | 🔜 Phase 3 Tasks Next
