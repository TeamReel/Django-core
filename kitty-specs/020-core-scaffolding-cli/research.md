# Research: Core Scaffolding CLI
*Path: kitty-specs/020-core-scaffolding-cli/research.md*

**Feature**: B20 Core Scaffolding CLI
**Date**: 2025-12-04
**Status**: Planning Phase

---

## Executive Summary

Research findings from planning discovery for B20 Core Scaffolding CLI. All critical architectural decisions resolved through planning interrogation. Zero blocking unknowns remain.

**Key Decisions Made**:
1. **Template Discovery**: Hybrid approach optimized for day-1 usability
2. **Constitutional Validation**: Post-generation with atomic rollback
3. **Template Inheritance**: File-level with 2-level maximum depth
4. **Interactive UX**: Smart hybrid with auto-detection

---

## Research Questions & Findings

### Q1: Template Discovery Strategy

**Question**: How should templates be discovered and prioritized across multiple sources?

**Alternatives Evaluated**:
- **Option A**: Filesystem-only discovery (simple, predictable, less flexible)
- **Option B**: Python package discovery only (flexible, complex, overkill for MVP)
- **Option C**: Hybrid discovery (balanced, day-1 friendly, extensible)

**Decision**: **Option C - Hybrid Discovery (Day-1 Optimized)**

**Rationale**:
- Core-based projects work out-of-the-box with zero configuration
- Project-local templates enable easy customization without modifying Core
- Plugin packages supported as advanced feature, not required for normal use
- Precedence order is intuitive and predictable

**Implementation Details**:
- **Discovery order**:
  1. Project-local templates (`./templates/scaffold/` or configured path)
  2. Configured filesystem directories (via settings or CLI config)
  3. Core built-in templates (shipped with Core-App package)
  4. Optional plugin/template packages (Python entry points)
- **Template resolution**: First match wins (custom overrides Core)
- **Configuration**: Optional `SCAFFOLD_TEMPLATE_DIRS` setting for custom paths
- **Package discovery**: Use `importlib.metadata` entry points for `scaffold_templates` group

**Alternatives Rejected**:
- **Filesystem-only**: Insufficient for distributing templates via pip packages
- **Package-only**: Too complex for simple project-local overrides, requires packaging knowledge

---

### Q2: Constitutional Validation Integration

**Question**: When and how should constitutional validation (check_policy.py) run during scaffolding?

**Alternatives Evaluated**:
- **Option A**: Pre-generation validation (fast feedback, limited validation scope)
- **Option B**: Post-generation validation (validates actual output, question on failure handling)
  - **B1**: Roll back all generated files (atomic, clean state)
  - **B2**: Leave files but mark invalid (manual fixes required)
  - **B3**: Attempt auto-fix for violations (complex, risky)
- **Option C**: Hybrid validation (pre + post, most thorough but slower)

**Decision**: **Option B + B1 - Post-generation with Atomic Rollback**

**Rationale**:
- Validates actual generated code, not just template structure
- Atomic rollback ensures clean project state on validation failure
- Aligns with spec's "100% constitutional compliance on first generation" success criterion
- `--force` flag provides explicit opt-out for advanced users with clear warnings

**Implementation Details**:
- **Generation workflow**:
  1. Generate all files into temporary staging directory (e.g., `/tmp/scaffold-{uuid}/`)
  2. Run `check_policy.py` against staged output
  3. **If validation passes**: Atomically move staged files to target location
  4. **If validation fails**: Delete staged directory, surface structured error report, exit with non-zero code
- **Validation checks**:
  - B01 structure compliance (required directories, file patterns)
  - B03 security baseline (no hardcoded secrets, secure defaults present)
  - B04 i18n patterns (gettext markers in user-facing strings)
  - Code quality (Ruff linting passes, type hints present)
  - Testing structure (tests/ directory, pytest patterns)
- **Error reporting**:
  - Show violation type, file path, line number, suggested fix
  - Exit with code 1 for CI/CD failure detection
- **Force flag**: `--force` or `--skip-validation` bypasses checks with warning message

**Alternatives Rejected**:
- **Pre-generation only**: Can't validate final rendered code with variable substitutions
- **Leave invalid files**: Pollutes project with broken code, confusing developer experience
- **Auto-fix**: Too complex for MVP, risk of incorrect automated fixes

---

### Q3: Template Inheritance Model

**Question**: How should custom templates extend/override Core templates?

**Alternatives Evaluated**:
- **Option A**: Simple override (no inheritance, complete replacement)
- **Option B**: File-level inheritance (custom overrides specific files, inherits rest)
- **Option C**: Block-level inheritance (Jinja2 `{% extends %}` mechanism)

**Decision**: **Option B - File-level Inheritance with 2-level Maximum Depth**

**Rationale**:
- Balances simplicity (template authors don't need to understand complex inheritance chains) with flexibility (can override specific files without duplicating entire templates)
- 2-level depth limit prevents confusing multi-layer hierarchies
- File-level is intuitive: same-named file in child overrides parent
- Individual template files can still use Jinja2 block inheritance internally

**Implementation Details**:
- **Manifest declaration**: Custom template declares `extends: core/<template-name>` in `__template__.yaml`
- **File resolution**:
  1. Check child template for file (e.g., `custom/api-extended/models.py.j2`)
  2. If not found, check parent template (e.g., `core/api-first/models.py.j2`)
  3. If not found, check grandparent (if exists, max depth 2)
  4. If still not found, error (required file missing)
- **Override behavior**: Child file completely replaces parent file (no automatic merging)
- **Inheritance chain**:
  - **Valid**: `custom → core → base` (depth 2)
  - **Valid**: `custom → core` (depth 1)
  - **Invalid**: `custom → intermediate → core → base` (depth 3, fail fast with error)
- **Conflict detection**: Validate inheritance chain at template discovery time, fail early on circular dependencies or depth violations

**Alternatives Rejected**:
- **Simple override**: Forces duplication of entire template for small changes
- **Block-level inheritance**: Too complex for MVP, harder to debug, steep learning curve for template authors

---

### Q4: Interactive vs. Non-Interactive UX

**Question**: How should CLI balance discoverability for new users with automation for experienced teams?

**Alternatives Evaluated**:
- **Option A**: Minimal prompts (fast, predictable, good for CI/CD but poor discoverability)
- **Option B**: Guided interactive (discoverable, friendly, requires explicit opt-out)
- **Option C**: Smart hybrid with auto-detection (best of both worlds)

**Decision**: **Option C - Smart Hybrid with Auto-detection**

**Rationale**:
- Day-1 developers get friendly guided experience without reading docs
- Experienced teams get predictable, scriptable behavior automatically in CI/CD
- Auto-detection reduces cognitive load (no need to remember `--no-interactive` flag)
- Explicit flags available for edge cases

**Implementation Details**:
- **Auto-detection logic**:
  ```python
  import sys
  is_interactive = sys.stdin.isatty() and not any_flags_provided()
  ```
- **Interactive mode** (TTY + no flags):
  - Prompt for app name if not provided as positional arg
  - Show template selection menu with descriptions
  - Ask for required custom variables with defaults
  - Confirm generation before proceeding
- **Non-interactive mode** (non-TTY OR flags provided):
  - Use positional args and flags directly
  - Use sensible defaults for missing values
  - No prompts, fail fast on missing required values
- **Explicit control**:
  - `--no-interactive`: Force non-interactive even in TTY (for scripts run in terminal)
  - `--interactive`: Force interactive even with flags (for guided exploration)
- **CI/CD detection**: Recognize common CI environment variables (CI=true, GITHUB_ACTIONS, etc.)

**Example Flows**:

**Flow 1 - Interactive (TTY, no flags)**:
```bash
$ django-core-scaffold module payments
? Select a template:
  1) api-first - REST API module with DRF
  2) service - Business logic module (no API)
  3) ui-backed - Module with Django templates/forms
  4) minimal - Basic Django app structure
> 1
? Enter model name (default: Payment): Invoice
✓ Generating module 'payments' with template 'api-first'...
✓ Running constitutional validation...
✓ Module created successfully!

Next steps:
  1. Add 'payments' to INSTALLED_APPS in settings.py
  2. Run: python manage.py makemigrations
  3. Implement business logic in src/payments/
```

**Flow 2 - Non-interactive (flags provided)**:
```bash
$ django-core-scaffold module payments --template api-first --model-name Invoice
✓ Module created successfully!
```

**Flow 3 - CI/CD (no TTY)**:
```bash
$ django-core-scaffold module testdata --template minimal
✓ Module created successfully!
```

**Alternatives Rejected**:
- **Minimal prompts**: Poor discoverability for new users, high barrier to entry
- **Guided interactive**: Requires explicit `--no-interactive` in every CI/CD script, error-prone

---

## Technology Stack Decisions

### Core Dependencies

| Dependency | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| **Python** | 3.12+ | Runtime | Core-App baseline, modern type hints support |
| **Django** | 5.1+ | Framework | Core-App baseline |
| **Jinja2** | 3.1+ | Template rendering | Industry standard, familiar to Django developers, powerful variable substitution |
| **Click** | 8.1+ | CLI framework | Feature-rich, widely used, supports both console scripts and Django commands, good interactive prompt support |
| **PyYAML** | 6.0+ | Template manifest parsing | Standard for configuration files, human-readable |
| **importlib.metadata** | stdlib | Plugin discovery | Standard library, no additional dependency |

### Why Jinja2 over Django Templates?

**Decision**: Use Jinja2 for template rendering

**Rationale**:
- More flexible syntax for code generation (better whitespace control)
- Widely understood beyond Django (Ansible, Flask, etc.)
- Powerful variable substitution and filters
- Better support for file-level template inheritance
- Django templates still used in generated output (no user-facing impact)

### Why Click over argparse?

**Decision**: Use Click for CLI framework

**Rationale**:
- Built-in support for interactive prompts (`click.prompt`, `click.Choice`)
- Automatic help generation with rich formatting
- Easy subcommand management (scaffold app, scaffold init, etc.)
- Better error handling and user-friendly messages
- Widely adopted in Python ecosystem (Flask, Ruff, Black all use Click)

---

## Architecture Patterns

### Template Discovery Architecture

```
TemplateRegistry
├── FileSystemTemplateLoader
│   ├── ProjectLocalLoader (./templates/scaffold/)
│   ├── ConfiguredDirsLoader (SCAFFOLD_TEMPLATE_DIRS)
│   └── CoreBuiltinLoader (package data)
└── PackageTemplateLoader
    └── EntryPointDiscovery (importlib.metadata)

Discovery Flow:
1. Scan project-local directory
2. Scan configured directories
3. Scan Core package templates
4. Scan installed package entry points
5. Resolve inheritance chains
6. Validate template manifests
7. Build template catalog
```

### Generation Workflow Architecture

```
ScaffoldCommand
├── InputParser (Click commands, prompts)
├── TemplateResolver (discovery + selection)
├── VariableCollector (prompts, flags, defaults)
└── Generator
    ├── Renderer (Jinja2 engine)
    ├── Validator (check_policy.py integration)
    └── Atomizer (staging + move/rollback)

Generation Flow:
1. Parse CLI inputs (app name, template, flags)
2. Resolve template (discover + validate inheritance)
3. Collect variables (interactive prompts or flags)
4. Render templates to staging directory
5. Run constitutional validation
6. IF PASS: Atomically move to target
7. IF FAIL: Delete staging, show report, exit 1
```

### Constitutional Validation Integration

```
ConstitutionalValidator
├── PolicyRunner (subprocess to check_policy.py)
├── ReportParser (parse validation output)
└── ReportPresenter (format for CLI)

Validation Flow:
1. Generate code to /tmp/scaffold-{uuid}/
2. Run: check_policy.py --path /tmp/scaffold-{uuid}/
3. Parse JSON/text output
4. IF violations:
   - Format error report (file, line, rule, suggestion)
   - Delete staging directory
   - Exit with code 1
5. IF pass:
   - Move staging to target atomically
   - Show success message
```

---

## Risk Mitigation

### Risk 1: Template Maintenance Burden

**Risk**: As Core-App evolves, templates need continuous updates to stay compatible.

**Mitigation Strategy**:
- **Automated tests**: Golden file tests for each Core template (generate → compare output)
- **Version templates with Core**: Template changes tracked in CHANGELOG, semantic versioning
- **CI validation**: Every Core-App PR runs template generation tests
- **Template linter**: Validate template manifests and Jinja2 syntax at CI time

**Monitoring**: Track template generation failures in CI, alert on >5% failure rate

---

### Risk 2: Downstream Template Fragmentation

**Risk**: Different teams create incompatible custom templates, reducing consistency across ecosystem.

**Mitigation Strategy**:
- **Template authoring guide**: Document best practices, common patterns, pitfalls
- **Template validation**: CLI validates custom templates at discovery time (missing required files, invalid manifest syntax)
- **Template examples**: Provide well-documented example custom template in docs
- **Community templates**: Optional: curate list of recommended third-party templates (future)

**Monitoring**: None (accept some fragmentation as tradeoff for flexibility)

---

### Risk 3: Constitutional Validation False Positives

**Risk**: Overly strict validation blocks legitimate code patterns, frustrating developers.

**Mitigation Strategy**:
- **Clear error messages**: Show exactly what violated which rule, suggest fix
- **Force flag**: `--force` allows explicit opt-out with warning
- **Iterative rule refinement**: Monitor validation failures, adjust rules in check_policy.py
- **Documentation**: Document common false positives and how to handle them

**Monitoring**: Track `--force` flag usage, investigate high usage patterns

---

### Risk 4: Template Security Vulnerabilities

**Risk**: Malicious template packages could generate unsafe code (e.g., hardcoded secrets, SQL injection).

**Mitigation Strategy**:
- **Constitutional validation**: check_policy.py catches common security issues
- **Template source warnings**: Warn when using templates from third-party packages
- **Sandboxed rendering**: Jinja2 sandboxed mode (disable dangerous filters/tags)
- **Code review**: All Core templates manually reviewed before release

**Monitoring**: None for MVP (rely on validation + code review)

---

## Open Questions Resolved

All open questions from specification phase resolved during planning:

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Template inheritance depth** | Max 2 levels | Prevents complex chains, keeps mental model simple |
| **Template versioning** | Versioned with Core-App | Templates ship with releases, regeneration uses latest |
| **Validation strictness** | Block by default, `--force` to bypass | Ensures compliance, allows escape hatch for edge cases |
| **Template testing** | Golden file tests | Generate → compare output to expected fixtures |
| **Interactive prompts** | Auto-detect TTY, smart hybrid | Day-1 friendly, CI/CD automatic |
| **Constitutional conflicts** | Validation catches all violations | No special handling for custom templates |
| **Template manifest schema** | Minimal viable (see data-model.md) | name, description, extends, variables, files |
| **Migration generation** | No, leave to makemigrations | Keep scaffolding simple, migrations are dynamic |

---

## Next Steps

1. **Phase 1 Design**: Create data-model.md with template manifest schema, API contracts
2. **Phase 1 Contracts**: Define CLI interface contracts (commands, flags, exit codes)
3. **Phase 1 Quickstart**: Document scaffolding workflow for developers
4. **ADR Creation**:
   - ADR-021: Template discovery mechanism (precedence, resolution, package format)
   - ADR-022: Constitutional validation integration (timing, rollback, error reporting)
5. **Phase 2 Tasks**: Break down into work packages (WP01-WP08)

---

**Research Status**: ✅ Complete - All architectural decisions resolved, zero blocking unknowns
