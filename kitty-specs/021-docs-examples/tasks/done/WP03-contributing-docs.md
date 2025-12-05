---
work_package_id: "WP03"
subtasks:
  - "T017"
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
title: "Contributing Documentation"
phase: "Phase 2 - Documentation"
lane: "done"
assignee: "claude-agent"
agent: "claude-reviewer"
shell_pid: ""
review_status: "approved with minor fix"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-04T21:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-05T10:00:00Z"
    lane: "doing"
    agent: "claude-agent"
    shell_pid: ""
    action: "Started implementation"
  - timestamp: "2025-12-05T08:25:10Z"
    lane: "done"
    agent: "claude-reviewer"
    shell_pid: ""
    action: "Review approved with minor fix - code-style.md line-length corrected to match pyproject.toml (100 not 88)"
---

# Work Package Prompt: WP03 – Contributing Documentation

## Objectives & Success Criteria

**Goal**: Document contribution workflow including the Spec Kitty feature specification process.

**Success Criteria**:
- Contributor reads spec-kitty-workflow.md and creates valid feature spec
- Code style guide enables consistent Python code
- Testing guide explains pytest patterns and coverage requirements
- PR guidelines set clear expectations for reviews

## Context & Constraints

**Reference Documents**:
- `kitty-specs/021-docs-examples/spec.md` - User Story 2, FR-024 through FR-027
- `.kittify/` - Templates and scripts for Spec Kitty workflow
- `docs/testing.md`, `docs/TESTING_GUIDE.md` - Existing test docs to consolidate

**Dependencies**: WP01 (directory structure must exist)

## Subtasks & Detailed Guidance

### T017 – Write `docs/contributing/spec-kitty-workflow.md`

**Purpose**: Document the full feature specification lifecycle.

**Content Structure**:
1. **Overview**: What is Spec Kitty? Why use it?
2. **The Lifecycle**:
   - `/spec-kitty.specify` - Create feature specification
   - `/spec-kitty.plan` - Create implementation plan
   - `/spec-kitty.tasks` - Generate work packages
   - `/spec-kitty.implement` - Implement work packages
   - `/spec-kitty.review` - Review implementation
   - `/spec-kitty.accept` - Accept and merge
3. **Directory Structure**: Explain `kitty-specs/<feature>/` layout
4. **Templates**: Reference `.kittify/templates/`
5. **Example**: Walk through a simple feature

**Files**: `docs/contributing/spec-kitty-workflow.md`

### T018 – Write `docs/contributing/code-style.md` [P]

**Purpose**: Document Python conventions and tooling.

**Content**:
1. **Python Version**: 3.12+ required
2. **Formatting**: Black (line length 88)
3. **Linting**: Ruff rules and configuration
4. **Type Hints**: Required for all functions
5. **Imports**: isort configuration
6. **Naming Conventions**: Django conventions
7. **Pre-commit Hooks**: How to set up and use

**Files**: `docs/contributing/code-style.md`

### T019 – Write `docs/contributing/testing.md` [P]

**Purpose**: Document pytest patterns and coverage requirements.

**Content**:
1. **Test Framework**: pytest + pytest-django
2. **Test Structure**: `tests/` mirrors `src/`
3. **Running Tests**:
   ```bash
   pytest                           # All tests
   pytest tests/accounts/           # Single app
   pytest -k "test_login"           # By name
   pytest --cov=src                 # With coverage
   ```
4. **Fixtures**: Common fixtures in `conftest.py`
5. **Database**: `@pytest.mark.django_db`
6. **Coverage Requirements**: Minimum 80%
7. **CI Integration**: How tests run in CI

**Files**: `docs/contributing/testing.md`

### T020 – Write `docs/contributing/pr-guidelines.md` [P]

**Purpose**: Document PR process and review expectations.

**Content**:
1. **Branch Naming**: `<feature-id>-<short-description>`
2. **Commit Messages**: Conventional commits
3. **PR Title and Description**: Template
4. **Required Checks**: CI must pass
5. **Review Process**: What reviewers look for
6. **Merging**: Squash and merge policy
7. **After Merge**: Cleanup branches

**Files**: `docs/contributing/pr-guidelines.md`

### T021 – Write `docs/contributing/updating-features.md`

**Purpose**: Document how to modify existing features.

**Content**:
1. **When to Update vs New Feature**: Decision criteria
2. **Updating Specifications**: How to modify spec.md
3. **Backward Compatibility**: Breaking change policy
4. **Migration Guidance**: Data migrations
5. **ADR Updates**: When to create new ADRs
6. **Testing Updates**: Updating existing tests

**Files**: `docs/contributing/updating-features.md`

### T022 – Update `docs/contributing/index.md`

**Purpose**: Update index with links to all contributing docs.

**Content**:
- Overview of contribution process
- Links to each document in suggested order
- Quick reference for common tasks

**Files**: `docs/contributing/index.md`

### T023 – Consolidate existing testing docs

**Purpose**: Merge `docs/testing.md` and `docs/TESTING_GUIDE.md`.

**Steps**:
1. Review both existing files
2. Extract useful content into `docs/contributing/testing.md`
3. Remove or archive old files
4. Update any references to old locations

**Files**: `docs/contributing/testing.md`, remove old files

### T024 – Extract Development section from `README.md`

**Purpose**: Move development workflow from README to contributing docs.

**Steps**:
1. Identify Development section in README.md
2. Move relevant content to appropriate contributing docs
3. Update README to link to contributing docs

**Files**: `README.md`, various contributing docs

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Workflow changes frequently | Keep docs close to `.kittify/` tooling |
| Too much detail | Focus on common cases, link to advanced |

## Definition of Done Checklist

- [ ] T017: spec-kitty-workflow.md documents full lifecycle
- [ ] T018: code-style.md covers all conventions
- [ ] T019: testing.md explains pytest patterns
- [ ] T020: pr-guidelines.md sets clear expectations
- [ ] T021: updating-features.md covers modifications
- [ ] T022: index.md links to all docs
- [ ] T023: Testing docs consolidated
- [ ] T024: README Development section moved
- [ ] All docs pass Markdown linting
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify Spec Kitty workflow matches actual tooling
- Check code style matches pyproject.toml config
- Confirm PR guidelines match team practice

## Activity Log

- 2025-12-04T21:30:00Z – system – lane=planned – Prompt created.
- 2025-12-05T08:25:10Z – claude-agent – shell_pid= – lane=done – Review approved with minor fix - code-style.md line-length corrected
