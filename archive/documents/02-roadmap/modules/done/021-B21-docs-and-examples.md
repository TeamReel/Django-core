# B21: Docs & Examples

**Phase:** 5
**Status:** ✅ Done
**Module ID:** 021
**Category:** Platform

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 21. B21 – Docs & Examples Repository

**Doel**: Comprehensive docs en example projects verbinden alle pieces.

**Status**: ✅ Complete

**Key Features**:
- MkDocs documentation site
- Module reference docs (B01-B21)
- Integration guides
- API documentation (OpenAPI)
- Example implementations (examples/ directory)
- Troubleshooting guides
- Architecture Decision Records (ADRs)

---

**Fase 5 Compleet**: 4 modules (B18-B21)
**Outcome**: Ready to deploy, observe and extend as a platform
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Docs and Examples
*Path: kitty-specs/021-docs-examples/spec.md*

**Feature Branch**: `021-docs-examples`
**Created**: 2025-12-04
**Status**: Draft
**Input**: User description: "Documentation site and example implementations for onboarding developers, explaining architecture, demonstrating Core features, and documenting the Spec Kitty workflow."

---

## Summary

B21 provides comprehensive documentation and thematic example implementations for Django Core-App. Documentation is structured as plain Markdown optimized for MkDocs/Sphinx compatibility, with Mermaid diagrams for architecture visualization. Examples are minimal but realistic sub-projects demonstrating Core API, background tasks, and scaffolding workflows, with medium-weight smoke tests ensuring they stay in sync with Core.

**Goals**:
- Provide clear onboarding material for new developers joining Core-based projects
- Document the architecture and design decisions of the Core-App platform
- Offer realistic example implementations that demonstrate Core features in practice
- Document the Spec Kitty workflow for feature specification and implementation
- Structure docs for future hosting (ReadTheDocs/GitHub Pages) without requiring rewrites

**Non-Goals**:
- Product-specific documentation (downstream products document themselves)
- Exhaustive internal implementation details (focus on usage, not internals)
- Marketing materials or sales-oriented content
- Full API reference generation (link to existing Swagger UI instead)
- Comprehensive integration test coverage for examples (medium-weight smoke tests only)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New Developer Quick Start (Priority: P1)

A new developer joining a team using Django Core-App needs to understand the platform and start contributing within their first day.

**Why this priority**: First impression matters; poor onboarding leads to frustration and slower ramp-up time.

**Independent Test**: Developer follows getting-started guide from scratch, has working local environment and has made a simple change within 2 hours.

**Acceptance Scenarios**:

1. **Given** developer has cloned Core-App repo, **When** they read `docs/getting-started/quickstart.md`, **Then** they can run the project locally with `docker-compose up` within 15 minutes
2. **Given** developer has working local environment, **When** they read `docs/getting-started/first-contribution.md`, **Then** they understand how to create a branch, make a change, run tests, and submit a PR
3. **Given** developer wants to understand project structure, **When** they read `docs/architecture/overview.md`, **Then** they understand the layered architecture and where different concerns belong
4. **Given** developer needs to understand a specific module, **When** they navigate `docs/modules/<module-name>.md`, **Then** they find purpose, key concepts, and usage examples for that module

---

### User Story 2 - Contributor Workflow Understanding (Priority: P1)

A developer needs to add a new feature to Core-App and wants to follow the established workflow (Spec Kitty) for specification, planning, and implementation.

**Why this priority**: Consistent workflows ensure quality and maintainability; contributors must understand the process.

**Independent Test**: Developer follows Spec Kitty documentation to create a new feature specification, plans it, and begins implementation following documented patterns.

**Acceptance Scenarios**:

1. **Given** developer needs to add a feature, **When** they read `docs/contributing/spec-kitty-workflow.md`, **Then** they understand the specify → plan → tasks → implement → review → accept lifecycle
2. **Given** developer is creating a specification, **When** they use the spec template from docs, **Then** they produce a specification that passes Spec Kitty validation
3. **Given** developer wants to understand ADR conventions, **When** they read `docs/architecture/decisions/README.md`, **Then** they know when and how to create Architecture Decision Records
4. **Given** developer needs to update an existing feature, **When** they read `docs/contributing/updating-features.md`, **Then** they understand how to modify specs, update tests, and maintain backward compatibility

---

### User Story 3 - Example-Driven Learning (Priority: P1)

A product team starting a new downstream project wants to see realistic examples of how Core features work together before implementing their own modules.

**Why this priority**: Examples are the fastest path to understanding; teams copy and adapt proven patterns.

**Independent Test**: Team copies CRUD API example, modifies entity names, and has working API in under 1 hour.

**Acceptance Scenarios**:

1. **Given** team wants to build a REST API, **When** they examine `examples/crud-api/`, **Then** they see complete working example with auth, permissions, pagination, and tests
2. **Given** team needs background processing, **When** they examine `examples/background-tasks/`, **Then** they see Celery task definitions, health checks, and observability integration
3. **Given** team is bootstrapping a new product, **When** they examine `examples/scaffolding-demo/`, **Then** they understand how to use Core Scaffolding CLI to generate their project structure
4. **Given** team runs example smoke tests, **When** Core has breaking changes, **Then** smoke tests fail and indicate what needs updating

---

### User Story 4 - API Usage Patterns (Priority: P2)

A developer integrating with Core-App APIs needs conceptual guides explaining how to use endpoints effectively, beyond just the OpenAPI schema.

**Why this priority**: Swagger shows what's available; guides explain how to use it correctly in context.

**Independent Test**: Developer reads API guide, understands authentication flow, and successfully makes authenticated requests.

**Acceptance Scenarios**:

1. **Given** developer needs to authenticate, **When** they read `docs/guides/authentication.md`, **Then** they understand JWT flow, token refresh, and session handling
2. **Given** developer needs to implement permissions, **When** they read `docs/guides/permissions.md`, **Then** they understand RBAC model, role assignment, and permission checking
3. **Given** developer wants to see API examples, **When** docs reference `/api/docs/`, **Then** they can access the live Swagger UI for detailed endpoint reference
4. **Given** developer encounters an error, **When** they read `docs/guides/error-handling.md`, **Then** they understand error response format and how to handle common errors

---

### User Story 5 - Architecture Deep Dive (Priority: P2)

A tech lead evaluating Core-App or planning a major feature needs to understand the architectural decisions and constraints.

**Why this priority**: Architecture docs prevent costly mistakes and ensure alignment with platform principles.

**Independent Test**: Tech lead reads architecture docs and can explain layering, extension points, and constitutional principles to their team.

**Acceptance Scenarios**:

1. **Given** tech lead needs to understand layering, **When** they read `docs/architecture/layers.md`, **Then** they understand separation of API, service, model, and infrastructure layers
2. **Given** tech lead wants to see system components, **When** they view `docs/architecture/overview.md`, **Then** Mermaid diagrams show how modules interact
3. **Given** tech lead needs to understand design decisions, **When** they browse `docs/adr/`, **Then** they find ADRs explaining key choices with context and consequences
4. **Given** tech lead wants to extend Core, **When** they read `docs/architecture/extension-points.md`, **Then** they understand where and how downstream products can customize

---

### User Story 6 - Troubleshooting Common Issues (Priority: P3)

A developer encounters an issue and needs to quickly find solutions without reading extensive documentation.

**Why this priority**: Fast problem resolution improves developer experience; reduces support burden.

**Independent Test**: Developer with common error finds solution in troubleshooting guide within 5 minutes.

**Acceptance Scenarios**:

1. **Given** developer has migration error, **When** they check `docs/troubleshooting/migrations.md`, **Then** they find common causes and solutions
2. **Given** developer has authentication issue, **When** they check `docs/troubleshooting/auth.md`, **Then** they find debugging steps and common fixes
3. **Given** developer has Celery task issue, **When** they check `docs/troubleshooting/tasks.md`, **Then** they find logging tips and common configuration problems
4. **Given** developer can't find answer in docs, **When** troubleshooting page lacks solution, **Then** it points to where to ask for help (issues, discussions)

---

### Edge Cases

- **Docs-code drift**: Documentation becomes outdated as Core evolves. Mitigation: Smoke tests on examples, link validation in CI, doc review in PR process
- **Stale examples**: Examples stop working with Core updates. Mitigation: Medium-weight smoke tests run in CI for all examples
- **Broken internal links**: Doc restructuring breaks cross-references. Mitigation: Link checker in CI, relative links within docs/
- **Diagram rendering**: Mermaid not supported in some contexts. Mitigation: Mermaid works on GitHub, MkDocs, and most doc tools; fallback is code block
- **Example complexity creep**: Examples grow too complex and become hard to maintain. Mitigation: Strict scope per example, minimal but realistic
- **Missing module docs**: New modules added without documentation. Mitigation: Doc requirement in Spec Kitty workflow, PR checklist

---

## Requirements *(mandatory)*

### Functional Requirements

#### Documentation Structure

- **FR-001**: System MUST organize documentation under `docs/` with MkDocs-compatible directory structure
- **FR-002**: System MUST include top-level sections: `getting-started/`, `architecture/`, `guides/`, `modules/`, `examples/`, `contributing/`, `troubleshooting/`
- **FR-003**: Each section MUST include an `index.md` or `README.md` serving as section landing page
- **FR-004**: System MUST include navigation structure file (`nav.yml` or equivalent) defining doc hierarchy for future MkDocs/Sphinx integration
- **FR-005**: All documentation MUST be written in Markdown following CommonMark specification with GitHub Flavored Markdown extensions
- **FR-006**: Documentation MUST use relative links for internal cross-references (no absolute URLs to repo files)

#### Getting Started Documentation

- **FR-007**: System MUST include `docs/getting-started/quickstart.md` covering local development setup (< 15 min to first run)
- **FR-008**: System MUST include `docs/getting-started/prerequisites.md` listing required tools (Python, Docker, etc.)
- **FR-009**: System MUST include `docs/getting-started/first-contribution.md` guiding first PR workflow
- **FR-010**: System MUST include `docs/getting-started/project-structure.md` explaining directory layout and conventions

#### Architecture Documentation

- **FR-011**: System MUST include `docs/architecture/overview.md` with high-level system diagram (Mermaid)
- **FR-012**: System MUST include `docs/architecture/layers.md` explaining API, service, model, infrastructure layering
- **FR-013**: System MUST include `docs/architecture/extension-points.md` documenting where downstream products extend Core
- **FR-014**: System MUST maintain ADR documentation in `docs/adr/` following established ADR format
- **FR-015**: Architecture diagrams MUST use Mermaid code blocks (renders on GitHub, compatible with doc tools)

#### Module Documentation

- **FR-016**: System MUST include `docs/modules/` directory with one file per Core module (accounts, audit, organisations, etc.)
- **FR-017**: Each module doc MUST include: Purpose, Key Concepts, Models, API Endpoints (linked to Swagger), Usage Examples, Configuration Options
- **FR-018**: Module docs MUST link to relevant ADRs and architecture decisions where applicable

#### API Guides

- **FR-019**: System MUST include `docs/guides/authentication.md` explaining JWT auth flow with code examples
- **FR-020**: System MUST include `docs/guides/permissions.md` explaining RBAC model and permission checking
- **FR-021**: System MUST include `docs/guides/pagination.md` explaining cursor pagination patterns
- **FR-022**: System MUST include `docs/guides/error-handling.md` explaining error response format
- **FR-023**: API guides MUST link to `/api/docs/` (Swagger UI) as canonical API reference, not duplicate it

#### Contributing Documentation

- **FR-024**: System MUST include `docs/contributing/spec-kitty-workflow.md` documenting full specification lifecycle
- **FR-025**: System MUST include `docs/contributing/code-style.md` documenting Python conventions, formatting, type hints
- **FR-026**: System MUST include `docs/contributing/testing.md` documenting pytest patterns and coverage requirements
- **FR-027**: System MUST include `docs/contributing/pr-guidelines.md` documenting PR process, review expectations

#### Example Implementations

- **FR-028**: System MUST include `examples/crud-api/` demonstrating Core API layer (auth, permissions, serializers, pagination)
- **FR-029**: System MUST include `examples/background-tasks/` demonstrating Celery tasks, health checks, logging/metrics
- **FR-030**: System MUST include `examples/scaffolding-demo/` demonstrating Core Scaffolding CLI project bootstrap
- **FR-031**: Each example MUST be a sub-project within main repo sharing Core's environment (not standalone)
- **FR-032**: Each example MUST include README.md with purpose, setup, and walkthrough
- **FR-033**: Each example MUST include `tests/` directory with medium-weight smoke tests

#### Example Testing

- **FR-034**: Example smoke tests MUST run against actual database (not mocked)
- **FR-035**: Example smoke tests MUST verify key flows work end-to-end (create, read, update, delete for CRUD; task execution for background tasks)
- **FR-036**: Example smoke tests MUST be included in main CI pipeline (failures block PRs)
- **FR-037**: Example smoke tests MUST be lightweight enough to run in under 30 seconds per example
- **FR-038**: Examples MUST track `main` branch (always up-to-date with current Core APIs)

#### Future Hosting Preparation

- **FR-039**: Documentation structure MUST be compatible with MkDocs Material theme without restructuring
- **FR-040**: System MUST include placeholder `mkdocs.yml` configuration (commented out or in docs-tooling branch)
- **FR-041**: All images and assets MUST be stored in `docs/assets/` or `docs/_static/`
- **FR-042**: Documentation MUST NOT depend on any external services for basic rendering (works as plain Markdown on GitHub)

### Key Entities

- **DocSection**: Logical grouping of documentation files (getting-started, architecture, guides, etc.). Maps to directories under docs/.
- **ModuleDoc**: Documentation for a single Core module. Contains purpose, concepts, models, API links, examples.
- **Example**: Thematic implementation demonstrating Core features. Contains source code, README, smoke tests.
- **SmokeTest**: Lightweight functional test for an example. Verifies key flows work with real database.
- **Diagram**: Mermaid code block visualizing architecture or flow. Embedded in Markdown, renders on GitHub.
- **ADR**: Architecture Decision Record. Documents significant technical decision with context, decision, consequences.

---

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic (docs are about Core-App platform, not downstream products)
- [x] All functionality is reusable across multiple downstream products (examples demonstrate patterns, not products)
- [x] Extension points are clearly documented (docs explain where downstream extends Core)

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering (docs organized by concern, examples are isolated sub-projects)
- [x] No circular dependencies introduced (docs and examples are content, not code dependencies)
- [x] Extension points are stable and documented (architecture docs cover extension mechanisms)

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained (examples use modern Python, type hints)
- [x] Type hints will be used in example code (examples demonstrate best practices)
- [x] Code will be formatted with Black and linted with Ruff (examples pass same quality gates as Core)

### Testing (Principle IV)
- [x] Test plan includes pytest tests (smoke tests for each example)
- [x] Coverage targets defined (smoke tests cover key flows, not exhaustive coverage)
- [x] Integration tests planned for key flows (examples are integration tests by nature)

### Security & Privacy (Principle V)
- [x] Secure defaults maintained (examples use Core security patterns)
- [x] No secrets in code (examples use env vars, .env.example patterns)
- [x] Authentication/authorization handled through centralized mechanisms (examples use Core auth)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (examples demonstrate proper queryset usage)
- [x] Pagination implemented (examples show cursor pagination patterns)
- [x] Structured logging included (examples demonstrate logging best practices)

### API Design (Principle VII)
- [x] DRF standards followed (examples follow Core API patterns)
- [x] API responses are consistent (examples demonstrate standard response format)

### Documentation (Principle XI)
- [x] Feature documentation plan included (B21 IS the documentation feature)
- [x] Extension guide updates identified (architecture docs cover extension points)

**Violations Requiring Justification**: None. Documentation and examples are infrastructure for the platform.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New developer can have working local environment within 30 minutes of following quickstart guide
- **SC-002**: New developer can make first contribution within 2 hours of starting onboarding docs
- **SC-003**: All three thematic examples (CRUD API, background tasks, scaffolding) pass smoke tests in CI
- **SC-004**: 100% of Core modules have corresponding module documentation in `docs/modules/`
- **SC-005**: All Mermaid diagrams render correctly on GitHub and in MkDocs preview
- **SC-006**: Documentation passes link validation (no broken internal links)
- **SC-007**: Product team can copy and adapt CRUD API example to new entity in under 1 hour
- **SC-008**: Documentation structure can be built with `mkdocs build` without errors (after adding mkdocs.yml)

---

## Technical Constraints

- All documentation MUST be Markdown (CommonMark + GFM extensions)
- Diagrams MUST use Mermaid syntax (no binary images for architecture diagrams)
- Examples MUST run with Core's existing dependencies (no additional packages beyond Core)
- Examples MUST use shared Core settings and database configuration
- Smoke tests MUST complete in under 30 seconds per example
- Documentation structure MUST be compatible with MkDocs and Sphinx without restructuring
- All links MUST be relative within docs/ (portable across hosting platforms)

---

## Assumptions

- Developers have basic familiarity with Django and REST APIs
- Developers have Docker installed for local development
- Core-App CI/CD pipeline can run example smoke tests as part of standard test suite
- GitHub renders Mermaid diagrams in Markdown files (current functionality)
- MkDocs Material theme is the likely future hosting choice (but docs work with alternatives)
- Example code will be maintained alongside Core changes (same PR when breaking changes occur)

---

## Open Questions for Planning Phase

1. **Example scope boundaries**: How much functionality should each example include? (Proposal: minimum viable demonstration of feature area)
2. **Smoke test database**: Should examples use shared test database or isolated databases? (Proposal: use shared test database from conftest.py)
3. **Example discovery in tests**: How should pytest discover example smoke tests? (Proposal: `tests/examples/` directory with standard test files)
4. **Module doc generation**: Should module docs be partially auto-generated from code? (Proposal: hand-written for v1, consider automation later)
5. **Doc versioning**: Should docs be versioned with releases or always show latest? (Proposal: docs track main, releases can reference specific commits)
6. **Changelog integration**: Should CHANGELOG.md be part of docs site? (Proposal: yes, link from docs index)

---

## Risks

- **Documentation maintenance burden**: Docs become outdated as Core evolves. Mitigation: Include doc updates in PR checklist, smoke tests catch breaking changes.
- **Example scope creep**: Examples grow too complex to maintain. Mitigation: Strict "minimal but realistic" principle, regular cleanup.
- **Tooling lock-in**: MkDocs-biased structure doesn't work with Sphinx. Mitigation: Standard Markdown, minimal MkDocs-specific features.
- **Diagram complexity**: Mermaid diagrams become unmaintainable. Mitigation: Keep diagrams focused, one concept per diagram.
- **Contributor confusion**: Too many docs, hard to find things. Mitigation: Clear navigation structure, search-friendly headings.

---

## Dependencies

- **B01 Core Project Skeleton**: Examples follow B01 structure
- **B05 Core Accounts Authentication**: Examples use Core auth
- **B08 Hierarchical Access Control**: Examples demonstrate permissions
- **B13 API Foundation Standards**: CRUD API example follows B13 patterns
- **B15 Tasks Scheduling Foundation**: Background tasks example uses B15 Celery setup
- **B18 Platform Observability**: Examples include observability hooks
- **B20 Core Scaffolding CLI**: Scaffolding demo example uses B20 CLI

---

## Out of Scope (Explicitly Excluded)

- **Full API reference generation**: Use existing Swagger UI, don't duplicate
- **Video tutorials**: Text documentation only for v1
- **Interactive tutorials**: No Jupyter notebooks or interactive shells
- **Translated documentation**: English only for v1 (i18n for docs is separate effort)
- **Downstream product documentation**: Each product documents itself
- **Deployment guides**: B19 covers deployment; docs just link to it
- **Performance tuning guides**: Not in scope for v1
- **Complete test coverage for examples**: Smoke tests only, not comprehensive

---

## Deliverables

### Documentation Tree

```
docs/
├── index.md                          # Landing page with navigation
├── getting-started/
│   ├── index.md
│   ├── quickstart.md                 # < 15 min to first run
│   ├── prerequisites.md              # Required tools
│   ├── first-contribution.md         # First PR workflow
│   └── project-structure.md          # Directory layout
├── architecture/
│   ├── index.md
│   ├── overview.md                   # System diagram (Mermaid)
│   ├── layers.md                     # API/service/model layering
│   ├── extension-points.md           # Where to extend Core
│   └── decisions/
│       └── README.md                 # ADR index
├── guides/
│   ├── index.md
│   ├── authentication.md             # JWT flow
│   ├── permissions.md                # RBAC patterns
│   ├── pagination.md                 # Cursor pagination
│   └── error-handling.md             # Error response format
├── modules/
│   ├── index.md
│   ├── accounts.md
│   ├── organisations.md
│   ├── projects.md
│   ├── permissions.md
│   ├── audit.md
│   ├── tasks.md
│   ├── notifications.md
│   └── ...                           # One per Core module
├── examples/
│   ├── index.md
│   ├── crud-api.md                   # Walkthrough for CRUD example
│   ├── background-tasks.md           # Walkthrough for tasks example
│   └── scaffolding-demo.md           # Walkthrough for scaffolding example
├── contributing/
│   ├── index.md
│   ├── spec-kitty-workflow.md        # Feature specification process
│   ├── code-style.md                 # Python conventions
│   ├── testing.md                    # pytest patterns
│   └── pr-guidelines.md              # PR process
├── troubleshooting/
│   ├── index.md
│   ├── local-dev.md                  # Common local dev issues
│   ├── migrations.md                 # Migration problems
│   ├── auth.md                       # Auth debugging
│   └── tasks.md                      # Celery issues
├── adr/                              # Existing, keep as-is
│   └── ...
└── assets/
    └── ...                           # Images, diagrams if needed
```

### Example Implementations

```
examples/
├── README.md                         # Examples overview
├── crud-api/
│   ├── README.md                     # Example walkthrough
│   ├── models.py                     # Sample entity model
│   ├── serializers.py                # DRF serializers
│   ├── views.py                      # ViewSet with permissions
│   ├── urls.py                       # URL routing
│   └── tests/
│       └── test_smoke.py             # Smoke tests
├── background-tasks/
│   ├── README.md                     # Example walkthrough
│   ├── tasks.py                      # Celery task definitions
│   ├── health.py                     # Health check integration
│   └── tests/
│       └── test_smoke.py             # Smoke tests
└── scaffolding-demo/
    ├── README.md                     # Example walkthrough
    ├── demo_app/                     # Generated by scaffolding CLI
    │   └── ...
    └── tests/
        └── test_smoke.py             # Smoke tests
```

### Test Integration

```
tests/
└── examples/
    ├── __init__.py
    ├── conftest.py                   # Example-specific fixtures
    ├── test_crud_api_smoke.py        # CRUD example smoke tests
    ├── test_background_tasks_smoke.py # Tasks example smoke tests
    └── test_scaffolding_demo_smoke.py # Scaffolding example smoke tests
```

---

## Next Steps

After approval of this specification:

1. **Planning Phase** (`/spec-kitty.plan`): Define work packages, milestones, and task dependencies
2. **Task Breakdown** (`/spec-kitty.tasks`): Create granular tasks for each documentation section and example
3. **Implementation** (`/spec-kitty.implement`): Write documentation, create examples, add smoke tests
4. **Review** (`/spec-kitty.review`): Technical accuracy review, link validation, example testing
5. **Acceptance** (`/spec-kitty.accept`): Validate against success criteria, merge to main

---

**End of Specification**
