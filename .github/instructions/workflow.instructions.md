---
applyTo: "**"
---

# TeamReel — Workflow & Communication

## User Communication

The user is the **product owner** of TeamReel — not a programmer. All agents are the technical experts.

- **Language**: Match the user's language (usually Dutch). Technical terms in English are fine.
- **Tone**: Direct, confident. Present solutions, not problems.
- **Level**: Business-oriented. Explain *what* and *why*, not *how* internally.
- **Brevity**: Short updates, bullet points, no walls of text.

### When to ask questions

Only ask when the answer is NOT in the codebase, docs, or conventions. Use multiple-choice with ★ recommendation:

```
Ik moet iets beslissen over [topic]:

A) [Option A — kort uitgelegd]
B) [Option B — kort uitgelegd]

★ Mijn aanbeveling: **A** — [één zin waarom]
```

- 2-4 options, 1 sentence each, business-language
- If one option is clearly best: just do it, don't ask
- Never ask open-ended technical questions or wait for permission on standard engineering decisions

## Quality Standards (Definition of Done)

### Code
- Follow existing codebase conventions (check `.instructions.md` files)
- No `any` types (TypeScript), type hints (Python)
- Org-scoped querysets on all ViewSets
- `permission_classes` on all ViewSets
- `select_related`/`prefetch_related` — no N+1
- Design tokens only in CSS — no hardcoded values

### Tests
- Every feature has tests (pytest backend, Playwright critical flows)
- Every bugfix includes a regression test
- Verify: `pytest` (backend), `npx tsc --noEmit` + `npx vite build` (frontend)

### Security
- Safe migrations only (see migration-safety skill)
- No secrets in code

### Accessibility
- WCAG 2.1 AA, `:focus-visible`, touch targets ≥ 44×44px
- `@media (prefers-reduced-motion: reduce)` on animations

## Roadmap Workflow

All specs and tasks live in `documents/02-roadmap/modules/`:

```
modules/
├── backlog/    ← ideas, not yet specced
├── ready/      ← specced with phases, ready to build
├── active/     ← currently building (max 1-2)
├── quick/      ← small improvements (Q-series)
│   ├── todo/       ← ready to pick up
│   ├── doing/      ← being built (max 1)
│   ├── review/     ← built, awaiting code review
│   └── done/       ← completed and verified
├── done/       ← fully completed
└── later/      ← deferred
```

### Feature lifecycle
`backlog/` → `ready/` → `active/` → `done/`

### Quick lifecycle
`todo/` → `doing/` → `review/` → `done/`

**Bouwer** picks from `todo/` → builds → moves to `review/`.
**Reviewer** picks from `review/` → approves or fixes small issues → moves to `done/`. If large problems: back to `todo/` with feedback.

### When to create a spec
- New page, feature, model + API, or refactor 5+ files → **Feature** (in `backlog/`, Planner specs it)
- ≤4 uur, 1-3 files → **Quick** (in `quick/todo/`)
- Bug fix or small tweak → just implement

## Quick Module Template

```markdown
# Q{NNN} — {Naam}

| | |
|---|---|
| Status | 📋 TODO |   <!-- 📋 TODO → 🚧 DOING → 🔍 REVIEW → ✅ DONE -->
| Bron | {UI Review / Code Review / E2E Test / ...} |
| Impact | {🔴 critical / 🟡 important / 🟢 nice-to-have} |
| Effort | ~{n} uur |

## Wat
{Korte beschrijving}

## Checklist
- [ ] {taak 1}
- [ ] {taak 2}
- [ ] Tests
- [ ] Verify
```
