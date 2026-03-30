# Fase 13: Advanced UI (Performance & UX Hardening)

## 80. B40 – Incremental Frontend Performance & Fetch Guardrails (Optie B)

**Doel**: Stabiliseer en versnel de demo/prod frontend via een **incremental refactor** (geen big-bang rewrite): snelle create-flows, voorspelbare data-fetching, en harde guardrails tegen over-fetching/pagination-walks.

**Waarom agnostisch**: In elk product met tabellen, detailpagina’s en globale navigatie ontstaan dezelfde failure modes:
- “Create” hangt op blocking refetch / spinner
- Global nav triggert zware requests op onverwachte momenten
- Paginatie helpers lopen door pages heen zonder harde limieten
- Cache invalidation veroorzaakt “storms” van netwerkverkeer

**Wat moet er gebeuren**:
- **Fetch budget & guardrails (default-on)**
  - Introduceer expliciete limieten bij alle “fetch-all” helpers: `maxPages`, `maxItems`, `ttlMs`, `cacheKey`.
  - Fail-safe defaults: als `page_size` klein is, mag dat nooit leiden tot doorlopen naar page 8/9 zonder intent.
  - Additieve “budget tracing”: log (client-side) wanneer budgets worden overschreden.

- **Predictable invalidation (storm-control)**
  - Centraliseer cache invalidation rules per resource type.
  - Maak onderscheid tussen:
    - *local optimistic update* (direct UI)
    - *background refresh* (non-blocking)
    - *hard refresh* (alleen bij expliciete user action)

- **Optimistic create/update patterns (UX baseline)**
  - Alle create-modals: immediate UI insertion + non-blocking reconciliation.
  - Uniforme error handling:
    - rollback/mark-as-failed in list
    - toast + retry CTA

- **Scope-aware global navigation**
  - Global nav mag geen org-wide heavy queries doen “by default”.
  - Prefetch alleen:
    - huidige context (org/project)
    - top-N recente items met harde cap

- **Ordering + server-side filtering as performance lever**
  - Standaard newest-first ordering waar dat UX/logisch is.
  - Always filter op scope (org/project/parent) i.p.v. “fallback to all”.

- **Feature flags (B10) voor safe rollout**
  - `frontend_fetch_guardrails_enabled` (default: on)
  - `frontend_fetch_max_pages_default`
  - `frontend_fetch_max_items_default`
  - `frontend_optimistic_create_enabled`

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)
- No frontend/demo page required per Constitution
- Frontend integration is downstream product responsibility

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B40-incremental-frontend-performance-and-fetch-guardrails

[feature summary]
Add default-on performance guardrails and a consistent optimistic UX pattern for create/update flows, without rewriting the frontend.

[goals]
- Default caps for any multi-page fetch helpers (max pages/items)
- Centralized cache invalidation to prevent request storms
- Optimistic create patterns across core modals
- Scope-aware global navigation (no heavy org-wide queries by default)
- Additive observability for request budgets

[non-goals]
- Full rewrite of the frontend architecture
- Breaking changes to existing API contracts

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```
