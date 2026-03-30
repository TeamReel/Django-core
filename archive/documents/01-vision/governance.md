# Governance & Quality Enforcement

The platform uses **Spec-Driven Development (SDD)** with the **Spec Kitty workflow** to maintain quality when building with AI agents.

## The Spec Kitty Workflow

1.  **Spec**: Every feature starts with a specification, not code. Specs live in `documents/02-roadmap/modules/`.
2.  **AI Agents Build**: GitHub Copilot and other AI tools implement under governance rules defined in `.github/instructions/`.
3.  **Quality Checks**: Tests required for every feature (pytest) and bugfix (regression test).
4.  **Code Review**: Agent or human reviews against conventions before merge.
5.  **Verify**: `pytest` (backend), `npx tsc --noEmit` + `npx vite build` (frontend).

## Governance Rules (Enforced via Instructions)

The `.github/instructions/` files define non-negotiable rules:

*   **Security**: Org-scoped querysets, `permission_classes` on all ViewSets, no secrets in code.
*   **Testing**: Every feature has tests, every bugfix has regression test.
*   **Types**: No `any` in TypeScript, type hints in Python.
*   **Performance**: `select_related`/`prefetch_related` on all ViewSets — no N+1.
*   **Accessibility**: WCAG 2.1 AA, `:focus-visible`, touch targets >= 44x44px.
*   **CSS**: Design tokens only, no hardcoded values.
*   **Migrations**: Safe migrations only — never drop tables.

## Why This Matters

**Without governance:** AI agents can produce working but insecure, untestable or unmaintainable code.

**With Spec Kitty governance:**
*   AI agents follow documented conventions (`.instructions.md` files auto-attached by file pattern).
*   Quality rules are enforced structurally, not by individual expertise.
*   Every feature is traceable from spec to implementation to tests.

## Roadmap Structure

Specs and tasks follow a clear lifecycle in `documents/02-roadmap/modules/`:

```
backlog/ → ready/ → active/ → done/
```

Quick items (small improvements):
```
quick/todo/ → quick/doing/ → quick/review/ → quick/done/
```
