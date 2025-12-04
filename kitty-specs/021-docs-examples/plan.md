# B21 Docs and Examples - Implementation Plan
*Path: kitty-specs/021-docs-examples/plan.md*

**Status**: Draft
**Target**: B21 v1.0

---

## Overview

B21 delivers comprehensive documentation and thematic examples for Django Core-App. The implementation is divided into four work packages that can be worked in parallel with minimal dependencies.

---

## Work Packages

### WP01: Documentation Structure & Navigation (P1)
**Effort**: 2-3 hours
**Dependencies**: None

Create the base documentation structure and navigation:

1. Reorganize existing `docs/` to match target structure
2. Create section index files (`index.md` for each section)
3. Create navigation structure file (`nav.yml`)
4. Add placeholder `mkdocs.yml` (commented)
5. Set up `docs/assets/` directory

**Deliverables**:
- Complete directory structure per spec
- Navigation file for future MkDocs integration
- Link validation script or CI check

---

### WP02: Getting Started & Contributing Documentation (P1)
**Effort**: 4-6 hours
**Dependencies**: WP01 (structure)

Write foundational onboarding and contribution docs:

1. `getting-started/quickstart.md` - Local development setup
2. `getting-started/prerequisites.md` - Required tools
3. `getting-started/first-contribution.md` - First PR workflow
4. `getting-started/project-structure.md` - Directory layout
5. `contributing/spec-kitty-workflow.md` - Feature specification process
6. `contributing/code-style.md` - Python conventions
7. `contributing/testing.md` - pytest patterns
8. `contributing/pr-guidelines.md` - PR process

**Deliverables**:
- Complete getting-started section
- Complete contributing section
- New developer can onboard using docs

---

### WP03: Architecture & Module Documentation (P2)
**Effort**: 6-8 hours
**Dependencies**: WP01 (structure)

Write architecture overview and module reference:

1. `architecture/overview.md` - System diagram (Mermaid)
2. `architecture/layers.md` - API/service/model layering
3. `architecture/extension-points.md` - Customization points
4. `architecture/decisions/README.md` - ADR index
5. `modules/` - One file per Core module:
   - accounts.md, organisations.md, projects.md
   - permissions.md, audit.md, tasks.md
   - notifications.md, settings.md, transactions.md
   - i18n_preferences.md, security_baseline.md, api.md

**Deliverables**:
- Architecture section with Mermaid diagrams
- Complete module reference
- ADR index and cross-references

---

### WP04: API Guides & Troubleshooting (P2)
**Effort**: 3-4 hours
**Dependencies**: WP01 (structure)

Write API usage guides and troubleshooting docs:

1. `guides/authentication.md` - JWT flow with examples
2. `guides/permissions.md` - RBAC patterns
3. `guides/pagination.md` - Cursor pagination
4. `guides/error-handling.md` - Error response format
5. `troubleshooting/local-dev.md` - Common local issues
6. `troubleshooting/migrations.md` - Migration problems
7. `troubleshooting/auth.md` - Auth debugging
8. `troubleshooting/tasks.md` - Celery issues

**Deliverables**:
- Complete guides section
- Complete troubleshooting section
- Links to Swagger UI verified

---

### WP05: CRUD API Example (P1)
**Effort**: 3-4 hours
**Dependencies**: None

Create minimal CRUD API example:

1. Create `examples/crud-api/` directory structure
2. Implement simple `Item` model with CRUD operations
3. Add serializers with validation
4. Add viewset with permissions
5. Add URL routing
6. Write README.md walkthrough
7. Write smoke tests in `tests/examples/`

**Deliverables**:
- Working CRUD API example
- README walkthrough
- Passing smoke tests

---

### WP06: Background Tasks Example (P2)
**Effort**: 3-4 hours
**Dependencies**: None (but assumes B15 complete)

Create background tasks example:

1. Create `examples/background-tasks/` directory structure
2. Implement sample Celery task(s)
3. Add health check integration
4. Add logging/metrics examples
5. Write README.md walkthrough
6. Write smoke tests

**Deliverables**:
- Working background tasks example
- Observability integration demonstrated
- Passing smoke tests

---

### WP07: Scaffolding Demo Example (P2)
**Effort**: 2-3 hours
**Dependencies**: B20 (scaffolding CLI)

Create scaffolding demonstration:

1. Create `examples/scaffolding-demo/` directory structure
2. Document scaffolding commands
3. Show generated output structure
4. Write README.md walkthrough
5. Write smoke tests (CLI invocation, generated code validation)

**Deliverables**:
- Scaffolding workflow demonstrated
- Generated code example
- Passing smoke tests

---

### WP08: Example Walkthroughs & Integration (P2)
**Effort**: 2-3 hours
**Dependencies**: WP05, WP06, WP07

Write example walkthroughs in docs:

1. `docs/examples/index.md` - Examples overview
2. `docs/examples/crud-api.md` - CRUD walkthrough
3. `docs/examples/background-tasks.md` - Tasks walkthrough
4. `docs/examples/scaffolding-demo.md` - Scaffolding walkthrough
5. Configure pytest to discover example tests
6. Add example tests to CI pipeline

**Deliverables**:
- Example documentation complete
- All smoke tests running in CI
- Examples linked from main docs

---

## Milestone Plan

### Milestone 1: Structure & Onboarding (Week 1)
- WP01: Documentation Structure ✓
- WP02: Getting Started & Contributing ✓
- WP05: CRUD API Example ✓

**Exit Criteria**: New developer can onboard using docs, one working example

### Milestone 2: Architecture & Examples (Week 2)
- WP03: Architecture & Modules ✓
- WP06: Background Tasks Example ✓
- WP07: Scaffolding Demo ✓

**Exit Criteria**: Architecture documented, all examples working

### Milestone 3: Guides & Polish (Week 3)
- WP04: API Guides & Troubleshooting ✓
- WP08: Example Walkthroughs & Integration ✓
- Final review and link validation

**Exit Criteria**: All docs complete, all tests passing, ready for merge

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Docs become outdated | Include doc updates in PR checklist |
| Examples break with Core changes | Smoke tests in CI catch regressions |
| Scope creep in examples | Strict "minimal but realistic" principle |
| Missing module docs | Checklist tracks all modules |

---

## Definition of Done

- [ ] All documentation files created per structure
- [ ] All three examples implemented and working
- [ ] Smoke tests passing in CI
- [ ] Link validation passing
- [ ] Mermaid diagrams rendering on GitHub
- [ ] README updated with docs reference
- [ ] Success criteria validated
