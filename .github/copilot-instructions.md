# TeamReel

AI-powered content platform for amateur sports clubs — auto-generates branded videos, visuals, line-ups, and match graphics.

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
| Live Demo | `https://demo.teamreel.app` | |

## Data Model

```
Organisation → Project → BrandProfile + Period → Activity → Participation + Members
```

## Build & Validate

```bash
# Backend
pytest                              # run tests
python manage.py check              # Django system check
python manage.py makemigrations     # generate migrations

# Frontend
cd demo && npx tsc --noEmit         # type check
cd demo && npx vite build           # production build
```

## Key Conventions

- **Git**: Conventional commits, push to `main`
- **Database**: NEVER DROP TABLES. Safe migrations only.
- **TypeScript**: Strict mode, no `any`, interfaces for API responses
- **Python**: PEP8, type hints
- **CSS**: Design tokens only, no hardcoded values, mobile-first
- **Backend**: Org-scoped querysets, `permission_classes`, `select_related`/`prefetch_related` on all ViewSets

Details per file type are in the `.instructions.md` files (auto-attached by `applyTo` pattern).
Workflow rules, quality standards, and communication protocol are in `workflow.instructions.md`.

## Project Layout

```
src/                    ← Django apps (backend)
demo/src/               ← React app (frontend)
tests/                  ← Backend test suite
demo/tests/             ← Frontend E2E tests (Playwright)
documents/              ← Specs, roadmap, architecture docs
  02-roadmap/modules/   ← Feature specs + quick items
  05-demo/              ← Domain documentation
.github/
  agents/               ← Agent definitions (.agent.md)
  instructions/         ← File-pattern rules (.instructions.md)
  prompts/              ← Reusable task prompts (.prompt.md)
  skills/               ← Multi-step domain skills (SKILL.md)
  hooks/                ← Lifecycle hooks (format, safety)
requirements/           ← Python dependencies
```

## Available Agents

| Agent | Role |
|-------|------|
| **Bouwer** | Build features, fix bugs, refactor, write tests |
| **Code Review** | Audit code quality, security, a11y, performance |
| **Planner** | Architecture, roadmap specs, implementation plans |
| **Product Expert** | Domain knowledge, data model, UX flows |
| **Site Tester** | E2E browser testing, visual review, accessibility |
| **Database** | Query optimization, indexing, schema review |
| **Deploy & Logs** | Railway deployments, logs, monitoring |

## Available Skills

| Skill | Use when |
|-------|----------|
| `frontend-component` | Scaffolding a new React component |
| `backend-module` | Building a full Django app from spec |
| `api-endpoint` | Adding a single DRF endpoint |
| `migration-safety` | Reviewing schema changes |
| `ui-review` | Code-level a11y + token audit |
| `webapp-testing` | Browser-based E2E flow testing |
| `web-design-reviewer` | Visual/layout review in browser |
| `roadmap-execution` | Executing a roadmap phase |
| `pytest-coverage` | Finding test coverage gaps |
| `railway-ops` | Railway commands, seeding, deploys |
| `celery-task` | Background job scaffolding |
| `conventional-commit` | Generating commit messages |
| `documentation-writer` | Generating/updating docs |

## Railway Services

| Service | Purpose |
|---------|---------|
| `backend` | Django API server |
| `frontend` | React/Vite (nginx) |
| `celery-worker` | Async tasks (video, AI, email) |
| `celery-beat` | Scheduled tasks |
| `worker-ai` | AI processing |
| `Postgres` | Database |
| `Redis` | Cache + Celery broker |

For Railway operations (logs, seeding, debugging), see the `railway-ops` skill.

## Documentation

Domain docs mapped in `documents/05-demo/ai-context-index.md`. Key pointers:
- Architecture: `documents/05-demo/architecture.md`
- Frontend design: `documents/05-demo/frontend-design/`
- Data tables: `documents/05-demo/data/tables.md`
- Roadmap: `documents/02-roadmap/`

## Sources of Truth

1. **Codebase** — the implementation
2. `documents/` — specs, roadmap, architecture
3. **Railway** — production data state
