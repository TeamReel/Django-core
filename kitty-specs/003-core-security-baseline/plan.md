# Implementation Plan: Core Security Baseline
*Path: kitty-specs/003-core-security-baseline/plan.md*

**Branch**: `003-core-security-baseline` | **Date**: 2025-11-22 | **Spec**: [spec.md](spec.md)
**Status**: Planning Complete - Ready for Task Breakdown

## Summary

The Core Security Baseline establishes comprehensive security enforcement for Django Core-App through runtime validation and CI scanning. Runtime enforcement executes during Django `AppConfig.ready()` as synchronous validators that check Django settings (DEBUG, SECRET_KEY, ALLOWED_HOSTS, sessions, CSRF, headers, passwords, database SSL). CI scanning uses standalone Python scripts for pip-audit dependency scanning, Bandit static analysis, and configuration auditing with incremental scanning strategy. The feature integrates with Constitutional Enforcement Engine (Module 002) as security-specific rules and reporters, ensuring security governance is integral to the platform's constitution.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.x, Constitutional Engine (Module 002 - MERGED), pip-audit >=2.6.0, bandit >=1.7.5, pyyaml >=6.0.1, pybloom-live >=3.1.0
**Storage**: File-based YAML manifests (`.security/manifests/`), no database models required
**Testing**: pytest + pytest-django, 80%+ coverage target, integration tests for strict/advisory modes
**Target Platform**: Linux server (production), macOS/Windows (development)
**Project Type**: Django app (`src/security_baseline/`) + CI scanning scripts (`.security/scripts/`)
**Performance Goals**: Runtime validation <2s startup overhead, CI scanning <10min full scan, <3min incremental
**Constraints**: OWASP ASVS Level 1 compliance (minimum 25 controls), fail-safe behavior (block on engine unavailable)
**Scale/Scope**: 28 functional requirements, 10+ security rules, 26+ OWASP ASVS controls, ~5,000 lines estimated

## Constitution Check

*GATE: ✅ PASSED - All checks completed during spec clarification and planning*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic - all security rules are Django framework-level validations
- [x] **Core Focus**: Security baseline is foundational platform concern, reusable across all downstream products
- [x] **Downstream Extension**: Security manifest allows product-specific rule adjustments via configuration, not code

### II. Architecture and Modularity
- [x] **Single Responsibility**: `security_baseline` Django app focused solely on security validation and enforcement
- [x] **Stable APIs**: SecurityRule interface follows Constitutional Engine plugin pattern (Module 002)
- [x] **Minimal Dependencies**: Only 4 new dependencies (pip-audit, bandit, pyyaml, pybloom-live), all justified in research.md
- [x] **No Circular Deps**: `security_baseline` depends on `constitution_engine`, no reverse dependency
- [x] **No Downstream Imports**: Security baseline operates on Django settings only, no product imports

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline maintained (research.md confirms)
- [x] **Type Hints**: All SecurityRule, SecurityViolation, SecurityReport classes will use dataclasses with type hints
- [x] **Black Formatting**: Pre-commit hooks already configured (Module 001)
- [x] **Ruff Linting**: Already configured (Module 001)
- [x] **No Dead Code**: New feature, no dead code introduced
- [x] **Readable Code**: SecurityRule base class pattern promotes small, focused validators
- [x] **Curated Dependencies**: All dependencies justified in research.md with rationale

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Framework confirmed in spec
- [x] **Test Coverage**: 80%+ target matching Module 002 standards (SC-008)
- [x] **Regression Tests**: Integration tests planned for strict/advisory mode behavior
- [x] **Deterministic**: Security checks are deterministic (settings validation, no external state)
- [x] **Coverage Thresholds**: 80%+ enforced via CI (consistent with existing codebase)
- [x] **Integration Tests**: Startup behavior tests, CI scanning fixture tests planned

### V. Security and Privacy
- [x] **Secure Defaults**: THIS IS THE SECURITY MODULE - enforces secure defaults as primary function
- [x] **DEBUG Off**: FR-001 validates DEBUG=False in production
- [x] **No Secrets**: FR-002 validates SECRET_KEY entropy, security reports sanitize sensitive values
- [x] **Dependency Scanning**: FR-013-016 implement dependency scanning via pip-audit
- [x] **Centralized Auth**: No authentication logic in this module (validation only)
- [x] **No Sensitive Logging**: Security reports sanitize SECRET_KEY, database credentials (research.md confirms)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: No database queries in security validation (settings-only)
- [x] **Pagination**: N/A (no API responses)
- [x] **Explicit Caching**: Bloom filter cached in memory for password validation
- [x] **Structured Logging**: FR-027 requires structured logging with severity levels
- [x] **Health Checks**: Security validation status available via Constitutional Engine health endpoint
- [x] **Metrics Hooks**: Execution time tracked in SecurityReport (FR-028)
- [x] **Graceful Degradation**: Fail-safe behavior documented - strict mode blocks startup if engine unavailable

### VII. UX and API Design
- [x] **DRF Required**: N/A (no external APIs exposed)
- [x] **Consistent Responses**: SecurityReport follows JSON schema contract (contracts/security-report.json)
- [x] **Versioning Strategy**: SecurityReport schema versioned (1.0.0)
- [x] **Clear Errors**: SecurityRuleViolation includes remediation guidance (FR-025)
- [x] **Boundary Validation**: Security rules validate at Django startup boundary

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Quickstart.md provides 5-minute setup guide
- [x] **Mandatory Tools**: Black, Ruff, pytest already configured (Module 001)
- [x] **Pre-commit Hooks**: Existing hooks apply to this feature
- [x] **Type Checking**: mypy will run on security_baseline module (type hints planned)
- [x] **Task Scripts**: CI scanning scripts in `.security/scripts/`
- [x] **Developer Docs**: quickstart.md, research.md, data-model.md created

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Working on `003-core-security-baseline` branch
- [x] **Linked to Spec**: spec.md fully clarified and committed
- [x] **Focused PRs**: Single feature scope (security baseline)
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: FR-016-018 implement CI security scanning gates
- [x] **Merge Gates**: Severity thresholds configurable (FR-020)
- [x] **Scripted Deployment**: CI integration documented in quickstart.md

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: All docs in kitty-specs/003-core-security-baseline/
- [x] **App README**: src/security_baseline/README.md planned (not yet created)
- [x] **Getting Started**: quickstart.md complete
- [x] **Extension Guide**: howto/configuring-security-policies.md planned
- [x] **Spec Sync**: Spec clarifications recorded (Session 2025-11-22)
- [x] **ADR Required**: ADR planned for pip-audit selection, strict/advisory architecture

### XII. Constitution Evolution
- [x] **No Constitution Changes**: Feature complies with existing constitution
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

**None** - All constitutional principles satisfied.

**Constitution Check Status**: ✅ **PASS**

## Project Structure

### Documentation (this feature)

```
kitty-specs/003-core-security-baseline/
├── spec.md                  # Feature specification (clarified 2025-11-22)
├── plan.md                  # This file - implementation plan
├── research.md              # Architecture decisions and technology research
├── data-model.md            # Entity definitions (8 core entities)
├── quickstart.md            # 5-minute setup and usage guide
├── contracts/
│   └── security-report.json # SecurityReport JSON schema contract
└── checklists/
    └── requirements.md      # Specification quality validation
```

### Implementation Structure

```
src/
├── security_baseline/           # New Django app
│   ├── __init__.py
│   ├── apps.py                 # AppConfig with ready() hook for rule registration
│   ├── py.typed                # PEP 561 type marker
│   ├── README.md               # App documentation
│   ├── rules/
│   │   ├── __init__.py
│   │   ├── base.py            # SecurityRule base class
│   │   ├── registry.py        # SecurityRuleRegistry
│   │   ├── django_settings.py # DEBUG, SECRET_KEY, ALLOWED_HOSTS rules
│   │   ├── session_security.py # Session cookie rules
│   │   ├── csrf_protection.py  # CSRF configuration rules
│   │   ├── security_headers.py # HSTS, CSP, X-Frame-Options rules
│   │   ├── password_validation.py # Password policy rules
│   │   └── database_ssl.py    # Database SSL validation
│   ├── validators/
│   │   ├── __init__.py
│   │   └── breach_detector.py # Hybrid bloom filter + HIBP API
│   ├── reporters/
│   │   ├── __init__.py
│   │   └── security_reporter.py # SecurityReport generation
│   ├── config/
│   │   ├── __init__.py
│   │   ├── manifest_loader.py  # Load YAML manifests
│   │   └── asvs_mapper.py     # OWASP ASVS control mapping
│   └── models.py              # Empty (no database models needed)
├── constitution_engine/        # Existing (Module 002)
│   └── [no changes needed]
└── config/
    └── settings/
        ├── base.py            # Add INSTALLED_APPS += ['security_baseline']
        ├── local.py           # SECURITY_ENFORCEMENT_MODE='advisory'
        └── production.py      # SECURITY_ENFORCEMENT_MODE='strict'

.security/                      # New top-level directory
├── manifests/
│   ├── runtime.yaml           # Base security rule configuration
│   ├── bandit.yaml            # Bandit-specific config
│   ├── pip-audit.yaml         # pip-audit exclusions/thresholds
│   └── environments/
│       ├── local.yaml         # Development overrides
│       ├── staging.yaml       # Staging configuration
│       └── production.yaml    # Production strict rules
├── mappings/
│   └── asvs-l1-controls.yaml  # OWASP ASVS Level 1 control mappings
├── scripts/
│   ├── scan_dependencies.py   # pip-audit wrapper (incremental support)
│   ├── scan_code.py           # Bandit wrapper (incremental support)
│   └── audit_config.py        # Django settings validator
└── data/
    └── breached-passwords.bloom # Bloom filter (~50MB, generated)

tests/
└── security_baseline/
    ├── __init__.py
    ├── conftest.py            # pytest fixtures
    ├── rules/
    │   ├── test_django_settings.py
    │   ├── test_session_security.py
    │   ├── test_csrf_protection.py
    │   ├── test_security_headers.py
    │   └── test_password_validation.py
    ├── validators/
    │   └── test_breach_detector.py
    ├── config/
    │   ├── test_manifest_loader.py
    │   └── test_asvs_mapper.py
    └── integration/
        ├── test_startup_strict.py    # Test strict mode blocks startup
        ├── test_startup_advisory.py  # Test advisory mode logs warnings
        └── test_security_report.py   # Test report generation

requirements/
├── base.txt                   # Add: pyyaml>=6.0.1, pybloom-live>=3.1.0
└── local.txt                  # Add: pip-audit>=2.6.0, bandit>=1.7.5
```

**Structure Decision**: Single Django app pattern (Option 1 from template). The `security_baseline` app integrates with existing `constitution_engine` via plugin registration. CI scanning scripts are standalone (`.security/scripts/`) to avoid Django dependency in CI environment.

## Planning Decisions Summary

The following critical architectural decisions were made during planning discovery (2025-11-22):

1. **Module Architecture** (Q1): Django app `src/security_baseline/` that registers rules with Constitutional Engine via plugin interface
   - **Rationale**: Separation of concerns, testability, reusability through plugin pattern

2. **Security Manifest Structure** (Q2): Directory-based `.security/manifests/` with separate YAML files per concern
   - **Rationale**: Clean separation, version control friendly, environment overrides

3. **CI Scanning Implementation** (Q3): Standalone Python CLI scripts in `.security/scripts/` without Django dependencies
   - **Rationale**: CI platform agnostic, fast execution, local developer workflow support

4. **OWASP ASVS Mapping** (Q4): YAML mapping file `.security/mappings/asvs-l1-controls.yaml` loaded at runtime
   - **Rationale**: Updateable without code changes, version controllable, human readable

5. **Password Breach Detection** (Q5): Hybrid bloom filter (local) + HIBP API (fallback) with k-anonymity
   - **Rationale**: Performance (99% <5ms local), comprehensive coverage (600M+ passwords), privacy-preserving

All decisions documented in [research.md](research.md) with implementation patterns.

## Next Steps

### Phase 2: Task Breakdown (Next Command)

Run `/spec-kitty.tasks` to generate `tasks.md` with work package breakdown:

**Recommended Work Package Structure** (based on user story priorities):

- **WP01**: Project structure and dependencies (django app, manifest structure, CI scripts scaffolding)
- **WP02**: SecurityRule base classes and registry (foundation for all rules)
- **WP03**: Django settings security rules (P1 - MVP: DEBUG, SECRET_KEY, ALLOWED_HOSTS)
- **WP04**: Session and CSRF security rules (P1 - MVP)
- **WP05**: Security headers and SSL validation (P1 - MVP)
- **WP06**: Password validation with breach detection (P1 - MVP)
- **WP07**: Security manifest loader and ASVS mapper (P1 - MVP)
- **WP08**: Constitutional Engine integration (P1 - MVP)
- **WP09**: Security report generation and logging (P1 - MVP)
- **WP10**: CI dependency scanning (P2 - pip-audit wrapper, incremental support)
- **WP11**: CI static analysis (P2 - Bandit wrapper, incremental support)
- **WP12**: CI configuration audit (P2 - Django settings validator)
- **WP13**: Environment profiles and configuration flexibility (P3)
- **WP14**: Testing infrastructure (80%+ coverage target)
- **WP15**: Documentation and ADR (security-baseline.md, howto guides, ADR for pip-audit selection)

MVP Completion: WP01-WP09 (User Story 1 - P1: Secure-by-Default Django Deployment)

---

**Plan Status**: ✅ **COMPLETE** - Ready for task breakdown (`/spec-kitty.tasks`)
├── data-model.md        # Phase 1 output (/spec-kitty.plan command)
├── quickstart.md        # Phase 1 output (/spec-kitty.plan command)
├── contracts/           # Phase 1 output (/spec-kitty.plan command)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
