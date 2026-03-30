# Fase 13: Advanced UI (Search & Discovery)

## 79. B39 – Hierarchical Search Navigation & Related Results

**Doel**: Maak global search “entity‑centric” zodat een zoekopdracht niet alleen losse keyword matches toont, maar ook een hiërarchie van gerelateerde items onder een anker (bijv. Club/Team → Seasons → Competitions → Matches).

**Waarom agnostisch**: Veel domeinen hebben natuurlijke hiërarchieën die gebruikers verwachten te kunnen “doorzoeken als navigatie”, ook wanneer de child-items de zoekterm niet letterlijk bevatten.

Voorbeelden:
- Organisation → Projects → Sprints → Tasks
- Customer → Contracts → Invoices → Payments
- Knowledge base → Collections → Articles → Attachments

**Wat moet er gebeuren**:
- **Search response uitbreiden (additief)**
  - Behoud huidige keyword search output.
  - Voeg optioneel een `hierarchy`/`related` sectie toe via `?hierarchy=1` (of een aparte endpoint `/search/hierarchy/`).
  - Response nodes zijn generiek: `{ type, id, title, url, description?, children? }`.

- **Anchor resolution (anker bepalen)**
  - Gebruik top results van keyword search om 1–3 “anchors” te selecteren.
  - Disambiguatie regels (voor voorspelbaarheid):
    - Prefer exact title match boven partial.
    - Prefer `Project` boven `Organisation` (configurable).
    - Stop na 1 anchor wanneer confidence hoog is (configurable).

- **Pluggable resolvers (product‑agnostic extensibility)**
  - Introduceer een kleine registry (vergelijkbaar met `search_registry`) voor “hierarchy resolvers”.
  - Per anchor type kan een resolver children ophalen (en die children kunnen weer eigen children hebben).
  - Downstream products kunnen resolvers toevoegen/overriden zonder core te forken.

- **TeamReel default hierarchy (referentie-implementatie, niet hardcoded UX)**
  - Anchor: `projects.Project` (club/team)
  - Level 1: `activities.Period` roots (Seasons: `parent_period IS NULL`)
  - Level 2: `activities.Period` children (Competitions: `parent_period IS NOT NULL`)
  - Level 3: `activities.Activity` matches (`activity_type="match"`) binnen competition period
  - Let op: dit is de **default** resolver voor TeamReel-demo; core blijft generiek.

- **Permissions & tenant isolation (veilig default)**
  - Re‑use bestaande zichtbaarheid (bv. `index.get_visible_ids(user)`) waar mogelijk.
  - Geen children teruggeven die buiten membership/organisation scope vallen.

- **Performance guardrails**
  - Hard limits per level (bv. 3 seasons, 5 competitions/season, 5 matches/competition).
  - Max depth (bv. 3) en max nodes totaal (bv. 100).
  - Prefetch/select_related om N+1 te voorkomen.
  - Optionele caching op `(user_id, query)` met korte TTL.

- **Feature flags (B10)**
  - `search_hierarchy_enabled` (default: off)
  - `search_hierarchy_max_depth`
  - `search_hierarchy_max_nodes`
  - `search_hierarchy_anchor_types` (prioriteitlijst)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)
- No frontend/demo page required per Constitution
- Frontend integration is downstream product responsibility

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B39-hierarchical-search-navigation

[feature summary]
Extend global search with an optional, product-agnostic hierarchy/related-results tree under an anchor entity.

[goals]
- Additive API: keep existing search response stable
- Anchor selection with deterministic tie-breakers
- Pluggable resolver registry for child expansion
- Permission-safe: never leak cross-tenant data
- Guardrails: configurable max depth/nodes and per-level limits

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```
