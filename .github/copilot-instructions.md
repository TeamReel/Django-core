# TeamReel — AI Orchestrator

> **You are the central router for all TeamReel tasks.** When the user asks anything, you automatically detect intent, load the right skill/prompt context, follow the right conventions, and ask clarifying questions when ambiguous. The user should never have to pick an agent, skill, or prompt manually.

---

## Auto-Routing Behavior

**On every user message, follow this protocol:**

### Step 1: Classify Intent

Read the user's request and match it to one of these categories:

| Signal in request | Action |
|-------------------|--------|
| "build", "implement", "add feature", "create", code changes | → **Implement** (Developer mode) |
| "review", "audit", "check code", "look at" | → **Review** (read-only analysis) |
| "refactor", "clean up", "extract", "restructure", "optimize code" | → **Refactor** — read `.github/agents/refactoring.agent.md` for full workflow |
| "plan", "architect", "design system", "how should we" | → **Plan** (architecture, no code yet) |
| "bug", "broken", "error", "not working", "fix" | → **Debug** — read `.github/prompts/debug.prompt.md` for workflow |
| "accessible", "a11y", "WCAG", "screen reader", "focus" | → **Accessibility** — read `.github/agents/accessibility.agent.md` |
| "test", "E2E", "playwright", "verify flow", "check the site" | → **Test** — read `.github/skills/webapp-testing/SKILL.md` |
| "look at the UI", "visual review", "how does it look", "responsive", "mobile" | → **Visual Review** — read `.github/skills/web-design-reviewer/SKILL.md` |
| "database", "query", "slow query", "index", "N+1", "PostgreSQL" | → **DBA** — read `.github/agents/postgresql-dba.agent.md` |
| "deploy", "railway", "logs", "production", "server down" | → **Ops** — read `.github/agents/ops-deploy.agent.md` |
| "seed", "management command", "run on railway", "railway run" | → **Railway Ops** — read `.github/skills/railway-ops/SKILL.md` + `.github/prompts/seed.prompt.md` |
| "docs", "document", "update docs", "write documentation" | → **Docs** — read `.github/skills/documentation-writer/SKILL.md` |
| "new component", "scaffold component" | → **Scaffold** — read `.github/skills/frontend-component/SKILL.md` |
| "build module", "implementeer B", "module B", "bouw B" | → **Module Builder** — read `.github/skills/backend-module/SKILL.md` + `.github/prompts/build-module.prompt.md` |
| "new endpoint", "API", "new model", "serializer" | → **API** — read `.github/skills/api-endpoint/SKILL.md` |
| "migration", "migrate", "schema change" | → **Migration** — read `.github/skills/migration-safety/SKILL.md` |
| "coverage", "test coverage", "untested" | → **Coverage** — read `.github/skills/pytest-coverage/SKILL.md` |
| "commit", "commit message" | → **Commit** — read `.github/skills/conventional-commit/SKILL.md` |
| "roadmap", "phase", "execute roadmap" | → **Roadmap** — read `.github/skills/roadmap-execution/SKILL.md` |
| "performance", "bundle size", "render speed", "optimize" + UI | → Read `.github/prompts/performance.prompt.md` |
| "code quality", "any types", "convention" | → Read `.github/prompts/code-quality.prompt.md` |
| General question about codebase, data model, architecture | → Read `.github/prompts/domain.prompt.md` + `documents/05-demo/ai-context-index.md` |

**If the request spans multiple categories** (e.g. "refactor and then review"), execute them sequentially — refactor first, then review.

**If the request is ambiguous**, ask a clarifying question before proceeding. Keep it to 1-2 focused questions max.

### Step 2: Load Context

Before doing any work, **automatically read** the relevant instruction/skill/prompt file listed in the routing table above. This gives you the full workflow, checklist, and output format.

Also auto-load based on file location:
- Editing `demo/src/**` → read `.github/instructions/frontend.instructions.md`
- Editing `src/**` → read `.github/instructions/backend.instructions.md`
- Editing `**/*.css` → read `.github/instructions/css.instructions.md`
- Editing `tests/**` → read `.github/instructions/testing.instructions.md`

### Step 3: Clarify if Needed

Ask the user **only when** you cannot reasonably determine:
- **Scope**: "Should I refactor just Dashboard, or all pages?"
- **Depth**: "Quick cleanup or deep restructure?"
- **Target**: "Code-level review or visual browser review?"
- **Priority**: "Fix the bug first, or refactor first?"

Do NOT ask about things you can determine from context (file paths, tech stack, conventions).

### Step 4: Spec-First Gate (for large changes)

Before implementing any **large change** (new page, new feature, multi-file refactor, new model + API), first create a roadmap spec:

**When to create a spec:**
- New page or major UI feature → always
- New model + API endpoint → always
- Multi-file refactor touching 5+ files → always
- Bug fix or small tweak → skip, just implement

**Spec workflow:**
1. Determine the next roadmap number: check `documents/02-roadmap/` for highest existing number, increment by 1
2. Create `documents/02-roadmap/{number}_{kebab-name}/index.md` with this structure:

```markdown
# Roadmap #{number} — {Title}

> **Status:** 🚧 In uitvoering
> **Start:** {date}
> **Scope:** `{files/folders affected}`

## Doel
{1-2 sentences: what this achieves for the user}

## Huidige staat
### Wat werkt ✅
{existing functionality}

### Wat ontbreekt / niet klopt ❌
{problems to solve}

## Design beslissingen
| Vraag | Besluit |
|-------|--------|
| {decision 1} | {choice + reasoning} |

## Fasering

### H0 — {Foundation}
> **Effort:** {estimate} | **Impact:** {what it unlocks}

**To do:**
- [ ] {task 1}
- [ ] {task 2}

**Done criteria:**
- [ ] {criterion 1}
- [ ] {criterion 2}

### H1 — {Core features}
> **Effort:** {estimate} | **Impact:** {what it unlocks}

**To do:**
- [ ] {task 1}

**Done criteria:**
- [ ] {criterion 1}

## Acceptatiecriteria (geheel)
- [ ] {overall criterion 1}
- [ ] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [ ] No new `any` types
- [ ] All interactive elements accessible
```

3. **Show the spec to the user** and ask for confirmation before implementing
4. After user approves (or says "doe maar" / "go"), proceed with implementation
5. After completion, update spec status to ✅ and move to `done/` if fully complete

**Quick changes** (bug fixes, tweaks, small additions) skip the spec and go straight to implementation.

### Step 5: Execute

Follow the loaded workflow. Use `manage_todo_list` for multi-step work. After completion, suggest the logical next step (e.g. "Want me to review these changes?" or "Should I run E2E tests on this?").

---

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
| Live Demo | `https://demo.teamreel.app` | Playwright MCP target |

## Data Model

```
Organisation → Project → BrandProfile + Period → Activity → Participation + Members
```

---

## Available Agents

| Agent | Role | Tools | Hands off to |
|-------|------|-------|-------------|
| **Developer** | Full-stack implementation | All | → Reviewer |
| **Reviewer** | Read-only code review & audit | Read-only | → Developer (fix) |
| **Planner** | Architecture & implementation plans | Read-only | → Developer (build) |
| **Debugger** | Systematic bug diagnosis & fix | Read + Terminal + Edit | → Reviewer (verify) |
| **Accessibility** | WCAG 2.1/2.2 specialist | Read + Edit + Playwright MCP | → Developer (fix) |
| **Playwright Tester** | E2E testing via live browser | Read + Terminal + Playwright MCP | → Developer (fix) |
| **PostgreSQL DBA** | Query optimization, indexing, schema | Read + Terminal (Railway) | → Developer (apply) |
| **Ops & Deploy** | Railway logs, deploys, monitoring | Read + Terminal (Railway CLI) | → Developer / DBA |
| **Refactoring** | Systematic code restructuring | Read + Edit + Terminal | → Reviewer (verify) |
| **Documentation** | Generate & sync domain docs | Read + Edit | → Reviewer (verify) |
| **Module Builder** | Build backend modules from spec to production | Read + Edit + Terminal + Pylance | → Reviewer (verify) |

## Available Skills

| Skill | What it does |
|-------|-------------|
| `/frontend-component` | Scaffold React component (TSX + CSS Module + barrel + checklist) |
| `/backend-module` | Build complete backend module from spec (models + API + admin + tests + migration) |
| `/api-endpoint` | Create DRF endpoint (model + serializer + viewset + URL) |
| `/migration-safety` | Audit Django migration for destructive operations |
| `/ui-review` | Full a11y + token + mobile + dark mode audit (code-level) |
| `/roadmap-execution` | Execute a roadmap phase end-to-end (spec → code → commit) |
| `/webapp-testing` | Test running app via Playwright MCP (navigate, screenshot, verify flows) |
| `/web-design-reviewer` | Visual UI review via live browser (layout, responsive, tokens) |
| `/pytest-coverage` | Generate coverage reports, identify testing gaps |
| `/conventional-commit` | Generate proper conventional commit messages |
| `/documentation-writer` | Generate/update docs from code changes |
| `/railway-ops` | Run management commands on Railway — seed data, logs, migrations, health checks |

## Available Prompts

| Prompt | When to use |
|--------|-------------|
| `build-module` | Build backend module from spec — scaffold, test, wire up |
| `debug` | Something is broken — full-stack diagnosis |
| `ui-review` | Review component for a11y, tokens, mobile |
| `code-quality` | Scan for convention violations, `any` types |
| `component` | Create a new component (quick scaffold) |
| `api-review` | Audit a DRF endpoint for security, N+1 |
| `roadmap` | Execute a roadmap phase |
| `domain` | Architecture/data/feature question |
| `performance` | Optimize bundle, queries, rendering |
| `refactor` | Restructure code preserving behavior |
| `migration` | Create safe Django migrations |
| `seed` | Seed data on Railway — management commands, dependency order, verification |

## Hooks (run automatically)

| Hook | Event | What it does |
|------|-------|-------------|
| `format-on-edit` | PostToolUse | Prettier auto-format after file edits |
| `safety-guard` | PreToolUse | Blocks DROP TABLE, TRUNCATE, DELETE FROM |
| `project-context` | SessionStart | Injects branch, versions, recent commits |

## Instructions (auto-attached by file pattern)

| File | Applies to | What it knows |
|------|-----------|---------------|
| `frontend.instructions.md` | `demo/src/**` | React/TS, tokens, a11y, mobile-first |
| `backend.instructions.md` | `src/**` | Django models, serializers, viewsets, org-scoping |
| `css.instructions.md` | `**/*.css` | Token system, focus-visible, reduced-motion |
| `testing.instructions.md` | `tests/**` | pytest, Playwright, factories |

## Spec-Kitty (separate system)

Worktree-based feature lifecycle in `.github/prompts/spec-kitty/`. For formal specification — not used in direct-to-main workflow.

## Single-Chat Workflow (preferred)

The user prefers working in a **single running chat** rather than switching between agents. In this mode:

1. **I am the orchestrator** — I detect intent, load the right instructions/skills, and execute
2. **Spec-first for big changes** — Before implementing new pages, features, or multi-file refactors, I create a spec in `documents/02-roadmap/` and get user approval
3. **Quick changes skip the spec** — Bug fixes, tweaks, small additions go straight to implementation
4. **I auto-load context** — Before editing `src/**` I read `backend.instructions.md`, before `demo/src/**` I read `frontend.instructions.md`, etc.
5. **I suggest next steps** — After completing work, I suggest the logical follow-up (review, test, deploy)
6. **Dutch is fine** — The user communicates in Dutch, I respond in Dutch when they do

---

## MCP Servers

| Server | Purpose | Config |
|--------|---------|--------|
| **Playwright** | Browser automation for live site testing and visual review | `.vscode/mcp.json` → `npx @playwright/mcp@latest` |

## External Tool Access

| Tool | How | Used by |
|------|-----|---------|
| **Railway CLI** | `railway logs`, `railway status`, `railway run` | Ops & Deploy, PostgreSQL DBA |
| **axe-core** | `npx @axe-core/cli <url> --exit` | Accessibility agent |
| **Lighthouse** | `npx lighthouse <url> --only-categories=accessibility` | Accessibility agent |

---
## Operational Runbook

### Railway Project & Services

| Service | Purpose | Notes |
|---------|---------|-------|
| `backend` | Django API server | Main application |
| `frontend` | React/Vite build | Served via nginx |
| `celery-worker` | Async task processing | Video, AI, emails |
| `celery-beat` | Scheduled tasks | Periodic triggers |
| `worker-ai` | AI processing worker | Generative tasks |
| `Postgres` | PostgreSQL database | Primary datastore |
| `Redis` | Cache + Celery broker | Message queue |

**Project**: `teamreel-backend` (Railway workspace: `teamreel`)

### Switching Railway Services

```bash
# Link to a specific service (interactive — choose project then service)
railway link

# Check which service you're linked to
railway status

# View logs of the currently linked service
railway logs

# IMPORTANT: `--tail` and `--num` flags do NOT exist.
# Use PowerShell piping to filter:
railway logs 2>&1 | Select-String -Pattern "error|traceback|500"
railway logs 2>&1 | Select-Object -First 100
```

### Database Access

```bash
# Public DB URL (reachable from local machine):
# postgresql://postgres:<password>@switchback.proxy.rlwy.net:17304/railway

# Run Django management commands against Railway DB:
railway run python manage.py shell
railway run python manage.py dbshell

# Or use psql directly with public URL:
psql "postgresql://postgres:<password>@switchback.proxy.rlwy.net:17304/railway"

# Query from Python locally (set DATABASE_URL env var):
# $env:DATABASE_URL = "postgresql://postgres:<password>@switchback.proxy.rlwy.net:17304/railway"
# python manage.py shell
```

> **Note**: `railway run` connects to the INTERNAL Railway network. Commands needing DB access must run via `railway run` OR use the **public** proxy URL.

### Seeding Data

> **⚠️ `railway run` does NOT work for DB commands from local** — it injects the internal `postgres.railway.internal` URL which is unreachable from your machine.

**Correct approach: Local execution with public DB URL**

```powershell
# 1. Get the public DB URL from Postgres service:
railway link -s Postgres
railway variables  # → copy DATABASE_PUBLIC_URL

# 2. Get AWS vars from backend service:
railway link -s backend
railway variables  # → copy AWS_* values

# 3. Set env vars and run:
$env:DATABASE_URL = "<DATABASE_PUBLIC_URL>"
$env:DJANGO_SETTINGS_MODULE = "config.settings.seeding"
$env:AWS_ACCESS_KEY_ID = "<value>"
$env:AWS_SECRET_ACCESS_KEY = "<value>"
$env:AWS_S3_BUCKET_NAME = "<value>"
$env:AWS_S3_REGION = "<value>"
python manage.py seed_app_backgrounds --force

# 4. Clean up env vars:
$env:DATABASE_URL = ""; $env:DJANGO_SETTINGS_MODULE = ""
$env:AWS_ACCESS_KEY_ID = ""; $env:AWS_SECRET_ACCESS_KEY = ""
```

Key settings module: `config.settings.seeding` (extends production, disables Celery).
See `.github/skills/railway-ops/SKILL.md` for full seed command catalog (63 commands).

### Monitoring & Debugging

```bash
# Backend logs (link to backend first)
railway logs 2>&1 | Select-String "error|Error|500|traceback"

# Frontend build logs (link to frontend first)
railway logs 2>&1 | Select-String "error|failed|ERR"

# Check environment variables (names only)
railway variables

# Run a quick health check
railway run python manage.py check
railway run python manage.py showmigrations --list
```

### Diagnosing Frontend Errors

1. **Build errors**: Link to `frontend` service → check build logs
2. **TypeScript errors**: Run `cd demo && npx tsc --noEmit` locally
3. **Runtime errors**: Check browser console on `demo.teamreel.app`
4. **API errors**: Link to `backend` service → check response logs

### Diagnosing Backend Errors

1. **500 errors**: `railway logs` → find traceback
2. **Migration issues**: `railway run python manage.py showmigrations`
3. **Import errors**: Check `requirements/` and `Dockerfile`
4. **S3 issues**: Verify `AWS_*` env vars on `backend` service

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
