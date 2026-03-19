---
description: "Build a backend module from spec — discovery, convention check, phased implementation, verification. Usage: 'build module B62' or 'implementeer B50'"
---

# Build Backend Module

## Input
```
$ARGUMENTS
```

## Workflow

This prompt triggers the full module builder pipeline with quality gates (inspired by spec-kitty).

### Gate 0 — Discovery
1. Parse the module number (e.g. `B62`) from user input
2. Read the spec: `documents/02-roadmap/modules/planned/*-B{number}-*.md`
3. Read conventions: `.github/instructions/backend.instructions.md`
4. **Ambiguity scan** — check spec for gaps in: models, relationships, endpoints, permissions, integrations, edge cases, async tasks
5. **Clarify** — ask batched questions (1-5 depending on complexity), with sensible defaults the user can just confirm

### Gate 1 — Convention Check
Validate the spec against TeamReel backend conventions:
- UUID PK, timestamps, org FK on every model
- Three-serializer pattern (List/Detail/Write)
- Org-scoped querysets, BaseAPIPagination
- Soft delete pattern, safe migrations
- Permission class per model

Flag any violations and propose fixes before writing code.

### Gate 2 — Phase Plan
Auto-split based on module complexity:
- **Small** (1-2 models): 3 phases
- **Medium** (3-4 models): 4 phases
- **Large** (5+ models): 5 phases

Show the plan and **wait for user confirmation** before proceeding.

### Phase Execution
For each phase:
1. Create files using templates from `.github/skills/backend-module/templates/`
2. Fill in model names, fields, relationships from spec
3. Validate imports and syntax
4. Track progress with `manage_todo_list`

### Gate 3 — Verification
All must pass:
```bash
python manage.py check                              # No errors
python manage.py makemigrations --check --dry-run    # No pending migrations
pytest src/<app>/tests/ -v --tb=short                # All green
```

Plus self-review analysis (N+1 queries, convention compliance, test coverage).

### Gate 3.5 — Documentation
Create `src/<app>/README.md` following the pattern from `src/activities/README.md`:
- Title + scope, key components, API endpoints table, permissions, quick start examples, configuration, database indexes, testing instructions, extension points.

This is **mandatory** — no module is complete without a README.

### Gate 4 — Update Spec
Mark module as `✅ IMPLEMENTED` in the roadmap spec file.

### Output
Report: files created, models, endpoints, test count, any remaining TODOs.

## Reference
- Full playbook: `.github/skills/backend-module/SKILL.md`
- Code templates: `.github/skills/backend-module/templates/`
- Backend conventions: `.github/instructions/backend.instructions.md`
- Example app: `src/activities/` (gold standard)
