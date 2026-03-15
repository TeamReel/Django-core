# TeamReel — AI Orchestrator

> Central router — tells Copilot **what TeamReel is**, **where to find things**, and **which layer to invoke**. Detailed conventions live in instruction files; task logic lives in agents, skills, and prompts.

## What is TeamReel?

AI-powered content platform for amateur sports clubs — auto-generates branded videos, visuals, line-ups, and match graphics. No design skills needed.

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
Organisation → Project → BrandProfile + Period → Activity → Participation + Members
```

---

## Customization Layers

### 1. Instructions (always-on, auto-attached by file pattern)

| File | Applies to | What it knows |
|------|-----------|---------------|
| `frontend.instructions.md` | `demo/src/**` | React/TS, tokens, a11y, mobile-first |
| `backend.instructions.md` | `src/**` | Django models, serializers, viewsets, org-scoping |
| `css.instructions.md` | `**/*.css` | Token system, focus-visible, reduced-motion |
| `testing.instructions.md` | `tests/**` | pytest, Playwright, factories |

### 2. Custom Agents (persona-based workflows with handoffs)

Pick from the agent dropdown or mention by name:

| Agent | Role | Tools | Hands off to |
|-------|------|-------|-------------|
| **Developer** | Full-stack implementation | All | → Reviewer |
| **Reviewer** | Read-only code review & audit | Read-only | → Developer (fix) |
| **Planner** | Architecture & implementation plans | Read-only | → Developer (build) |
| **Debugger** | Systematic bug diagnosis & fix | Read + Terminal + Edit | → Reviewer (verify) |

### 3. Skills (on-demand capabilities, invoked by relevance or `/skill-name`)

| Skill | What it does |
|-------|-------------|
| `/frontend-component` | Scaffold React component (TSX + CSS Module + barrel + checklist) |
| `/api-endpoint` | Create DRF endpoint (model + serializer + viewset + URL) |
| `/migration-safety` | Audit Django migration for destructive operations |
| `/ui-review` | Full a11y + token + mobile + dark mode audit |
| `/roadmap-execution` | Execute a roadmap phase end-to-end (spec → code → commit) |

### 4. Prompts (reusable task prompts, invoke with `#prompt:name`)

| Prompt | When to use |
|--------|-------------|
| `#prompt:debug` | Something is broken — full-stack diagnosis |
| `#prompt:ui-review` | Review component for a11y, tokens, mobile |
| `#prompt:code-quality` | Scan for convention violations, `any` types |
| `#prompt:component` | Create a new component (quick scaffold) |
| `#prompt:api-review` | Audit a DRF endpoint for security, N+1 |
| `#prompt:roadmap` | Execute a roadmap phase |
| `#prompt:domain` | Architecture/data/feature question |
| `#prompt:performance` | Optimize bundle, queries, rendering |
| `#prompt:refactor` | Restructure code preserving behavior |
| `#prompt:migration` | Create safe Django migrations |

### 5. Hooks (lifecycle automation — run automatically)

| Hook | Event | What it does |
|------|-------|-------------|
| `format-on-edit` | PostToolUse | Prettier auto-format after file edits |
| `safety-guard` | PreToolUse | Blocks DROP TABLE, TRUNCATE, DELETE FROM |
| `project-context` | SessionStart | Injects branch, versions, recent commits |

### 6. Spec-Kitty (separate system)

Worktree-based feature lifecycle in `.github/prompts/spec-kitty/`. For formal specification — not used in direct-to-main workflow.

---

## When to Use What?

| Need | Use |
|------|-----|
| Write code | **Developer** agent |
| Review code | **Reviewer** agent |
| Plan architecture | **Planner** agent |
| Fix a bug | **Debugger** agent or `#prompt:debug` |
| Scaffold a component | `/frontend-component` skill |
| Create an API endpoint | `/api-endpoint` skill |
| Check migration safety | `/migration-safety` skill |
| Audit a11y / design system | `/ui-review` skill |
| Execute a roadmap phase | `/roadmap-execution` skill |
| Quick task (no persona) | `#prompt:*` prompts |

---

## Documentation Index

All domain documentation mapped in: `documents/05-demo/ai-context-index.md`

Quick pointers:
- **Architecture**: `documents/05-demo/features/application-architecture.md`
- **Frontend design**: `documents/05-demo/frontend-design/` (6 docs)
- **Data tables**: `documents/05-demo/data/tables.md`
- **UX flows**: `documents/05-demo/features/ux-flows.md`
- **Roadmap specs**: `documents/02-roadmap/`

---

## Working Conventions

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
