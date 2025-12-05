---
work_package_id: "WP10"
subtasks:
  - "T086"
  - "T087"
  - "T088"
  - "T089"
  - "T090"
  - "T091"
  - "T092"
  - "T093"
  - "T094"
title: "Integration & Polish"
phase: "Phase 4 - Integration"
lane: "done"
assignee: ""
agent: "claude-implementer"
shell_pid: ""
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-04T21:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-05T11:30:00Z"
    lane: "doing"
    agent: "claude-implementer"
    action: "Started implementation"
  - timestamp: "2025-12-05T11:45:00Z"
    lane: "done"
    agent: "claude-reviewer"
    action: "Review approved - 68 tests pass, CI jobs added"
---

# Work Package Prompt: WP10 – Integration & Polish

## Objectives & Success Criteria

**Goal**: Integrate all documentation, set up CI, and ensure quality.

**Success Criteria**:
- All docs pass linting
- Cross-references are valid
- CI runs example smoke tests
- README.md updated with new structure

## Context & Constraints

**Reference Documents**:
- `kitty-specs/021-docs-examples/spec.md` - All user stories, NFR-001 through NFR-007
- All WP01-WP09 outputs
- `.github/workflows/` - Existing CI configuration

**Dependencies**: All previous work packages (WP01-WP09)

## Subtasks & Detailed Guidance

### T086 – Validate all internal links

**Purpose**: Ensure all Markdown links work.

**Steps**:
1. Install link checker tool (e.g., `markdown-link-check`)
2. Run against all docs:
   ```bash
   find docs -name "*.md" | xargs markdown-link-check
   ```
3. Fix any broken links
4. Add to CI pipeline

**Files**: All `docs/**/*.md`

### T087 – Run Markdown linting

**Purpose**: Ensure consistent Markdown formatting.

**Steps**:
1. Install `markdownlint-cli`
2. Create `.markdownlint.json` config:
   ```json
   {
     "default": true,
     "MD013": false,
     "MD033": false
   }
   ```
3. Run linter: `markdownlint docs/**/*.md`
4. Fix any issues
5. Add to CI pipeline

**Files**: All `docs/**/*.md`, `.markdownlint.json`

### T088 – Verify Mermaid diagrams render

**Purpose**: Ensure all diagrams work in GitHub.

**Steps**:
1. List all files with Mermaid blocks
2. Preview each in GitHub
3. Fix any rendering issues
4. Consider adding Mermaid validator

**Files**: Architecture docs with diagrams

### T089 – Create `docs/nav.yml` for MkDocs

**Purpose**: Define navigation structure for MkDocs.

**Content**:
```yaml
# docs/nav.yml
nav:
  - Home: index.md
  - Getting Started:
    - Quickstart: getting-started/quickstart.md
    - Prerequisites: getting-started/prerequisites.md
    - First Contribution: getting-started/first-contribution.md
    - Project Structure: getting-started/project-structure.md
  - Architecture:
    - Overview: architecture/overview.md
    - Layers: architecture/layers.md
    - Data Model: architecture/data-model.md
    - Request Flow: architecture/request-flow.md
    - ADRs: architecture/adr/index.md
  - Modules:
    - Overview: modules/index.md
    - Accounts: modules/accounts.md
    - Organisations: modules/organisations.md
    - Projects: modules/projects.md
    - Permissions: modules/permissions.md
    - ...
  - Guides:
    - API Authentication: guides/api-authentication.md
    - API Pagination: guides/api-pagination.md
    - ...
  - Examples:
    - CRUD API: examples/crud-api/README.md
    - Background Tasks: examples/background-tasks/README.md
    - Scaffolding Demo: examples/scaffolding-demo/README.md
  - Contributing:
    - Overview: contributing/index.md
    - Spec Kitty Workflow: contributing/spec-kitty-workflow.md
    - Code Style: contributing/code-style.md
    - Testing: contributing/testing.md
    - PR Guidelines: contributing/pr-guidelines.md
  - Troubleshooting:
    - Common Errors: troubleshooting/common-errors.md
    - Debugging: troubleshooting/debugging.md
    - Performance: troubleshooting/performance.md
```

**Files**: `docs/nav.yml`

### T090 – Update main README.md

**Purpose**: Simplify README and link to docs.

**Content Structure**:
```markdown
# django-core

Brief description.

## Quick Links

- [Getting Started](docs/getting-started/quickstart.md)
- [Architecture](docs/architecture/overview.md)
- [API Reference](docs/modules/index.md)
- [Contributing](docs/contributing/index.md)

## Installation

Minimal installation steps.

## Development

```bash
git clone ...
pip install -e .[dev]
pytest
```

## Documentation

Full documentation is in the [docs/](docs/) directory.

## License

...
```

**Files**: `README.md`

### T091 – Create CI job for docs linting

**Purpose**: Automate documentation quality checks.

**Content** (add to existing workflow):
```yaml
# .github/workflows/ci.yml (add job)
  docs-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g markdownlint-cli markdown-link-check
      - run: markdownlint 'docs/**/*.md' --config .markdownlint.json
      - run: |
          find docs -name "*.md" | xargs -I {} markdown-link-check {}
```

**Files**: `.github/workflows/ci.yml`

### T092 – Create CI job for example smoke tests

**Purpose**: Run example tests in CI.

**Content** (add to existing workflow):
```yaml
# .github/workflows/ci.yml (add job)
  example-tests:
    runs-on: ubuntu-latest
    needs: [test]  # Run after main tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -e .[dev]
      - run: pytest tests/examples/ -v
```

**Files**: `.github/workflows/ci.yml`

### T093 – Final cross-reference audit

**Purpose**: Verify all cross-references are accurate.

**Checklist**:
- [ ] Module docs reference correct ADRs
- [ ] Getting started links to prerequisites
- [ ] Architecture docs link to module docs
- [ ] Examples reference relevant guides
- [ ] Index pages list all child documents
- [ ] Troubleshooting references error codes

**Files**: All documentation files

### T094 – Update `tasks.md` completion status

**Purpose**: Mark all tasks complete and document lessons learned.

**Steps**:
1. Update all task checkboxes to checked
2. Add lessons learned section
3. Document any scope changes
4. Prepare for `/spec-kitty.review`

**Files**: `kitty-specs/021-docs-examples/tasks.md`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| CI adds too much time | Run docs jobs in parallel |
| Link checker false positives | Configure ignore patterns |

## Definition of Done Checklist

- [ ] T086: All internal links validated
- [ ] T087: Markdown linting passes
- [ ] T088: Mermaid diagrams render
- [ ] T089: nav.yml created for MkDocs
- [ ] T090: README.md simplified
- [ ] T091: CI docs-lint job added
- [ ] T092: CI example-tests job added
- [ ] T093: Cross-reference audit complete
- [ ] T094: tasks.md updated
- [ ] All CI checks pass
- [ ] Feature ready for review

## Review Guidance

- Run full CI pipeline
- Verify MkDocs can build (if installed)
- Check README is concise
- Confirm examples work end-to-end

## Activity Log

- 2025-12-04T21:30:00Z – system – lane=planned – Prompt created.

