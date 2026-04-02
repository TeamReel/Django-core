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

All specs and tasks live in `docs/roadmap/backlog/`, organized by theme:

```
docs/roadmap/
├── backlog/                         ← DE WERKMAP
│   ├── 01-content-pipeline/         ← Video/media generatie & verwerking
│   ├── 02-infra-tooling/            ← Refactoring, cleanup, AI tooling
│   ├── 03-admin-analytics/          ← Dashboard, monitoring, analytics
│   ├── 04-club-experience/          ← Ledenportaal, onboarding, sponsor
│   ├── 05-social-publishing/        ← Delen, publiceren, public feed
│   ├── 06-automation/               ← Match day automation, calendar, scraping
│   ├── 07-commerce/                 ← Betaling, abonnementen, marketplace
│   └── 08-platform-scaling/         ← Whitelabel, multi-taal, PWA
├── archive/                         ← Afgerond werk (niet meer actief)
└── icebox/                          ← Verre toekomst
```

Each phase has 3 folders: `todo/`, `review/`, `done/`.

### Item naming

Items get a layer prefix: `BE-`, `FE-`, `FULL-`, `INFRA-`, or `AI-`.
Items can be a single `.md` file or a folder with `index.md` + sub-phases (for large features).

### Lifecycle

`todo/` → `review/` → `done/`

| Agent | Picks from | Delivers to |
|-------|-----------|-------------|
| **Planner** | — | `todo/` (creates specs) |
| **Bouwer** | `todo/` | `review/` |
| **Reviewer** | `review/` | `done/` or back to `todo/` |

### When to create a spec
- New page, feature, model + API, or refactor 5+ files → **Feature spec** (folder with `index.md` + phases)
- ≤4 uur, 1-3 files → **Single spec file** in the appropriate phase's `todo/`
- Bug fix or small tweak → just implement, no spec needed

## Module Template

```markdown
# {Prefix}-{naam}

| | |
|---|---|
| Status | 📋 TODO |   <!-- 📋 TODO → 🔍 REVIEW → ✅ DONE -->
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
