# TeamReel AI System — Cheatsheet

> Snelle referentie voor alle agents, skills, prompts, instructions en hooks.
> Laatst bijgewerkt: 2026-03-17

---

## Hoe werkt het systeem?

```
┌─────────────────────────────────────────────────────────┐
│  copilot-instructions.md  (orchestrator / router)       │
│                                                         │
│  Jouw bericht → intent detectie → juiste agent/skill    │
│  laden → context bestanden inladen → uitvoeren          │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Agents  │ │  Skills  │ │  Prompts │
    │ (wie)    │ │ (hoe)    │ │ (wat)    │
    └────┬─────┘ └────┬─────┘ └────┬─────┘
         │            │            │
         ▼            ▼            ▼
    ┌──────────────────────────────────────┐
    │  Instructions  (auto per bestandstype)│
    │  frontend · backend · css · testing  │
    └──────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Hooks  (automatisch voor/na acties) │
    │  format · safety · project-context   │
    └──────────────────────────────────────┘
```

**Agents** = Rollen met expertise (developer, reviewer, debugger...)
**Skills** = Recepten voor specifieke taken (scaffold component, seed data...)
**Prompts** = Gedetailleerde workflows voor probleemoplossing
**Instructions** = Automatisch geladen conventies per bestandstype
**Hooks** = Automatische acties (format, safety guard)

---

## Agents (10)

| Agent | Rol | Trigger woorden | Mag code wijzigen? |
|-------|-----|----------------|--------------------|
| **Developer** | Full-stack implementatie | "build", "implement", "add feature", "create" | ✅ Ja |
| **Reviewer** | Code review & audit | "review", "audit", "check code" | ❌ Nee (read-only) |
| **Planner** | Architectuur & planning | "plan", "architect", "design", "how should we" | ❌ Nee (maakt specs) |
| **Debugger** | Bug diagnose & fix | "bug", "broken", "error", "not working", "fix" | ✅ Ja |
| **Refactoring** | Code herstructureren | "refactor", "clean up", "extract", "restructure" | ✅ Ja |
| **Accessibility** | WCAG specialist | "accessible", "a11y", "WCAG", "screen reader" | ✅ Ja (kleine fixes) |
| **Playwright Tester** | E2E browser testen | "test", "E2E", "playwright", "verify flow" | ✅ Ja (test files) |
| **PostgreSQL DBA** | Database optimalisatie | "database", "query", "slow query", "N+1", "index" | ❌ Advies → Developer |
| **Ops & Deploy** | Railway & productie | "deploy", "railway", "logs", "production" | ❌ Ops commands only |
| **Documentation** | Docs synchroniseren | "docs", "document", "update docs" | ✅ Ja (docs files) |

### Agent handoff keten

```
Planner ──spec──→ Developer ──code──→ Reviewer ──issues──→ Developer
                      │                                        │
                      ├──→ Playwright Tester ──bugs──→ Developer
                      │
                      └──→ Accessibility ──a11y fixes──→ Reviewer

Debugger ──fix──→ Reviewer ──verify──→ ✅

Ops & Deploy ──diagnose──→ Developer (code fix)
                        ──→ PostgreSQL DBA (DB issue)

Refactoring ──restructure──→ Reviewer ──verify──→ Playwright Tester
```

---

## Skills (11)

| Skill | Wat het doet | Wanneer gebruiken |
|-------|-------------|-------------------|
| **api-endpoint** | Scaffold DRF endpoint (model + serializer + viewset + URL) | Nieuw API endpoint nodig |
| **frontend-component** | Scaffold React component (TSX + CSS Module + barrel) | Nieuw component nodig |
| **conventional-commit** | Genereer commit message in correct formaat | Bij elke commit |
| **migration-safety** | Audit migratie op destructieve operaties | Nieuwe Django migratie |
| **roadmap-execution** | Voer roadmap fase uit (spec → code → verify → commit) | Roadmap fase implementeren |
| **documentation-writer** | Genereer/update docs na code wijzigingen | Na grote features/changes |
| **pytest-coverage** | Coverage rapport + gap analyse | Testen verbeteren |
| **ui-review** | A11y + tokens + mobile + dark mode audit (code-level) | Component quality check |
| **web-design-reviewer** | Visuele review via live browser (Playwright MCP) | UI visueel controleren |
| **webapp-testing** | E2E testen via live browser (Playwright MCP) | User flows verifiëren |
| **railway-ops** | Management commands op Railway, seed data, logs | Productie operaties |

---

## Prompts (11 + spec-kitty)

| Prompt | Wanneer | Snelle uitleg |
|--------|---------|---------------|
| **debug** | Iets is kapot | Systematische diagnose: classify → evidence → fix → verify |
| **ui-review** | Component UI checken | 6-dimensie audit (a11y, tokens, mobile, dark mode) |
| **code-quality** | Convention scan | Zoekt `any` types, hardcoded values, dead code |
| **component** | Nieuw component | Scaffold met alle conventies |
| **api-review** | Endpoint auditen | Security, N+1, org-scoping, permissions |
| **roadmap** | Roadmap fase uitvoeren | 5-stap workflow: spec → research → implement → verify → commit |
| **domain** | Vraag over architectuur/data | Verwijst naar `docs/` kennisbasis |
| **performance** | Optimalisatie nodig | Bundle size, queries, rendering, lazy loading |
| **refactor** | Code herstructureren | 5 refactor types, safety protocol, anti-patterns |
| **migration** | Schema wijziging | Veilige migratie regels, nooit DROP TABLE |
| **seed** | Data seeden op Railway | Dependency order, env vars, verificatie |

---

## Instructions (4) — automatisch geladen

| Instruction | Actief bij | Kernregels |
|-------------|-----------|------------|
| **frontend** | `demo/src/**` | React 18 + TS strict, CSS Modules + tokens, max 500 regels TSX, geen `any` |
| **backend** | `src/**` | Django 5 + DRF, UUID PKs, org-scoped querysets, nooit DROP TABLE |
| **css** | `**/*.css` | Design tokens only, `:focus-visible`, `prefers-reduced-motion`, mobile-first |
| **testing** | `tests/**` | pytest + factory_boy, Playwright, role-based selectors, mock externals |

> **Je hoeft deze niet handmatig te laden** — ze worden automatisch geactiveerd op basis van welke bestanden je bewerkt.

---

## Hooks (3) — automatisch

| Hook | Trigger | Wat het doet |
|------|---------|-------------|
| **format-on-edit** | Na elke file edit | Prettier auto-format op `.ts/.tsx/.css/.json` |
| **safety-guard** | Vóór terminal command | Blokkeert `DROP TABLE`, `DELETE FROM`, `TRUNCATE` |
| **project-context** | Session start | Injecteert branch, versions, recente commits |

---

## Combinaties — wanneer wat samenwerkt

### 🏗️ Nieuwe feature bouwen

```
1. Planner        → maakt roadmap spec in docs/roadmap/
2. Developer      → implementeert per fase
   ├─ frontend.instructions.md  (auto-loaded)
   ├─ css.instructions.md       (auto-loaded)
   ├─ frontend-component skill  (als nieuw component nodig)
   └─ api-endpoint skill        (als nieuw endpoint nodig)
3. Reviewer       → code review
4. Playwright     → E2E test van de feature
5. Documentation  → docs bijwerken
6. Commit skill   → conventional commit message
```

### 🐛 Bug fixen

```
1. Debugger       → classify → evidence → fix
   ├─ debug prompt              (gedetailleerde workflow)
   ├─ backend/frontend instructions (auto-loaded)
   └─ safety-guard hook         (voorkomt destructieve commands)
2. Reviewer       → verify fix
3. Commit skill   → fix(scope): description
```

### 🎨 UI verbeteren

```
1. ui-review skill/prompt  → code-level audit (tokens, a11y, mobile)
2. web-design-reviewer     → visuele browser check (screenshots)
3. Accessibility agent     → WCAG deep-dive (axe-core, Lighthouse)
4. Developer               → fixes implementeren
5. Reviewer                → verify
```

### 🔄 Refactoring

```
1. Refactoring agent  → herstructureer code
   ├─ refactor prompt         (safety protocol)
   ├─ frontend instructions   (auto-loaded)
   └─ css instructions        (auto-loaded)
2. Reviewer           → verify behavior preserved
3. Playwright Tester  → regression check
4. Commit skill       → refactor(scope): description
```

### 🚀 Productie operaties

```
1. Ops & Deploy       → logs, health checks, deploy status
   ├─ railway-ops skill       (commands, env vars)
   └─ seed prompt             (data seeding workflow)
2. PostgreSQL DBA     → als DB issue gevonden
3. Developer          → als code fix nodig
```

### 📋 Roadmap uitvoeren

```
1. Planner            → spec lezen/maken
2. roadmap-execution  → fase-voor-fase implementeren
   ├─ Developer              (code)
   ├─ Instructions           (auto per bestandstype)
   └─ Skills per taak        (component, endpoint, etc.)
3. Reviewer           → elke fase reviewen
4. Documentation      → docs updaten
5. Commit skill       → feat(scope): ... — roadmap #N phase X
```

---

## Snelle referentie — "Ik wil..."

| Ik wil... | Zeg dit | Wat er gebeurt |
|-----------|---------|----------------|
| Feature bouwen | "implement X" / "bouw X" | Developer agent + instructions |
| Plan maken | "plan X" / "hoe moeten we X doen" | Planner → roadmap spec |
| Code reviewen | "review X" / "check deze code" | Reviewer (read-only) |
| Bug fixen | "X is kapot" / "error bij Y" | Debugger → fix → verify |
| Refactoren | "refactor X" / "clean up Y" | Refactoring agent |
| UI checken (code) | "review UI van X" | ui-review skill |
| UI checken (browser) | "hoe ziet X eruit" / "visual review" | web-design-reviewer via Playwright |
| Accessibility | "a11y check" / "WCAG audit" | Accessibility agent |
| E2E testen | "test de flow" / "check de site" | Playwright Tester |
| Database optimaliseren | "slow query" / "N+1 probleem" | PostgreSQL DBA |
| Deploy/logs bekijken | "railway logs" / "deploy status" | Ops & Deploy |
| Nieuw component | "scaffold component X" | frontend-component skill |
| Nieuw endpoint | "maak endpoint voor X" | api-endpoint skill |
| Migratie checken | "is deze migratie veilig?" | migration-safety skill |
| Data seeden | "seed X op railway" | railway-ops skill + seed prompt |
| Docs updaten | "update documentatie" | Documentation agent |
| Coverage rapport | "test coverage van X" | pytest-coverage skill |
| Commit message | "commit message" | conventional-commit skill |
| Roadmap uitvoeren | "voer roadmap #X uit" | roadmap-execution skill |
| Performance | "optimize X" / "bundle size" | performance prompt |

---

## Bestanden

```
.github/
├── agents/                    # 10 agent definities
│   ├── accessibility.agent.md
│   ├── debugger.agent.md
│   ├── developer.agent.md
│   ├── documentation.agent.md
│   ├── ops-deploy.agent.md
│   ├── planner.agent.md
│   ├── playwright-tester.agent.md
│   ├── postgresql-dba.agent.md
│   ├── refactoring.agent.md
│   └── reviewer.agent.md
│
├── instructions/              # 4 auto-loaded per bestandstype
│   ├── backend.instructions.md     (src/**)
│   ├── css.instructions.md         (**/*.css)
│   ├── frontend.instructions.md    (demo/src/**)
│   └── testing.instructions.md     (tests/**)
│
├── skills/                    # 11 taak-recepten
│   ├── api-endpoint/
│   ├── conventional-commit/
│   ├── documentation-writer/
│   ├── frontend-component/
│   ├── migration-safety/
│   ├── pytest-coverage/
│   ├── railway-ops/
│   ├── roadmap-execution/
│   ├── ui-review/
│   ├── web-design-reviewer/
│   └── webapp-testing/
│
├── prompts/                   # 11 workflows + spec-kitty
│   ├── api-review.prompt.md
│   ├── code-quality.prompt.md
│   ├── component.prompt.md
│   ├── debug.prompt.md
│   ├── domain.prompt.md
│   ├── migration.prompt.md
│   ├── performance.prompt.md
│   ├── refactor.prompt.md
│   ├── roadmap.prompt.md
│   ├── seed.prompt.md
│   ├── ui-review.prompt.md
│   └── spec-kitty/           # 14 formele spec lifecycle bestanden
│
├── hooks/                     # 3 automatische triggers
│   ├── format-on-edit.json        (PostToolUse → Prettier)
│   ├── safety-guard.json          (PreToolUse → blokkeert DROP/DELETE)
│   └── project-context.json       (SessionStart → git info)
│
└── copilot-instructions.md    # Orchestrator / router
```

---

## Gouden regels (altijd geldig)

1. **Nooit `DROP TABLE`** — safety-guard blokkeert het, migratie-regels verbieden het
2. **Geen `any` types** — TypeScript strict mode, interfaces voor alles
3. **Design tokens only** — geen hardcoded kleuren, spacing, of shadows
4. **Org-scoped queries** — elke queryset filtert op organisatie
5. **Mobile-first CSS** — base styles = telefoon, breakpoints voor groter
6. **`:focus-visible` + `prefers-reduced-motion`** — op elk interactief element
7. **Touch targets ≥ 44×44px** — accessibility minimum
8. **Conventional commits** — `type(scope): description`
9. **Verify before commit** — `tsc --noEmit` + `vite build` moeten slagen
10. **Spec-first voor grote changes** — roadmap in `docs/roadmap/` voor 5+ bestanden
