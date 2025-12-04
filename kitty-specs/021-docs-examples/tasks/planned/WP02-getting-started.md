---
work_package_id: "WP02"
subtasks:
  - "T009"
  - "T010"
  - "T011"
  - "T012"
  - "T013"
  - "T014"
  - "T015"
  - "T016"
title: "Getting Started Documentation"
phase: "Phase 2 - Documentation"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-04T21:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP02 – Getting Started Documentation

## Objectives & Success Criteria

**Goal**: Write comprehensive onboarding documentation enabling new developers to set up and contribute within 2 hours.

**Success Criteria**:
- New developer follows quickstart.md and has working environment in 30 minutes
- Prerequisites are clearly listed with version requirements
- First contribution guide covers complete PR workflow
- Project structure is fully documented

## Context & Constraints

**Reference Documents**:
- `kitty-specs/021-docs-examples/spec.md` - User Story 1, FR-007 through FR-010
- `README.md` - Extract existing Getting Started content

**Dependencies**: WP01 (directory structure must exist)

**Constraints**:
- Include both Docker and non-Docker setup options
- All commands must be tested and working
- Use relative links within docs/

## Subtasks & Detailed Guidance

### T009 – Write `docs/getting-started/quickstart.md`

**Purpose**: Enable developers to run the project locally in under 15 minutes.

**Steps**:
1. Create file with clear section structure:
   - Prerequisites summary (link to prerequisites.md)
   - Option A: Docker setup (recommended)
   - Option B: Local Python setup
   - Verifying the installation
   - Next steps

2. Docker setup section:
   ```bash
   git clone https://github.com/TeamReel/django-core.git
   cd django-core
   cp .env.example .env
   docker-compose up
   # Visit http://localhost:8000
   ```

3. Local Python setup section:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements/local.txt
   python manage.py migrate
   python manage.py runserver
   ```

4. Include troubleshooting tips for common issues

**Files**: `docs/getting-started/quickstart.md`

### T010 – Write `docs/getting-started/prerequisites.md` [P]

**Purpose**: List all required tools with version requirements.

**Content**:
- Python 3.12+ (with installation links)
- PostgreSQL 13+ (or Docker alternative)
- Redis 6+ (or Docker alternative)
- Docker & Docker Compose (optional but recommended)
- Git
- IDE recommendations (VS Code, PyCharm)

**Files**: `docs/getting-started/prerequisites.md`

### T011 – Write `docs/getting-started/first-contribution.md` [P]

**Purpose**: Guide developers through their first contribution.

**Content**:
1. Fork and clone the repository
2. Create a feature branch
3. Make a simple change (e.g., fix typo, add docstring)
4. Run quality checks (ruff, mypy, pytest)
5. Commit with conventional commit message
6. Push and create PR
7. Address review feedback
8. Merge celebration 🎉

**Files**: `docs/getting-started/first-contribution.md`

### T012 – Write `docs/getting-started/project-structure.md` [P]

**Purpose**: Explain directory layout and conventions.

**Content**:
```
django-core/
├── src/                    # Django applications
│   ├── accounts/           # User authentication (B05)
│   ├── organisations/      # Organization management (B06)
│   ├── projects/           # Project workspaces (B07)
│   ├── permissions/        # Access control (B08)
│   ├── audit/              # Audit logging (B09)
│   └── ...                 # Other modules
├── tests/                  # Test suite (mirrors src/)
├── docs/                   # Documentation
├── kitty-specs/            # Feature specifications
├── requirements/           # Python dependencies
├── config/                 # Django settings
└── examples/               # Example implementations
```

**Files**: `docs/getting-started/project-structure.md`

### T013 – Update `docs/getting-started/index.md`

**Purpose**: Update index with links to all getting-started docs.

**Steps**:
1. Add brief section descriptions
2. Link to each document
3. Suggest reading order

**Files**: `docs/getting-started/index.md`

### T014 – Extract relevant content from `README.md`

**Purpose**: Move Getting Started content to dedicated docs.

**Steps**:
1. Identify Getting Started section in README.md
2. Copy relevant content to appropriate getting-started docs
3. Enhance with more detail as needed

**Files**: Various getting-started docs

### T015 – Update `README.md` to link to getting-started docs

**Purpose**: Keep README concise with links to detailed docs.

**Steps**:
1. Replace detailed Getting Started with summary
2. Add prominent link to `docs/getting-started/quickstart.md`
3. Keep README focused on project overview

**Files**: `README.md`

### T016 – Validate quickstart by following it on clean environment

**Purpose**: Ensure all commands work correctly.

**Steps**:
1. Use fresh clone or clean environment
2. Follow quickstart.md step by step
3. Note any issues or unclear instructions
4. Fix documentation based on findings

**Files**: Update docs as needed

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Commands become outdated | Test all commands during validation |
| Docker setup varies by OS | Include OS-specific notes |

## Definition of Done Checklist

- [ ] T009: quickstart.md enables setup in <15 minutes
- [ ] T010: prerequisites.md lists all requirements
- [ ] T011: first-contribution.md covers full PR workflow
- [ ] T012: project-structure.md explains layout
- [ ] T013: index.md links to all docs
- [ ] T014: README content extracted
- [ ] T015: README updated with links
- [ ] T016: Quickstart validated on clean environment
- [ ] All docs pass Markdown linting
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Follow quickstart.md yourself to validate
- Check all links work
- Verify commands are copy-paste ready
- Ensure OS-specific instructions are included

## Activity Log

- 2025-12-04T21:30:00Z – system – lane=planned – Prompt created.

