# Fase 13: Advanced UI (Navigation & Productivity)

## 81. B41 – User Navigation State (Recents & Favorites)

**Doel**: Maak **Recents** en **Favorites** first-class, **server-backed** features zodat ze cross-device werken, betrouwbaar zijn en onder duidelijke policies vallen (retentie, limits, privacy).

**Waarom agnostisch**: Elke SaaS heeft “productivity navigation state”: users willen snel terug naar laatst gebruikte items en vaste shortcuts. Dit geldt in elk domein (CRM, project management, learning, content, sport).

**Wat moet er gebeuren**:

- **Data model (core, extensible)**
  - Introduceer een kleine app (bijv. `navigation_state` of `user_activity`) met 2 resources:
    - `UserRecent`: `(user, kind, target_type?, target_id?, label, path, last_seen_at, count?)`
    - `UserFavorite`: `(user, kind, target_type?, target_id?, label, path, created_at)`
  - **Agnostisch resolven**: support zowel “opaque target” (type+id) als “fallback path” (URL) voor cases zonder entiteit.
  - **Deduping/upsert**: recents upsert op `(user, kind, target_type, target_id, path)`; favorites uniek op `(user, kind, target_type, target_id, path)`.

- **API endpoints (DRF)**
  - `GET /api/v1/navigation/recents/`
  - `POST /api/v1/navigation/recents/` (upsert: zet `last_seen_at=now`, increment `count`)
  - `DELETE /api/v1/navigation/recents/{id}/` (of bulk delete)
  - `POST /api/v1/navigation/recents/clear/`
  - `GET /api/v1/navigation/favorites/`
  - `POST /api/v1/navigation/favorites/` (create)
  - `DELETE /api/v1/navigation/favorites/{id}/`
  - Optioneel v1.1: `POST /api/v1/navigation/sync/` (bulk ingest + return canonical)

- **Permissions & veiligheid (default safe)**
  - Altijd per-user scoped: users kunnen alleen hun eigen recents/favorites lezen/schrijven.
  - No data leakage: server mag geen info teruggeven over targets waar de user geen toegang (meer) toe heeft.
    - Voorkeur: resolve targets op GET en drop/mark “unresolved” items.
  - Sanitization: beperk `label` length, valideer `path` (relative only), blokkeer absolute URLs.

- **Privacy / AVG (minimale opslag)**
  - Guidance: sla geen vrije tekst op die PII kan bevatten (bv. zoekqueries). Alleen:
    - `label` uit entity name (club/team/match), of fixed labels (“Directory • matches”).
    - `path` uitsluitend interne route.
  - Ondersteun “delete my data”: endpoints of management command om user nav-state te verwijderen.

- **Retentie & limits (guardrails)**
  - Recents: max N (bv. 50 of 100). Bij upsert: prune oudste.
  - Retentie: optional TTL (bv. 90 dagen) via periodic cleanup.
  - Favorites: max N (bv. 1000) optioneel.

- **Frontend integratie (TeamReel demo)**
  - Houd de huidige localStorage UX als **optimistic cache**, maar maak backend de source-of-truth na login.
  - Startup: fetch recents/favorites, merge met local cache (dedupe), push canonical naar store.
  - Writes: bij `addRecent` en `toggleFavorite` ook een API call (debounced/throttled).

- **Feature flags (B10)**
  - `navigation_state_enabled` (default: off)
  - `navigation_recents_enabled` / `navigation_favorites_enabled`
  - `navigation_recents_max_items`
  - `navigation_recents_retention_days`

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)
- No frontend/demo page required per Constitution
- Frontend integration is downstream product responsibility

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B41-user-navigation-state

[feature summary]
Server-backed recents & favorites (user navigation state) with safe defaults, limits, and frontend sync.

[goals]
- DRF API for recents/favorites (CRUD + clear)
- Upsert + dedupe for recents
- Tenant-safe: strictly per-user
- Privacy-safe: internal routes only, limited labels
- Guardrails: max items + optional retention TTL
- Frontend sync strategy: optimistic local cache + backend source-of-truth

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```
