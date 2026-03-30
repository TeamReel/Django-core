# Spec Kitty Workflow

## Purpose

Spec Kitty is the governance workflow for building features with AI agents. It ensures every feature is traceable from spec to implementation to tests.

---

## Current Practice

### Feature Lifecycle

New features and larger modules follow this path:

1. **Spec** — Define WHAT to build (in `documents/02-roadmap/modules/`)
2. **Plan** — Define HOW: architecture, data model, API endpoints, testing strategy
3. **Build** — AI agents (Bouwer) implement under governance rules (`.github/instructions/`)
4. **Review** — Code Review agent validates against conventions
5. **Verify** — `pytest` (backend), `npx tsc --noEmit` + `npx vite build` (frontend)

### Quick Items

Small improvements (1-4 hours, 1-3 files) skip the full spec process:

```
quick/todo/ → quick/doing/ → quick/review/ → quick/done/
```

See the [Quick Module Template](../../.github/instructions/workflow.instructions.md) for the format.

### Bug Fixes

Just implement directly — include a regression test.

---

## Governance Rules

Enforced via `.github/instructions/` files (auto-attached by file pattern):

*   **Security**: Org-scoped querysets, `permission_classes` on all ViewSets.
*   **Testing**: Every feature has tests, every bugfix has regression test.
*   **Types**: No `any` in TypeScript, type hints in Python.
*   **Performance**: `select_related`/`prefetch_related` — no N+1.
*   **CSS**: Design tokens only, no hardcoded values.
*   **Migrations**: Safe only — never drop tables.
*   **Git**: Conventional commits.

---

## Module Naming

*   **Backend**: `B01` … `B70` (see [REGISTRY.md](../04-modules/REGISTRY.md))
*   **Frontend**: `F01` … `F30`
*   **Quick items**: `Q001` … `Q999`

---

## AI Agents

| Agent | Role |
|-------|------|
| **Bouwer** | Build features, fix bugs, write tests |
| **Code Review** | Audit quality, security, a11y, performance |
| **Planner** | Architecture, roadmap specs, implementation plans |
| **Product Expert** | Domain knowledge, data model, UX flows |
| **Site Tester** | E2E browser testing, visual review |
| **Database** | Query optimization, indexing, schema review |
| **Deploy & Logs** | Railway deployments, logs, monitoring |

---

## References

*   Workflow rules: `.github/instructions/workflow.instructions.md`
*   Agent definitions: `.github/agents/`
*   Skills: `.github/skills/`
*   Roadmap specs: `documents/02-roadmap/modules/`
