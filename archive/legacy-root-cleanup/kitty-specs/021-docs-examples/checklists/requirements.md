# B21 Docs and Examples - Requirements Checklist
*Path: kitty-specs/021-docs-examples/checklists/requirements.md*

## Documentation Structure

- [ ] **FR-001**: `docs/` organized with MkDocs-compatible directory structure
- [ ] **FR-002**: Top-level sections created: `getting-started/`, `architecture/`, `guides/`, `modules/`, `examples/`, `contributing/`, `troubleshooting/`
- [ ] **FR-003**: Each section has `index.md` landing page
- [ ] **FR-004**: Navigation structure file exists for future MkDocs integration
- [ ] **FR-005**: All docs use CommonMark Markdown with GFM extensions
- [ ] **FR-006**: All internal links use relative paths

## Getting Started Documentation

- [ ] **FR-007**: `docs/getting-started/quickstart.md` exists (< 15 min to first run)
- [ ] **FR-008**: `docs/getting-started/prerequisites.md` lists required tools
- [ ] **FR-009**: `docs/getting-started/first-contribution.md` guides first PR
- [ ] **FR-010**: `docs/getting-started/project-structure.md` explains directory layout

## Architecture Documentation

- [ ] **FR-011**: `docs/architecture/overview.md` with high-level Mermaid diagram
- [ ] **FR-012**: `docs/architecture/layers.md` explaining layering
- [ ] **FR-013**: `docs/architecture/extension-points.md` documenting extension mechanisms
- [ ] **FR-014**: ADR documentation maintained in `docs/adr/`
- [ ] **FR-015**: All diagrams use Mermaid code blocks

## Module Documentation

- [ ] **FR-016**: `docs/modules/` directory exists with per-module files
- [ ] **FR-017**: Each module doc includes: Purpose, Concepts, Models, API links, Examples, Config
- [ ] **FR-018**: Module docs link to relevant ADRs

## API Guides

- [ ] **FR-019**: `docs/guides/authentication.md` explains JWT flow
- [ ] **FR-020**: `docs/guides/permissions.md` explains RBAC
- [ ] **FR-021**: `docs/guides/pagination.md` explains cursor pagination
- [ ] **FR-022**: `docs/guides/error-handling.md` explains error format
- [ ] **FR-023**: API guides link to `/api/docs/` Swagger UI

## Contributing Documentation

- [ ] **FR-024**: `docs/contributing/spec-kitty-workflow.md` documents full lifecycle
- [ ] **FR-025**: `docs/contributing/code-style.md` documents Python conventions
- [ ] **FR-026**: `docs/contributing/testing.md` documents pytest patterns
- [ ] **FR-027**: `docs/contributing/pr-guidelines.md` documents PR process

## Example Implementations

- [ ] **FR-028**: `examples/crud-api/` demonstrates Core API layer
- [ ] **FR-029**: `examples/background-tasks/` demonstrates Celery + observability
- [ ] **FR-030**: `examples/scaffolding-demo/` demonstrates scaffolding CLI
- [ ] **FR-031**: Examples share Core environment (not standalone)
- [ ] **FR-032**: Each example has README.md with walkthrough
- [ ] **FR-033**: Each example has `tests/` with smoke tests

## Example Testing

- [ ] **FR-034**: Smoke tests run against actual database
- [ ] **FR-035**: Smoke tests verify key flows end-to-end
- [ ] **FR-036**: Smoke tests run in main CI pipeline
- [ ] **FR-037**: Smoke tests complete in < 30 seconds per example
- [ ] **FR-038**: Examples track `main` branch

## Future Hosting Preparation

- [ ] **FR-039**: Structure compatible with MkDocs Material
- [ ] **FR-040**: Placeholder `mkdocs.yml` exists
- [ ] **FR-041**: Assets stored in `docs/assets/`
- [ ] **FR-042**: Works as plain Markdown on GitHub

---

## Success Criteria Validation

- [ ] **SC-001**: New developer has working environment in 30 minutes
- [ ] **SC-002**: New developer makes first contribution in 2 hours
- [ ] **SC-003**: All three examples pass smoke tests
- [ ] **SC-004**: All Core modules have documentation
- [ ] **SC-005**: Mermaid diagrams render on GitHub and MkDocs
- [ ] **SC-006**: No broken internal links
- [ ] **SC-007**: CRUD API example adaptable in 1 hour
- [ ] **SC-008**: `mkdocs build` succeeds (after adding config)

---

## User Story Acceptance

### US1 - New Developer Quick Start
- [ ] Quickstart guide enables local run in 15 minutes
- [ ] First contribution guide is clear and actionable
- [ ] Project structure is well explained

### US2 - Contributor Workflow Understanding
- [ ] Spec Kitty workflow documented
- [ ] ADR conventions documented
- [ ] Feature update process documented

### US3 - Example-Driven Learning
- [ ] CRUD API example complete and working
- [ ] Background tasks example complete and working
- [ ] Scaffolding demo example complete and working
- [ ] Smoke tests catch Core breaking changes

### US4 - API Usage Patterns
- [ ] Authentication guide with code examples
- [ ] Permissions guide with patterns
- [ ] Links to Swagger UI work

### US5 - Architecture Deep Dive
- [ ] Layering explained with diagrams
- [ ] Extension points documented
- [ ] ADRs accessible and indexed

### US6 - Troubleshooting
- [ ] Common issues documented
- [ ] Solutions actionable
- [ ] Escalation path clear
