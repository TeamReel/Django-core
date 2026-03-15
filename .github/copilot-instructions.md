# TeamReel — AI Orchestrator

> This file is the central router. It tells you **what TeamReel is**, **where to find things**, and **which agent to use**. It does NOT contain detailed conventions — those live in the instruction and prompt files below.

## What is TeamReel?

An AI-powered content platform that lets amateur sports clubs generate professional branded content (videos, visuals, line-ups, match graphics) automatically. Any team member, no design skills needed.

## Tech Stack

| Layer | Tech | Location |
|-------|------|----------|
| Backend | Django 5 + DRF | `src/` |
| Frontend | React 18 + TypeScript + Vite | `demo/src/` |
| Database | PostgreSQL | Railway |
| Storage | S3 | `src/files/` → FileAsset |
| Video | FFmpeg | `src/video/` |
| AI | OpenAI, Gemini, LangGraph | `src/generative/` |
| Deploy | Railway (backend) · Vercel (frontend) | |

## Data Model

```
Organisation → Project (nested) → BrandProfile + Period (nested) → Activity → Participation + Members
```

---

## Agent Routing — Which Agent For What?

### Auto-Attached Instructions (always active per file type)

| Instruction | Applies to | What it knows |
|-------------|-----------|---------------|
| `frontend.instructions.md` | `demo/src/**` | React/TS, tokens, a11y, mobile-first, UI primitives |
| `backend.instructions.md` | `src/**` | Django models, serializers, viewsets, org-scoping |
| `css.instructions.md` | `**/*.css` | Token system, focus-visible, reduced-motion |
| `testing.instructions.md` | `tests/**` | pytest, Playwright, factories |

### Task Agents (invoke with `#prompt:name`)

| Agent | When to use |
|-------|-------------|
| `#prompt:debug` | Something is broken — systematic full-stack diagnosis |
| `#prompt:ui-review` | Review a component for a11y, tokens, mobile, dark mode |
| `#prompt:code-quality` | Scan for convention violations, `any` types, tech debt |
| `#prompt:component` | Create a new component with all conventions baked in |
| `#prompt:api-review` | Audit a DRF endpoint for security, N+1, correctness |
| `#prompt:roadmap` | Execute a roadmap phase end-to-end (spec → code → commit) |
| `#prompt:domain` | Look up any architecture/data/feature question |
| `#prompt:performance` | Analyze and optimize bundle size, queries, rendering |
| `#prompt:refactor` | Restructure code while preserving behavior and conventions |
| `#prompt:migration` | Create safe Django migrations (never drop tables) |

### Spec-Kitty (worktree-based feature lifecycle)
Separate system in `.github/prompts/spec-kitty/`. For formal feature specification using git worktrees — not used in the direct-to-main workflow.

---

## Documentation Index

All domain documentation is mapped in: `documents/05-demo/ai-context-index.md`

Quick pointers:
- **Architecture**: `documents/05-demo/features/application-architecture.md`
- **Frontend design**: `documents/05-demo/frontend-design/` (6 docs)
- **Data tables**: `documents/05-demo/data/tables.md`
- **UX flows**: `documents/05-demo/features/ux-flows.md`
- **Roadmap specs**: `documents/02-roadmap/`

---

## Working Conventions (summary)

- **Git**: Conventional commits, push to `main`
- **Database**: NEVER DROP TABLES. Safe migrations only.
- **TypeScript**: Strict mode, no `any`, interfaces for API responses
- **Python**: PEP8, type hints, docstrings
- **CSS**: Design tokens only, no hardcoded values, mobile-first
- **Decisions**: Present 2-3 options with trade-offs, recommend 80/20 winner

## Sources of Truth
1. **Codebase** — the implementation
2. `documents/` — active documentation + roadmap
3. **Railway/Production** — real-world data state
