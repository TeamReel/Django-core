---
work_package_id: "WP09"
subtasks:
  - "T108"
  - "T109"
  - "T110"
  - "T111"
  - "T112"
  - "T113"
  - "T114"
  - "T115"
title: "Visual Regression & CI"
phase: "Phase 2 - Quality"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-05T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/022-frontend-design-system/tasks/planned/WP09-visual-regression-ci.md](kitty-specs/022-frontend-design-system/tasks/planned/WP09-visual-regression-ci.md)*

# Work Package Prompt: WP09 – Visual Regression & CI

## ⚠️ IMPORTANT: Review Feedback Status

- **Has review feedback?**: Check the `review_status` field above.

---

## Review Feedback

*[This section is empty initially.]*

---

## Objectives & Success Criteria

### Objectives
1. Configure Chromatic for visual regression testing
2. Create baseline snapshots for core components
3. Set up GitHub Actions CI pipeline
4. Configure quality gates (lint, typecheck, test, visual)
5. Ensure CI blocks merges on failures

### Success Criteria
- [ ] Chromatic project configured with project token
- [ ] Baseline snapshots created for Button, Input, Card, Alert, Modal
- [ ] GitHub Actions workflow runs on PR and push to main
- [ ] CI includes lint, typecheck, test, and Chromatic jobs
- [ ] Merge blocked when CI fails
- [ ] Visual regression workflow documented

---

## Context & Constraints

### Reference Documents
- Spec: `kitty-specs/022-frontend-design-system/spec.md` (FR-022)
- Plan: `kitty-specs/022-frontend-design-system/plan.md` (Principle X)

### Technical Constraints
- Chromatic is the chosen visual regression service
- CI must run in GitHub Actions
- Secrets stored in GitHub repository secrets
- All checks must pass before merge

### Dependencies
- Requires WP01 (Storybook) and WP04-WP05 (core components)

---

## Subtasks & Detailed Guidance

### Subtask T108 – Configure Chromatic project
- **Purpose**: Set up Chromatic for visual testing
- **Steps**:
  1. Create Chromatic account (if not exists)
  2. Create new project linked to repository
  3. Obtain project token
  4. Add `CHROMATIC_PROJECT_TOKEN` to GitHub secrets
  5. Install chromatic package
- **Files**:
  - `packages/design-system/package.json` (add chromatic)
- **Parallel?**: No (foundation for visual testing)

```bash
# Install chromatic
pnpm --filter design-system add -D chromatic
```

### Subtask T109 – Add Chromatic npm scripts
- **Purpose**: Simplify Chromatic usage
- **Steps**:
  1. Add `chromatic` script to package.json
  2. Configure options (exit-zero-on-changes for CI)
- **Files**:
  - `packages/design-system/package.json`

```json
{
  "scripts": {
    "chromatic": "chromatic --exit-zero-on-changes",
    "chromatic:ci": "chromatic"
  }
}
```

### Subtask T110 – Create baseline visual snapshots
- **Purpose**: Establish visual baselines for core components
- **Steps**:
  1. Ensure Storybook has stories for Button, Input, Card, Alert, Modal
  2. Run first Chromatic build to create baselines
  3. Accept baselines in Chromatic UI
  4. Document which stories are visual regression targets
- **Files**:
  - None (Chromatic cloud service)
- **Parallel?**: No (requires stories to exist)

```bash
# Create initial baselines
pnpm --filter design-system run chromatic --project-token=$CHROMATIC_PROJECT_TOKEN
```

### Subtask T111 – Configure GitHub Actions workflow
- **Purpose**: Automate CI on PR and push
- **Steps**:
  1. Create `.github/workflows/design-system.yml`
  2. Trigger on push to main and PR to main
  3. Set up pnpm and Node.js
  4. Install dependencies
  5. Configure caching for faster builds
- **Files**:
  - `.github/workflows/design-system.yml`

```yaml
name: Design System CI

on:
  push:
    branches: [main]
    paths:
      - 'packages/design-system/**'
      - '.github/workflows/design-system.yml'
  pull_request:
    branches: [main]
    paths:
      - 'packages/design-system/**'
      - '.github/workflows/design-system.yml'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter design-system lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter design-system typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter design-system test --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: packages/design-system/coverage/lcov.info

  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for Chromatic
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          workingDir: packages/design-system
          exitZeroOnChanges: true  # Don't fail on visual changes (for review)
          exitOnceUploaded: true   # Speed up CI
```

### Subtask T112 – Add lint, typecheck, test jobs
- **Purpose**: Core quality gates
- **Steps**:
  1. Already defined in T111 workflow
  2. Verify each job runs independently
  3. Ensure coverage is uploaded
- **Files**:
  - `.github/workflows/design-system.yml` (verify)

### Subtask T113 – Add Chromatic job
- **Purpose**: Visual regression in CI
- **Steps**:
  1. Already defined in T111 workflow
  2. Verify project token works
  3. Test on a PR
- **Files**:
  - `.github/workflows/design-system.yml` (verify)

### Subtask T114 – Configure merge blocking
- **Purpose**: Prevent bad code from merging
- **Steps**:
  1. In GitHub repository settings, go to Branches
  2. Add branch protection rule for `main`
  3. Require status checks: lint, typecheck, test
  4. Optionally require Chromatic check
  5. Require PR reviews
- **Files**:
  - None (GitHub settings)

### Subtask T115 – Document visual regression workflow
- **Purpose**: Help developers understand the process
- **Steps**:
  1. Update `packages/design-system/README.md` with visual testing section
  2. Document how to:
     - Run Chromatic locally
     - Review visual changes
     - Accept/reject changes
     - Handle intentional changes
- **Files**:
  - `packages/design-system/README.md`

```markdown
## Visual Regression Testing

We use Chromatic for visual regression testing.

### Running Locally

```bash
pnpm --filter design-system chromatic --project-token=$CHROMATIC_PROJECT_TOKEN
```

### CI Workflow

1. Chromatic runs on every PR
2. Visual changes are flagged for review
3. Review changes at chromatic.com
4. Accept intentional changes, reject regressions

### Handling Intentional Changes

When making intentional visual changes:
1. Make your changes
2. Run Chromatic or push to PR
3. Review the visual diff in Chromatic
4. Accept the new baseline
5. Merge your PR
```

---

## Test Strategy

### Verification Commands
```bash
# Verify CI workflow syntax
act -l  # requires 'act' for local testing

# Verify Chromatic configuration
pnpm --filter design-system chromatic --dry-run
```

### Expected Outcomes
- CI workflow runs all jobs
- Chromatic uploads snapshots
- Coverage report generated
- Branch protection enforced

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Chromatic costs | Monitor snapshot count; prune unnecessary stories |
| Flaky visual tests | Disable animations; use deterministic fonts |
| Long CI times | Use caching; parallelize jobs |

---

## Definition of Done Checklist

- [ ] Chromatic project configured
- [ ] Chromatic scripts added to package.json
- [ ] Baseline snapshots created
- [ ] GitHub Actions workflow created
- [ ] Lint, typecheck, test jobs working
- [ ] Chromatic job working
- [ ] Branch protection configured
- [ ] Documentation updated
- [ ] `tasks.md` updated with WP09 status

---

## Activity Log

- 2025-12-05T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
